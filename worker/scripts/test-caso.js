import assert from 'node:assert/strict';
import { crearCaseState, enriquecerRespuestaLab } from '../src/caso.js';

const body = {
  conversationId: 'lab-test-1',
  caso: {
    intencion: 'emision',
    datos: {
      origen: 'MAD', destino: 'BOG', fecha: '11MAR',
      paisMercado: 'PANAMA', mercado: 'PTY001', moneda: 'USD',
      descuentoPais: true, descuentoTipo: 'adulto-mayor',
      apellido: 'NO-DEBE-SALIR'
    },
    pasajeros: { ADT: 2, CHD: 1, INF: 1, plazas: 3, total: 4 },
    respuestas: { lineaVuelo: '1|3', clase: 'J' },
    pantalla: 'DTR:TN PERSONA REAL NO-DEBE-SALIR'
  }
};
const resultado = {
  procedimientoId: 'emision-latam',
  titulo: 'Emisión LATAM',
  decision: { intencionActiva: 'emision', avisos: [], respuestasActivas: { clase: 'J' } },
  pasoActual: 2,
  paso: { n: 2, comando: 'SS 3 J 1' },
  explicacion: 'Comando del manual'
};

const caso = crearCaseState({ body, resultado });
assert.equal(caso.environment, 'lab');
assert.equal(caso.stage, 'in_progress');
assert.equal(caso.nextCommand, 'SS 3 J 1');
assert.equal(caso.confirmationRequired, false);
assert.equal(caso.data.origen, 'MAD');
assert.equal(caso.data.paisMercado, 'PANAMA');
assert.equal(caso.data.mercado, 'PTY001');
assert.equal(caso.data.moneda, 'USD');
assert.equal(caso.data.descuentoPais, true);
assert.equal(caso.data.descuentoTipo, 'adulto-mayor');
assert.equal(caso.data.apellido, undefined);
assert.equal(JSON.stringify(caso).includes('NO-DEBE-SALIR'), false);
assert.equal(caso.evidence.pantallasPegadas, 1);

const enriched = enriquecerRespuestaLab(body, resultado);
assert.equal(enriched.environment, 'lab');
assert.equal(enriched.caso.procedure.id, 'emision-latam');
console.log('test-caso: OK');
