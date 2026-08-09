import { verifyFirebaseIdToken } from './auth.js';
import { checkAndConsumeQuota, todayKey } from './quota.js';
import { buildPassengerSystemPrompt, buildEvaluationPrompt, buildTutorPrompt } from './prompts.js';
import { generatePassengerReply, generateEvaluation, generateTutorText } from './gemini.js';
import { queProcedimiento } from './arbol.js';
import { siguientePaso } from './tutor.js';
import { leerPantalla, fusionarEnCaso } from './pantalla.js';
import scenarios from './scenarios.generated.json';
import procedimientos from './procedimientos.generated.json';

function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };
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
async function handleTutorPaso(request, env) {
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
  const pegadas = [caso?.pantalla, ...(caso?.pantallas || [])].filter(Boolean);
  for (const texto of pegadas) {
    const l = leerPantalla(texto);
    casoConHechos = fusionarEnCaso(casoConHechos, l);
    // Al panel se le devuelve la ÚLTIMA que aportó algo: es la que el alumno
    // acaba de pegar y quiere ver confirmada.
    if (l.tipo || !lectura) lectura = l;
  }

  // 1 · ¿Qué procedimiento? O lo dice el cliente, o lo decide el árbol.
  let id = procedimientoId;
  let decision = null;
  if (!id) {
    if (!casoConHechos) {
      return new Response(JSON.stringify({ error: 'bad_request', detalle: 'Hace falta procedimientoId o caso.' }),
        { status: 400, headers: corsHeaders(env) });
    }
    decision = queProcedimiento(casoConHechos);
    // El árbol necesita más información: se devuelve la pregunta, sin gastar IA.
    if (!decision.procedimientoId) {
      return new Response(JSON.stringify({ decision, lectura }), { status: 200, headers: corsHeaders(env) });
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
  const avance = siguientePaso(procedimiento, { pasoActual, comandoEscrito, datos });

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

  // Primera fase: todo lo determinista, sin esperar al modelo ni gastar cuota.
  // Lo que el alumno necesita para seguir —qué paso toca, qué comando, si lo
  // escribió bien— ya está decidido aquí.
  if (!conIA) {
    respuesta.explicacion = avance.paso.explicacion || null;
    respuesta.pendienteDeExplicacion = true;
    return new Response(JSON.stringify(respuesta), { status: 200, headers: corsHeaders(env) });
  }

  // 3 · Solo ahora se gasta cuota y se pide redacción.
  const quota = await checkAndConsumeQuota(env.ROLEPLAY_KV, uid, todayKey(), Number(env.DAILY_QUOTA));
  if (!quota.allowed) {
    // Sin IA el tutor sigue sirviendo: el paso y el comando ya están.
    respuesta.explicacion = avance.paso.explicacion || null;
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
      nivel
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
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(env) });
    }

    const url = new URL(request.url);
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
