#!/usr/bin/env node
/**
 * Mide el vocabulario que los manuales dan por sabido y comprueba cuánto de
 * él está ya cubierto por el glosario.
 *
 * Existe para dimensionar el hueco del "modo principiante": los manuales
 * están escritos para quien ya lleva meses en el puesto y dan por sabido
 * todo el vocabulario. Un tutor que empiece por los comandos deja al
 * principiante tecleando sin entender qué toca.
 *
 * ANTES este script mentía de dos maneras:
 *   1. Terminaba diciendo "Ninguno tiene definición" — una frase fija que
 *      siguió imprimiéndose después de escribir _glosario.json con 34
 *      términos definidos.
 *   2. Contaba las apariciones sobre TODOS los json de la carpeta, glosario
 *      incluido, así que definir un término INFLABA su cuenta de "sin
 *      definir" (636 → 921 apariciones sin que cambiara un solo manual).
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'procedimientos');

const TERMINOS = [
  'TST', 'TSM', 'EMD', 'PNR', 'DOI', 'FAREBASIS', 'fare basis',
  'FHE', 'SVC', 'PENTY', 'PENF', 'TKT', 'RBD', 'ON HOLD',
  'OPEN FOR USE', 'Cyber', 'ARNK', 'placa', 'radio', 'ETRV',
  'EXCH', 'cupón', 'cupon', 'TQT', 'TQM', 'TQO', 'HK', 'HN',
  'NN1', 'segmento', 'revalidar', 'reemisión', 'remisión'
];

// Variantes de escritura del MISMO término. No merecen entrada propia en el
// glosario: son la misma palabra escrita de otra manera en los manuales.
// "remisión" es directamente una errata de "reemisión" que aparece en el
// material original y se respeta tal cual está escrita.
const ALIAS = {
  FAREBASIS: 'fare basis',
  CUPON: 'cupón',
  'REMISIÓN': 'reemisión'
};

// El glosario NO cuenta como uso: es la definición, no el manual que la
// presupone. Contarlo hacía subir la cifra al definir un término.
const glosario = JSON.parse(readFileSync(join(DIR, '_glosario.json'), 'utf8'));
const definidos = new Map(
  (glosario.terminos || []).map((t) => [String(t.termino).toUpperCase(), t])
);

let texto = '';
for (const f of readdirSync(DIR).filter((f) => f.endsWith('.json') && f !== '_glosario.json')) {
  texto += readFileSync(join(DIR, f), 'utf8');
}

const filas = [];
for (const t of TERMINOS) {
  const patron = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = texto.match(new RegExp(patron, 'gi'));
  if (!m) continue;
  const canonico = ALIAS[t.toUpperCase()] || t;
  const entrada = definidos.get(canonico.toUpperCase());
  filas.push({ termino: t, usos: m.length, entrada, alias: canonico !== t ? canonico : null });
}
filas.sort((a, b) => b.usos - a.usos);

const cubiertos = filas.filter((f) => f.entrada && f.entrada.confianza !== 'hueco');
const huecos = filas.filter((f) => f.entrada && f.entrada.confianza === 'hueco');
const sinEntrada = filas.filter((f) => !f.entrada);

const ETIQUETA = { verbatim: 'del manual', derivado: 'deducido', hueco: 'HUECO' };

console.log('\nVocabulario que los manuales dan por sabido:\n');
for (const f of filas) {
  const estado = f.entrada ? ETIQUETA[f.entrada.confianza] || f.entrada.confianza : 'SIN ENTRADA';
  const via = f.alias ? ` (= ${f.alias})` : '';
  console.log(`  ${String(f.usos).padStart(4)}  ${f.termino.padEnd(14)} ${estado}${via}`);
}

const total = filas.reduce((a, f) => a + f.usos, 0);
console.log(`\n  ${filas.length} términos · ${total} apariciones en los manuales`);
console.log(`  ${cubiertos.length} definidos · ${huecos.length} huecos · ${sinEntrada.length} sin entrada en el glosario`);

if (huecos.length) {
  console.log('\nHuecos — preguntas para el instructor:');
  for (const f of huecos) console.log(`  · ${f.termino} (${f.usos} usos)`);
}
if (sinEntrada.length) {
  console.log('\nSin entrada en _glosario.json (habría que añadirlos):');
  for (const f of sinEntrada) console.log(`  · ${f.termino} (${f.usos} usos)`);
}
console.log('');

// Sirve de aviso en CI: si un término usado se queda sin entrada, se nota.
process.exitCode = sinEntrada.length ? 1 : 0;
