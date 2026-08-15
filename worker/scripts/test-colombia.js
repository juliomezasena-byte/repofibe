import assert from 'node:assert/strict';
import procedimiento from '../../public/procedimientos/emision-colombia-cop.json' with { type: 'json' };
import { detectarIntencion, extraerContextoColombia } from '../src/coach.js';
import { queProcedimiento } from '../src/arbol.js';
import { siguientePaso } from '../src/tutor.js';

assert.equal(procedimiento.id, 'emision-colombia-cop');
assert.ok(procedimiento.pasos.length >= 20, 'el manual debe conservar el flujo completo');
assert.deepEqual(extraerContextoColombia('Reserva de Colombia cobrada en COP, oficina BOG001'), {
  paisMercado: 'COLOMBIA', mercado: 'BOG001', moneda: 'COP', cobroCOP: true
});
assert.deepEqual(extraerContextoColombia('reserva general desde Madrid'), {});
assert.equal(detectarIntencion('reserva Colombia cobrada en COP').intencion, 'emision-colombia-cop');

const manual = queProcedimiento({ intencion: 'emision', datos: {
  paisMercado: 'COLOMBIA', mercado: 'BOG001', moneda: 'COP', cobroCOP: true
} });
assert.equal(manual.procedimientoId, 'emision-colombia-cop');
assert.match(manual.avisos.join(' '), /BOG001|COP/);

const pregunta = queProcedimiento({ intencion: 'emision', datos: { paisMercado: 'COLOMBIA', mercado: 'BOG001' } });
assert.equal(pregunta.procedimientoId, null);
assert.equal(pregunta.siguientePregunta.id, 'cobroCOP');

const general = queProcedimiento({ intencion: 'emision', datos: { paisMercado: 'COLOMBIA', mercado: 'BOG001' }, respuestas: { cobroCOP: false } });
assert.equal(general.procedimientoId, 'emision-latam');

const primerPaso = siguientePaso(procedimiento, { datos: { fecha: '11MAR', origen: 'MAD', destino: 'BOG' } });
assert.equal(primerPaso.paso.comando, 'AN 11MAR MADBOG');
const pago = procedimiento.pasos.find((p) => p.n === 18);
assert.equal(pago.confianza, 'hueco');
assert.equal(siguientePaso({ pasos: [pago] }, { datos: {} }).paso.comando, null);
console.log('test-colombia: OK');
