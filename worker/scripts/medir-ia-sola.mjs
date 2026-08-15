// Diagnóstico: ¿el atajo determinista es el que estropea el router?
// Mide la IA SOLA (sin cortocircuito determinista) sobre las 65 frases.
import { clasificarIntencion } from '../src/clasificador.js';
import { generateIntentClassification } from '../src/gemini.js';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const mapa = JSON.parse(readFileSync(join(AQUI, 'mapa-intenciones.json'), 'utf8'));
const frases = JSON.parse(readFileSync(join(AQUI, 'frases-novato.json'), 'utf8'));
const ET = Object.keys(mapa);
const KEY = process.env.GEMINI_API_KEY, MODEL = 'gemini-2.5-flash';
if (!KEY) { console.error('Falta GEMINI_API_KEY'); process.exit(1); }
const generar = (p, e) => generateIntentClassification(KEY, MODEL, p, e);

let ok = 0, mis = 0, preg = 0;
const fallos = [];
for (const { frase, esperado } of frases) {
  let r; try { r = await clasificarIntencion(frase, { etiquetas: ET, mapa, generar }); } catch { r = { intencion: null, ambiguo: false }; }
  const got = r.intencion || null;
  if (esperado === 'ambiguo') { if (!got) preg++; else { mis++; fallos.push(`AMB→${got}: ${frase}`); } continue; }
  if (got === esperado) ok++;
  else if (!got) { preg++; fallos.push(`sinruta(${esperado}): ${frase}`); }
  else { mis++; fallos.push(`MIS ${got}≠${esperado}: ${frase}`); }
}
console.log('\n=== IA SOLA (sin atajo determinista) ===');
console.log(`aciertos: ${ok}/${frases.length} (${Math.round(ok / frases.length * 100)}%)`);
console.log(`MISROUTE: ${mis}  | sin ruta/preguntó: ${preg}`);
console.log('(comparar: dos etapas 49%/13 mis · determinista solo 40%/10 mis)');
console.log('\n-- fallos --');
fallos.slice(0, 18).forEach((f) => console.log('  ' + f));
