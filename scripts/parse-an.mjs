#!/usr/bin/env node
/**
 * Parser de pantallas AN reales de Amadeus → flights.json
 *
 * Convierte el texto que el agente copia del terminal real en vuelos con
 * clases y asientos reales. Es la vía barata para tener "vuelos reales" sin
 * API: el dato sale del GDS de verdad y queda congelado, así que la suite
 * de regresión sigue siendo determinista.
 *
 * Uso:
 *   node scripts/parse-an.mjs docs/fuentes/an/mad-bog.txt          # ver
 *   node scripts/parse-an.mjs docs/fuentes/an/mad-bog.txt --write  # aplicar
 *
 * Formato que entiende (verbatim del terminal MAD905/SITELPRO):
 *
 *   ** IBERIA - AN ** BOG BOGOTA.CO 221 MO 15MAR 0000
 *    1 IB 155 J9 C9 D9 R9 U2 W9 E9 /MAD4S BOG 1 0010 0440 E0/350 10:30
 *                T9 P2 Y9 B9 H9 K9 M9 L9 F9 V9 S9 G8 Z9 N9 Q9 O9 X8
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const FLIGHTS = join(RAIZ, 'public', 'profiles', 'amadeus', 'flights.json');

const [, , archivo, ...flags] = process.argv;
if (!archivo) {
  console.error('Uso: node scripts/parse-an.mjs <archivo-con-la-pantalla-AN> [--write]');
  process.exit(1);
}
const escribir = flags.includes('--write');

// ── Cabecera: ** IBERIA - AN ** BOG BOGOTA.CO 221 MO 15MAR 0000
const RE_CABECERA = /^\*\*\s*(.+?)\s*-\s*AN\s*\*\*\s+([A-Z]{3})\s+(\S+)\s+\d+\s+([A-Z]{2})\s+(\d{1,2}[A-Z]{3})/;

// ── Línea de vuelo, partida por el "/" que precede a la ruta
const RE_VUELO = /^\s*(\d+)\s+([A-Z0-9]{2})\s+(\d{1,4})\s+(.*?)\s*\/(.+)$/;

// ── Cola: 0010 0440 E0/350 10:30   ·   1400 0550+1E0/350 9:50
const RE_COLA = /(\d{4})\s+(\d{4})(\+\d)?\s*([A-Z]?)(\d)\/(\S+)\s+(\d{1,2}:\d{2})\s*$/;

// ── Token de clase: J9, U2, G8, LC…
const RE_CLASE = /^([A-Z])([0-9A-Z])$/;

/** Extrae origen/destino y sus terminales de "MAD4S BOG 1" o "BOG 1 MAD4S". */
function parsearRuta(texto) {
  const tokens = texto.trim().split(/\s+/);
  const puntos = [];
  for (let i = 0; i < tokens.length && puntos.length < 2; i++) {
    const m = tokens[i].match(/^([A-Z]{3})(.*)$/);
    if (!m) continue;
    let terminal = m[2] || '';
    // El terminal puede venir pegado (MAD4S) o suelto en el token siguiente (BOG 1)
    if (!terminal && tokens[i + 1] && !/^[A-Z]{3}/.test(tokens[i + 1])) {
      terminal = tokens[i + 1];
      i++;
    }
    puntos.push({ codigo: m[1], terminal });
  }
  return puntos.length === 2 ? puntos : null;
}

/** "J9 C9 U2 G8" → { J:9, C:9, U:2, G:8 }. Letra no numérica = cerrada. */
function parsearClases(texto, destino = {}) {
  for (const token of texto.trim().split(/\s+/)) {
    const m = token.match(RE_CLASE);
    if (!m) continue;
    const [, clase, valor] = m;
    destino[clase] = /\d/.test(valor) ? Number(valor) : valor;
  }
  return destino;
}

// ─────────────────────────────────────────────────────────────────

const lineas = readFileSync(join(RAIZ, archivo), 'utf8').split(/\r?\n/);
const vuelos = [];
let fechaActual = null;
let ultimo = null;

for (const linea of lineas) {
  const cab = linea.match(RE_CABECERA);
  if (cab) {
    fechaActual = cab[5];
    ultimo = null;
    continue;
  }

  const v = linea.match(RE_VUELO);
  if (v) {
    const [, numLinea, aerolinea, numVuelo, clasesTexto, resto] = v;
    const cola = resto.match(RE_COLA);
    if (!cola) {
      console.warn(`! No pude leer la cola de: ${linea.trim()}`);
      ultimo = null;
      continue;
    }
    const [, salida, llegada, diaExtra, , escalas, equipo, duracion] = cola;
    const ruta = parsearRuta(resto.slice(0, cola.index));
    if (!ruta) {
      console.warn(`! No pude leer la ruta de: ${linea.trim()}`);
      ultimo = null;
      continue;
    }

    const hhmm = (t) => `${t.slice(0, 2)}:${t.slice(2)}`;
    ultimo = {
      line: Number(numLinea),
      airline: aerolinea,
      flightNumber: numVuelo.padStart(4, '0'),
      classes: parsearClases(clasesTexto),
      origin: ruta[0].codigo,
      originTerminal: ruta[0].terminal || undefined,
      destination: ruta[1].codigo,
      destinationTerminal: ruta[1].terminal || undefined,
      departure: hhmm(salida),
      arrival: hhmm(llegada),
      arrivalDayOffset: diaExtra ? Number(diaExtra.slice(1)) : undefined,
      equipment: equipo,
      stops: Number(escalas),
      duration: duracion,
      searchDate: fechaActual,
      fuente: 'AN real (terminal MAD905)'
    };
    vuelos.push(ultimo);
    continue;
  }

  // Línea de continuación: solo tokens de clase → pertenece al vuelo anterior
  if (ultimo && linea.trim() && linea.trim().split(/\s+/).every((t) => RE_CLASE.test(t))) {
    parsearClases(linea, ultimo.classes);
  }
}

if (vuelos.length === 0) {
  console.error('✗ No se reconoció ningún vuelo. ¿El texto es una pantalla AN?');
  process.exit(1);
}

// Limpia los undefined para no ensuciar el JSON
for (const v of vuelos) {
  for (const k of Object.keys(v)) if (v[k] === undefined) delete v[k];
}

console.log(`\nVuelos leídos: ${vuelos.length}\n`);
for (const v of vuelos) {
  const clases = Object.entries(v.classes).map(([c, n]) => `${c}${n}`).join(' ');
  const extra = v.arrivalDayOffset ? `+${v.arrivalDayOffset}` : '';
  console.log(
    `  ${String(v.line).padStart(2)} ${v.airline}${v.flightNumber} ` +
    `${v.origin}${v.originTerminal || ''}→${v.destination}${v.destinationTerminal || ''} ` +
    `${v.departure}-${v.arrival}${extra} ${v.equipment} ${v.duration} ${v.searchDate}`
  );
  console.log(`     ${Object.keys(v.classes).length} clases: ${clases}`);
}

if (!escribir) {
  console.log('\n(vista previa — usa --write para aplicar a flights.json)\n');
  process.exit(0);
}

const catalogo = JSON.parse(readFileSync(FLIGHTS, 'utf8'));
const antes = catalogo.flights.length;

// Reemplaza los vuelos de las mismas rutas; conserva el resto intacto para
// no romper los escenarios existentes.
const rutasNuevas = new Set(vuelos.map((v) => `${v.origin}-${v.destination}`));
catalogo.flights = catalogo.flights
  .filter((v) => !rutasNuevas.has(`${v.origin}-${v.destination}`))
  .concat(vuelos);

writeFileSync(FLIGHTS, JSON.stringify(catalogo, null, 2) + '\n');
console.log(`\n✓ flights.json: ${antes} → ${catalogo.flights.length} vuelos`);
console.log(`  Rutas actualizadas: ${[...rutasNuevas].join(', ')}\n`);
