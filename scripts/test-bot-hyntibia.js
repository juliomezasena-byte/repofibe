#!/usr/bin/env node
/**
 * El paquete del navegador tiene que hacer DOS cosas:
 *   1. leer un billete real igual de bien que el del Worker
 *   2. no llevarse dentro ni un manual
 *
 * Se prueba el archivo YA COMPILADO, no el código fuente: es lo que de verdad
 * se publica. Un bundle puede romperse por el empaquetado aunque el fuente
 * esté bien.
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const BUNDLE = join(RAIZ, '..', 'hyntibia llsm', 'HYNTIBIA', 'hyntibia-v1', 'assets', 'hyntibia-bot.js');

let pasados = 0;
let fallos = 0;
function comprobar(nombre, real, esperado) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (ok) { pasados++; console.log(`  [OK]   ${nombre}`); }
  else { fallos++; console.error(`  [FALLO] ${nombre}\n          esperado: ${JSON.stringify(esperado)}\n          real:     ${JSON.stringify(real)}`); }
}

const codigo = readFileSync(BUNDLE, 'utf8');

// Se ejecuta como lo haría el navegador: un IIFE que deja un global.
const contexto = vm.createContext({ console });
vm.runInContext(codigo, contexto);
const bot = contexto.HyntibIA;

console.log('\n--- EL PAQUETE CARGA Y EXPONE SU API ---');
comprobar('existe el global HyntibIA', typeof bot === 'object' && bot !== null, true);
for (const fn of ['leerPantalla', 'analizarBillete', 'familiaDeFareBasis', 'derechosDeFamilia']) {
  comprobar(`expone ${fn}`, typeof bot[fn], 'function');
}

console.log('\n--- LEE EL BILLETE REAL DE GARCIABRAVO ---');
const DTR = `►DTR:TN 0752527441266·
ISSUED BY: IBERIA LINEAS AEREAS ORG/DST: SCL/SCL FCMI: DOI: 29SEP25
«E/R:»
AIRLINE DATA: KFQQV IB TOUR CODE: TKTD:
PASSENGER: GARCIABRAVO/CONSUELOISIDORA
EXCH: CONJ TKT:
O FM: SCL IB 0118 A 20AUG 1040 OK AON4NQM7 20AUG/20AUG 1PC OPEN FOR USE
O TO: MAD IB 0113 O 18SEP 1320 OK ODL0NQM7 18SEP/18SEP 1PC OPEN FOR USE
  TO: SCL
FC: SCL IB MAD140.00 IB SCL267.50NUC407.50END ROE1.00
FARE: USD 408.00/FOP:MS-WEB,060105000CWDP936570/CLP938038/
TOTAL: CLP 938038/TKTN: 075-2527441266 6`;

const lectura = bot.leerPantalla(DTR, new Date(2026, 7, 8));
comprobar('lo reconoce como billete', lectura.tipo, 'billete');
comprobar('familia OPTIMA (no BASIC)', lectura.billete.familia, 'OPTIMA');
comprobar('DOI 29SEP25', lectura.billete.doi, '29SEP25');
comprobar('placa 075', lectura.billete.placa, '075');
comprobar('nada volado', lectura.billete.algunSegmentoVolado, false);
comprobar('sabe que OPTIMA no es reembolsable', lectura.billete.reembolsable, false);

console.log('\n--- REGLA DEL FARE BASIS ---');
comprobar('AON4NQM7 → OPTIMA', bot.familiaDeFareBasis('AON4NQM7').familia, 'OPTIMA');
comprobar('la regla no cita el documento interno',
  /#\d{4}/.test(bot.familiaDeFareBasis('AON4NQM7').regla || ''), false);

console.log('\n--- NO SE PUBLICA NADA INTERNO ---');
const prohibido = [
  ['pasos de manual', /"pasos":/],
  ['ids de procedimiento', /cambio-manual-sin-segmento|reembolso-ibex|umnr-menor|generar-split/],
  ['números de documento', /#\d{4}\b/],
  ['comandos de reemisión', /TTP\/ETRV|FQPSCL/]
];
for (const [que, re] of prohibido) {
  comprobar(`el bundle no contiene ${que}`, re.test(codigo), false);
}

console.log('\n' + '='.repeat(50));
console.log(`Resultados: ${pasados} pasados, ${fallos} fallidos.`);
console.log('='.repeat(50) + '\n');
process.exit(fallos ? 1 : 0);
