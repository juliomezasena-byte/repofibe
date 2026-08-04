import { verifyFirebaseIdToken } from './auth.js';
import { checkAndConsumeQuota, todayKey } from './quota.js';
import { buildPassengerSystemPrompt, buildEvaluationPrompt } from './prompts.js';
import { generatePassengerReply, generateEvaluation } from './gemini.js';
import scenarios from './scenarios.generated.json';

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
      return new Response(JSON.stringify({ error: 'not_found' }), { status: 404, headers: corsHeaders(env) });
    } catch (err) {
      console.error('Worker Request Error:', err.message, err.stack);
      const status = /token|Authorization|Issuer|Audience|expirado|uid/i.test(err.message) ? 401 : 500;
      return new Response(JSON.stringify({ error: err.message }), { status, headers: corsHeaders(env) });
    }
  }
};
