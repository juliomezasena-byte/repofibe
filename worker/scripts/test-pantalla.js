#!/usr/bin/env node
/**
 * La caja de "pega tu pantalla" tiene que AHORRAR preguntas.
 *
 * Este test existe porque la caja estuvo puesta en el panel sin hacer nada:
 * el árbol pedía `billete`, `pnr` e `historico`, el panel mandaba
 * `caso.pantalla`, y nadie parseaba. El alumno pegaba el billete y el tutor
 * le seguía preguntando si había volado algún tramo — con la respuesta
 * escrita delante.
 *
 * Lo que se prueba no es que el parser funcione (de eso ya van los 84 de
 * test-lectores). Es que lo leído LLEGUE a la decisión.
 */

import { leerPantalla, fusionarEnCaso } from '../src/pantalla.js';
import { queProcedimiento } from '../src/arbol.js';
import { buildTutorPrompt, terminosDelPaso } from '../src/prompts.js';

let fallos = 0;
let pasados = 0;

function comprobar(nombre, real, esperado) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (ok) { pasados++; console.log(`  [OK]   ${nombre}`); }
  else { fallos++; console.error(`  [FALLO] ${nombre}\n          esperado: ${JSON.stringify(esperado)}\n          real:     ${JSON.stringify(real)}`); }
}

// ── Pantallas reales, las mismas que en test-lectores ────────────

const DTR_GARCIABRAVO = `►DTR:TN 0752527441266·
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
EQIV.FARE PD: CLP 390048/
TAXES: CLP 547990/OI:
TOTAL: CLP 938038/TKTN: 075-2527441266 6`;

const RT_KFQQV = `KFQQV/RP/MADIB/KFQQV/SCL175/75991053/SCL/IB/A/CL//SU
 1.ALVAREZURBINA/MARGARITAANGELICA 2.GARCIABRAVO/CONSUELOISIDORA
 3. IB118 A 20AUG SCLMAD TK2 1040 0520+1ET
 4. IB113 O 18SEP MADSCL HK2 1320 2140 ET
 5.CT/P +56993573248-M
13.SSR TKNE IB HK1 SCLMAD 118 A20AUG 0752527441266C1/P2`;

const RHA_CANCELACION = `013/022 CS/IB 494 S 21NOV 1 MADEAS UN1 1600 1705/TK
    022 AS/IB 506 S 21NOV 1 MADEAS TK1 1155 1300/TK
    022 RF-MADRIIB 301059 CR-MAD RI IB 30SEP1059Z`;

// Fecha fija: el billete es de agosto de 2026 y el test no puede cambiar
// de resultado mañana.
const HOY = new Date(2026, 7, 8);

// ── 1. Reconocer qué le han pegado ──────────────────────────────

console.log('\n--- RECONOCE LA PANTALLA ---');
comprobar('el DTR es un billete', leerPantalla(DTR_GARCIABRAVO, HOY).tipo, 'billete');
comprobar('el RT es un PNR', leerPantalla(RT_KFQQV, HOY).tipo, 'pnr');
comprobar('el RHA es un histórico', leerPantalla(RHA_CANCELACION, HOY).tipo, 'historico');

console.log('\n--- NO INVENTA CUANDO NO RECONOCE ---');
const basura = leerPantalla('hola buenas, me puedes ayudar con un cambio', HOY);
comprobar('no se inventa un tipo', basura.tipo, null);
comprobar('y explica qué esperaba', basura.avisos.some((a) => /DTR:TN|RT|RHA/.test(a)), true);
const vacio = leerPantalla('   ', HOY);
comprobar('el texto vacío tampoco cuela', vacio.tipo, null);

// ── 2. Lo leído llega a la decisión ─────────────────────────────

console.log('\n--- PEGAR EL BILLETE AHORRA PREGUNTAS ---');

// Sin pegar nada, el árbol NO puede saber si voló algo: pregunta.
const sinPegar = queProcedimiento({ intencion: 'cambio' });
comprobar('sin billete, pregunta si ha volado', sinPegar.siguientePregunta?.id, 'volado');

// Con el billete pegado, ya lo sabe: los cupones dicen OPEN FOR USE.
const lectura = leerPantalla(DTR_GARCIABRAVO, HOY);
const conBillete = queProcedimiento(fusionarEnCaso({ intencion: 'cambio' }, lectura));
comprobar('con el billete, YA NO pregunta si ha volado', conBillete.siguientePregunta?.id !== 'volado', true);
comprobar('y deja dicho cómo lo sabe',
  conBillete.camino.some((c) => /OPEN FOR USE/.test(c.comoLoSe)), true);

// Los hechos del billete son los correctos (los tres que falló el bot)
comprobar('nada volado', lectura.billete.algunSegmentoVolado, false);
comprobar('familia OPTIMA, no BASIC', lectura.billete.familia, 'OPTIMA');
comprobar('DOI 29SEP25', lectura.billete.doi, '29SEP25');
comprobar('placa 075', lectura.billete.placa, '075');

console.log('\n--- PEGAR EL PNR TRAE EL AVISO DEL TK ---');
const lecturaPnr = leerPantalla(RT_KFQQV, HOY);
const conPnr = queProcedimiento(fusionarEnCaso({ intencion: 'cambio', respuestas: { volado: false } }, lecturaPnr));
comprobar('avisa de que hay segmentos en TK',
  conPnr.advertencias.some((a) => /TK/.test(a) && /involuntario/i.test(a)), true);
comprobar('y manda al histórico antes de cobrar nada', conPnr.siguientePregunta?.id, 'historico');

console.log('\n--- PEGAR EL HISTÓRICO DECIDE INVOLUNTARIO SOLO ---');
const lecturaRha = leerPantalla(RHA_CANCELACION, HOY);
const conRha = queProcedimiento(fusionarEnCaso({ intencion: 'cambio', respuestas: { volado: false } }, lecturaRha));
comprobar('ya no pregunta si es voluntario', conRha.siguientePregunta?.id !== 'involuntario', true);
comprobar('lo dedujo del RHA',
  conRha.camino.some((c) => /histórico \(RHA\)/.test(c.comoLoSe)), true);

console.log('\n--- NO PISA LO QUE EL ALUMNO YA CONFIRMÓ ---');
const yaDicho = fusionarEnCaso({ intencion: 'cambio', billete: { familia: 'YA-ESTABA' } }, lectura);
comprobar('un hecho confirmado gana a una relectura', yaDicho.billete.familia, 'YA-ESTABA');

// ── 3. El glosario llega al prompt ──────────────────────────────

console.log('\n--- EL GLOSARIO SE USA DE VERDAD ---');

const pasoConTst = {
  n: 11, sistema: 'amadeus', confianza: 'verbatim',
  proceso: 'Guardar la tarifa cotizada y verificar que se creó la máscara TST',
  comando: 'FXP'
};
const terminos = terminosDelPaso(pasoConTst).map((t) => t.termino);
comprobar('encuentra TST en el paso', terminos.includes('TST'), true);
comprobar('no arrastra términos que no salen', terminos.includes('EMD'), false);

const prompt = buildTutorPrompt({
  procedimiento: { titulo: 'Cambio manual', fuente: { documento: '#3121' } },
  paso: pasoConTst,
  veredicto: null,
  nivel: 'principiante'
});
comprobar('el prompt lleva el bloque de vocabulario', /VOCABULARIO VERIFICADO/.test(prompt), true);
comprobar('con la definición REAL del material, no una inventada',
  /Transitional Stored Ticket/.test(prompt), true);
comprobar('prohíbe definir lo que no está en el glosario',
  /no lo definas/i.test(prompt), true);

// Un término que sabemos que NO está documentado no puede colarse definido
const pasoConHueco = {
  n: 1, sistema: 'resiber', confianza: 'verbatim',
  proceso: 'Consultar el ETRV del billete', comando: 'ETRV'
};
const promptHueco = buildTutorPrompt({
  procedimiento: { titulo: 'Involuntario', fuente: { documento: '#3639' } },
  paso: pasoConHueco, veredicto: null, nivel: 'principiante'
});
comprobar('un término HUECO se marca como no documentado',
  /ETRV: NO está definido en el material/.test(promptHueco), true);

// ── 3bis. Las dos fases: lo determinista no depende de la IA ────

console.log('\n--- EL VEREDICTO NO NECESITA A LA IA ---');
// El paso, el comando y el veredicto salen de siguientePaso(), que es JS puro.
// Por eso la primera fase (conIA:false) puede responder al instante: si algo
// de esto dependiera del modelo, separar las fases no serviría de nada.
const { siguientePaso } = await import('../src/tutor.js');
const splitProc = JSON.parse(
  await import('node:fs').then((fs) =>
    fs.readFileSync(new URL('../../public/procedimientos/generar-split.json', import.meta.url), 'utf8'))
);
const av1 = siguientePaso(splitProc, { pasoActual: null, comandoEscrito: null, datos: {} });
comprobar('el primer paso sale sin IA', av1.paso?.n, 1);
comprobar('y trae su comando', typeof av1.paso?.comando === 'string', true);

const av2 = siguientePaso(splitProc, { pasoActual: 1, comandoEscrito: av1.paso.comando, datos: {} });
comprobar('el veredicto de un acierto sale sin IA', av2.veredicto?.correcto, true);

const av3 = siguientePaso(splitProc, { pasoActual: 1, comandoEscrito: 'ZZZ INVENTADO', datos: {} });
comprobar('el de un fallo también', av3.veredicto?.correcto, false);
comprobar('y dice por qué', typeof av3.veredicto?.motivo === 'string' && av3.veredicto.motivo.length > 0, true);

// ── 4. El bundle trae las tablas que hacen falta ────────────────

console.log('\n--- LAS TABLAS ESTÁN EN EL BUNDLE ---');
const material = JSON.parse(
  await import('node:fs').then((fs) =>
    fs.readFileSync(new URL('../src/procedimientos.generated.json', import.meta.url), 'utf8'))
);
for (const t of ['_glosario', '_gama-tarifas-cabinas', '_tipos-de-tarifas-beneficios', '_sistemas']) {
  comprobar(`${t} empaquetada`, !!material[t], true);
}
comprobar('las tablas NO se confunden con procedimientos',
  Object.keys(material).filter((k) => !k.startsWith('_')).every((k) => Array.isArray(material[k].pasos)), true);

console.log('\n' + '='.repeat(50));
console.log(`Resultados: ${pasados} pasados, ${fallos} fallidos.`);
console.log('='.repeat(50) + '\n');
process.exit(fallos ? 1 : 0);
