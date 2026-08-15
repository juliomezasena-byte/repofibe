// Medición EN VIVO del router inteligente contra Gemini real, sobre las 65
// frases de novato. No es un test de CI (necesita red + clave): es la prueba
// de aceptación que mide la mejora sobre la línea base determinista (40%).
//
//   GEMINI_API_KEY=... node worker/scripts/medir-router-vivo.mjs
import { entenderIntencion } from '../src/clasificador.js';
import { detectarIntencion } from '../src/coach.js';
import { generateIntentClassification } from '../src/gemini.js';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const mapa = JSON.parse(readFileSync(join(AQUI, 'mapa-intenciones.json'), 'utf8'));
const frases = JSON.parse(readFileSync(join(AQUI, 'frases-novato.json'), 'utf8'));
const ETIQUETAS = Object.keys(mapa);

const KEY = process.env.GEMINI_API_KEY;
const MODEL = 'gemini-2.5-flash';
if (!KEY) { console.error('Falta GEMINI_API_KEY'); process.exit(1); }

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
// 65 llamadas seguidas disparan el límite de tasa de Gemini (429) y falsean la
// medición. Se espacian y se reintenta con backoff: así medimos el clasificador,
// no el rate-limit.
async function generar(prompt, etiquetas) {
  for (let intento = 0; intento < 4; intento++) {
    try { return await generateIntentClassification(KEY, MODEL, prompt, etiquetas); }
    catch (e) {
      if (intento === 3) throw e;
      await espera(1500 * (intento + 1));
    }
  }
}

let acierto = 0, misroute = 0, preguntaBien = 0, preguntaMal = 0, missReal = 0;
const fallos = [];

for (const { frase, esperado } of frases) {
  let r;
  try {
    r = await entenderIntencion(frase, { etiquetas: ETIQUETAS, mapa, generar, deterministaFn: detectarIntencion });
  } catch (e) { r = { intencion: null, ambiguo: false, via: 'error' }; }
  const got = r.intencion || null;
  await espera(600); // espaciar las llamadas para no chocar con el rate-limit

  if (esperado === 'ambiguo') {
    // Lo correcto ante una frase ambigua es NO encaminar (preguntar).
    if (!got) preguntaBien++; else { misroute++; fallos.push(`AMBIGUA→${got}: "${frase}"`); }
    continue;
  }
  if (got === esperado) acierto++;
  else if (!got) {
    // No encaminó: aceptable (preguntará), pero cuenta como "no resuelto".
    if (r.ambiguo) preguntaMal++; else missReal++;
    fallos.push(`SIN RUTA (esperaba ${esperado}): "${frase}"`);
  } else {
    misroute++;
    fallos.push(`MISROUTE ${got}≠${esperado}: "${frase}"`);
  }
}

const total = frases.length;
console.log('\n===== ROUTER INTELIGENTE — EN VIVO =====');
console.log(`aciertos:                 ${acierto}/${total}  (${Math.round(acierto / total * 100)}%)`);
console.log(`preguntó ante ambigüedad: ${preguntaBien} (correcto)`);
console.log(`MISROUTE (peligroso):     ${misroute}`);
console.log(`sin ruta / preguntó:      ${preguntaMal + missReal}`);
console.log('\n(línea base determinista: 26/65 = 40%, 10 misroutes)');
console.log('\n— fallos —');
fallos.slice(0, 20).forEach((f) => console.log('  ' + f));
