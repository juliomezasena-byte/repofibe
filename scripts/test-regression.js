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

  let flowErrors = 0;
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

console.log(`\n==========================================`);
console.log(`Resumen QA: ${passedScenarios}/${scenarios.length} escenarios superados.`);
console.log(`Tolerancia: ${toleranceFailures === 0 ? 'OK' : toleranceFailures + ' fallos'}`);
console.log(`==========================================`);

if (passedScenarios < scenarios.length || toleranceFailures > 0) {
  process.exit(1);
}
