import assert from 'node:assert/strict';
import { detectarIntencion } from '../src/coach.js';
import { queProcedimiento } from '../src/arbol.js';

const casos = [
  ['necesito una factura en Colombia', 'facturas-latam'],
  ['quiero agregar DOCS al pasajero', 'agregar-docs'],
  ['el cliente necesita una silla de ruedas', 'pmr-silla-de-ruedas'],
  ['quiero transportar cenizas', 'transporte-ceniza'],
  ['caso MEDA con INCAD', 'casos-meda'],
  ['quiero pagar con tarjeta en Colombia', 'formas-pago-latam'],
  ['me cobraron pero no emitieron el billete', 'comunicaciones-cortadas-latam'],
  ['necesito crear una reserva on hold 72 horas', 'on-hold-72h'],
  ['quiero emitir la reserva on hold', 'emision-reservas-on-hold']
];

for (const [texto, esperado] of casos) {
  const detectado = detectarIntencion(texto)?.intencion;
  assert.equal(detectado, esperado, `${texto}: ${detectado} !== ${esperado}`);
  const r = queProcedimiento({ intencion: detectado });
  assert.equal(r.procedimientoId, esperado, `${esperado}: árbol no enruta`);
}

console.log(`test-nuevos-manuales: OK (${casos.length} rutas)`);
