import assert from 'node:assert/strict';
import { resolverProcedimiento } from '../src/resolver-procedimiento.js';
import { extraerDatosDeReserva, extraerComandoEscrito } from '../src/coach.js';

const noConfundePalabra = extraerDatosDeReserva('creame una reserva a BOG');
assert.deepEqual(noConfundePalabra, { destino: 'BOG' });
assert.deepEqual(extraerDatosDeReserva('AN 11MAR MADBOG'), { origen: 'MAD', destino: 'BOG', fecha: '11MAR' });
assert.deepEqual(extraerDatosDeReserva('Quiero volar de Madrid a Bogotá'), { origen: 'MAD', destino: 'BOG' });
assert.deepEqual(extraerDatosDeReserva('Madrid hacia Bogota'), { origen: 'MAD', destino: 'BOG' });
assert.deepEqual(extraerDatosDeReserva('Quiero viajar el 11 de marzo de Madrid a Bogotá'), { origen: 'MAD', destino: 'BOG', fecha: '11MAR' });
assert.deepEqual(extraerDatosDeReserva('12/04/2027 desde Barcelona hasta Lima'), { origen: 'BCN', destino: 'LIM', fecha: '12APR' });
assert.deepEqual(extraerDatosDeReserva('creame una reserva BOG MAD'), { origen: 'BOG', destino: 'MAD' });
assert.equal(extraerComandoEscrito('corrige este comando: SS 2 J 1'), 'SS 2 J 1');
assert.equal(extraerComandoEscrito('¿Qué significa AN?'), null);

const intake = resolverProcedimiento({ texto: 'Créame una reserva a BOG' });
assert.equal(intake.intencion, 'emision');
assert.equal(intake.allowedProcedureId, 'emision-latam');
assert.equal(intake.source, 'deterministic-tree');
assert.equal(resolverProcedimiento({ texto: 'necesito hacer una reserva' }).intencion, 'emision');
assert.equal(resolverProcedimiento({ texto: 'reserva de Madrid a Bogota' }).intencion, 'emision');

const resolved = resolverProcedimiento({
  texto: '11MAR MADBOG 2 ADT 1 CHD 1 INF',
  caso: { intencion: 'emision', datos: { origen: 'MAD', destino: 'BOG', fecha: '11MAR' }, pasajeros: { ADT: 2, CHD: 1, INF: 1, plazas: 3 }, respuestas: { lineaVuelo: '1|3', clase: 'J' }, disponibilidad: { vuelos: [] } }
});
assert.equal(resolved.allowedProcedureId, 'emision-latam');
assert.equal(resolved.source, 'deterministic-tree');
console.log('test-resolver: OK');
