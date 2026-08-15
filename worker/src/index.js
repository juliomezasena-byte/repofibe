import { verifyFirebaseIdToken } from './auth.js';
import { checkAndConsumeQuota, todayKey } from './quota.js';
import { buildPassengerSystemPrompt, buildEvaluationPrompt, buildTutorPrompt, buildGeneralCoachPrompt, construirRespuestaAnclada, construirRespuestaDeDecision } from './prompts.js';
import { generatePassengerReply, generateEvaluation, generateTutorText } from './gemini.js';
import { queProcedimiento } from './arbol.js';
import { siguientePaso } from './tutor.js';
import { leerPantalla, fusionarEnCaso } from './pantalla.js';
import { detectarIntencion } from './coach.js';
import { consumirCupoPublico, responderCoachPublico } from './publico.js';
import scenarios from './scenarios.generated.json';
import procedimientos from './procedimientos.generated.json';
import { enriquecerRespuestaLab } from './caso.js';

function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };
}

// El coach público lo llama una página distinta (hyntibia) y no lleva datos
// sensibles: los manuales quedan en el servidor y la respuesta ya va anclada.
// Por eso su CORS es abierto; el gasto lo frena el tope, no el origen.
function corsPublico(env, request = null) {
  const origen = request?.headers.get('Origin') || '';
  const permitidos = String(env.PUBLIC_ALLOWED_ORIGINS || 'https://hyntibia.com.co,https://yntibia-tutor-lab.web.app,https://simulador-3362613.web.app')
    .split(',').map((valor) => valor.trim()).filter(Boolean);
  const origenPermitido = permitidos.includes(origen) ? origen : permitidos[0];
  return {
    'Access-Control-Allow-Origin': origenPermitido,
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Bot-Clave',
    'Content-Type': 'application/json'
  };
}

/**
 * Coach público: sin login, tras la clave, con techo de gasto.
 * El token (el hash de la clave, ya público en la página) solo filtra
 * escáneres que no la abrieron; el tope diario es la protección de verdad.
 */
async function handleCoachPublico(request, env) {
  const cors = corsPublico(env, request);
  if (env.PUBLIC_BOT_HASH && env.PUBLIC_REQUIRE_BOT_KEY === 'true' && request.headers.get('X-Bot-Clave') !== env.PUBLIC_BOT_HASH) {
    return new Response(JSON.stringify({ error: 'bot_key_required' }), { status: 403, headers: cors });
  }

  const ip = request.headers.get('CF-Connecting-IP') || 'sin-ip';
  const cupo = await consumirCupoPublico(env.ROLEPLAY_KV, ip, env);
  if (!cupo.allowed) {
    return new Response(JSON.stringify({ error: cupo.motivo, explicacion: cupo.mensaje }), { status: 429, headers: cors });
  }

  // Algunos clientes del widget envían el cuerpo como JSON válido pero con
  // un Content-Type inconsistente. Leer el texto una sola vez y parsearlo
  // explícitamente evita que el tutor caiga silenciosamente en el estado de
  // entrada genérico por tratar la consulta como si no existiera.
  const cuerpo = await request.text()
    .then((texto) => {
      if (!texto.trim()) return {};
      try { return JSON.parse(texto); } catch { return {}; }
    })
    .catch(() => ({}));
  const resultado = await responderCoachPublico(cuerpo, env);
  const status = resultado?.error === 'procedimiento_desconocido' ? 404
    : resultado?.error === 'step_state_mismatch' ? 409
    : 200;
  const respuesta = env.ENVIRONMENT === 'lab' ? enriquecerRespuestaLab(cuerpo, resultado) : resultado;
  return new Response(JSON.stringify(respuesta), { status, headers: cors });
}

function findScenario(scenarioId) {
  const scenario = scenarios.find((s) => s.id === scenarioId);
  if (!scenario) throw new Error(`Escenario desconocido: ${scenarioId}`);
  return scenario;
}

async function authenticate(request, env) {
  const authHeader = request.headers.get('Authorization') || '';
  const idToken = authHeader.replace('Bearer ', '').trim();
  if (!idToken || idToken === 'undefined' || idToken === 'null') {
    throw new Error('Token de autenticación faltante o inválido. Por favor vuelve a iniciar sesión.');
  }
  return verifyFirebaseIdToken(idToken, env.FIREBASE_PROJECT_ID);
}

async function handleTurn(request, env) {
  const { uid } = await authenticate(request, env);

  const { scenarioId, history } = await request.json();
  if (!scenarioId || !Array.isArray(history)) {
    return new Response(JSON.stringify({ error: 'bad_request' }), { status: 400, headers: corsHeaders(env) });
  }
  if (history.length >= Number(env.MAX_TURNS)) {
    return new Response(JSON.stringify({ error: 'max_turns_reached' }), { status: 400, headers: corsHeaders(env) });
  }
  const scenario = findScenario(scenarioId);

  const quota = await checkAndConsumeQuota(env.ROLEPLAY_KV, uid, todayKey(), Number(env.DAILY_QUOTA));
  if (!quota.allowed) {
    return new Response(JSON.stringify({ error: 'quota_exceeded' }), { status: 429, headers: corsHeaders(env) });
  }

  const systemPrompt = buildPassengerSystemPrompt(scenario);
  const passengerReply = await generatePassengerReply(env.GEMINI_API_KEY, env.GEMINI_MODEL, systemPrompt, history);

  return new Response(JSON.stringify({ passengerReply }), { status: 200, headers: corsHeaders(env) });
}

async function handleEvaluate(request, env) {
  const { uid } = await authenticate(request, env);
  void uid;

  const { scenarioId, transcript } = await request.json();
  if (!scenarioId || !Array.isArray(transcript)) {
    return new Response(JSON.stringify({ error: 'bad_request' }), { status: 400, headers: corsHeaders(env) });
  }

  const scenario = findScenario(scenarioId);
  const prompt = buildEvaluationPrompt(scenario, transcript);
  const evaluation = await generateEvaluation(env.GEMINI_API_KEY, env.GEMINI_MODEL, prompt);

  return new Response(JSON.stringify(evaluation), { status: 200, headers: corsHeaders(env) });
}

/**
 * El tutor. El orden importa y es el que hace que no alucine:
 *
 *   1. JS decide QUÉ procedimiento aplica      (arbol.js)
 *   2. JS decide QUÉ paso toca y el COMANDO    (tutor.js, desde el manual)
 *   3. Gemini SOLO redacta el porqué           (responseSchema de 2 campos)
 *
 * Si el paso es `hueco`, se corta ANTES del punto 3: no se le pregunta a la
 * IA por algo que no está en el material.
 */
/**
 * Tutor autenticado: usa el mismo cerebro conversacional que el coach de
 * HyntibIA, pero conserva el filtro de Firebase y la cuota por usuario.
 *
 * Antes existía otra implementación paralela aquí. Esa copia se quedó atrás:
 * para una pregunta libre devolvía la primera pregunta del árbol (el menú
 * "¿qué necesita el pasajero?") y el código que llamaba a Gemini estaba
 * después de un return inalcanzable. Unificamos la ruta para que Pratika y
 * HyntibIA decidan con los mismos manuales, extractores y reglas de seguridad.
 */
async function handleTutorPaso(request, env) {
  const { uid } = await authenticate(request, env);
  const cuerpo = await request.json().catch(() => ({}));
  const pideIA = cuerpo?.conIA !== false;
  let cuota = null;

  if (pideIA && env.GEMINI_API_KEY) {
    cuota = await checkAndConsumeQuota(
      env.ROLEPLAY_KV,
      uid,
      todayKey(),
      Number(env.DAILY_QUOTA || 20)
    );
  }

  const resultado = await responderCoachPublico(
    { ...cuerpo, conIA: pideIA && (cuota ? cuota.allowed : true) },
    env
  );

  if (cuota && !cuota.allowed) {
    resultado.avisos = [
      ...(resultado.avisos || []),
      'Límite diario de redacción alcanzado. El paso y el comando siguen saliendo del manual; continúa en modo determinista.'
    ];
  }

  const status = resultado?.error === 'procedimiento_desconocido' ? 404
    : resultado?.error === 'step_state_mismatch' ? 409
    : 200;
  return new Response(JSON.stringify(resultado), { status, headers: corsHeaders(env) });
}

// Conservamos la implementación histórica durante esta transición para que
// el diff sea reversible y para no perder la documentación inline del flujo
// determinista. La ruta activa usa la función unificada anterior.
async function handleTutorPasoLegacy(request, env) {
  const { uid } = await authenticate(request, env);

  const cuerpo = await request.json();
  const {
    procedimientoId, pasoActual = null, comandoEscrito = null, datos = {},
    caso = null, nivel = 'principiante',
    // `conIA: false` devuelve SOLO lo determinista y no espera al modelo.
    // El panel pide primero así —el paso, el comando y el veredicto ya están
    // decididos en JS y aparecen al instante— y luego repite la petición con
    // `conIA: true` para rellenar la explicación cuando llegue. Antes había
    // que esperar a Gemini para ver un "Correcto" que ya se sabía.
    conIA = true
  } = cuerpo;

  // 0 · Si ha pegado una pantalla, se lee ANTES de preguntarle nada. Leerla
  //     puede ahorrarle tres preguntas: el billete ya dice si algo está
  //     volado, qué familia es y qué placa lleva.
  //     Se admiten varias: un caso real necesita el billete Y el histórico, y
  //     el alumno los pega de uno en uno. El cliente las reenvía todas en
  //     cada petición, así que releerlas aquí es lo que mantiene los hechos
  //     vivos entre pregunta y pregunta.
  let lectura = null;
  let casoConHechos = caso;
  // `caso.pantalla` es de un solo uso (lo que acaba de salir en la Terminal).
  // `caso.pantallas` son las que el alumno pegó a mano y se conservan.
  const pegadas = (caso?.pantallas || []).filter(Boolean);
  const suelta = caso?.pantalla || null;

  for (const texto of pegadas) {
    const l = leerPantalla(texto);
    casoConHechos = fusionarEnCaso(casoConHechos, l);
    // Al panel se le devuelve la ÚLTIMA que aportó algo: es la que el alumno
    // acaba de pegar y quiere ver confirmada.
    if (l.tipo || !lectura) lectura = l;
  }

  if (suelta) {
    const l = leerPantalla(suelta);
    casoConHechos = fusionarEnCaso(casoConHechos, l);
    // Si la salida de la Terminal SÍ es una pantalla útil (un DTR:TN, un RT),
    // se aprovecha. Si no lo es —una AN, un mensaje de error— se ignora en
    // silencio: el alumno no ha pegado nada, solo ha ejecutado un comando, y
    // regañarle con "no reconozco esa pantalla" sería ruido en cada paso.
    if (l.tipo) lectura = l;
  }

  // 1 · ¿Qué procedimiento? O lo dice el cliente, o lo decide el árbol.
  let id = procedimientoId;
  let decision = null;
  if (!id) {
    const consultaTexto = cuerpo.consulta || cuerpo.texto || cuerpo.mensaje || null;

    // Encaminar desde el texto libre ANTES de que el árbol pregunte. Si el
    // alumno escribió "quiere cambiar la fecha", eso YA es la intención y nos
    // saltamos la primera pregunta. Es determinista (coach.js), no IA.
    let encaminadoPor = null;
    if (consultaTexto && !(casoConHechos && casoConHechos.intencion)) {
      const intuido = detectarIntencion(consultaTexto);
      if (intuido) {
        casoConHechos = { ...(casoConHechos || {}), intencion: intuido.intencion };
        encaminadoPor = intuido.comoLoSe;
      }
    }

    decision = casoConHechos ? queProcedimiento(casoConHechos) : { procedimientoId: null };
    if (encaminadoPor && decision) decision.encaminadoPor = encaminadoPor;
    // El worker es SIN ESTADO: si la intención se dedujo del texto, hay que
    // devolverla para que el cliente la reenvíe en el próximo turno. Sin esto,
    // al pulsar el siguiente botón el árbol vuelve a preguntar "¿qué necesita?".
    if (decision) decision.intencionActiva = casoConHechos?.intencion || null;

    if (!decision.procedimientoId) {
      // El coach honesto SOLO habla cuando el árbol no está ya esperando un
      // dato (siguientePregunta). Si el árbol pregunta, esa pregunta ES la
      // respuesta — el panel la pinta como botones. El coach nunca da comandos.
      const debeResponderCoach = false;
      if (debeResponderCoach) {
        const prompt = buildGeneralCoachPrompt({ consulta: consultaTexto, lectura });
        const quota = await checkAndConsumeQuota(env.ROLEPLAY_KV, uid, todayKey(), Number(env.DAILY_QUOTA));
        if (quota.allowed) {
          try {
            const resIA = await generateTutorText(env.GEMINI_API_KEY, env.GEMINI_MODEL, prompt);
            return new Response(JSON.stringify({
              decision,
              lectura,
              explicacion: resIA.explicacion || '👋 ¡Hola! Soy tu coach. ¿Qué necesita el pasajero: comprar, cambiar, reembolso o un servicio?',
              diagnostico: resIA.diagnostico || '',
              datosCaso: casoConHechos?.datos || {},
              pasajerosCaso: casoConHechos?.pasajeros || null
            }), { status: 200, headers: corsHeaders(env) });
          } catch (e) { /* si la IA falla, cae a la respuesta determinista */ }
        }
      }
      return new Response(JSON.stringify({
        decision,
        lectura,
        explicacion: construirRespuestaDeDecision(decision),
        diagnostico: '',
        datosCaso: casoConHechos?.datos || {},
        pasajerosCaso: casoConHechos?.pasajeros || null
      }), { status: 200, headers: corsHeaders(env) });
    }
    id = decision.procedimientoId;
  }

  // Las claves `_*` del bundle son tablas de referencia, no procedimientos:
  // no se pueden recorrer paso a paso.
  const procedimiento = String(id).startsWith('_') ? null : procedimientos[id];
  if (!procedimiento) {
    return new Response(JSON.stringify({ error: 'procedimiento_desconocido', id }),
      { status: 404, headers: corsHeaders(env) });
  }

  // 2 · Qué paso toca. El comando sale de aquí, nunca del modelo.
  //     `soloResponder`: el alumno preguntó sobre el paso actual → no avanza.
  const avance = siguientePaso(procedimiento, { pasoActual, comandoEscrito, datos, soloResponder: cuerpo.soloResponder });

  const respuesta = {
    procedimientoId: id,
    titulo: procedimiento.titulo,
    decision,
    lectura,
    ...avance,
    explicacion: null,
    diagnostico: null
  };

  if (avance.terminado || !avance.paso) {
    return new Response(JSON.stringify(respuesta), { status: 200, headers: corsHeaders(env) });
  }

  // Un hueco se devuelve tal cual: no se le pregunta a la IA por lo que
  // el material no tiene.
  if (avance.paso.confianza === 'hueco') {
    respuesta.explicacion = avance.paso.nota;
    return new Response(JSON.stringify(respuesta), { status: 200, headers: corsHeaders(env) });
  }

  // La respuesta visible del tutor siempre queda anclada al paso ya elegido.
  // Gemini se reserva para roleplay/evaluaciÃ³n; no puede crear transacciones.
  respuesta.explicacion = construirRespuestaAnclada({
    paso: avance.paso,
    veredicto: avance.veredicto,
    avisos: [...(decision?.avisos || []), ...(avance.avisos || [])],
    saltoDeSistema: avance.saltoDeSistema
  });
  return new Response(JSON.stringify(respuesta), { status: 200, headers: corsHeaders(env) });

  // Primera fase: todo lo determinista, sin esperar al modelo ni gastar cuota.
  // Lo que el alumno necesita para seguir —qué paso toca, qué comando, si lo
  // escribió bien— ya está decidido aquí.
  if (!conIA) {
    respuesta.explicacion = construirRespuestaAnclada({ paso: avance.paso, veredicto: avance.veredicto, avisos: [...(decision?.avisos || []), ...(avance.avisos || [])], saltoDeSistema: avance.saltoDeSistema });
    respuesta.pendienteDeExplicacion = true;
    return new Response(JSON.stringify(respuesta), { status: 200, headers: corsHeaders(env) });
  }

  // 3 · Solo ahora se gasta cuota y se pide redacción.
  const quota = await checkAndConsumeQuota(env.ROLEPLAY_KV, uid, todayKey(), Number(env.DAILY_QUOTA));
  if (!quota.allowed) {
    // Sin IA el tutor sigue sirviendo: el paso y el comando ya están.
    respuesta.explicacion = construirRespuestaAnclada({ paso: avance.paso, veredicto: avance.veredicto, avisos: [...(decision?.avisos || []), ...(avance.avisos || [])], saltoDeSistema: avance.saltoDeSistema });
    respuesta.avisos = [...(respuesta.avisos || []), 'Cuota diaria agotada: te doy el paso del manual sin explicación redactada.'];
    return new Response(JSON.stringify(respuesta), { status: 200, headers: corsHeaders(env) });
  }

  try {
    const prompt = buildTutorPrompt({
      procedimiento,
      paso: avance.paso,
      veredicto: avance.veredicto,
      avisos: avance.avisos,
      saltoDeSistema: avance.saltoDeSistema,
      nivel,
      // Si el alumno escribió una pregunta libre en medio del paso, se contesta
      // anclada al contexto del manual — nunca inventando.
      pregunta: cuerpo.consulta || cuerpo.texto || cuerpo.mensaje || null
    });
    const texto = await generateTutorText(env.GEMINI_API_KEY, env.GEMINI_MODEL, prompt);
    respuesta.explicacion = texto.explicacion;
    respuesta.diagnostico = texto.diagnostico || null;
  } catch (err) {
    // La IA es un adorno: si falla, el paso del manual sigue siendo válido.
    console.error('Tutor: falló la redacción:', err.message);
    respuesta.explicacion = avance.paso.explicacion || null;
    respuesta.avisos = [...(respuesta.avisos || []), 'No pude redactar la explicación; te doy la del manual.'];
  }

  return new Response(JSON.stringify(respuesta), { status: 200, headers: corsHeaders(env) });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // El coach público (hyntibia) tiene su propio CORS abierto — es una página
    // distinta y pública. El resto sigue atado al origen del simulador.
    const esPublico = url.pathname === '/coach/publico';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: esPublico ? corsPublico(env, request) : corsHeaders(env) });
    }

    try {
      if (request.method === 'POST' && url.pathname === '/roleplay/turn') {
        return await handleTurn(request, env);
      }
      if (request.method === 'POST' && url.pathname === '/roleplay/evaluate') {
        return await handleEvaluate(request, env);
      }
      if (request.method === 'POST' && url.pathname === '/tutor/paso') {
        return await handleTutorPaso(request, env);
      }
      if (request.method === 'POST' && esPublico) {
        return await handleCoachPublico(request, env);
      }
      return new Response(JSON.stringify({ error: 'not_found' }), { status: 404, headers: corsHeaders(env) });
    } catch (err) {
      console.error('Worker Request Error:', err.message, err.stack);
      // El error dice su propio código si lo sabe (ErrorDeAutenticacion → 401).
      // La expresión regular queda solo de red de seguridad para los `throw new
      // Error(...)` sueltos que aún clasifican por texto; adivinar el código
      // leyendo el mensaje es lo que convertía un token inválido en un 500.
      const status = err.status
        || (/token|Authorization|Issuer|Audience|expirado|uid/i.test(err.message) ? 401 : 500);
      return new Response(JSON.stringify({ error: err.message }), { status, headers: corsHeaders(env) });
    }
  }
};
