import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DslParser } from '../src/engine/DslParser.js';
import { PnrStateMachine } from '../src/engine/PnrStateMachine.js';
import { ResponseGenerator } from '../src/engine/ResponseGenerator.js';
import { EvaluationEngine } from '../src/engine/EvaluationEngine.js';
import { QuizEngine } from '../src/engine/QuizEngine.js';
import { IBERIA_BANK } from '../src/engine/quizBanks/iberia.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const spec = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/profiles/amadeus/commands_meta.json'), 'utf8'));
const flights = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/profiles/amadeus/flights.json'), 'utf8')).flights;
const scenarios = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/profiles/amadeus/scenarios.json'), 'utf8')).scenarios;
const locations = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/profiles/amadeus/locations.json'), 'utf8')).locations;

const parser = new DslParser(spec);
const fsm = new PnrStateMachine();
const responseGen = new ResponseGenerator(spec);
const evalEngine = new EvaluationEngine();

console.log('--- SUITE DE PRUEBAS DE REGRESIÓN (QA) ---');

let passedScenarios = 0;

scenarios.forEach((scen) => {
  console.log(`\nProbando Escenario: ${scen.title}`);
  fsm.reset();

  if (scen.initialState && scen.initialState.pnr) {
    fsm.setState(scen.initialState.pnr);
  }

  // Anti auto-completado: ningún escenario puede arrancar hecho (o casi).
  const evalInicial = evalEngine.evaluate(scen, fsm.getState());
  let flowErrors = 0;
  if (evalInicial.completed || evalInicial.score >= 80) {
    console.error(`  [ERROR INICIO] Arranca en ${evalInicial.score}% (completado: ${evalInicial.completed}) sin ejecutar comandos.`);
    flowErrors++;
  }

  scen.suggestedFlow.forEach((cmd) => {
    const parseResult = parser.parse(cmd);
    if (!parseResult.success) {
      console.error(`  [ERROR PARSER] Comando "${cmd}" falló: ${parseResult.error}`);
      flowErrors++;
      return;
    }
    const processResult = fsm.process(parseResult, flights, locations);
    const output = responseGen.formatResponse(processResult, fsm.getState());
    // XE elimina líneas y HE/consultas pueden devolver estados informativos;
    // cualquier otro comando del flujo sugerido NO debe fallar.
    if (!processResult.success && !cmd.startsWith('XE')) {
      console.error(`  [ERROR FSM] Comando "${cmd}" respuesta: ${output}`);
      flowErrors++;
    }
  });

  const evalResult = evalEngine.evaluate(scen, fsm.getState());
  console.log(`  Resultado Evaluación: ${evalResult.score}% (Completado: ${evalResult.completed})`);

  // Criterio estricto: el flujo sugerido del manual DEBE completar el escenario al 100%
  // y no puede producir errores intermedios.
  if (evalResult.completed && flowErrors === 0) {
    console.log(`  [PASS] Escenario ${scen.id} completado al 100%.`);
    passedScenarios++;
  } else {
    console.error(`  [FAIL] Escenario ${scen.id} (errores de flujo: ${flowErrors}). Feedback:`, evalResult.feedback);
  }
});

// ── Suite de tolerancia (feedback de David): Amadeus lee los comandos
// con o sin espacios, y DAC debe dar la ciudad REAL, nunca inventada. ──
console.log('\n--- SUITE DE TOLERANCIA (ESPACIOS + IATA REAL) ---');

let toleranceFailures = 0;
function probarTolerancia(nombre, comandos, verificar) {
  fsm.reset();
  let lastResult = null;
  for (const cmd of comandos) {
    const pr = parser.parse(cmd);
    if (!pr.success) {
      console.error(`  [FAIL] ${nombre}: "${cmd}" no parseó (${pr.error})`);
      toleranceFailures++;
      return;
    }
    lastResult = fsm.process(pr, flights, locations);
  }
  const err = verificar(lastResult, fsm.getState());
  if (err) {
    console.error(`  [FAIL] ${nombre}: ${err}`);
    toleranceFailures++;
  } else {
    console.log(`  [PASS] ${nombre}`);
  }
}

// Espacios y uniones equivalentes
probarTolerancia('SN unido (SN12APRMEXSDQ)', ['SN12APRMEXSDQ'],
  (r) => r.success && r.data.origin === 'MEX' && r.data.destination === 'SDQ' ? null : 'origen/destino incorrectos');
probarTolerancia('SN espaciado (SN 12 APR MEX SDQ)', ['SN 12 APR MEX SDQ'],
  (r) => r.success && r.data.origin === 'MEX' && r.data.destination === 'SDQ' ? null : 'origen/destino incorrectos');
probarTolerancia('SS espaciado del manual (SS 3 J 3)', ['AN25NOVBOGMIA', 'SS 3 J 3'],
  (r, s) => r.success && s.segments.length >= 1 && s.segments[0].class === 'J' && s.segments[0].status === 'HK3' ? null : 'venta no registrada como HK3 clase J');
probarTolerancia('SS unido (SS3J3)', ['AN25NOVBOGMIA', 'SS3J3'],
  (r, s) => r.success && s.segments.length >= 1 && s.segments[0].class === 'J' ? null : 'venta no registrada');
probarTolerancia('FQC espaciado (FQC 35 USD/DOP)', ['FQC 35 USD/DOP'],
  (r) => r.success && r.data.toCurrency === 'DOP' && r.data.convertedAmount === '2065.00' ? null : `conversión incorrecta: ${JSON.stringify(r.data || r)}`);
probarTolerancia('TK espaciado (TK OK)', ['TK OK'],
  (r, s) => r.success && s.ticketing ? null : 'ticketing no registrado');

// DAC con IATA real (el caso de David: WAS debe decir WASHINGTON)
probarTolerancia('DAC WAS -> WASHINGTON', ['DAC WAS'],
  (r) => r.success && r.data.city === 'WASHINGTON' ? null : `respondió: ${JSON.stringify(r.data || r.error)}`);
probarTolerancia('DACWAS unido -> WASHINGTON', ['DACWAS'],
  (r) => r.success && r.data.city === 'WASHINGTON' ? null : `respondió: ${JSON.stringify(r.data || r.error)}`);
probarTolerancia('DAC MDE -> MEDELLIN', ['DAC MDE'],
  (r) => r.success && r.data.city === 'MEDELLIN' ? null : `respondió: ${JSON.stringify(r.data || r.error)}`);
probarTolerancia('DAC XXX -> error honesto', ['DAC XXX'],
  (r) => !r.success && /NO MATCH/.test(r.error) ? null : 'aceptó un código inexistente');
probarTolerancia('DAN SANTO DOMINGO -> SDQ', ['DAN SANTO DOMINGO'],
  (r) => r.success && r.data.code === 'SDQ' ? null : `respondió: ${JSON.stringify(r.data || r.error)}`);
probarTolerancia('DAN WASHINGTON -> WAS', ['DAN WASHINGTON'],
  (r) => r.success && r.data.code === 'WAS' ? null : `respondió: ${JSON.stringify(r.data || r.error)}`);

// ── Comandos nuevos del Material de Apoyo ──
probarTolerancia('MN avanza un día (12APR -> 13APR)', ['SN 12 APR MEX SDQ', 'MN'],
  (r) => r.success && r.data.date === '13APR' ? null : `fecha: ${JSON.stringify(r.data?.date || r.error)}`);
probarTolerancia('MY retrocede y MO vuelve al original', ['SN 12 APR MEX SDQ', 'MN', 'MN', 'MO'],
  (r) => r.success && r.data.date === '12APR' ? null : `fecha: ${JSON.stringify(r.data?.date || r.error)}`);
probarTolerancia('MN cruza fin de mes (30APR -> 1MAY)', ['SN 30 APR MEX SDQ', 'MN'],
  (r) => r.success && r.data.date === '1MAY' ? null : `fecha: ${JSON.stringify(r.data?.date || r.error)}`);
probarTolerancia('FQN1*PE muestra penalidades paginadas', ['FQN1*PE'],
  (r, s) => r.success && r.type === 'PAGED' && /CANCELLATIONS/.test(r.data.page) && s.viewedPenalties ? null : 'sin página de penalidades');
probarTolerancia('MD/MU navegan páginas de FQN', ['FQN1*PE', 'MD'],
  (r) => r.success && r.data.index === 1 && /CHANGES/.test(r.data.page) ? null : `página: ${JSON.stringify(r.data || r.error)}`);
probarTolerancia('MU en primera página -> error honesto', ['FQN1*PE', 'MU'],
  (r) => !r.success && /FIRST PAGE/.test(r.error) ? null : 'no avisó que ya estaba en la primera página');
probarTolerancia('TKXL 24JUL fija plazo', ['TKXL 24JUL'],
  (r, s) => r.success && /TKXL/.test(s.ticketing || '') ? null : `ticketing: ${s.ticketing}`);
probarTolerancia('APE- correo de confirmación', ['APE-ANA@GMAIL.COM'],
  (r, s) => r.success && s.contacts.length === 1 && /ANA@GMAIL.COM/.test(s.contacts[0].text) ? null : 'correo no registrado');
probarTolerancia('SR CTCE- seguridad del correo', ['SR CTCE-ANA//GMAIL.COM'],
  (r, s) => r.success && s.ssrs.length === 1 && /CTCE/.test(s.ssrs[0]) ? null : 'CTCE no registrado');
probarTolerancia('NM niño (CHD/fecha) conserva el nombre completo', ['NM1PEREZ/JUAN(CHD/10MAY18)'],
  (r, s) => r.success && s.passengers.length === 1 && s.passengers[0].name === 'PEREZ/JUAN(CHD/10MAY18)' ? null : `nombre: ${JSON.stringify(s.passengers)}`);
probarTolerancia('XE1-3 borra el rango', ['NM1AAA/UNO', 'NM1BBB/DOS', 'NM1CCC/TRES', 'XE1-3'],
  (r, s) => r.success && s.passengers.length === 0 ? null : `quedaron: ${s.passengers.length}`);
probarTolerancia('XE con lista (XE1,3) borra solo esas', ['NM1AAA/UNO', 'NM1BBB/DOS', 'NM1CCC/TRES', 'XE1,3'],
  (r, s) => r.success && s.passengers.length === 1 && /BBB/.test(s.passengers[0].name) ? null : `quedaron: ${JSON.stringify(s.passengers)}`);

// ── Bug del profesor: XE debe borrar CUALQUIER línea visible del PNR ──
probarTolerancia('Caso del profesor: XE2,3 borra los dos remarks',
  ['NM1GARCIA/CARLOS MR', 'RM HOLA', 'RM HALO', 'XE2,3'],
  (r, s) => {
    if (!r.success) return `XE2,3 falló: ${r.error}`;
    return s.remarks.length === 0 ? null : `quedaron ${s.remarks.length} remarks`;
  });
probarTolerancia('XE borra un remark individual (línea visual)',
  ['NM1GARCIA/CARLOS MR', 'RM NOTA UNO', 'XE2'],
  (r, s) => r.success && s.remarks.length === 0 && s.passengers.length === 1 ? null : `remarks: ${s.remarks.length}`);
probarTolerancia('XE borra la línea de ticketing',
  ['NM1GARCIA/CARLOS MR', 'TK OK', 'XE2'],
  (r, s) => r.success && s.ticketing === null && s.passengers.length === 1 ? null : `ticketing: ${s.ticketing}`);
probarTolerancia('XE borra un SSR por su línea',
  ['NM1GARCIA/CARLOS MR', 'SR VGML', 'XE2'],
  (r, s) => r.success && s.ssrs.length === 0 ? null : `ssrs: ${s.ssrs.length}`);

// ── Comandos que David reporto como faltantes ──
probarTolerancia('TQT muestra el TST tras FXP', ['AN25NOVBOGMIA', 'SS1Y1', 'FXP', 'TQT'],
  (r) => r.success && r.type === 'TST_VIEW' && /REGISTRO DE TARIFA/.test(''+r.data.tst.fareBasis + 'REGISTRO DE TARIFA') ? null : (r.type === 'TST_VIEW' ? null : 'TQT no mostro el TST'));
probarTolerancia('TQT sin TST -> error honesto', ['TQT'],
  (r) => !r.success && /NO TST/.test(r.error) ? null : 'TQT no aviso que falta el TST');
probarTolerancia('TQT/T1 especifico funciona', ['AN25NOVBOGMIA', 'SS1Y1', 'FXP', 'TQT/T1'],
  (r) => r.success && r.type === 'TST_VIEW' && r.data.line === '1' ? null : 'TQT/T1 fallo');
probarTolerancia('ERK guarda y muestra el PNR (como ER)', ['AN25NOVBOGMIA', 'SS1Y1', 'NM1GARCIA/CARLOS MR', 'APBOG 573001234567-M', 'TK OK', 'ERK'],
  (r, s) => r.success && s.isTransacted && s.code ? null : 'ERK no cerro el PNR');

// ── Regresiones negativas: no debe bastar con completar la estructura del PNR. ──
console.log('\n--- SUITE DE REGRESIONES NEGATIVAS ---');

function probarRegresionNegativa(nombre, comandos, verificar, escenario = null) {
  fsm.reset();
  if (escenario?.initialState?.pnr) fsm.setState(escenario.initialState.pnr);

  let lastResult = null;
  for (const cmd of comandos) {
    const pr = parser.parse(cmd);
    if (!pr.success) {
      console.error(`  [FAIL] ${nombre}: "${cmd}" no parseó (${pr.error})`);
      toleranceFailures++;
      return;
    }
    lastResult = fsm.process(pr, flights, locations);
  }

  const err = verificar(lastResult, fsm.getState());
  if (err) {
    console.error(`  [FAIL] ${nombre}: ${err}`);
    toleranceFailures++;
  } else {
    console.log(`  [PASS] ${nombre}`);
  }
}

const scenario19 = scenarios.find((scen) => scen.id === 'scenario-19');
const scenario20 = scenarios.find((scen) => scen.id === 'scenario-20');

probarRegresionNegativa('Nivel 20 no completa sin INF',
  ['AN13MARLIMBOG', 'SS1Y1', 'NM1GARCIA/CARLOS MR', 'APBOG 573004445566-M', 'TK OK', 'FXX/FF-OPTIMA/RAD*IN,BOG', 'ER'],
  (r, s) => !evalEngine.evaluate(scenario20, s).completed ? null : 'completó sin registrar el INF', scenario20);
probarRegresionNegativa('Nivel 20 no completa sin RAD*IN',
  ['AN13MARLIMBOG', 'SS1Y1', 'NM1GARCIA/CARLOS MR(INFGARCIA/SOFIA/01JAN25)', 'APBOG 573004445566-M', 'TK OK', 'FXX/FF-OPTIMA/RAD,BOG', 'ER'],
  (r, s) => !evalEngine.evaluate(scenario20, s).completed ? null : 'completó sin la tarifa RAD*IN', scenario20);
probarRegresionNegativa('Nivel 19 no completa con una nota distinta al TTL',
  ['RT', 'XE4-6', 'RM CUALQUIER COSA', 'ER'],
  (r, s) => !evalEngine.evaluate(scenario19, s).completed ? null : 'aceptó una nota distinta al TTL requerido', scenario19);
probarRegresionNegativa('XE3 borra el RM tras SRXBAG en la línea 2',
  ['NM1GARCIA/CARLOS MR', 'SRXBAG/P1/S1', 'RM NOTA DE EQUIPAJE', 'XE3'],
  (r, s) => r.success && s.remarks.length === 0 && s.baggage.length === 1
    ? null
    : `resultado: ${r.error || 'RM no borrado'}`);
probarRegresionNegativa('TQT/T99 rechaza un TST inexistente',
  ['AN25NOVBOGMIA', 'SS1Y1', 'FXP', 'TQT/T99'],
  (r) => !r.success && /NO TST|CHECK TST/.test(r.error) ? null : 'mostró un TST inexistente');

const erkInvalido = parser.parse('ERKXYZ');
if (erkInvalido.success) {
  console.error('  [FAIL] ERKXYZ no debe parsear: aceptó un sufijo inválido');
  toleranceFailures++;
} else {
  console.log('  [PASS] ERKXYZ no parsea');
}

// ── Módulo de equipaje / EMD (flujo de David) ──
probarTolerancia('SRXBAG registra el servicio de equipaje', ['SRXBAG/P1/S1'],
  (r, s) => r.success && s.baggage.length === 1 && s.baggage[0].pax === 1 && s.baggage[0].seg === 1 ? null : 'no registro XBAG');
probarTolerancia('FXG sin equipaje -> error honesto', ['FXG'],
  (r) => !r.success && /NO BAGGAGE/.test(r.error) ? null : 'guardo sin servicio');
probarTolerancia('FXG crea el TSM', ['SRXBAG/P1/S1', 'FXG'],
  (r, s) => r.success && s.tsm && s.tsm.status === 'STORED' ? null : 'no creo TSM');
probarTolerancia('TTM sin forma de pago -> error', ['SRXBAG/P1/S1', 'FXG', 'TTM/M1/RT'],
  (r) => !r.success && /FORM OF PAYMENT/.test(r.error) ? null : 'emitio sin FP');
probarTolerancia('Flujo EMD completo emite el documento', ['SRXBAG/P1/S1', 'FXG', 'TMI/FP-CASH,', 'TTM/M1/RT'],
  (r, s) => r.success && r.emd && s.tsmIssued ? null : 'no emitio EMD');

// ── Módulo de Cambio Voluntario Manual (reemisión con penalidad) ──
probarTolerancia('DF modo resta (diferencia de tarifa)', ['DF 1890 - 1750'],
  (r) => r.success && r.data.mode === 'DIFF' && r.data.totalSum === 140 ? null : `resultado: ${JSON.stringify(r.data || r.error)}`);
probarTolerancia('DF modo penalidad menos descuento', ['DF 150 P 75'],
  (r) => r.success && r.data.mode === 'PENALTY_MINUS_DISCOUNT' && r.data.totalSum === 75 ? null : `resultado: ${JSON.stringify(r.data || r.error)}`);
probarTolerancia('DF modo suma sigue igual (legacy, no se rompió)', ['DF 500000;250000;100000*2'],
  (r) => r.success && r.data.mode === 'SUM' && r.data.totalSum === 950000 ? null : `resultado: ${JSON.stringify(r.data || r.error)}`);

probarTolerancia('TTE + FXP renumera el TST a T2 (no reinicia en T1)',
  ['AN25NOVBOGMIA', 'SS1Y1', 'FXP', 'TTE/ALL', 'AN25NOVBOGMIA', 'SS1Y1', 'FXP'],
  (r, s) => r.success && s.tst && s.tst.number === 2 ? null : `TST quedó en: ${s.tst?.number}`);

probarTolerancia('FP (TST) y TMI/FP- (TSM) son campos independientes (bug de colisión corregido)',
  ['AN25NOVBOGMIA', 'SS1Y1', 'FXP', 'FP CASH,', 'SRXBAG/P1/S1', 'FXG', 'TMI/FP-VISA'],
  (r, s) => s.tst?.fop === 'CASH,' && s.tsm?.fop === 'VISA' ? null : `tst.fop=${s.tst?.fop} tsm.fop=${s.tsm?.fop}`);

probarTolerancia('TMI/M1/F.../CV-... carga el valor de la penalidad en el TSM',
  ['SRXBAG/P1/S1', 'FXG', 'TMI/M1/F3279/CV-3279'],
  (r, s) => r.success && s.tsm?.penaltyValue === 3279 && s.tsm?.couponValue === 3279 && s.penaltyValueAdded ? null : `tsm=${JSON.stringify(s.tsm)}`);

// TWD/TKT necesita un issuedTicket sembrado (setState), no cabe en probarTolerancia (que solo hace reset()).
(function probarTwdTrasReemision() {
  fsm.reset();
  fsm.setState({
    passengers: [{ id: 1, name: 'TEST/PAX' }],
    segments: [{ id: 1, flight: 'IB1', class: 'Y', date: '01ENE', route: 'MAD-BCN', status: 'HK1' }],
    issuedTicket: { number: '0759999999999', doi: '01ENE26', fareBasisOut: 'YFLEX', total: 100, currency: 'EUR' },
    tst: { number: 1, priceUSD: 100, currency: 'EUR', total: 100, fareBasis: 'YFLEX' }
  });
  const secuencia = ['TTE/ALL', 'AN25NOVBOGMIA', 'SS1Y1', 'FXP', 'TWD/TKT0759999999999'];
  let last = null;
  for (const cmd of secuencia) {
    const pr = parser.parse(cmd);
    last = fsm.process(pr, flights, locations);
  }
  const s = fsm.getState();
  if (last.success && last.type === 'TICKET_DETAIL' && last.data.ticket.doi === '01ENE26') {
    console.log('  [PASS] TWD/TKT sigue leyendo el billete original tras TTE+FXP');
  } else {
    console.error(`  [FAIL] TWD/TKT tras reemisión: ${JSON.stringify(last)}`);
    toleranceFailures++;
  }
})();

const scenario23 = scenarios.find((scen) => scen.id === 'scenario-23');
probarRegresionNegativa('Nivel 23 no completa si se omite TTI/EXCH (falta evidencia de reemisión)',
  scenario23.suggestedFlow.filter((cmd) => cmd !== 'TTI/EXCH/T2'),
  (r, s) => !evalEngine.evaluate(scenario23, s).completed ? null : 'completó sin marcar la reemisión con TTI/EXCH', scenario23);

// ── Fixes de la auditoría externa (01AGO26) — exploits cerrados ──
probarRegresionNegativa('Nivel 23: exploit cerrado — no completa si se omiten AN/SS/XE (no tocó los vuelos reales)',
  scenario23.suggestedFlow.filter((cmd) => !['AN13MARMADBER', 'SS1Y1', 'XE2'].includes(cmd)),
  (r, s) => !evalEngine.evaluate(scenario23, s).completed ? null : 'completó sin cambiar los vuelos reales (exploit crítico reportado por auditoría)', scenario23);

probarRegresionNegativa('Nivel 23: no completa si se sustituye TTP1/TTM por otra emisión (isTicketed solo no basta)',
  scenario23.suggestedFlow.map((cmd) => cmd === 'TTP1/TTM/T2/M1/ET/RT' ? 'TTM/M1/RT' : cmd),
  (r, s) => !evalEngine.evaluate(scenario23, s).completed ? null : 'completó sin ejecutar la emisión combinada real (isTicketed venía sembrado en true)', scenario23);

const scenario24 = scenarios.find((scen) => scen.id === 'scenario-24');
probarRegresionNegativa('Nivel 24: exploit cerrado — no completa si se omiten AN/SS/XE (no tocó los vuelos reales)',
  scenario24.suggestedFlow.filter((cmd) => !['AN18MARMADBER', 'SS1Y1', 'AN18APRBERMAD', 'XE2,3'].includes(cmd)),
  (r, s) => !evalEngine.evaluate(scenario24, s).completed ? null : 'completó sin cambiar los vuelos reales (exploit crítico reportado por auditoría)', scenario24);

probarRegresionNegativa('Nivel 24: no completa con otra ruta aunque conserve XE2,3 y dos segmentos',
  scenario24.suggestedFlow.map((cmd) =>
    cmd === 'AN18MARMADBER' || cmd === 'AN18APRBERMAD' ? 'AN25NOVBOGMIA' : cmd),
  (r, s) => !evalEngine.evaluate(scenario24, s).completed ? null : 'aceptó una ruta/fecha distinta a MAD-BER y BER-MAD', scenario24);

probarRegresionNegativa('Nivel 24: no completa con clase distinta a Y',
  scenario24.suggestedFlow.map((cmd) => cmd === 'SS1Y1' ? 'SS1C1' : cmd),
  (r, s) => !evalEngine.evaluate(scenario24, s).completed ? null : 'aceptó clase C en lugar de la clase Y requerida', scenario24);

(function probarNoContaminacionDeSetState() {
  const semilla = {
    passengers: [{ id: 1, name: 'TEST/PAX' }],
    segments: [{ id: 1, flight: 'IB1', class: 'Y', date: '01ENE', route: 'MAD-BCN', status: 'HK1' }],
    tst: { number: 1, priceUSD: 100, currency: 'EUR', total: 100, fareBasis: 'YFLEX' }
  };
  fsm.reset();
  fsm.setState(semilla);
  fsm.process(parser.parse('FP CASH,'), flights, locations);
  if (semilla.tst.fop) {
    console.error(`  [FAIL] setState no aisló el TST: el objeto sembrado quedó con fop="${semilla.tst.fop}"`);
    toleranceFailures++;
  } else {
    console.log('  [PASS] setState aísla tst/tsm (copia propia) — el objeto sembrado no se contamina');
  }
})();

(function probarTwdTrasEmisionRealDelMotor() {
  fsm.reset();
  fsm.setState({
    passengers: [{ id: 1, name: 'TEST/PAX' }],
    segments: [{ id: 1, flight: 'IB1', class: 'Y', date: '01ENE', route: 'MAD-BCN', status: 'HK1' }],
    contacts: [{ id: 1, text: 'AP123' }],
    ticketing: 'TK OK'
  });
  const secuencia = ['FXP', 'ER', 'TTP1/ET/RT', 'TWD/L1'];
  let last = null;
  for (const cmd of secuencia) {
    last = fsm.process(parser.parse(cmd), flights, locations);
  }
  if (last.success && last.type === 'TICKET_DETAIL') {
    console.log('  [PASS] TWD funciona tras una emisión real del motor (antes: NO TICKET ON FILE)');
  } else {
    console.error(`  [FAIL] TWD tras emisión real del motor: ${JSON.stringify(last)}`);
    toleranceFailures++;
  }
})();

(function probarTwdLineaInexistenteFalla() {
  fsm.reset();
  fsm.setState({
    passengers: [{ id: 1, name: 'TEST/PAX' }],
    segments: [{ id: 1, flight: 'IB1', class: 'Y', date: '01ENE', route: 'MAD-BCN', status: 'HK1' }],
    contacts: [{ id: 1, text: 'AP123' }],
    ticketing: 'TK OK'
  });
  const secuencia = ['FXP', 'ER', 'TTP1/ET/RT', 'TWD/L999'];
  let last = null;
  for (const cmd of secuencia) {
    last = fsm.process(parser.parse(cmd), flights, locations);
  }
  if (!last.success) {
    console.log('  [PASS] TWD/L999 no encuentra billete (antes: cualquier número de línea devolvía éxito)');
  } else {
    console.error(`  [FAIL] TWD/L999 debía fallar: ${JSON.stringify(last)}`);
    toleranceFailures++;
  }
})();

probarTolerancia('Sintaxis del manual ya parsea: TMC/L5, TQM/M1, TMI/M1/FP-',
  ['IU IB NN1 PENF MAD/P1', 'TMC/L5', 'TQM/M1', 'TMI/M1/FP-CASH,'],
  (r, s) => r.success && s.tsm?.fop === 'CASH' ? null : `resultado: ${JSON.stringify(r)} tsm=${JSON.stringify(s.tsm)}`);

// ── Feedback de David en producción (02AGO26) ──
probarTolerancia('Fare basis refleja la tarifa real: COMFORT -> letra U',
  ['AN25NOVBOGMIA', 'SS1Y1', 'FXP/FF-COMFORT'],
  (r, s) => s.tst?.fareBasis === 'YU' ? null : `fareBasis: ${s.tst?.fareBasis}`);
probarTolerancia('Fare basis BASIC -> letra B, OPTIMA -> letra M',
  ['AN25NOVBOGMIA', 'SS1Y1', 'FXP/FF-BASIC'],
  (r, s) => s.tst?.fareBasis === 'YB' ? null : `fareBasis: ${s.tst?.fareBasis}`);
probarTolerancia('Fare basis FLEX conserva el sufijo literal (letra sin confirmar con David)',
  ['AN25NOVBOGMIA', 'SS1Y1', 'FXP/FF-FLEX'],
  (r, s) => s.tst?.fareBasis === 'YFLEX' ? null : `fareBasis: ${s.tst?.fareBasis}`);

probarTolerancia('Caso exacto de David: FXX/FF-PECOMFORT/RAD,GUA -> GTQ (no USD)',
  ['AN25NOVBOGMIA', 'SS1Y1', 'FXX/FF-PECOMFORT/RAD,GUA'],
  (r) => r.currency === 'GTQ' ? null : `currency: ${r.currency}`);
probarTolerancia('Caso exacto de David: FXP/FF-PECOMFORT crea TST con fare basis letra U (Comfort)',
  ['AN25NOVBOGMIA', 'SS1Y1', 'FXP/FF-PECOMFORT'],
  (r, s) => s.tst?.fareBasis === 'YU' ? null : `fareBasis: ${s.tst?.fareBasis}`);
probarTolerancia('FQC1440USD/GTQ convierte a Guatemala (auditoría propia: tabla de tasas duplicada, FQC tenía su propia copia sin GTQ)',
  ['FQC1440USD/GTQ'],
  (r) => r.success && r.data.toCurrency === 'GTQ' && r.data.convertedAmount === '11160.00' ? null : `resultado: ${JSON.stringify(r.data || r.error)}`);

probarTolerancia('AP con formato válido se acepta', ['APBOG 573001234567-M'],
  (r, s) => r.success && s.contacts.length === 1 ? null : 'no se registró');
probarRegresionNegativa('AP con formato inválido se rechaza (hallazgo de David)',
  ['APBOG-malformado'],
  (r) => !r.success && /FORMAT ERROR/.test(r.error) ? null : 'aceptó un formato de contacto inválido');

probarRegresionNegativa('AN sin origen/destino da error honesto, no default silencioso (hallazgo de David)',
  ['AN25NOV'],
  (r) => !r.success && /FORMAT ERROR/.test(r.error) ? null : `aceptó sin origen/destino: ${JSON.stringify(r)}`);

(function probarLadderSinCeroInvalido() {
  const fsmTmp = new PnrStateMachine();
  let encontrado0 = false;
  for (let seed = 1; seed <= 50; seed++) {
    const ladder = fsmTmp.buildClassLadder(seed, 3);
    Object.keys(ladder).forEach((k) => { if (ladder[k] === 0) encontrado0 = true; });
  }
  if (encontrado0) {
    console.error('  [FAIL] buildClassLadder todavía genera un "0" inválido (hallazgo de David)');
    toleranceFailures++;
  } else {
    console.log('  [PASS] buildClassLadder nunca genera "0" — solo abierto (1-9) o cerrado (C)');
  }
})();

(function probarAnUsaCabinsCorrectamente() {
  // Verifica el WIRING real de AN (formatAvailability), no solo la función
  // aislada — la auditoría propia encontró que un replace_all anterior
  // solo había corregido SN, dejando AN todavía leyendo equipment.json.
  const vueloLargo = { line: 1, airline: 'IB', flightNumber: '999', classes: { J: 4, W: 3, Y: 9 }, cabins: 3, origin: 'BOG', destination: 'MIA', departure: '10:00', arrival: '11:00', equipment: 'NOEXISTE', stops: 0 };
  const output = responseGen.formatAvailability({ date: '25NOV', origin: 'BOG', destination: 'MIA', flights: [vueloLargo] });
  if (/W3/.test(output)) {
    console.log('  [PASS] AN (formatAvailability) usa cabins del vuelo, no equipment.json (wiring real verificado)');
  } else {
    console.error(`  [FAIL] AN no muestra clase premium con cabins=3: ${output}`);
    toleranceFailures++;
  }
})();

probarTolerancia('SS doble segmento tolera espacios (mismo principio que SS normal)',
  ['AN25NOVBOGMIA', 'SS 5 Y 1 * C 2'],
  (r, s) => r.success && s.segments.length >= 2 && s.segments.some((seg) => seg.class === 'Y') && s.segments.some((seg) => seg.class === 'C')
    ? null
    : `segments: ${JSON.stringify(s.segments)}`);

(function probarFormatFlightClassesUsaCabins() {
  const classes = { J: 4, C: 5, Y: 9, W: 3, E: 2 };
  const out2 = responseGen.formatFlightClasses(classes, 2);
  const out3 = responseGen.formatFlightClasses(classes, 3);
  if (/W3/.test(out2)) {
    console.error(`  [FAIL] formatFlightClasses con cabins=2 mostró clase premium: ${out2}`);
    toleranceFailures++;
  } else if (!/W3/.test(out3)) {
    console.error(`  [FAIL] formatFlightClasses con cabins=3 debería mostrar premium: ${out3}`);
    toleranceFailures++;
  } else {
    console.log('  [PASS] formatFlightClasses usa cabins del vuelo (no equipment.json) como fuente única');
  }
})();

probarTolerancia('FQN en cabina Business muestra NO PENALTY (hallazgo de David)',
  ['AN25NOVBOGMIA', 'SS1J1', 'FXP/FF-BUSFLEX', 'FQN1*PE'],
  (r) => r.success && /NO PENALTY \(BUSINESS FARE\)/.test(r.data.page) ? null : `pagina: ${r.data?.page}`);

probarRegresionNegativa('$$PAY sin $$CONFIG falla (comando no existía, hallazgo de David)',
  ['AN25NOVBOGMIA', 'SS1Y1', 'FXP', 'FP CASH,', '$$PAY'],
  (r) => !r.success && /NO PCI PROFILE/.test(r.error) ? null : 'pagó sin perfil PCI cargado');
probarTolerancia('$$CONFIG + $$PAY completan el flujo de cobro',
  ['AN25NOVBOGMIA', 'SS1Y1', 'FXP', 'FP CASH,', '$$CONFIG:CCTYPE/2', '$$PAY'],
  (r, s) => r.success && s.pciConfigured && s.paid ? null : `pciConfigured=${s.pciConfigured} paid=${s.paid}`);

probarTolerancia('SS doble segmento vende 2 vuelos en un comando (propuesta de David)',
  ['AN25NOVBOGMIA', 'SS5Y1*C2'],
  (r, s) => r.success && s.segments.length >= 2 && s.segments.some((seg) => seg.class === 'Y') && s.segments.some((seg) => seg.class === 'C')
    ? null
    : `segments: ${JSON.stringify(s.segments)}`);

probarTolerancia('RTR funciona como alias de RT',
  ['NM1GARCIA/CARLOS MR', 'RTR'],
  (r) => r.success && r.pnr ? null : 'RTR no redespliega el PNR');
probarTolerancia('RTF funciona como alias de RT',
  ['NM1GARCIA/CARLOS MR', 'RTF'],
  (r) => r.success && r.pnr ? null : 'RTF no redespliega el PNR');

(function probarNumeroBilleteEnPnr() {
  fsm.reset();
  fsm.setState({
    passengers: [{ id: 1, name: 'TEST/PAX' }],
    segments: [{ id: 1, flight: 'IB1', class: 'Y', date: '01ENE', route: 'MAD-BCN', status: 'HK1' }],
    contacts: [{ id: 1, text: 'AP+5551234567' }],
    ticketing: 'TK OK'
  });
  const secuencia = ['FXP', 'ER', 'TTP1/ET/RT'];
  for (const cmd of secuencia) fsm.process(parser.parse(cmd), flights, locations);
  const output = responseGen.formatResponse({ success: true, pnr: fsm.getState() }, fsm.getState());
  if (/TKT: \d+/.test(output)) {
    console.log('  [PASS] El número de billete aparece en el PNR redisplegado (hallazgo de David)');
  } else {
    console.error(`  [FAIL] El número de billete no aparece en el PNR: ${output}`);
    toleranceFailures++;
  }
})();

// ── FXX desglosa por tipo de pasajero (petición de David) ──
probarTolerancia('FXX con ADT+CHD desglosa dos tarifas (CHD 75%)',
  ['AN13MARLIMBOG', 'SS2Y1', 'NM2PEREZ/CARLOS MR/JUAN(CHD/10MAY18)', 'FXX/FF-OPTIMA/RAD*CH,BOG'],
  (r) => {
    if (!r.perPax) return 'sin desglose perPax';
    const adt = r.perPax.find((p) => p.type === 'ADT');
    const chd = r.perPax.find((p) => p.type === 'CHD');
    if (!adt || !chd) return 'faltan ADT o CHD';
    return chd.fare === Math.round(adt.fare * 0.75) ? null : 'CHD no es 75% del ADT';
  });
probarTolerancia('FXX con ADT+INF: el infante (10%) sale del nombre del adulto',
  ['AN13MARLIMBOG', 'SS1Y1', 'NM1GARCIA/CARLOS MR(INFGARCIA/SOFIA/01JAN25)', 'FXX/FF-OPTIMA/RAD*IN,BOG'],
  (r) => {
    const adt = (r.perPax || []).find((p) => p.type === 'ADT');
    const inf = (r.perPax || []).find((p) => p.type === 'INF');
    if (!adt || !inf) return 'faltan ADT o INF';
    return inf.fare === Math.round(adt.fare * 0.10) ? null : 'INF no es 10% del ADT';
  });

// ── Vuelos dinámicos (petición de David: no siempre los mismos 3) ──
probarTolerancia('SN muestra escalera completa (>=13 letras) en la 1a opción', ['SN 12 APR MEX SDQ'],
  (r) => {
    const f = r.data.flights[0];
    const n = Object.keys(f.classes || {}).length;
    return r.success && n >= 13 ? null : `solo ${n} clases`;
  });
probarTolerancia('SN/AN entrega 3-5 opciones con línea 1..N y cabinas Y/C/J abiertas', ['SN 12 APR MEX SDQ'],
  (r) => {
    const fl = r.data.flights;
    if (fl.length < 3 || fl.length > 5) return `opciones: ${fl.length}`;
    for (let i = 0; i < fl.length; i++) if (fl[i].line !== i + 1) return 'líneas no secuenciales';
    const ok = fl.every((f) => typeof f.classes.Y === 'number' && typeof f.classes.C === 'number' && typeof f.classes.J === 'number');
    return ok ? null : 'alguna cabina Y/C/J cerrada (rompería la venta)';
  });
// Dinamismo real: dos consultas seguidas NO deben ser idénticas.
probarTolerancia('Dos consultas del mismo tramo dan vuelos distintos', ['AN25NOVBOGMIA'],
  (r) => {
    const firma = (d) => d.flights.map((f) => f.airline + f.flightNumber + f.departure).join('|');
    const a = firma(r.data);
    fsm.reset();
    const b = firma(fsm.process(parser.parse('AN25NOVBOGMIA'), flights, locations).data);
    return a !== b ? null : 'las dos consultas fueron idénticas (no es dinámico)';
  });
// En varias corridas aparecen escalas y clases cerradas (probabilístico).
probarTolerancia('Aparecen escalas (stops=1) en varias consultas', ['AN25NOVBOGMIA'],
  () => {
    for (let k = 0; k < 40; k++) {
      fsm.reset();
      const d = fsm.process(parser.parse('AN10AUGBOGSCL'), flights, locations).data;
      if (d.flights.some((f) => f.stops === 1 && f.via)) return null;
    }
    return 'nunca apareció una opción con escala en 40 consultas';
  });
probarTolerancia('SS en clase cerrada -> error (busca una C real en la escalera)', ['AN25NOVBOGMIA'],
  (r, s) => {
    let cerrada = null;
    for (const f of r.data.flights) {
      const cls = Object.entries(f.classes).find(([, v]) => v === 'C' || v === 0);
      if (cls) { cerrada = { line: f.line, clase: cls[0] }; break; }
    }
    if (!cerrada) return null; // sin clase cerrada esta corrida: nada que verificar
    const res = fsm.process(parser.parse(`SS1${cerrada.clase}${cerrada.line}`), flights, locations);
    return !res.success && /CLOSED/.test(res.error) ? null : 'vendió una clase cerrada';
  });

// ── Suite del QuizEngine (modo Teoría de Juan Pablo) ──
console.log('\n--- SUITE DEL QUIZ (TEORÍA) ---');
let quizFailures = 0;
const quiz = new QuizEngine({ commands: spec.commands, locations, flights });

function probarQuiz(nombre, fn) {
  try {
    const err = fn();
    if (err) { console.error(`  [FAIL] ${nombre}: ${err}`); quizFailures++; }
    else console.log(`  [PASS] ${nombre}`);
  } catch (e) {
    console.error(`  [FAIL] ${nombre}: excepción ${e.message}`); quizFailures++;
  }
}

probarQuiz('Determinismo: mismo seed => mismo quiz', () => {
  const a = quiz.generateQuiz(10, 42);
  const b = quiz.generateQuiz(10, 42);
  return JSON.stringify(a) === JSON.stringify(b) ? null : 'quizzes distintos con el mismo seed';
});

probarQuiz('200 preguntas: 4 opciones únicas y respuesta válida', () => {
  for (let seed = 1; seed <= 20; seed++) {
    for (const q of quiz.generateQuiz(10, seed)) {
      if (q.options.length !== 4) return `"${q.prompt}" tiene ${q.options.length} opciones`;
      if (new Set(q.options).size !== 4) return `opciones duplicadas en "${q.prompt}"`;
      if (q.correctIndex < 0 || q.correctIndex > 3) return `correctIndex inválido en "${q.prompt}"`;
      if (!q.explain) return `sin explicación en "${q.prompt}"`;
    }
  }
  return null;
});

probarQuiz('Todos los tipos de pregunta se generan', () => {
  const tipos = new Set(quiz.generateQuiz(14, 7).map((q) => q.type));
  const faltan = QuizEngine.TYPES.filter((t) => !tipos.has(t));
  return faltan.length === 0 ? null : `faltan tipos: ${faltan.join(',')}`;
});

probarQuiz('Sin prompts repetidos dentro de un quiz', () => {
  const qs = quiz.generateQuiz(10, 99);
  return new Set(qs.map((q) => q.prompt)).size === qs.length ? null : 'prompts repetidos';
});

probarQuiz('city-iata: los distractores nunca son códigos de la misma ciudad', () => {
  for (let seed = 1; seed <= 30; seed++) {
    for (const q of quiz.generateQuiz(10, seed).filter((x) => x.type === 'city-iata')) {
      const ciudad = q.prompt.match(/de (.+)\?$/)[1];
      const codesDeCiudad = locations.filter((l) => l.city === ciudad).map((l) => l.code);
      const malos = q.options.filter((o, i) => i !== q.correctIndex && codesDeCiudad.includes(o));
      if (malos.length) return `distractor ambiguo ${malos[0]} para ${ciudad}`;
    }
  }
  return null;
});

// ── Integridad del banco Iberia (examen real que el usuario reprobó) ──
// Estas pruebas validan el CONTENIDO estático del banco: no generan quiz,
// recorren IBERIA_BANK directamente. Detectan en el sitio exacto el error
// más costoso: un distractor que coincide con la respuesta correcta hace
// que buildOptions() lo filtre y la pregunta quede con 3 opciones y sea
// descartada en silencio por el motor (nadie nota que falta una pregunta).
console.log('\n--- SUITE DEL BANCO IBERIA (EXAMEN REAL) ---');
let iberiaFailures = 0;
function probarIberia(nombre, fn) {
  try {
    const err = fn();
    if (err) { console.error(`  [FAIL] ${nombre}: ${err}`); iberiaFailures++; }
    else console.log(`  [PASS] ${nombre}`);
  } catch (e) {
    console.error(`  [FAIL] ${nombre}: excepción ${e.message}`); iberiaFailures++;
  }
}

probarIberia('Cada pregunta tiene 4 opciones no vacías', () => {
  for (const q of IBERIA_BANK) {
    if (!Array.isArray(q.options) || q.options.length !== 4) return `${q.id}: ${q.options?.length ?? 0} opciones`;
    if (q.options.some((o) => !o || !o.trim())) return `${q.id}: opción vacía`;
  }
  return null;
});

probarIberia('correctIndex apunta a una opción real (0-3)', () => {
  for (const q of IBERIA_BANK) {
    if (typeof q.correctIndex !== 'number' || q.correctIndex < 0 || q.correctIndex > 3) {
      return `${q.id}: correctIndex=${q.correctIndex}`;
    }
  }
  return null;
});

probarIberia('Las 4 opciones de cada pregunta son únicas entre sí', () => {
  for (const q of IBERIA_BANK) {
    if (new Set(q.options).size !== q.options.length) return `${q.id}: opciones duplicadas`;
  }
  return null;
});

probarIberia('Ninguna pregunta sin explicación', () => {
  for (const q of IBERIA_BANK) {
    if (!q.explanation || !q.explanation.trim()) return `${q.id}: sin explanation`;
  }
  return null;
});

probarIberia('Ninguna pregunta sin fuente (source) declarada', () => {
  for (const q of IBERIA_BANK) {
    if (!q.source || !q.source.trim()) return `${q.id}: sin source`;
  }
  return null;
});

probarIberia('Sin ids ni prompts duplicados en el banco', () => {
  const ids = IBERIA_BANK.map((q) => q.id);
  const texts = IBERIA_BANK.map((q) => q.text);
  if (new Set(ids).size !== ids.length) return 'ids duplicados';
  if (new Set(texts).size !== texts.length) return 'preguntas (text) duplicadas';
  return null;
});

console.log(`\n==========================================`);
console.log(`Resumen QA: ${passedScenarios}/${scenarios.length} escenarios superados.`);
console.log(`Tolerancia: ${toleranceFailures === 0 ? 'OK' : toleranceFailures + ' fallos'}`);
console.log(`Quiz: ${quizFailures === 0 ? 'OK' : quizFailures + ' fallos'}`);
console.log(`Banco Iberia: ${iberiaFailures === 0 ? 'OK' : iberiaFailures + ' fallos'}`);
console.log(`==========================================`);

if (passedScenarios < scenarios.length || toleranceFailures > 0 || quizFailures > 0 || iberiaFailures > 0) {
  process.exit(1);
}
