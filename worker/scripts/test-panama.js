import assert from 'node:assert/strict';
import procedimiento from '../../public/procedimientos/descuento-panama.json' with { type: 'json' };
import procedimientoEcuador from '../../public/procedimientos/descuento-ecuador.json' with { type: 'json' };
import procedimientos from '../src/procedimientos.generated.json' with { type: 'json' };
import { detectarIntencion, extraerContextoPanama, extraerContextoEcuador, extraerDatosDeReserva } from '../src/coach.js';
import { queProcedimiento } from '../src/arbol.js';
import { siguientePaso } from '../src/tutor.js';

assert.equal(procedimiento.id, 'descuento-panama');
assert.ok(procedimiento.pasos.length >= 30, 'el manual debe conservar el flujo completo');
assert.equal(procedimientoEcuador.id, 'descuento-ecuador');
assert.ok(procedimientoEcuador.pasos.length >= 30, 'Ecuador debe conservar el flujo completo');
assert.deepEqual(extraerContextoPanama('El cliente llama de Panama, PTY001, descuento pais en USD'), {
  paisMercado: 'PANAMA', mercado: 'PTY001', moneda: 'USD', descuentoPais: true
});
assert.deepEqual(extraerDatosDeReserva('El cliente llama de Panama, PTY001, descuento pais en USD'), {});
assert.deepEqual(extraerDatosDeReserva('11MAR MADBOG 2 ADT 1 CHD 1 INF'), {
  origen: 'MAD', destino: 'BOG', fecha: '11MAR'
});
assert.equal(detectarIntencion('quiero un descuento pais'), null);
assert.deepEqual(extraerContextoPanama('reserva general desde Madrid'), {});
assert.deepEqual(extraerContextoEcuador('residente de Ecuador, UIO001, descuento discapacidad en USD'), {
  paisMercado: 'ECUADOR', mercado: 'UIO001', moneda: 'USD', descuentoPais: true, descuentoTipo: 'discapacidad'
});

const descuento = queProcedimiento({ intencion: 'emision', datos: { paisMercado: 'PANAMA', mercado: 'PTY001', descuentoPais: true } });
assert.equal(descuento.procedimientoId, 'descuento-panama');
assert.match(descuento.avisos.join(' '), /PTY001/);

const pregunta = queProcedimiento({ intencion: 'emision', datos: { paisMercado: 'PANAMA', mercado: 'PTY001' } });
assert.equal(pregunta.procedimientoId, null);
assert.equal(pregunta.siguientePregunta.id, 'descuentoPais');

const general = queProcedimiento({ intencion: 'emision', datos: { paisMercado: 'PANAMA', mercado: 'PTY001' }, respuestas: { descuentoPais: false } });
assert.equal(general.procedimientoId, 'emision-latam');

const ecuador = queProcedimiento({ intencion: 'emision', datos: { paisMercado: 'ECUADOR', mercado: 'UIO001', descuentoPais: true, descuentoTipo: 'joven' } });
assert.equal(ecuador.procedimientoId, 'descuento-ecuador');
assert.match(ecuador.avisos.join(' '), /UIO001|RZZ/);

const primerPaso = siguientePaso(procedimiento, { datos: { fecha: '11MAR', origen: 'MAD', destino: 'BOG' } });
assert.equal(primerPaso.paso.comando, 'AN 11MAR MADBOG');
const pendiente = siguientePaso(procedimientos['emision-latam'], { pasoActual: 1, datos: {} });
assert.equal(pendiente.paso.n, 1);
const completadoEnSegundoTurno = siguientePaso(procedimientos['emision-latam'], {
  pasoActual: 1,
  datos: { fecha: '11MAR', origen: 'MAD', destino: 'BOG' }
});
assert.equal(completadoEnSegundoTurno.paso.n, 1);
assert.equal(completadoEnSegundoTurno.paso.comando, 'AN 11MAR MADBOG');
const docs = procedimiento.pasos.find((p) => p.n === 13);
const pasoDocs = siguientePaso({ pasos: [docs] }, { datos: {} });
assert.equal(pasoDocs.paso.comando, null);
assert.ok(pasoDocs.paso.faltanDatos.includes('paisDocumento'));
console.log('test-panama: OK');
