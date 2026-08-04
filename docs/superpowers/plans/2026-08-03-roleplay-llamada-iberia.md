# Roleplay de Llamada con IA (Iberia) — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir un módulo de práctica de llamada telefónica donde Gemini (free tier) hace de pasajero usando los escenarios existentes, embebido junto al Terminal Amadeus real, con un Cloudflare Worker gratuito que esconde la API key y aplica cuota diaria por usuario.

**Architecture:** Dos subsistemas. (1) `worker/` — Cloudflare Worker independiente que verifica el ID token de Firebase, aplica cuota diaria en KV, y llama a Gemini con prompts construidos server-side a partir de una copia generada de `scenarios.json`. (2) Frontend — nueva página `Roleplay.jsx` que reutiliza `<Terminal>` sin modificarlo y añade `<RoleplayPanel>` (chat + voz) que habla con el Worker. La corrección técnica del PNR sigue evaluándose 100% localmente con `EvaluationEngine.js` (sin cambios); Gemini solo evalúa comunicación.

**Tech Stack:** Cloudflare Workers + Workers KV, `jose` (verificación JWT), Gemini API REST (`gemini-2.0-flash`), React 19 + Web Speech API (`SpeechRecognition`/`speechSynthesis`), Firebase Auth/Firestore (ya en el proyecto), Playwright para E2E.

**Spec:** `docs/superpowers/specs/2026-08-03-roleplay-llamada-iberia-design.md`

---

## Convenciones de este repo (léelo antes de empezar)

- No hay Jest/Vitest. Las pruebas de lógica pura son scripts Node planos con contador pass/fail y `process.exit(1)` si algo falla — mismo patrón que `scripts/test-parser.js`. Este plan sigue ese estilo tanto en `scripts/` (raíz) como en `worker/scripts/`.
- Componentes React no tienen pruebas unitarias en este repo; se verifican con Playwright E2E (`e2e/*.spec.js`) y QA manual — este plan hace lo mismo para `RoleplayPanel`/`Roleplay`.
- `.env` y `.env.local` ya están en `.gitignore`. Nunca commitear claves.

---

## Fase 0 — Prerrequisitos manuales (el usuario, no el agente)

- [ ] **Paso 0.1: Obtener la API key de Gemini**

Ir a https://aistudio.google.com, generar una API key gratuita. Guardarla, se usará en el Paso 8.

- [ ] **Paso 0.2: Crear cuenta de Cloudflare**

Ir a https://dash.cloudflare.com/sign-up (gratis, sin tarjeta).

---

## Fase 1 — Cloudflare Worker (backend)

### Task 1: Scaffold del Worker

**Files:**
- Create: `worker/package.json`
- Create: `worker/wrangler.toml`
- Create: `worker/.gitignore`

- [ ] **Step 1: Crear `worker/package.json`**

```json
{
  "name": "roleplay-worker",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "test": "node scripts/test-prompts.js && node scripts/test-quota.js && node scripts/test-auth-claims.js"
  },
  "devDependencies": {
    "wrangler": "^4.0.0"
  },
  "dependencies": {
    "jose": "^5.9.6"
  }
}
```

- [ ] **Step 2: Crear `worker/wrangler.toml`**

```toml
name = "roleplay-iberia-worker"
main = "src/index.js"
compatibility_date = "2025-01-01"

[[kv_namespaces]]
binding = "ROLEPLAY_KV"
id = "REEMPLAZAR_DESPUES_DE_CREAR_EL_NAMESPACE"

[vars]
FIREBASE_PROJECT_ID = "simulador-3362613"
GEMINI_MODEL = "gemini-2.0-flash"
DAILY_QUOTA = "20"
MAX_TURNS = "8"
ALLOWED_ORIGIN = "https://simulador-3362613.web.app"
```

- [ ] **Step 3: Crear `worker/.gitignore`**

```
node_modules/
.wrangler/
.dev.vars
```

- [ ] **Step 4: Instalar dependencias**

Run: `cd worker && npm install`
Expected: crea `worker/node_modules` y `worker/package-lock.json` sin errores.

- [ ] **Step 5: Commit**

```bash
git add worker/package.json worker/wrangler.toml worker/.gitignore
git commit -m "chore(worker): scaffold del Cloudflare Worker de roleplay"
```

---

### Task 2: Generar la copia de escenarios (server-side, no confiar en el cliente)

**Files:**
- Create: `worker/scripts/sync-scenarios.mjs`
- Create (generado, se commitea): `worker/src/scenarios.generated.json`

- [ ] **Step 1: Escribir el script de sincronización**

`worker/scripts/sync-scenarios.mjs`:
```js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = path.join(__dirname, '../../public/profiles/amadeus/scenarios.json');
const outPath = path.join(__dirname, '../src/scenarios.generated.json');

const raw = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

if (!Array.isArray(raw.scenarios) || raw.scenarios.length === 0) {
  console.error('[FAIL] scenarios.json no tiene un array "scenarios" con elementos.');
  process.exit(1);
}

const minimal = raw.scenarios.map((s) => {
  if (!s.id || !s.title || !s.description) {
    throw new Error(`Escenario incompleto (falta id/title/description): ${JSON.stringify(s)}`);
  }
  return { id: s.id, title: s.title, description: s.description };
});

fs.writeFileSync(outPath, JSON.stringify(minimal, null, 2) + '\n');
console.log(`[OK] ${minimal.length} escenarios sincronizados en scenarios.generated.json`);
```

- [ ] **Step 2: Ejecutarlo y verificar el output**

Run: `cd worker && node scripts/sync-scenarios.mjs`
Expected: `[OK] N escenarios sincronizados...` y aparece `worker/src/scenarios.generated.json` con un array de objetos `{id, title, description}`.

- [ ] **Step 3: Commit**

```bash
git add worker/scripts/sync-scenarios.mjs worker/src/scenarios.generated.json
git commit -m "feat(worker): script de sincronizacion de escenarios + copia generada"
```

**Nota:** re-ejecutar `node scripts/sync-scenarios.mjs` cada vez que `public/profiles/amadeus/scenarios.json` cambie, y commitear el resultado.

---

### Task 3: Módulo de prompts (TDD)

**Files:**
- Create: `worker/src/prompts.js`
- Test: `worker/scripts/test-prompts.js`

- [ ] **Step 1: Escribir el test que falla**

`worker/scripts/test-prompts.js`:
```js
import { buildPassengerSystemPrompt, buildEvaluationPrompt, RUBRIC } from '../src/prompts.js';

let passed = 0;
let failed = 0;

function check(name, condition) {
  if (condition) {
    console.log(`[PASS] ${name}`);
    passed++;
  } else {
    console.error(`[FAIL] ${name}`);
    failed++;
  }
}

console.log('--- TEST RUNNER: prompts ---');

const scenario = { id: 'scenario-1', title: 'Nivel 1', description: 'El cliente llama desde México pidiendo un vuelo a Santo Domingo.' };

const passengerPrompt = buildPassengerSystemPrompt(scenario);
check('incluye la descripcion del escenario', passengerPrompt.includes(scenario.description));
check('instruye responder en español', /español/i.test(passengerPrompt));
check('instruye no revelar comandos técnicos', /comandos? técnicos?/i.test(passengerPrompt));

const transcript = [
  { role: 'agent', text: 'Iberia, buenos días, ¿en qué puedo ayudarle?' },
  { role: 'passenger', text: 'Quiero saber el estado de mi vuelo.' }
];
const evalPrompt = buildEvaluationPrompt(scenario, transcript);
check('el prompt de evaluación incluye la transcripción', evalPrompt.includes('Quiero saber el estado de mi vuelo.'));
check('el prompt de evaluación menciona los 5 pasos del guion corporativo', RUBRIC.every((c) => evalPrompt.includes(c.name)));
check('RUBRIC tiene exactamente los 5 pasos del guion corporativo', RUBRIC.length === 5);

console.log(`\nResultados: ${passed} pasados, ${failed} fallidos.`);
if (failed > 0) process.exit(1);
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `cd worker && node scripts/test-prompts.js`
Expected: `Error [ERR_MODULE_NOT_FOUND]` porque `src/prompts.js` no existe todavía.

- [ ] **Step 3: Implementar `worker/src/prompts.js`**

```js
export const RUBRIC = [
  { name: 'Saludo', description: 'Saluda al pasajero apropiadamente al contestar la llamada (identifica la aerolínea, cortesía profesional).' },
  { name: 'Pedir nombre', description: 'Pregunta el nombre del pasajero.' },
  { name: 'Parafraseo usando el nombre', description: 'Repite o parafrasea lo que dijo el pasajero, dirigiéndose a él/ella por su nombre.' },
  { name: 'Verbalizar ayuda y pedir código de reserva y apellido', description: 'Ofrece ayuda mencionando el nombre del pasajero, y solicita el código de reserva (localizador) y el apellido.' },
  { name: 'Pedir número de recontacto', description: 'Solicita un número de teléfono para poder recontactar al pasajero.' }
];

export function buildPassengerSystemPrompt(scenario) {
  return [
    'Eres un pasajero llamando por teléfono a un agente de reservas de Iberia.',
    `Tu situación: ${scenario.description}`,
    'Responde siempre en español, en 1-2 frases por turno, con un tono emocional coherente con la urgencia del caso (paciente si es una consulta simple, más ansioso si es una queja o un vuelo próximo).',
    'No menciones comandos técnicos de Amadeus ni terminología de sistema GDS: tú eres un pasajero común, no un agente.',
    'Si el agente ya resolvió tu solicitud, agradece y da por terminada la llamada.'
  ].join('\n');
}

export function buildEvaluationPrompt(scenario, transcript) {
  const transcriptText = transcript
    .map((turn) => `${turn.role === 'agent' ? 'Agente' : 'Pasajero'}: ${turn.text}`)
    .join('\n');

  const rubricText = RUBRIC
    .map((c, i) => `${i + 1}. ${c.name}: ${c.description}`)
    .join('\n');

  return [
    'Eres un evaluador de calidad de atención al cliente de un call center de Iberia.',
    `Situación del pasajero: ${scenario.description}`,
    'Transcripción de la llamada (rol Agente = el que se evalúa):',
    transcriptText,
    'Evalúa el desempeño del Agente contra esta rúbrica de 5 criterios (0-100 cada uno):',
    rubricText,
    'Responde SOLO con el JSON solicitado por el esquema, sin texto adicional.'
  ].join('\n\n');
}
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `cd worker && node scripts/test-prompts.js`
Expected: 7 `[PASS]`, `Resultados: 7 pasados, 0 fallidos.`

- [ ] **Step 5: Commit**

```bash
git add worker/src/prompts.js worker/scripts/test-prompts.js
git commit -m "feat(worker): modulo de construccion de prompts para Gemini"
```

---

### Task 4: Módulo de cuota diaria (TDD)

**Files:**
- Create: `worker/src/quota.js`
- Test: `worker/scripts/test-quota.js`

- [ ] **Step 1: Escribir el test que falla**

`worker/scripts/test-quota.js`:
```js
import { checkAndConsumeQuota } from '../src/quota.js';

let passed = 0;
let failed = 0;

function check(name, condition) {
  if (condition) {
    console.log(`[PASS] ${name}`);
    passed++;
  } else {
    console.error(`[FAIL] ${name}`);
    failed++;
  }
}

console.log('--- TEST RUNNER: quota ---');

function makeFakeKV(initial = {}) {
  const store = { ...initial };
  return {
    async get(key) {
      return store[key] ?? null;
    },
    async put(key, value) {
      store[key] = value;
    },
    _store: store
  };
}

async function run() {
  const kv = makeFakeKV();
  const day = '2026-08-03';

  const first = await checkAndConsumeQuota(kv, 'user-1', day, 2);
  check('primera llamada del día permitida', first.allowed === true);
  check('cuenta queda en 1 tras la primera llamada', kv._store['quota:user-1:2026-08-03'] === '1');

  const second = await checkAndConsumeQuota(kv, 'user-1', day, 2);
  check('segunda llamada permitida (límite es 2)', second.allowed === true);

  const third = await checkAndConsumeQuota(kv, 'user-1', day, 2);
  check('tercera llamada RECHAZADA (excede el límite de 2)', third.allowed === false);

  const otherUser = await checkAndConsumeQuota(kv, 'user-2', day, 2);
  check('otro usuario tiene su propia cuota independiente', otherUser.allowed === true);

  console.log(`\nResultados: ${passed} pasados, ${failed} fallidos.`);
  if (failed > 0) process.exit(1);
}

run();
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `cd worker && node scripts/test-quota.js`
Expected: `Error [ERR_MODULE_NOT_FOUND]` porque `src/quota.js` no existe.

- [ ] **Step 3: Implementar `worker/src/quota.js`**

```js
const SECONDS_IN_A_DAY = 60 * 60 * 24;

export async function checkAndConsumeQuota(kv, uid, dayKey, limit) {
  const key = `quota:${uid}:${dayKey}`;
  const current = Number((await kv.get(key)) ?? '0');

  if (current >= limit) {
    return { allowed: false, remaining: 0 };
  }

  const next = current + 1;
  await kv.put(key, String(next), { expirationTtl: SECONDS_IN_A_DAY });
  return { allowed: true, remaining: limit - next };
}

export function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `cd worker && node scripts/test-quota.js`
Expected: 4 `[PASS]`, `Resultados: 4 pasados, 0 fallidos.`

- [ ] **Step 5: Commit**

```bash
git add worker/src/quota.js worker/scripts/test-quota.js
git commit -m "feat(worker): cuota diaria por usuario con Workers KV"
```

---

### Task 5: Verificación del ID token de Firebase (TDD para las claims; la firma la valida `jose`)

**Files:**
- Create: `worker/src/auth.js`
- Test: `worker/scripts/test-auth-claims.js`

- [ ] **Step 1: Escribir el test que falla**

`worker/scripts/test-auth-claims.js`:
```js
import { assertValidClaims } from '../src/auth.js';

let passed = 0;
let failed = 0;

function check(name, condition) {
  if (condition) {
    console.log(`[PASS] ${name}`);
    passed++;
  } else {
    console.error(`[FAIL] ${name}`);
    failed++;
  }
}

console.log('--- TEST RUNNER: auth claims ---');

const projectId = 'simulador-3362613';
const now = Math.floor(Date.now() / 1000);

const validPayload = {
  iss: `https://securetoken.google.com/${projectId}`,
  aud: projectId,
  sub: 'uid-123',
  exp: now + 3600
};

check('claims válidas no lanzan error', (() => {
  try {
    assertValidClaims(validPayload, projectId);
    return true;
  } catch {
    return false;
  }
})());

check('rechaza issuer incorrecto', (() => {
  try {
    assertValidClaims({ ...validPayload, iss: 'https://otro.com' }, projectId);
    return false;
  } catch {
    return true;
  }
})());

check('rechaza audience incorrecto', (() => {
  try {
    assertValidClaims({ ...validPayload, aud: 'otro-proyecto' }, projectId);
    return false;
  } catch {
    return true;
  }
})());

check('rechaza token expirado', (() => {
  try {
    assertValidClaims({ ...validPayload, exp: now - 10 }, projectId);
    return false;
  } catch {
    return true;
  }
})());

check('rechaza payload sin sub (uid)', (() => {
  try {
    assertValidClaims({ ...validPayload, sub: undefined }, projectId);
    return false;
  } catch {
    return true;
  }
})());

console.log(`\nResultados: ${passed} pasados, ${failed} fallidos.`);
if (failed > 0) process.exit(1);
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `cd worker && node scripts/test-auth-claims.js`
Expected: `Error [ERR_MODULE_NOT_FOUND]` porque `src/auth.js` no existe.

- [ ] **Step 3: Implementar `worker/src/auth.js`**

```js
import { createRemoteJWKSet, jwtVerify } from 'jose';

const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

let cachedJWKS = null;
function getJWKS() {
  if (!cachedJWKS) {
    cachedJWKS = createRemoteJWKSet(new URL(JWKS_URL));
  }
  return cachedJWKS;
}

export function assertValidClaims(payload, projectId) {
  const expectedIssuer = `https://securetoken.google.com/${projectId}`;
  const now = Math.floor(Date.now() / 1000);

  if (payload.iss !== expectedIssuer) {
    throw new Error(`Issuer inválido: ${payload.iss}`);
  }
  if (payload.aud !== projectId) {
    throw new Error(`Audience inválido: ${payload.aud}`);
  }
  if (!payload.exp || payload.exp <= now) {
    throw new Error('Token expirado');
  }
  if (!payload.sub) {
    throw new Error('Token sin uid (sub)');
  }
}

export async function verifyFirebaseIdToken(idToken, projectId) {
  const { payload } = await jwtVerify(idToken, getJWKS());
  assertValidClaims(payload, projectId);
  return { uid: payload.sub };
}
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `cd worker && node scripts/test-auth-claims.js`
Expected: 5 `[PASS]`, `Resultados: 5 pasados, 0 fallidos.`

- [ ] **Step 5: Commit**

```bash
git add worker/src/auth.js worker/scripts/test-auth-claims.js
git commit -m "feat(worker): verificacion de ID token de Firebase (JWKS + claims)"
```

---

### Task 6: Cliente de Gemini

**Files:**
- Create: `worker/src/gemini.js`

No hay test automatizado para este módulo (requiere red y una API key real) — se verifica en el Task 7 con `wrangler dev` contra la API real.

- [ ] **Step 1: Implementar `worker/src/gemini.js`**

```js
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export async function generatePassengerReply(apiKey, model, systemPrompt, history) {
  const contents = history.map((turn) => ({
    role: turn.role === 'agent' ? 'user' : 'model',
    parts: [{ text: turn.text }]
  }));

  const res = await fetch(`${API_BASE}/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents
    })
  });

  if (!res.ok) {
    throw new Error(`Gemini respondió ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini no devolvió texto en la respuesta');
  }
  return text.trim();
}

export async function generateEvaluation(apiKey, model, evaluationPrompt) {
  const res = await fetch(`${API_BASE}/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: evaluationPrompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            score: { type: 'NUMBER' },
            strengths: { type: 'ARRAY', items: { type: 'STRING' } },
            improvements: { type: 'ARRAY', items: { type: 'STRING' } }
          },
          required: ['score', 'strengths', 'improvements']
        }
      }
    })
  });

  if (!res.ok) {
    throw new Error(`Gemini respondió ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini no devolvió JSON en la respuesta');
  }
  return JSON.parse(text);
}
```

- [ ] **Step 2: Commit**

```bash
git add worker/src/gemini.js
git commit -m "feat(worker): cliente REST de Gemini (turno de pasajero + evaluacion)"
```

---

### Task 7: Fetch handler — wiring de rutas

**Files:**
- Create: `worker/src/index.js`

- [ ] **Step 1: Implementar `worker/src/index.js`**

```js
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
  const idToken = authHeader.replace('Bearer ', '');
  if (!idToken) throw new Error('Falta el header Authorization');
  return verifyFirebaseIdToken(idToken, env.FIREBASE_PROJECT_ID);
}

async function handleTurn(request, env) {
  const { uid } = await authenticate(request, env);

  const quota = await checkAndConsumeQuota(env.ROLEPLAY_KV, uid, todayKey(), Number(env.DAILY_QUOTA));
  if (!quota.allowed) {
    return new Response(JSON.stringify({ error: 'quota_exceeded' }), { status: 429, headers: corsHeaders(env) });
  }

  const { scenarioId, history } = await request.json();
  if (!scenarioId || !Array.isArray(history)) {
    return new Response(JSON.stringify({ error: 'bad_request' }), { status: 400, headers: corsHeaders(env) });
  }
  if (history.length >= Number(env.MAX_TURNS)) {
    return new Response(JSON.stringify({ error: 'max_turns_reached' }), { status: 400, headers: corsHeaders(env) });
  }

  const scenario = findScenario(scenarioId);
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
      const status = /token|Authorization|Issuer|Audience|expirado|uid/i.test(err.message) ? 401 : 500;
      return new Response(JSON.stringify({ error: err.message }), { status, headers: corsHeaders(env) });
    }
  }
};
```

- [ ] **Step 2: Configurar el secreto de Gemini para desarrollo local**

Crear `worker/.dev.vars` (ya está en `.gitignore`, nunca se commitea):
```
GEMINI_API_KEY=pegar_aqui_la_key_de_aistudio_del_paso_0.1
```

- [ ] **Step 3: Probar localmente**

Run: `cd worker && npm run dev`
En otra terminal:
```bash
curl -i -X POST http://localhost:8787/roleplay/turn \
  -H "Content-Type: application/json" \
  -d '{"scenarioId":"scenario-1","history":[]}'
```
Expected: `401` con `{"error":"Falta el header Authorization"}` — confirma que la ruta existe y el guard de auth funciona sin necesitar un token real todavía.

- [ ] **Step 4: Commit**

```bash
git add worker/src/index.js
git commit -m "feat(worker): fetch handler con rutas /roleplay/turn y /roleplay/evaluate"
```

---

### Task 8: Crear el KV namespace y desplegar

- [ ] **Step 1: Login de wrangler**

Run: `cd worker && npx wrangler login`
Expected: abre el navegador, autoriza, confirma "Successfully logged in".

- [ ] **Step 2: Crear el namespace de KV**

Run: `npx wrangler kv namespace create ROLEPLAY_KV`
Expected: imprime un `id`. Copiar ese id.

- [ ] **Step 3: Pegar el id en `wrangler.toml`**

Editar `worker/wrangler.toml`, reemplazar `REEMPLAZAR_DESPUES_DE_CREAR_EL_NAMESPACE` con el id real del paso anterior.

- [ ] **Step 4: Configurar el secreto de producción**

Run: `npx wrangler secret put GEMINI_API_KEY`
Pegar la key de aistudio.google.com cuando lo pida.

- [ ] **Step 5: Desplegar**

Run: `npx wrangler deploy`
Expected: imprime una URL tipo `https://roleplay-iberia-worker.<subdominio>.workers.dev`. **Guardar esta URL**, se usa en el Task 9.

- [ ] **Step 6: Verificar en producción**

```bash
curl -i -X POST https://roleplay-iberia-worker.<subdominio>.workers.dev/roleplay/turn \
  -H "Content-Type: application/json" -d '{"scenarioId":"scenario-1","history":[]}'
```
Expected: `401`, igual que en local (todavía sin token real — la prueba con token real se hace en el Task 14 desde el navegador ya logueado).

- [ ] **Step 7: Commit del `wrangler.toml` actualizado**

```bash
git add worker/wrangler.toml
git commit -m "chore(worker): configura KV namespace id tras el primer deploy"
```

---

## Fase 2 — Frontend

### Task 9: Configuración de entorno + cliente HTTP del Worker

**Files:**
- Create: `.env.example`
- Create: `src/lib/roleplayClient.js`

- [ ] **Step 1: Crear `.env.example`**

```
VITE_ROLEPLAY_WORKER_URL=https://roleplay-iberia-worker.tu-subdominio.workers.dev
```

- [ ] **Step 2: Crear `.env.local` real (no se commitea)**

Copiar `.env.example` a `.env.local` y poner la URL real del Task 8, Step 5.

- [ ] **Step 3: Implementar `src/lib/roleplayClient.js`**

```js
const WORKER_URL = import.meta.env.VITE_ROLEPLAY_WORKER_URL;

async function post(path, idToken, body) {
  const res = await fetch(`${WORKER_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`
    },
    body: JSON.stringify(body)
  });

  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data.error || `Error ${res.status}`);
    error.status = res.status;
    throw error;
  }
  return data;
}

export function sendTurn(idToken, scenarioId, history) {
  return post('/roleplay/turn', idToken, { scenarioId, history });
}

export function evaluateSession(idToken, scenarioId, transcript) {
  return post('/roleplay/evaluate', idToken, { scenarioId, transcript });
}
```

- [ ] **Step 4: Commit**

```bash
git add .env.example src/lib/roleplayClient.js
git commit -m "feat: cliente HTTP del frontend hacia el Worker de roleplay"
```

(`.env.local` no se commitea — ya está en `.gitignore`.)

---

### Task 10: Hook de voz con fallback a texto

**Files:**
- Create: `src/hooks/useSpeech.js`

No hay framework de test unitario para hooks en este repo (confirmado: no hay Jest/Vitest). Se verifica en el Task 13 (E2E, ruta de fallback de texto) y con QA manual de voz real en Chrome (Task 15).

- [ ] **Step 1: Implementar `src/hooks/useSpeech.js`**

```js
import { useCallback, useRef, useState } from 'react';

export function useSpeech({ lang = 'es-ES' } = {}) {
  const RecognitionCtor = typeof window !== 'undefined'
    ? (window.SpeechRecognition || window.webkitSpeechRecognition)
    : null;
  const supported = Boolean(RecognitionCtor && typeof window !== 'undefined' && window.speechSynthesis);

  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  const startListening = useCallback((onResult, onError) => {
    if (!supported) return;
    const recognition = new RecognitionCtor();
    recognition.lang = lang;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      onResult(text);
    };
    recognition.onerror = (event) => {
      onError?.(event.error);
      setListening(false);
    };
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }, [supported, lang, RecognitionCtor]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const speak = useCallback((text) => {
    if (!supported) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    window.speechSynthesis.speak(utterance);
  }, [supported, lang]);

  return { supported, listening, startListening, stopListening, speak };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useSpeech.js
git commit -m "feat: hook de voz (SpeechRecognition + speechSynthesis) con deteccion de soporte"
```

---

### Task 11: Persistencia de sesiones en Firestore

**Files:**
- Create: `src/lib/roleplaySessions.js`

- [ ] **Step 1: Implementar `src/lib/roleplaySessions.js`**

```js
import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export async function saveRoleplaySession(uid, { scenarioId, technicalScore, serviceScore, transcript }) {
  try {
    await addDoc(collection(db, 'users', uid, 'roleplaySessions'), {
      scenarioId,
      technicalScore,
      serviceScore,
      transcript,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error guardando sesión de roleplay:', error);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/roleplaySessions.js
git commit -m "feat: guarda sesiones de roleplay en Firestore (users/{uid}/roleplaySessions)"
```

---

### Task 12: `RoleplayPanel.jsx`

**Files:**
- Create: `src/components/RoleplayPanel.jsx`

- [ ] **Step 1: Implementar `src/components/RoleplayPanel.jsx`**

```jsx
import React, { useState } from 'react';
import { Phone, PhoneOff, Mic } from 'lucide-react';
import { auth } from '../lib/firebase';
import { sendTurn, evaluateSession } from '../lib/roleplayClient';
import { saveRoleplaySession } from '../lib/roleplaySessions';
import { useSpeech } from '../hooks/useSpeech';

const MAX_TURNS = 8;

export function RoleplayPanel({ scenarios, activeScenario, evaluationResult }) {
  const [scenarioId, setScenarioId] = useState(activeScenario?.id ?? scenarios[0]?.id ?? '');
  const [callActive, setCallActive] = useState(false);
  const [history, setHistory] = useState([]);
  const [textInput, setTextInput] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState(null);

  const { supported, listening, startListening, speak } = useSpeech();

  const scenario = scenarios.find((s) => s.id === scenarioId) || scenarios[0];

  async function submitAgentTurn(text) {
    if (!text.trim() || history.length >= MAX_TURNS) return;
    setError(null);
    const newHistory = [...history, { role: 'agent', text }];
    setHistory(newHistory);

    try {
      const idToken = await auth.currentUser.getIdToken();
      const { passengerReply } = await sendTurn(idToken, scenarioId, newHistory);
      const withReply = [...newHistory, { role: 'passenger', text: passengerReply }];
      setHistory(withReply);
      speak(passengerReply);
    } catch (err) {
      if (err.status === 429) {
        setError('Ya usaste tu práctica gratuita de hoy. Vuelve mañana.');
      } else {
        setError('No se pudo contactar al pasajero simulado. Intenta de nuevo.');
      }
    }
  }

  function handleMicClick() {
    startListening((text) => submitAgentTurn(text), () => setError('No se entendió el audio, intenta de nuevo.'));
  }

  function handleTextSubmit(e) {
    e.preventDefault();
    submitAgentTurn(textInput);
    setTextInput('');
  }

  function startCall() {
    setCallActive(true);
    setHistory([]);
    setFeedback(null);
    setError(null);
  }

  async function endCall() {
    setCallActive(false);
    try {
      const idToken = await auth.currentUser.getIdToken();
      const result = await evaluateSession(idToken, scenarioId, history);
      setFeedback(result);
      await saveRoleplaySession(auth.currentUser.uid, {
        scenarioId,
        technicalScore: evaluationResult?.score ?? 0,
        serviceScore: result.score,
        transcript: history
      });
    } catch {
      setError('No se pudo evaluar la llamada. Tu progreso en el Terminal no se perdió.');
    }
  }

  return (
    <div className="roleplay-panel">
      <h3>Llamada de práctica</h3>

      {!callActive && !feedback && (
        <>
          <select value={scenarioId} onChange={(e) => setScenarioId(e.target.value)}>
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
          <button onClick={startCall}><Phone size={16} /> Iniciar llamada</button>
        </>
      )}

      {callActive && (
        <>
          <div className="roleplay-transcript">
            {history.map((turn, i) => (
              <p key={i} className={`roleplay-turn roleplay-${turn.role}`}>
                <strong>{turn.role === 'agent' ? 'Tú' : 'Pasajero'}:</strong> {turn.text}
              </p>
            ))}
          </div>

          {supported ? (
            <button onClick={handleMicClick} disabled={listening || history.length >= MAX_TURNS}>
              <Mic size={16} /> {listening ? 'Escuchando...' : 'Hablar'}
            </button>
          ) : (
            <form onSubmit={handleTextSubmit}>
              <input
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Escribe tu respuesta al pasajero"
                disabled={history.length >= MAX_TURNS}
              />
              <button type="submit" disabled={history.length >= MAX_TURNS}>Enviar</button>
            </form>
          )}

          {error && <p className="roleplay-error">{error}</p>}

          <button onClick={endCall}><PhoneOff size={16} /> Finalizar llamada</button>
        </>
      )}

      {feedback && (
        <div className="roleplay-feedback">
          <h4>Resultado de la llamada</h4>
          <p>Resolución técnica: {evaluationResult?.score ?? 0}%</p>
          <p>Atención al cliente: {feedback.score}%</p>
          <p><strong>Fortalezas:</strong></p>
          <ul>{feedback.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
          <p><strong>A mejorar:</strong></p>
          <ul>{feedback.improvements.map((s, i) => <li key={i}>{s}</li>)}</ul>
          <button onClick={startCall}>Practicar de nuevo</button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/RoleplayPanel.jsx
git commit -m "feat: componente RoleplayPanel (chat de llamada + voz + feedback)"
```

---

### Task 13: Página `Roleplay.jsx`, ruta y entrada en el menú

**Files:**
- Create: `src/pages/Roleplay.jsx`
- Modify: `src/App.jsx` (import + ruta `/roleplay`)
- Modify: `src/pages/Menu.jsx` (tarjeta nueva)

- [ ] **Step 1: Crear `src/pages/Roleplay.jsx`**

```jsx
import React from 'react';
import { Terminal } from '../components/Terminal';
import { RoleplayPanel } from '../components/RoleplayPanel';
import { useAppContext } from '../context/AppContext';

export function Roleplay() {
  const {
    scenarios,
    activeScenario,
    evaluationResult,
    handleExecuteCommand,
    history,
    terminalRef
  } = useAppContext();

  return (
    <main className="main-layout">
      <Terminal
        ref={terminalRef}
        onExecuteCommand={handleExecuteCommand}
        history={history}
        missionComplete={!!evaluationResult?.completed}
      />
      <RoleplayPanel
        scenarios={scenarios}
        activeScenario={activeScenario}
        evaluationResult={evaluationResult}
      />
    </main>
  );
}
```

- [ ] **Step 2: Modificar `src/App.jsx`**

Añadir el import junto a los demás (cerca de `import { Simulator } ...`):
```js
import { Roleplay } from './pages/Roleplay';
```

Añadir la ruta dentro de `<Routes>`, junto a `/simulador` (`src/App.jsx:420`):
```jsx
<Route path="/simulador" element={<Simulator />} />
<Route path="/roleplay" element={<Roleplay />} />
```

- [ ] **Step 3: Modificar `src/pages/Menu.jsx`**

Añadir el import de `Phone` junto a los demás iconos:
```js
import { TerminalSquare, Brain, FileCheck, Phone } from 'lucide-react';
```

Añadir una cuarta tarjeta, después del bloque `</Link>` del examen (mismo patrón visual que las otras tres):
```jsx
<Link to="/roleplay" style={{ textDecoration: 'none' }}>
  <div style={{
    background: 'rgba(30, 41, 59, 0.7)',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    borderRadius: '12px',
    padding: '2.5rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '260px',
    transition: 'transform 0.2s, background 0.2s',
    backdropFilter: 'blur(10px)'
  }}
  onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(56, 189, 248, 0.15)'; e.currentTarget.style.transform = 'translateY(-5px)'; }}
  onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(30, 41, 59, 0.7)'; e.currentTarget.style.transform = 'translateY(0)'; }}
  >
    <Phone size={72} color="#38bdf8" style={{ marginBottom: '1.5rem' }} />
    <h3 style={{ color: '#fff', fontSize: '1.4rem', marginBottom: '0.5rem', textAlign: 'center' }}>Llamada de Práctica</h3>
    <p style={{ color: '#94a3b8', textAlign: 'center', fontSize: '0.95rem' }}>Atiende a un pasajero simulado por IA mientras resuelves su caso en el Terminal.</p>
  </div>
</Link>
```

- [ ] **Step 4: Verificar que compila**

Run: `npm run build`
Expected: build exitoso, sin errores de imports rotos.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Roleplay.jsx src/App.jsx src/pages/Menu.jsx
git commit -m "feat: pagina Roleplay embebida con Terminal + entrada en el menu"
```

---

## Fase 3 — Verificación end-to-end

### Task 14: E2E con mock del Worker

**Files:**
- Create: `e2e/roleplay.spec.js`

- [ ] **Step 1: Escribir el test** (sigue el patrón de `e2e/examen.spec.js` para login/navegación — revisar ese archivo para copiar el helper de login exacto antes de escribir este test)

`e2e/roleplay.spec.js`:
```js
import { test, expect } from '@playwright/test';

test('el agente completa una llamada de práctica y ve el feedback', async ({ page }) => {
  await page.route('**/roleplay/turn', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ passengerReply: 'Buenos días, quisiera saber el estado de mi vuelo.' })
    })
  );

  await page.route('**/roleplay/evaluate', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        score: 88,
        strengths: ['Saludo correcto'],
        improvements: ['Podría confirmar más datos del pasajero']
      })
    })
  );

  // NOTA para quien ejecute esta tarea: insertar aquí el login helper real
  // usado en e2e/examen.spec.js antes de navegar a /roleplay.

  await page.goto('/roleplay');
  await page.getByRole('button', { name: /iniciar llamada/i }).click();

  const textInput = page.getByPlaceholder('Escribe tu respuesta al pasajero');
  await textInput.fill('Iberia, buenos días, ¿en qué puedo ayudarle?');
  await page.getByRole('button', { name: /enviar/i }).click();

  await expect(page.getByText('Buenos días, quisiera saber el estado de mi vuelo.')).toBeVisible();

  await page.getByRole('button', { name: /finalizar llamada/i }).click();

  await expect(page.getByText('Atención al cliente: 88%')).toBeVisible();
  await expect(page.getByText('Saludo correcto')).toBeVisible();
});
```

- [ ] **Step 2: Ejecutar y ajustar el login helper**

Run: `npx playwright test e2e/roleplay.spec.js`
Expected inicial: probablemente falle en la navegación por falta de sesión — copiar el bloque de login de `e2e/examen.spec.js` (login con usuario de prueba) al inicio de este test, tal como se hace ahí, y volver a correr hasta que pase.

Expected final: `1 passed`.

- [ ] **Step 3: Commit**

```bash
git add e2e/roleplay.spec.js
git commit -m "test(e2e): flujo completo de llamada de roleplay con Worker mockeado"
```

---

### Task 15: QA manual de voz real (no automatizable)

- [ ] **Step 1:** Con `npm run dev` corriendo y `.env.local` apuntando al Worker desplegado, abrir `/roleplay` en Chrome de escritorio, iniciar sesión, elegir un escenario, pulsar "Hablar", decir un saludo real, y confirmar que: (a) se transcribe correctamente, (b) el pasajero responde por voz y texto, (c) se puede resolver el caso en el Terminal en paralelo, (d) "Finalizar llamada" muestra ambos puntajes.
- [ ] **Step 2:** Probar en Firefox (sin `SpeechRecognition`) y confirmar que aparece el `<input>` de texto en vez del botón de micrófono.
- [ ] **Step 3:** Provocar una cuota agotada (bajar `DAILY_QUOTA` a `1` temporalmente en `wrangler.toml`, redeploy, hacer 2 llamadas) y confirmar que el segundo intento muestra "Ya usaste tu práctica gratuita de hoy" y no un error crudo. Revertir `DAILY_QUOTA` a `20` y redeploy.

---

### Task 16: Build final y cierre

- [ ] **Step 1: Build de producción**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 2: Suite completa**

Run: `npm run test:parser && npm run test:regression && npm run test:learning && npm run test:e2e`
Expected: todo en verde, incluyendo el nuevo `e2e/roleplay.spec.js`.

- [ ] **Step 3: Suite del Worker**

Run: `cd worker && npm test`
Expected: todo en verde (prompts, quota, auth-claims).

- [ ] **Step 4: Deploy a Firebase Hosting** (fuera de este plan si el usuario prefiere revisar antes — confirmar con el usuario antes de este paso)

Run: `npm run build && firebase deploy --only hosting`
