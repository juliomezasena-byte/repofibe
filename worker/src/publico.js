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
import { detectarIntencion, extraerPasajeros } from './coach.js';
import { construirRespuestaAnclada, construirRespuestaDeDecision } from './prompts.js';
import procedimientos from './procedimientos.generated.json' with { type: 'json' };

const dia = () => new Date().toISOString().slice(0, 10);
const DOS_DIAS = 172800; // TTL en KV: se limpia solo

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

/**
 * Consume un cupo del coach público. Dos frenos:
 *   · por IP: para que un solo abusador no agote el techo de todos
 *   · global: el tope que de verdad acota la factura de Gemini del día
 * @returns {Promise<{allowed:boolean, motivo?:string, mensaje?:string}>}
 */
export async function consumirCupoPublico(kv, ip, env) {
  const hoy = dia();
  const capIp = Number(env.PUBLIC_DAILY_IP_CAP || 40);
  const capGlobal = Number(env.PUBLIC_DAILY_GLOBAL_CAP || 400);

  const kGlobal = `pub:global:${hoy}`;
  const kIp = `pub:ip:${ip}:${hoy}`;

  const [gRaw, iRaw] = await Promise.all([kv.get(kGlobal), kv.get(kIp)]);
  const g = Number(gRaw || 0);
  const i = Number(iRaw || 0);

  if (g >= capGlobal) {
    return { allowed: false, motivo: 'tope_global', mensaje: 'El asistente alcanzó su límite de consultas por hoy. Inténtalo mañana.' };
  }
  if (i >= capIp) {
    return { allowed: false, motivo: 'tope_ip', mensaje: 'Has alcanzado tu límite de consultas por hoy. Inténtalo mañana.' };
  }

  await Promise.all([
    kv.put(kGlobal, String(g + 1), { expirationTtl: DOS_DIAS }),
    kv.put(kIp, String(i + 1), { expirationTtl: DOS_DIAS })
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
  const consulta = cuerpo?.consulta || cuerpo?.texto || cuerpo?.mensaje || null;

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
  if (env.ROLEPLAY_KV) {
    try {
      const memRaw = await env.ROLEPLAY_KV.get('memoria:aprendizajes');
      if (memRaw) aprendizajesPrevios = JSON.parse(memRaw);
    } catch (e) { /* fallback silencioso */ }
  }

  // Si el usuario da una orden explícita de aprendizaje/corrección
  if (consulta && typeof consulta === 'string') {
    const cLower = consulta.toLowerCase();
    const esOrdenAprendizaje = cLower.includes('recuerda que') || cLower.includes('aprende que') ||
      cLower.includes('toma nota') || cLower.includes('no, se hace asi') || cLower.includes('no, se hace así') ||
      cLower.includes('corrección:') || cLower.includes('corregir:');

    if (esOrdenAprendizaje && env.ROLEPLAY_KV) {
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

  let id = procedimientoId;
  let decision = null;
  if (!id) {
    let encaminadoPor = null;
    if (consulta && !(casoConHechos && casoConHechos.intencion)) {
      const intuido = detectarIntencion(consulta);
      if (intuido) {
        casoConHechos = { ...(casoConHechos || {}), intencion: intuido.intencion };
        encaminadoPor = intuido.comoLoSe;
      }
    }
    decision = casoConHechos ? queProcedimiento(casoConHechos) : { procedimientoId: null };
    if (encaminadoPor && decision) decision.encaminadoPor = encaminadoPor;
    // Sin estado en el worker: se devuelve la intención para que el cliente la
    // reenvíe y el árbol no vuelva a preguntar "¿qué necesita?" en cada botón.
    if (decision) decision.intencionActiva = casoConHechos?.intencion || null;

    if (!decision.procedimientoId) {
      let explicacion = decision.avisos?.length ? decision.avisos.join(' ') : null;
      let diagnostico = '';

      // SIEMPRE pasar por Gemini cuando hay texto de usuario
      const hayTextoLibre = consulta && consulta.trim().length > 0;
      const hayPantalla = casoConHechos && casoConHechos.pantalla;

      if (env.GEMINI_API_KEY && (hayTextoLibre || hayPantalla)) {
        try {
          const contextoArbol = decision.siguientePregunta
            ? `\n\nNOTA INTERNA: El árbol de decisión necesita este dato para avanzar: "${decision.siguientePregunta.texto}". Opciones lógicas esperadas: ${(decision.siguientePregunta.opciones || []).map(o => String(o.valor)).join(', ')}. Si el usuario ya lo respondió, extráelo en "respuestaExtraida". Si no, pregúntaselo sutilmente en tu explicación.`
            : '';
          const promptConContexto = buildGeneralCoachPrompt({ consulta: (consulta || '') + contextoArbol, lectura, aprendizajes: aprendizajesPrevios });
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
        return { decision, lectura, explicacion, diagnostico };
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
  const pasoInicial = yaSeleccionoVuelo && pasoActual === null ? 1.3 : pasoActual;
  const avance = siguientePaso(procedimiento, { pasoActual: pasoInicial, comandoEscrito, datos, soloResponder: cuerpo?.soloResponder });
  const respuesta = { procedimientoId: id, titulo: procedimiento.titulo, decision, lectura, ...avance, explicacion: null, diagnostico: null };

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
    respuesta.explicacion = [decision?.avisos?.join(' '), pasoParaTutor.explicacion].filter(Boolean).join('\n') || procedimiento.resumen || null;
    return respuesta;
  }
  if (pasoParaTutor.confianza === 'hueco') { respuesta.explicacion = pasoParaTutor.nota; return respuesta; }

  // 3 · Gemini pone las palabras, anclado al paso
  if (env.GEMINI_API_KEY) {
    try {
      const t = await generateTutorText(env.GEMINI_API_KEY, env.GEMINI_MODEL, buildTutorPrompt({
        procedimiento, paso: pasoParaTutor, veredicto: avance.veredicto, avisos: avance.avisos,
        saltoDeSistema: avance.saltoDeSistema, nivel: 'principiante', pregunta: consulta, aprendizajes: aprendizajesPrevios
      }));
      respuesta.explicacion = [decision?.avisos?.join(' '), t.explicacion].filter(Boolean).join('\n');
      respuesta.diagnostico = t.diagnostico || null;
    } catch (e) {
      respuesta.explicacion = [decision?.avisos?.join(' '), pasoParaTutor?.explicacion || procedimiento.resumen].filter(Boolean).join('\n');
    }
  } else {
    // Fallback inteligente determinista si no hay GEMINI_API_KEY configurada en el Worker
    respuesta.explicacion = [decision?.avisos?.join(' '), pasoParaTutor?.explicacion || procedimiento.resumen].filter(Boolean).join('\n');
  }
  return respuesta;
}
