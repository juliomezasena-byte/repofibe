import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DslParser } from '../src/engine/DslParser.js';
import { PnrStateMachine } from '../src/engine/PnrStateMachine.js';
import { ResponseGenerator } from '../src/engine/ResponseGenerator.js';
import { EvaluationEngine } from '../src/engine/EvaluationEngine.js';

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
  (r, s) => r.success && s.segments.length === 1 && s.segments[0].class === 'J' && s.segments[0].status === 'HK3' ? null : 'venta no registrada como HK3 clase J');
probarTolerancia('SS unido (SS3J3)', ['AN25NOVBOGMIA', 'SS3J3'],
  (r, s) => r.success && s.segments.length === 1 && s.segments[0].class === 'J' ? null : 'venta no registrada');
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
probarTolerancia('Caso del profesor: XE3,4 borra los dos remarks',
  ['AN20APRSDQMEX', 'SS1V1', 'NM1GARCIA/CARLOS MR', 'RM HOLA', 'RM HALO', 'XE3,4'],
  (r, s) => {
    if (!r.success) return `XE3,4 falló: ${r.error}`;
    if (s.remarks.length !== 0) return `quedaron ${s.remarks.length} remarks`;
    if (s.passengers.length !== 1 || s.segments.length !== 1) return 'borró pasajero o segmento por error';
    return null;
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

// ── Escalera de clases RBD completa y escalas (como en clase) ──
probarTolerancia('SN muestra escalera completa de clases (>=15 letras)', ['SN 12 APR MEX SDQ'],
  (r) => {
    const f = r.data.flights[0];
    const n = Object.keys(f.classes || {}).length;
    return r.success && n >= 15 ? null : `solo ${n} clases en la primera opción`;
  });
probarTolerancia('SN incluye opción con escala (IB VIA MAD)', ['SN 12 APR MEX SDQ'],
  (r) => r.data.flights.some((f) => f.airline === 'IB' && f.stops === 1 && f.via === 'MAD') ? null : 'no aparece la opción con escala');
probarTolerancia('Escalera marca clases cerradas con C', ['SN 12 APR MEX SDQ'],
  (r) => r.data.flights.some((f) => Object.values(f.classes).includes('C')) ? null : 'ninguna clase cerrada C');
probarTolerancia('SS en clase cerrada (Q de AV0026) -> error', ['AN25NOVBOGMIA', 'SS1Q1'],
  (r, s) => !r.success && /CLOSED/.test(r.error) && s.segments.length === 0 ? null : 'vendió una clase cerrada');
probarTolerancia('Ruta sin catálogo también trae 3 opciones con escalera', ['SN 10 AUG BOG SCL'],
  (r) => {
    const fl = r.data.flights;
    const ok = r.success && fl.length === 3 && fl.every((f) => Object.keys(f.classes).length >= 15) && fl.some((f) => f.stops === 1);
    return ok ? null : `opciones: ${fl.length}`;
  });

console.log(`\n==========================================`);
console.log(`Resumen QA: ${passedScenarios}/${scenarios.length} escenarios superados.`);
console.log(`Tolerancia: ${toleranceFailures === 0 ? 'OK' : toleranceFailures + ' fallos'}`);
console.log(`==========================================`);

if (passedScenarios < scenarios.length || toleranceFailures > 0) {
  process.exit(1);
}
