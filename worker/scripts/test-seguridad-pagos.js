import { validarRespuestaGemini } from '../src/validar-gemini.js';
import { siguientePaso, validarComando } from '../src/tutor.js';
import { buildGeneralCoachPrompt } from '../src/prompts.js';
import procedimientos from '../src/procedimientos.generated.json' with { type: 'json' };

let pasados = 0;
let fallos = 0;

function comprobar(nombre, condicion, detalle = '') {
  if (condicion) {
    pasados += 1;
    console.log(`  [OK]   ${nombre}`);
  } else {
    fallos += 1;
    console.error(`  [FALLO] ${nombre}${detalle ? `: ${detalle}` : ''}`);
  }
}

console.log('\n--- SEGURIDAD DE PAGOS Y EMISIÓN EN LABORATORIO ---');

const fpCash = { comando: 'FP CASH,' };
comprobar(
  'acepta FP CASH como forma de pago simulada autorizada',
  validarRespuestaGemini({ explicacion: 'Usa `FP CASH,` en el laboratorio.', diagnostico: '' }, fpCash).ok
);

const config = { comando: '$$CONFIG:CCTYPE/2' };
comprobar(
  'acepta $$CONFIG como configuración local del laboratorio',
  validarRespuestaGemini({ explicacion: 'Configura el perfil con `$$CONFIG:CCTYPE/2`.', diagnostico: '' }, config).ok
);

const pay = { comando: '$$PAY' };
comprobar(
  'acepta $$PAY como cobro local del laboratorio',
  validarRespuestaGemini({ explicacion: 'Ahora ejecuta `$$PAY`.', diagnostico: '' }, pay).ok
);

const emd = { comando: 'TTM/M1/RT' };
comprobar(
  'acepta TTM/M1/RT para emitir el EMD de práctica',
  validarRespuestaGemini({ explicacion: 'Emite el EMD con `TTM/M1/RT`.', diagnostico: '' }, emd).ok
);

comprobar(
  'rechaza token con apariencia de tarjeta aunque el modelo lo mencione',
  !validarRespuestaGemini({ explicacion: 'Usa `FP MS-TT,VI1234567890123456-1023-V1234ABCD`.', diagnostico: '' }, fpCash).ok
);

comprobar(
  'rechaza pago o emisión si no coincide con el paso actual',
  !validarRespuestaGemini({ explicacion: 'Ejecuta `$$PAY`.', diagnostico: '' }, { comando: 'AN 11MAR MADBOG' }).ok
);

const colombia = procedimientos['emision-colombia-cop'];
const salto = siguientePaso(colombia, { pasoActual: 18, datos: {} });
comprobar(
  'un salto directo no expone el siguiente comando de pago tras el hueco PCI',
  salto.paso?.confianza === 'hueco' && !salto.paso?.comando,
  JSON.stringify(salto)
);

const pasoPagoLab = siguientePaso(procedimientos['emision-latam'], { pasoActual: 17, datos: {} });
comprobar('el paso PCI hueco muestra solo la simulación FP CASH',
  pasoPagoLab.paso?.confianza === 'hueco' && pasoPagoLab.paso?.simulacion?.comando === 'FP CASH,' && !pasoPagoLab.paso?.comando);
comprobar('FP CASH permite continuar solo dentro del paso hueco de laboratorio',
  validarComando(procedimientos['emision-latam'].pasos.find((p) => p.n === 17), 'FP CASH,').correcto === true);

const promptSeguro = buildGeneralCoachPrompt({
  consulta: 'PNR ABC123, ticket 075-1234567890, correo agente@example.com, diagnóstico: hospitalización reciente',
  lectura: { tipo: 'billete', numeroBillete: '075-1234567890', pasajero: 'PEREZ/ANA' }
});
comprobar('no envía PNR/TKT/email/MEDA crudos al prompt',
  !/ABC123|075-1234567890|agente@example.com|hospitalización reciente|PEREZ\/ANA/i.test(promptSeguro), promptSeguro);

for (const [id, pasos] of Object.entries(procedimientos)) {
  if (id.startsWith('_')) continue;
  for (const paso of pasos.pasos || []) {
    const texto = `${paso.comando || ''} ${paso.explicacion || ''}`;
    if (/MS-TT\s*,?\s*VI\d{8,}|\$\$PAY\s*:\s*MS-TT|FP\s+MS-TT,VI/i.test(texto)) {
      comprobar(`no quedan datos de pago con apariencia real en ${id} paso ${paso.n}`, false, texto);
    }
  }
}

console.log(`Resultados: ${pasados} pasados, ${fallos} fallidos.`);
process.exit(fallos ? 1 : 0);
