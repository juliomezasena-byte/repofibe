/**
 * El coach público de hyntibia: MISMO cerebro anclado que /tutor/paso, pero
 * sin login y con techo de gasto.
 *
 * POR QUÉ SEPARADO DEL HANDLER CON LOGIN: no quiero tocar el endpoint
 * protegido para abrir una puerta pública — un error ahí expondría lo de los
 * demás. Este orquesta las MISMAS piezas compartidas (coach.js, arbol.js,
 * tutor.js, prompts.js), así que la garantía que importa —los comandos salen
 * del manual, nunca inventados— no puede desincronizarse: vive en esas piezas,
 * no aquí.
 *
 * LO QUE ESTE MÓDULO SÍ HACE distinto:
 *   · no pide token de Firebase
 *   · acota el gasto de Gemini con dos topes en KV: por IP y un techo global
 *     diario. Aunque alguien encuentre el endpoint, la factura tiene tope.
 */
import { leerPantalla, fusionarEnCaso } from './pantalla.js';
import { queProcedimiento } from './arbol.js';
import { siguientePaso } from './tutor.js';
import { detectarIntencion, extraerPasajeros, extraerDatosDeReserva, extraerContextoPanama, extraerContextoEcuador, extraerContextoColombia, extraerComandoEscrito } from './coach.js';
import { buildGeneralCoachPrompt, buildTutorPrompt, construirRespuestaAnclada, construirRespuestaDeDecision } from './prompts.js';
import { generateTutorText, generateTutorTextServidor } from './gemini.js';
import { validarRespuestaGemini } from './validar-gemini.js';
import { redactarTextoSensible } from './redactar.js';
import procedimientos from './procedimientos.generated.json' with { type: 'json' };

const dia = () => new Date().toISOString().slice(0, 10);
const DOS_DIAS = 172800; // TTL en KV: se limpia solo

async function redactarConGemini({ env, prompt, paso = null }) {
  if (!env.GEMINI_API_KEY && !env.GEMINI_ENDPOINT) return null;
  let timer;
  try {
    // El puente del servidor (Vertex de pago) tiene prioridad; si no, Google directo.
    const seguro = redactarTextoSensible(prompt);
    const llamada = env.GEMINI_ENDPOINT
      ? generateTutorTextServidor(env.GEMINI_ENDPOINT, seguro, env.PUBLIC_BOT_HASH || '')
      : generateTutorText(env.GEMINI_API_KEY, env.GEMINI_MODEL, seguro);
    const respuesta = await Promise.race([
      llamada,
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('gemini_timeout')), Number(env.GEMINI_TIMEOUT_MS) || 8000); })
    ]);
    const segura = validarRespuestaGemini(respuesta, paso);
    return segura.ok ? segura : null;
  } catch (error) {
    console.error('Coach Gemini fallback:', error.message);
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function datosDeCaso(caso = {}) {
  const datos = { ...(caso.datos || {}) };
  const pasajeros = caso.pasajeros;
  if (pasajeros?.plazas > 0) datos.plazas = pasajeros.plazas;
  if (caso.respuestas?.lineaVuelo) {
    const [lineaVuelo, plazas] = String(caso.respuestas.lineaVuelo).split('|');
    datos.lineaVuelo = lineaVuelo;
    if (!datos.plazas && Number(plazas) > 0) datos.plazas = Number(plazas);
  }
  if (caso.respuestas?.clase) datos.clase = caso.respuestas.clase;
  return datos;
}

function normalizarTexto(valor = '') {
  return String(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9|]+/g, ' ')
    .trim();
}

/**
 * Entiende una respuesta escrita con palabras normales, sin pedirle a un
 * modelo que decida por nosotros. Solo devuelve valores que ya existen en
 * las opciones del árbol; si hay ambigüedad, devuelve null y pregunta.
 */
export function extraerRespuestaDePregunta(pregunta, texto) {
  if (!pregunta || !texto || !Array.isArray(pregunta.opciones)) return null;
  const q = normalizarTexto(texto);
  if (!q) return null;

  const opciones = pregunta.opciones;
  const porTexto = opciones.filter((opcion) => {
    const etiqueta = normalizarTexto(opcion.texto);
    return etiqueta && (q === etiqueta || q.includes(etiqueta) || etiqueta.includes(q));
  });
  if (porTexto.length === 1) return porTexto[0].valor;

  if (pregunta.id === 'lineaVuelo') {
    const candidatas = opciones.filter((opcion) => {
      const linea = String(opcion.valor).split('|')[0];
      const vuelo = normalizarTexto(opcion.texto).match(/\b(?:ib|la)\s*\d+/)?.[0] || '';
      return new RegExp(`(?:^|\\s)(?:linea|vuelo|opcion)?\\s*${linea}(?:$|\\s)`, 'i').test(q)
        || (vuelo && q.includes(vuelo));
    });
    if (candidatas.length === 1) return candidatas[0].valor;
  }

  if (pregunta.id === 'clase') {
    const candidatas = opciones.filter((opcion) => {
      const clase = normalizarTexto(opcion.valor);
      return new RegExp(`(?:^|\\s)${clase}(?:$|\\s|[,.])`, 'i').test(q);
    });
    if (candidatas.length === 1) return candidatas[0].valor;
  }

  const porValor = opciones.filter((opcion) => {
    const valor = normalizarTexto(opcion.valor);
    if (!valor || valor === 'true' || valor === 'false') return false;
    return q === valor || q.includes(` ${valor} `) || q.startsWith(`${valor} `) || q.endsWith(` ${valor}`);
  });
  if (porValor.length === 1) return porValor[0].valor;

  if (opciones.some((opcion) => opcion.valor === true) && opciones.some((opcion) => opcion.valor === false)) {
    let afirma = false;
    let niega = false;
    if (pregunta.id === 'volado') {
      niega = /\b(no|ninguno|nunca|sin volar|no ha volado)\b/i.test(q);
      afirma = !niega && /\b(si|ya|volo|volado|usado|boar[d]?ed)\b/i.test(q);
    } else if (pregunta.id === 'involuntario') {
      afirma = /\b(involuntario|cancelacion|cancelado|cambio de hora|downgrad|iberia cambio)\b/i.test(q);
      niega = /\b(voluntario|lo pide el pasajero|lo solicita el pasajero)\b/i.test(q);
    } else if (pregunta.id === 'cambiaClaseORuta') {
      afirma = /\b(cambia|distinta|diferente|otra clase|otra ruta)\b/i.test(q);
      niega = /\b(misma clase|misma ruta|mismo vuelo|igual)\b/i.test(q);
    } else if (pregunta.id === 'cotizo') {
      afirma = /\b(si|cotizo|cotizacion|devolvio|aparecio)\b/i.test(q);
      niega = /\b(no|nada|sin cotizacion|no devolvio)\b/i.test(q);
    }
    if (afirma !== niega) return opciones.find((opcion) => opcion.valor === afirma)?.valor;
  }

  return null;
}

/**
 * Consume un cupo del coach público. Dos frenos:
 *   · por IP: para que un solo abusador no agote el techo de todos
 *   · global: el tope que de verdad acota la factura de Gemini del día
 * @returns {Promise<{allowed:boolean, motivo?:string, mensaje?:string}>}
 */
export async function consumirCupoPublico(kv, ip, env) {
  const hoy = dia();
  const capGlobal = Number(env.PUBLIC_DAILY_GLOBAL_CAP || 400);
  const capIp = Number(env.PUBLIC_DAILY_IP_CAP || 30);

  const kGlobal = `pub:global:${hoy}`;
  const kIp = `pub:ip:${ip}:${hoy}`;
  const [gRaw, ipRaw] = await Promise.all([kv.get(kGlobal), kv.get(kIp)]);
  const g = Number(gRaw || 0);
  const usedIp = Number(ipRaw || 0);

  if (g >= capGlobal) {
    return { allowed: false, motivo: 'tope_global', mensaje: 'El asistente alcanzó su límite de consultas por hoy. Inténtalo mañana.' };
  }
  if (usedIp >= capIp) {
    return { allowed: false, motivo: 'tope_ip', mensaje: 'Has alcanzado tu límite de consultas por hoy. Inténtalo mañana.' };
  }

  await Promise.all([
    kv.put(kGlobal, String(g + 1), { expirationTtl: DOS_DIAS }),
    kv.put(kIp, String(usedIp + 1), { expirationTtl: DOS_DIAS })
  ]);
  return { allowed: true };
}

/**
 * Un turno de conversación anclado. Reutiliza exactamente la lógica del tutor:
 * lee pantallas → encamina por intención → árbol → paso del manual, y Gemini
 * solo pone las palabras. Nunca emite un comando que no venga de siguientePaso.
 */
export async function responderCoachPublico(cuerpo, env) {
  const { procedimientoId = null, pasoActual = null, comandoEscrito = null, caso = null } = cuerpo || {};
  const continuidad = cuerpo?.continuidad && typeof cuerpo.continuidad === 'object'
    ? { turnos: Math.max(0, Math.min(99, Number(cuerpo.continuidad.turnos) || 0)), procedimiento: typeof cuerpo.continuidad.procedimiento === 'string' ? cuerpo.continuidad.procedimiento.slice(0, 80) : null, paso: Number.isFinite(Number(cuerpo.continuidad.paso)) ? Number(cuerpo.continuidad.paso) : null, camposConfirmados: Array.isArray(cuerpo.continuidad.camposConfirmados) ? cuerpo.continuidad.camposConfirmados.filter((campo) => ['origen', 'destino', 'fecha', 'fechaIda', 'fechaVuelta', 'lineaVuelo', 'clase', 'plazas', 'mercado', 'segmento'].includes(campo)).slice(0, 12) : [] }
    : null;
  const consulta = cuerpo?.consulta || cuerpo?.texto || cuerpo?.mensaje || null;
  if (caso?.currentStep !== undefined && caso?.currentStep !== null && pasoActual !== null
      && String(caso.currentStep) !== String(pasoActual)) {
    return {
      error: 'step_state_mismatch',
      explicacion: 'El estado del paso no coincide con la última respuesta del tutor. Vuelve a enviar el último paso sin saltarlo.',
      diagnostico: 'Avance rechazado por integridad de secuencia.'
    };
  }
  const comandoMencionado = extraerComandoEscrito(consulta);
  const esSolicitudDeCorreccion = Boolean(comandoMencionado && /\b(corrige|corregir|correcto|bien|puse|escrib[ií]|comando|error|funciona)\b/i.test(consulta));
  const comandoParaValidar = comandoEscrito || (esSolicitudDeCorreccion ? comandoMencionado : null);

  // 0 · Leer lo pegado
  let lectura = null;
  let casoConHechos = caso;
  for (const t of (caso?.pantallas || []).filter(Boolean)) {
    const l = leerPantalla(t);
    casoConHechos = fusionarEnCaso(casoConHechos, l);
    if (l.tipo || !lectura) lectura = l;
  }
  if (caso?.pantalla) {
    const l = leerPantalla(caso.pantalla);
    casoConHechos = fusionarEnCaso(casoConHechos, l);
    if (l.tipo || l.errorPantalla) lectura = l;
  }
  if (!lectura && consulta) {
    const l = leerPantalla(consulta);
    if (l.tipo || l.errorPantalla) lectura = l;
  }

  // Si el estudiante pegó un mensaje de error de Amadeus o Resiber
  if (lectura?.errorPantalla) {
    return {
      decision: { procedimientoId: lectura.errorPantalla.procedimientoRecomendado },
      lectura,
      explicacion: `⚠️ **Mensaje del sistema detectado:** \`${lectura.errorPantalla.error}\`\n\n💡 **Diagnóstico y Solución:** ${lectura.errorPantalla.solucion}`,
      diagnostico: `Se detectó el error de Amadeus/Resiber: ${lectura.errorPantalla.error}.`
    };
  }

  // 0.1 · Sistema de Aprendizaje Activo (Self-Learning KV Memory)
  let aprendizajesPrevios = [];
  if (false && env.ROLEPLAY_KV) {
    try {
      const memRaw = await env.ROLEPLAY_KV.get('memoria:aprendizajes');
      if (memRaw) aprendizajesPrevios = JSON.parse(memRaw);
    } catch (e) { /* fallback silencioso */ }
  }

  // Si el usuario da una orden explícita de aprendizaje/corrección
  // No se acepta memoria global escrita por usuarios anónimos: evita
  // poisoning y fugas entre conversaciones. El manual/versionado del repo
  // es la única fuente de autoridad.
  aprendizajesPrevios = [];

  if (consulta && typeof consulta === 'string') {
    const cLower = consulta.toLowerCase();
    const esOrdenAprendizaje = cLower.includes('recuerda que') || cLower.includes('aprende que') ||
      cLower.includes('toma nota') || cLower.includes('no, se hace asi') || cLower.includes('no, se hace así') ||
      cLower.includes('corrección:') || cLower.includes('corregir:');

    if (esOrdenAprendizaje && false && env.ROLEPLAY_KV) {
      const nuevoAprendizaje = { fecha: new Date().toISOString(), texto: consulta };
      aprendizajesPrevios.unshift(nuevoAprendizaje);
      // Guardar en KV hasta 50 aprendizajes confirmados
      await env.ROLEPLAY_KV.put('memoria:aprendizajes', JSON.stringify(aprendizajesPrevios.slice(0, 50)));
      return {
        decision: { procedimientoId: '_memoria' },
        lectura: null,
        explicacion: `🧠 **¡Entendido y Aprendido!** He guardado esta instrucción en mi memoria permanente:\n\n> "${consulta}"\n\nA partir de este momento, aplicaré este conocimiento en todas las consultas futuras.`,
        diagnostico: 'Nuevo aprendizaje registrado con éxito en KV.'
      };
    }
  }

  // 1 · ¿Qué procedimiento?
  const pasajeros = extraerPasajeros(consulta);
  if (pasajeros) casoConHechos = { ...(casoConHechos || {}), pasajeros };
  const datosReserva = extraerDatosDeReserva(consulta);
  const contextoPanama = { ...extraerContextoPanama(consulta) };
  const contextoEcuador = { ...extraerContextoEcuador(consulta) };
  const contextoColombia = { ...extraerContextoColombia(consulta) };
  if (casoConHechos?.datos?.mercado === 'PTY001' && /DESCUENTO|JUBILAD|ADULTO MAYOR|TERCERA EDAD|\b55\b|\b60\b/i.test(consulta || '')) {
    contextoPanama.descuentoPais = true;
  }
  if (casoConHechos?.datos?.mercado === 'UIO001' && /DESCUENTO|DISCAPAC|CONADIS|JOVEN|ADULTO MAYOR|TERCERA EDAD|\b65\b/i.test(consulta || '')) {
    contextoEcuador.descuentoPais = true;
  }
  if (Object.keys(datosReserva).length || Object.keys(contextoPanama).length || Object.keys(contextoEcuador).length || Object.keys(contextoColombia).length) {
    casoConHechos = {
      ...(casoConHechos || {}),
      datos: { ...(casoConHechos?.datos || {}), ...datosReserva, ...contextoPanama, ...contextoEcuador, ...contextoColombia }
    };
  }

  let id = procedimientoId;
  let decision = null;
  if (!id) {
    let encaminadoPor = null;
    // `noAdivinar`: cuando el cliente ya intentó clasificar con IA y quedó sin
    // certeza (ambiguo, o determinista con trampa conocida), NO dejamos que el
    // detector determinista interno vuelva a misrutear "cambiar el nombre" →
    // cambio de vuelo. Preferimos preguntar. Solo lo activa tutor-local tras
    // correr el clasificador de conjunto cerrado.
    if (consulta && !(casoConHechos && casoConHechos.intencion) && !cuerpo?.noAdivinar) {
      const intencionPorMercado = contextoPanama.descuentoPais
        ? 'descuento-panama'
        : contextoEcuador.descuentoPais
          ? 'descuento-ecuador'
          : contextoColombia.cobroCOP
            ? 'emision-colombia-cop'
          : null;
      const intuido = detectarIntencion(consulta)
        || (intencionPorMercado ? { intencion: intencionPorMercado, comoLoSe: 'Lo deduje del mercado y del descuento indicado explícitamente.' } : null);
      if (intuido) {
        casoConHechos = { ...(casoConHechos || {}), intencion: intuido.intencion };
        encaminadoPor = intuido.comoLoSe;
      }
    }
    decision = casoConHechos ? queProcedimiento(casoConHechos) : { procedimientoId: null };
    if (encaminadoPor && decision) decision.encaminadoPor = encaminadoPor;
    if (decision && casoConHechos?.pasajeros) decision.pasajerosActivos = casoConHechos.pasajeros;
    // Sin estado en el worker: se devuelve la intención para que el cliente la
    // reenvíe y el árbol no vuelva a preguntar "¿qué necesita?" en cada botón.
    if (decision) decision.intencionActiva = casoConHechos?.intencion || null;

    if (decision?.siguientePregunta && consulta) {
      const valor = extraerRespuestaDePregunta(decision.siguientePregunta, consulta);
      if (valor !== null) {
        const idPregunta = decision.siguientePregunta.id;
        casoConHechos = {
          ...(casoConHechos || {}),
          respuestas: { ...(casoConHechos?.respuestas || {}), [idPregunta]: valor }
        };
        decision = queProcedimiento(casoConHechos);
        decision.intencionActiva = casoConHechos?.intencion || null;
        if (casoConHechos?.pasajeros) decision.pasajerosActivos = casoConHechos.pasajeros;
        decision.respuestaExtraida = { id: idPregunta, valor };
        decision.respuestasActivas = casoConHechos.respuestas;
      }
    }

    if (!decision.procedimientoId) {
      let explicacion = construirRespuestaDeDecision(decision);
      let diagnostico = '';
      decision.respuestasActivas = casoConHechos?.respuestas || {};
      const textoLibre = consulta && !lectura?.tipo ? consulta : null;
      // La fase determinista del panel llama primero con `conIA:false` y la
      // segunda fase redacta con `conIA:true`. Respetar esta bandera evita
      // gastar cuota dos veces y mantiene visible la respuesta rápida del
      // árbol antes de pedir una explicación larga.
      if (textoLibre && (env.GEMINI_API_KEY || env.GEMINI_ENDPOINT) && cuerpo?.conIA !== false) {
        const redactada = await redactarConGemini({
          env,
          paso: null,
          prompt: buildGeneralCoachPrompt({ consulta: textoLibre, lectura, aprendizajes: aprendizajesPrevios, continuidad })
        });
        if (redactada) {
          explicacion = redactada.texto;
          diagnostico = redactada.diagnostico;
        }
      }
      return {
        decision,
        lectura,
        explicacion,
        diagnostico,
        datosCaso: casoConHechos?.datos || {},
        pasajerosCaso: casoConHechos?.pasajeros || null
      };

      // SIEMPRE pasar por Gemini cuando hay texto de usuario
      const hayTextoLibre = consulta && consulta.trim().length > 0;
      const hayPantalla = casoConHechos && casoConHechos.pantalla;

      if (false && env.GEMINI_API_KEY && (hayTextoLibre || hayPantalla)) {
        try {
          const contextoArbol = decision.siguientePregunta
            ? `\n\nNOTA INTERNA: El árbol de decisión necesita este dato para avanzar: "${decision.siguientePregunta.texto}". Opciones lógicas esperadas: ${(decision.siguientePregunta.opciones || []).map(o => String(o.valor)).join(', ')}. Si el usuario ya lo respondió, extráelo en "respuestaExtraida". Si no, pregúntaselo sutilmente en tu explicación.`
            : '';
          const promptConContexto = buildGeneralCoachPrompt({ consulta: (consulta || '') + contextoArbol, lectura, aprendizajes: aprendizajesPrevios, continuidad });
          const t = await generateTutorText(env.GEMINI_API_KEY, env.GEMINI_MODEL, promptConContexto);
          
          explicacion = t.explicacion;
          diagnostico = t.diagnostico || '';

          // Si Gemini logró extraer la respuesta del texto del usuario, actualizamos el estado y reevaluamos
          if (t.respuestaExtraida !== undefined && t.respuestaExtraida !== null && decision.siguientePregunta) {
            const idPregunta = decision.siguientePregunta.id;
            casoConHechos = { ...casoConHechos, respuestas: { ...(casoConHechos.respuestas || {}), [idPregunta]: t.respuestaExtraida } };
            
            // Re-evaluar el árbol con el nuevo dato
            decision = queProcedimiento(casoConHechos);
            
            // Si el árbol avanzó y ya encontró un procedimiento, salimos del bloque if(!decision.procedimientoId)
            // para que ejecute el paso del manual en la Fase 2 más abajo.
            if (decision.procedimientoId) {
               // Limpiamos la explicación genérica para usar la del manual
               explicacion = null;
            } else if (decision.siguientePregunta) {
               // Avanzó a OTRA pregunta, pero no a un procedimiento. Borramos los botones del UI por este turno.
               delete decision.siguientePregunta;
            }
          } else {
             // Gemini respondió, pero no extrajo nada. Ocultamos los botones crudos para no parecer un IVR.
             if (decision.siguientePregunta) delete decision.siguientePregunta;
          }

        } catch (e) {
          if (!explicacion && decision.siguientePregunta) explicacion = decision.siguientePregunta.texto;
        }
      }

      if (!decision.procedimientoId) {
        if (!explicacion) {
          explicacion = decision.siguientePregunta
            ? decision.siguientePregunta.texto
            : 'Cuéntame qué necesita el pasajero: comprar billete, cambio, reembolso o un servicio — y te guío paso a paso con los comandos exactos del manual.';
        }
        return {
          decision,
          lectura,
          explicacion,
          diagnostico,
          datosCaso: casoConHechos?.datos || {},
          pasajerosCaso: casoConHechos?.pasajeros || null
        };
      }
    }
    id = decision.procedimientoId;
  }

  // 2 · Paso del manual — el comando sale de aquí, nunca del modelo
  const procedimiento = String(id).startsWith('_') ? null : procedimientos[id];
  if (!procedimiento) return { error: 'procedimiento_desconocido', id };

  const datos = datosDeCaso(casoConHechos);
  const yaSeleccionoVuelo = id === 'emision-latam'
    && !!casoConHechos?.disponibilidad
    && !!casoConHechos?.respuestas?.lineaVuelo
    && !!casoConHechos?.respuestas?.clase;
  // La pantalla AN ya fue ejecutada antes de abrir el chat: al elegir lÃ­nea y
  // clase seguimos en la venta, no repetimos la disponibilidad genÃ©rica.
  // MY/MN es un tip opcional. Si la disponibilidad ya fue leída y el alumno
  // eligió vuelo/clase, el siguiente paso real es SS; no mostramos el tip.
  const pasoInicial = yaSeleccionoVuelo && pasoActual === null ? 2 : pasoActual;
  const mostrarPasoInicial = yaSeleccionoVuelo && pasoActual === null;
  const avance = siguientePaso(procedimiento, {
    pasoActual: pasoInicial,
    comandoEscrito: comandoParaValidar,
    datos,
    soloResponder: cuerpo?.soloResponder || mostrarPasoInicial
  });
  const respuesta = { procedimientoId: id, titulo: procedimiento.titulo, decision, lectura, ...avance, datosCaso: datos, pasajerosCaso: casoConHechos?.pasajeros || null, explicacion: null, diagnostico: null };
  const pasajerosDetectados = casoConHechos?.pasajeros;
  const avisoComposicion = pasajerosDetectados
    ? `Composición detectada: ${pasajerosDetectados.ADT} ADT + ${pasajerosDetectados.CHD} CHD + ${pasajerosDetectados.INF} INF = ${pasajerosDetectados.plazas} plazas. El INF no ocupa plaza.`
    : null;
  const avisosContexto = avisoComposicion && !(decision?.avisos || []).some((aviso) => aviso.includes('Composición detectada'))
    ? [avisoComposicion]
    : [];
  respuesta.avisos = [...new Set([...(respuesta.avisos || []), ...avisosContexto])];
  if (avance.veredicto) {
    respuesta.correccion = {
      escrito: comandoParaValidar,
      correcto: Boolean(avance.veredicto.correcto),
      comandoManual: avance.paso?.comando || null,
      motivo: avance.veredicto.motivo || null,
      pista: avance.veredicto.pista || null
    };
  }

  // Si es un ejercicio o procedimiento con fases, adaptarlo como paso para que Gemini genere la tutoría
  let pasoParaTutor = avance.paso;
  if (procedimiento.fases && !pasoParaTutor) {
    const faseIndex = pasoActual === null ? 0 : Math.min(Number(pasoActual), procedimiento.fases.length - 1);
    const f = procedimiento.fases[faseIndex] || procedimiento.fases[0];
    const numFase = f.fase;
    const totalFases = procedimiento.fases.length;
    pasoParaTutor = {
      n: numFase,
      sistema: 'amadeus/resiber',
      proceso: `Paso ${numFase} de ${totalFases}: ${f.nombre}`,
      explicacion: `${f.descripcion}\n• Comandos Amadeus: ${f.comandosAmadeus?.join(' -> ') || 'N/A'}\n• Comandos Resiber: ${f.comandosResiber?.join(' -> ') || 'N/A'}`,
      comando: f.comandosAmadeus?.[0] || null,
      confianza: 'verbatim'
    };
    respuesta.pasoActual = numFase;
    respuesta.siguientePaso = numFase < totalFases ? numFase + 1 : null;
    respuesta.terminado = numFase >= totalFases;
  }

  if (!pasoParaTutor) {
    respuesta.explicacion = procedimiento.resumen || `Procedimiento completado: ${procedimiento.titulo}`;
    return respuesta;
  }

  if (cuerpo?.conIA === false) {
    respuesta.explicacion = construirRespuestaAnclada({
      paso: pasoParaTutor,
      veredicto: avance.veredicto,
      avisos: [...(decision?.avisos || []), ...avisosContexto, ...(avance.avisos || [])],
      saltoDeSistema: avance.saltoDeSistema,
      pregunta: cuerpo?.soloResponder ? consulta : null
    });
    return respuesta;
  }
  if (pasoParaTutor.confianza === 'hueco') { respuesta.explicacion = pasoParaTutor.nota; return respuesta; }

  // 3 · Gemini pone las palabras, anclado al paso
  if (false && env.GEMINI_API_KEY) {
    try {
      const t = await generateTutorText(env.GEMINI_API_KEY, env.GEMINI_MODEL, buildTutorPrompt({
        procedimiento, paso: pasoParaTutor, veredicto: avance.veredicto, avisos: avance.avisos,
        saltoDeSistema: avance.saltoDeSistema, nivel: 'principiante', pregunta: consulta, aprendizajes: aprendizajesPrevios, continuidad
      }));
      respuesta.explicacion = [decision?.avisos?.join(' '), t.explicacion].filter(Boolean).join('\n');
      respuesta.diagnostico = t.diagnostico || null;
    } catch (e) {
      respuesta.explicacion = [decision?.avisos?.join(' '), pasoParaTutor?.explicacion || procedimiento.resumen].filter(Boolean).join('\n');
    }
  } else {
    // Fallback inteligente determinista si no hay GEMINI_API_KEY configurada en el Worker
    respuesta.explicacion = construirRespuestaAnclada({
      paso: pasoParaTutor,
      veredicto: avance.veredicto,
      avisos: [...(decision?.avisos || []), ...avisosContexto, ...(avance.avisos || [])],
      saltoDeSistema: avance.saltoDeSistema,
      pregunta: cuerpo?.soloResponder ? consulta : null
    });
  }
  if ((env.GEMINI_API_KEY || env.GEMINI_ENDPOINT) && cuerpo?.conIA !== false) {
    const redactada = await redactarConGemini({
      env,
      paso: pasoParaTutor,
      prompt: buildTutorPrompt({
        procedimiento,
        paso: pasoParaTutor,
        veredicto: avance.veredicto,
        avisos: avance.avisos,
        saltoDeSistema: avance.saltoDeSistema,
        nivel: 'principiante',
        pregunta: consulta,
        aprendizajes: aprendizajesPrevios,
        continuidad
      })
    });
    if (redactada) {
      respuesta.explicacion = [decision?.avisos?.join(' '), redactada.texto].filter(Boolean).join('\n');
      respuesta.diagnostico = redactada.diagnostico || null;
    }
  }
  if (respuesta.correccion && !respuesta.correccion.correcto && respuesta.correccion.comandoManual) {
    respuesta.explicacion = [
      respuesta.explicacion,
      `Corrección contra el manual: el comando correcto para este paso es ${respuesta.correccion.comandoManual}.`
    ].filter(Boolean).join(' ');
  }
  return respuesta;
}
