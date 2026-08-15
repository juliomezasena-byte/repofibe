/**
 * Verifica que el tutor ACUMULA hechos entre turnos (el bug de "se le olvida").
 * Simula lo que hace el cliente arreglado: absorber datosCaso en cada respuesta.
 * Determinista (sin IA) — la extracción de datos no necesita Gemini.
 */
import { responderLocal } from '../worker/src/tutor-local.js';

let estado = { intencion: null, procedimientoId: null, pasoActual: null, respuestas: {}, pasajeros: null, datos: {}, pantallas: [] };

function base(consulta) {
  return {
    procedimientoId: estado.procedimientoId,
    pasoActual: estado.pasoActual,
    caso: { intencion: estado.intencion, respuestas: estado.respuestas, pasajeros: estado.pasajeros, datos: estado.datos, pantallas: estado.pantallas },
    consulta
  };
}
function absorber(j) {
  if (j.procedimientoId) estado.procedimientoId = j.procedimientoId;
  if (j.paso) estado.pasoActual = j.paso.n;
  if (j.decision?.intencionActiva) estado.intencion = j.decision.intencionActiva;
  if (j.decision?.respuestasActivas) Object.assign(estado.respuestas, j.decision.respuestasActivas);
  if (j.datosCaso) Object.assign(estado.datos, j.datosCaso);   // ← el arreglo
  if (j.pasajerosCaso) estado.pasajeros = j.pasajerosCaso;
}

console.log('TURNO 1: "reserva bogota madrid"');
const t1 = await responderLocal(base('quiero hacer una reserva de bogota a madrid'));
console.log('  datosCaso devuelto:', JSON.stringify(t1.datosCaso || null));
console.log('  pide:', JSON.stringify(t1.paso?.faltanDatos || '(avanzó)'));
absorber(t1);
console.log('  estado.datos acumulado:', JSON.stringify(estado.datos));

console.log('\nTURNO 2: "13 de marzo, vuelta 15 de abril" (sin repetir ruta)');
const t2 = await responderLocal(base('13 de marzo, vuelta el 15 de abril'));
absorber(t2);
const pide2 = t2.paso?.faltanDatos || [];
console.log('  pide:', JSON.stringify(pide2.length ? pide2 : '(avanzó, ya no re-pregunta ruta)'));

const reAskRuta = Array.isArray(pide2) && pide2.some((d) => /origen|destino|ruta/i.test(String(d)));
console.log('\n' + (reAskRuta
  ? '✗ TODAVÍA re-pregunta la ruta que ya dio → el bug sigue'
  : '✓ Ya NO re-pregunta origen/destino: acumula el contexto entre turnos'));
process.exitCode = reAskRuta ? 1 : 0;
