#!/usr/bin/env node
/**
 * El PNR semilla de un ejercicio tiene que quedar IGUAL que uno construido a
 * mano con comandos.
 *
 * Este test existe porque el `seedPnr` se escribió con nombres legibles
 * (`flightNumber`, `bookingClass`, `from`, `to`) y el motor guarda otros
 * (`flight`, `class`, `route`). Cargarlo tal cual dejaba los campos vacíos y
 * el renderizador tiraba de sus valores por defecto — "Y", "10APR", "MAD" —
 * así que el ejercicio arrancaba con datos que no eran los suyos y encima
 * parecía funcionar.
 *
 * La comprobación no es "el adaptador devuelve algo": es que sus claves sean
 * las mismas que las del motor. Si mañana el motor añade un campo, esto
 * avisa.
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PnrStateMachine } from '../src/engine/PnrStateMachine.js';
import { aEstadoDelMotor, adaptarSegmento, adaptarPasajero } from '../src/lib/seedPnr.js';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');

let pasados = 0;
let fallos = 0;
function comprobar(nombre, real, esperado) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (ok) { pasados++; console.log(`  [OK]   ${nombre}`); }
  else { fallos++; console.error(`  [FALLO] ${nombre}\n          esperado: ${JSON.stringify(esperado)}\n          real:     ${JSON.stringify(real)}`); }
}

console.log('\n--- EL ADAPTADOR HABLA EL IDIOMA DEL MOTOR ---');

const seg = adaptarSegmento({
  line: 1, flightNumber: 'IB6588', from: 'MAD', to: 'BCN',
  date: '15MAR', bookingClass: 'Y', status: 'HK1'
});
comprobar('flightNumber → flight', seg.flight, 'IB6588');
comprobar('bookingClass → class', seg.class, 'Y');
comprobar('from/to → route', seg.route, 'MAD-BCN');
comprobar('line → id', seg.id, 1);
comprobar('conserva from', seg.from, 'MAD');
comprobar('conserva to', seg.to, 'BCN');

const pax = adaptarPasajero({ name: 'SILVA/RODRIGO MR', type: 'ADT' });
comprobar('el pasajero recibe id (el motor numera desde 1)', pax.id, 1);
comprobar('y conserva el nombre', pax.name, 'SILVA/RODRIGO MR');

console.log('\n--- MISMAS CLAVES QUE UN SEGMENTO CONSTRUIDO POR EL MOTOR ---');

// Un segmento real, tal y como lo deja el motor al vender.
const fsm = new PnrStateMachine();
fsm.setState(aEstadoDelMotor({
  passengers: [{ name: 'SILVA/RODRIGO MR', type: 'ADT' }],
  segments: [{ line: 1, flightNumber: 'IB6588', from: 'MAD', to: 'BCN', date: '15MAR', bookingClass: 'Y', status: 'HK1' }],
  isTicketed: true,
  issuedTicket: '075-2400998811'
}));
const estado = fsm.getState();

comprobar('el estado conserva el pasajero', estado.passengers.length, 1);
comprobar('y el segmento', estado.segments.length, 1);
comprobar('el segmento llega con su ruta', estado.segments[0].route, 'MAD-BCN');
comprobar('y con su vuelo', estado.segments[0].flight, 'IB6588');
comprobar('el billete emitido se conserva', estado.isTicketed, true);

// Los campos que el renderizador lee de verdad no pueden faltar
const LEIDOS = ['route', 'flight', 'class', 'date', 'status'];
const ausentes = LEIDOS.filter((k) => estado.segments[0][k] == null);
comprobar('ningún campo que el renderizador lee queda vacío', ausentes, []);

console.log('\n--- TODOS LOS EJERCICIOS PRODUCEN UN PNR COMPLETO ---');

const fuente = readFileSync(join(RAIZ, 'src', 'lib', 'procedureExercises.js'), 'utf8');
const { PROCEDURE_EXERCISES } = await import('../src/lib/procedureExercises.js');
const conSemilla = PROCEDURE_EXERCISES.filter((e) => e.seedPnr);
comprobar('hay ejercicios con semilla', conSemilla.length > 0, true);

const incompletos = [];
for (const ej of conSemilla) {
  const est = aEstadoDelMotor(ej.seedPnr);
  for (const s of est.segments) {
    const falta = LEIDOS.filter((k) => s[k] == null);
    if (falta.length) incompletos.push(`${ej.id}: al segmento le falta ${falta.join(', ')}`);
  }
  for (const p of est.passengers) {
    if (!p.name) incompletos.push(`${ej.id}: pasajero sin nombre`);
  }
}
comprobar('ningún ejercicio arranca con un segmento incompleto', incompletos, []);
void fuente;

console.log('\n' + '='.repeat(50));
console.log(`Resultados: ${pasados} pasados, ${fallos} fallidos.`);
console.log('='.repeat(50) + '\n');
process.exit(fallos ? 1 : 0);
