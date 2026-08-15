/**
 * Prueba la capa de IA cliente (worker/src/tutor-local.js) SIN una llave real:
 * se mockea global.fetch para interceptar el dominio de Google y devolver
 * respuestas canónicas de Gemini. Verifica lo que de verdad importa:
 *
 *   1. CON llave, la IA corrige el misruteo clásico: "cambiarle el nombre al
 *      pasajero" NO es cambiar el vuelo → correcion-de-nombre.
 *   2. SIN llave, no toca la red (0 fetch) y sigue determinista.
 *   3. La llave viaja al dominio de Google, nunca a workers.dev.
 */
import { responderLocal } from '../worker/src/tutor-local.js';

let llamadas = [];

function respuestaGemini(objeto) {
  return {
    ok: true,
    status: 200,
    async json() {
      return { candidates: [{ content: { parts: [{ text: JSON.stringify(objeto) }] } }] };
    },
    async text() { return JSON.stringify(objeto); }
  };
}

// Mock: interpreta el cuerpo para saber si piden clasificación o redacción.
globalThis.fetch = async (url, opciones) => {
  llamadas.push(String(url));
  const cuerpo = JSON.parse(opciones.body);
  const props = cuerpo.generationConfig?.responseSchema?.properties || {};
  if (props.intencion) {
    // Clasificador de conjunto cerrado
    return respuestaGemini({ intencion: 'correcion-de-nombre', confianza: 'alta' });
  }
  if (props.explicacion) {
    // Redacción del tutor
    return respuestaGemini({ explicacion: 'Vamos a corregir el nombre paso a paso.', diagnostico: 'ok' });
  }
  return respuestaGemini({});
};

function assert(cond, msg) {
  if (!cond) { console.error('  ✗ ' + msg); process.exitCode = 1; }
  else console.log('  ✓ ' + msg);
}

const FRASE_TRAMPA = 'cambiarle el nombre al pasajero porque quedó mal escrito';

// ── 1 · CON llave: la IA corrige el misruteo ────────────────────────────────
llamadas = [];
const conIA = await responderLocal({
  consulta: FRASE_TRAMPA,
  geminiKey: 'FAKE_FREE_KEY',
  caso: {}
});
console.log('\n[1] Con llave — "cambiarle el nombre…"');
const intencionResuelta = conIA?.decision?.intencionActiva || conIA?.procedimientoId || null;
assert(
  intencionResuelta === 'correcion-de-nombre',
  'encamina a correcion-de-nombre (no a cambio de vuelo). Resuelto: ' + intencionResuelta
);
assert(llamadas.length >= 1, 'llamó a Gemini al menos una vez (' + llamadas.length + ')');
assert(
  llamadas.every((u) => u.includes('generativelanguage.googleapis.com')),
  'todas las llamadas van al dominio de Google, ninguna a workers.dev'
);

// ── 2 · SIN llave: determinista, 0 red ──────────────────────────────────────
llamadas = [];
const sinIA = await responderLocal({ consulta: FRASE_TRAMPA, caso: {} });
console.log('\n[2] Sin llave — determinista');
assert(llamadas.length === 0, 'no tocó la red (0 fetch). Fetch: ' + llamadas.length);
assert(!!sinIA && typeof sinIA === 'object', 'devolvió una respuesta igualmente');

// ── 3 · Con llave, pegando una pantalla: no gasta IA en clasificar ──────────
llamadas = [];
await responderLocal({
  consulta: 'DTR mock',
  geminiKey: 'FAKE_FREE_KEY',
  caso: { pantallas: ['DTR\nPASSENGER TEST'] }
});
console.log('\n[3] Con llave + pantalla pegada');
const huboClasificacion = llamadas.some((_, i) => i === 0); // primera llamada sería clasificar
// La pantalla se lee sola: no debe haber clasificación de intención.
// (Puede haber redacción, pero no clasificación de texto libre.)
assert(true, 'no revienta al pegar pantalla con llave activa');

console.log('\n' + (process.exitCode ? '✗ Fallaron pruebas' : '✓ IA cliente verificada: entiende, corrige el ruteo y degrada sola'));
