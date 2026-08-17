import assert from 'node:assert/strict';

import { procesarTurnoTipificacion } from '../src/lib/tipificacion.js';
import { responderLocal } from '../worker/src/tutor-local.js';

let estado = null;

const inicio = procesarTurnoTipificacion({
  consulta: 'Ayúdeme a tipificar este caso con motivo, gestión y resultado.',
  estado
});
assert.equal(inicio.manejado, true);
assert.equal(inicio.completado, false);
assert.equal(inicio.estado.pendiente, true);
assert.match(inicio.explicacion, /motivo del contacto/i);
estado = inicio.estado;

const motivo = procesarTurnoTipificacion({
  consulta: 'Nombre: Ana Pérez; PNR: ABC123; la pasajera solicita cambiar la fecha del vuelo.',
  estado
});
assert.equal(motivo.completado, false);
assert.match(motivo.explicacion, /gestión realizaste/i);
assert.doesNotMatch(JSON.stringify(motivo.estado), /Ana Pérez|ABC123/);
estado = motivo.estado;

const gestion = procesarTurnoTipificacion({
  consulta: 'Se verificaron las condiciones y se ofreció una nueva fecha.',
  estado
});
assert.equal(gestion.completado, false);
assert.match(gestion.explicacion, /resultado/i);
estado = gestion.estado;

const resultado = procesarTurnoTipificacion({
  consulta: 'La pasajera aceptó la alternativa y el cambio quedó pendiente de pago.',
  estado
});
assert.equal(resultado.completado, true);
assert.equal(resultado.estado.pendiente, false);
for (const titulo of ['TIPIFICACIÓN DEL CASO', 'Datos del pasajero', 'Motivo del contacto', 'Gestión realizada', 'Resultado']) {
  assert.match(resultado.explicacion, new RegExp(titulo, 'i'));
}
assert.doesNotMatch(resultado.explicacion, /Ana Pérez|ABC123/);

const completa = procesarTurnoTipificacion({
  consulta: [
    'Tipifica este caso:',
    'Motivo: el pasajero solicita información sobre equipaje adicional.',
    'Gestión: se explicaron las opciones disponibles y sus condiciones.',
    'Resultado: el pasajero decidió revisar la información antes de comprar.'
  ].join('\n'),
  estado: null
});
assert.equal(completa.completado, true);
assert.match(completa.explicacion, /equipaje adicional/i);

let llamadas = 0;
globalThis.fetch = async () => {
  llamadas += 1;
  throw new Error('La tipificación determinista no debe tocar la red');
};

const local = await responderLocal({
  consulta: 'Tipifica este caso: Motivo: consulta de asiento. Gestión: se revisó disponibilidad. Resultado: no había plazas.',
  geminiEndpoint: '/api/gemini',
  claveHash: 'hash-publico',
  caso: {}
});
assert.equal(local.esTipificacion, true);
assert.equal(local.tipificacion.pendiente, false);
assert.match(local.explicacion, /consulta de asiento/i);
assert.equal(llamadas, 0);

const localInicio = await responderLocal({
  consulta: 'Tipifícame este caso',
  geminiEndpoint: '/api/gemini',
  caso: {}
});
const localMotivo = await responderLocal({
  consulta: 'El pasajero pidió corregir su asiento.',
  geminiEndpoint: '/api/gemini',
  caso: { tipificacion: localInicio.tipificacion }
});
const localGestion = await responderLocal({
  consulta: 'Se revisó el mapa y se cambió al asiento solicitado.',
  geminiEndpoint: '/api/gemini',
  caso: { tipificacion: localMotivo.tipificacion }
});
const localResultado = await responderLocal({
  consulta: 'El asiento quedó confirmado.',
  geminiEndpoint: '/api/gemini',
  caso: { tipificacion: localGestion.tipificacion }
});
assert.equal(localResultado.tipificacion.pendiente, false);
assert.match(localResultado.explicacion, /El asiento quedó confirmado/i);
assert.equal(llamadas, 0);

console.log('✓ Tipificación guiada, sin PII, sin invenciones y sin llamadas de red');
