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
    const processResult = fsm.process(parseResult, flights);
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

console.log(`\n==========================================`);
console.log(`Resumen QA: ${passedScenarios}/${scenarios.length} escenarios superados.`);
console.log(`==========================================`);

if (passedScenarios < scenarios.length) {
  process.exit(1);
}
