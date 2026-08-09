#!/usr/bin/env node
/**
 * Aplica la escalera RBD REAL de Iberia a los vuelos IB del catálogo, y
 * marca la procedencia de TODOS los vuelos.
 *
 * Qué es honesto y qué no:
 *   - La escalera (qué clases existen y en qué orden) SÍ es real: salió de
 *     la pantalla AN del terminal MAD905 para MAD-BOG/BOG-MAD.
 *   - Los CONTADORES de asientos de los vuelos sin captura son sintéticos.
 *     Se marcan como tales y nunca se presentan como reales.
 *   - Las aerolíneas que NO son IB no se tocan: cada una tiene su propia
 *     escalera y no tenemos captura de ninguna.
 *
 * Regla de radio (del propio material de formación del usuario):
 *   Iberia NO tiene Turista Premium en corto radio → los vuelos IB de corto
 *   radio no llevan las clases de Premium Economy.
 *
 * Uso: node scripts/upgrade-rbd.mjs [--write]
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const FLIGHTS = join(RAIZ, 'public', 'profiles', 'amadeus', 'flights.json');
const escribir = process.argv.includes('--write');

/** Escalera real de Iberia largo radio, en el orden exacto del terminal. */
const ESCALERA_IB_LARGO = 'J C D R I U W E T P Y B H K M L F V S G Z N Q O X'.split(' ');

/** Clases de Turista Premium — NO existen en corto radio Iberia. */
const PREMIUM_ECONOMY = new Set(['W', 'E', 'T', 'P']);

const ESCALERA_IB_CORTO = ESCALERA_IB_LARGO.filter((c) => !PREMIUM_ECONOMY.has(c));

/** PRNG determinista: mismo catálogo de entrada → misma salida siempre. */
function prng(semilla) {
  let s = [...semilla].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/**
 * Reparte asientos con una forma parecida a la real: la mayoría a 9, unas
 * pocas clases escasas y alguna cerrada. Preserva el valor que ya existía
 * para no alterar escenarios que dependan de una clase concreta.
 */
function repartirAsientos(escalera, previas, semilla) {
  const r = prng(semilla);
  const out = {};
  for (const clase of escalera) {
    if (previas[clase] !== undefined) { out[clase] = previas[clase]; continue; }
    const d = r();
    out[clase] = d < 0.06 ? 0 : d < 0.14 ? 'C' : d < 0.30 ? 1 + Math.floor(r() * 5) : 9;
  }
  return out;
}

/** Corto radio = mismo continente y menos de 3h de vuelo aproximado. */
function esCortoRadio(v) {
  const EUROPA = new Set(['MAD', 'BCN', 'BER', 'FRA', 'LIS', 'AGP', 'SVQ', 'VGO', 'ACE', 'PMI']);
  return EUROPA.has(v.origin) && EUROPA.has(v.destination);
}

const catalogo = JSON.parse(readFileSync(FLIGHTS, 'utf8'));
const cambios = [];

for (const v of catalogo.flights) {
  if (v.fuente?.startsWith('AN real')) continue;          // capturado del terminal: intocable

  if (v.airline !== 'IB') {
    if (!v.fuente) { v.fuente = 'sintetico (sin captura de esta aerolinea)'; cambios.push(`  · ${v.airline}${v.flightNumber} ${v.origin}->${v.destination}: solo se marca la procedencia`); }
    continue;
  }

  const corto = esCortoRadio(v);
  const escalera = corto ? ESCALERA_IB_CORTO : ESCALERA_IB_LARGO;
  const antes = Object.keys(v.classes).length;
  v.classes = repartirAsientos(escalera, v.classes, `${v.airline}${v.flightNumber}${v.origin}${v.destination}`);
  v.fuente = `sintetico (escalera RBD real de IB ${corto ? 'corto' : 'largo'} radio)`;
  cambios.push(`  · IB${v.flightNumber} ${v.origin}->${v.destination}: ${antes} → ${escalera.length} clases (${corto ? 'corto radio, SIN Turista Premium' : 'largo radio'})`);
}

console.log(`\nEscalera IB largo radio (${ESCALERA_IB_LARGO.length}): ${ESCALERA_IB_LARGO.join(' ')}`);
console.log(`Escalera IB corto radio (${ESCALERA_IB_CORTO.length}): ${ESCALERA_IB_CORTO.join(' ')}  ← sin W E T P\n`);

if (cambios.length === 0) { console.log('Nada que cambiar.\n'); process.exit(0); }
console.log('Cambios:');
cambios.forEach((c) => console.log(c));

if (!escribir) { console.log('\n(vista previa — usa --write para aplicar)\n'); process.exit(0); }

writeFileSync(FLIGHTS, JSON.stringify(catalogo, null, 2) + '\n');
console.log('\n✓ flights.json actualizado\n');
