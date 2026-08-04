import { buildPassengerSystemPrompt, buildEvaluationPrompt, RUBRIC } from '../src/prompts.js';

let passed = 0;
let failed = 0;

function check(name, condition) {
  if (condition) {
    console.log(`[PASS] ${name}`);
    passed++;
  } else {
    console.error(`[FAIL] ${name}`);
    failed++;
  }
}

console.log('--- TEST RUNNER: prompts ---');

const scenario = { id: 'scenario-1', title: 'Nivel 1', description: 'El cliente llama desde México pidiendo un vuelo a Santo Domingo.' };

const passengerPrompt = buildPassengerSystemPrompt(scenario);
check('incluye la descripcion del escenario', passengerPrompt.includes(scenario.description));
check('instruye responder en español', /español/i.test(passengerPrompt));
check('instruye no revelar comandos técnicos', /comandos? técnicos?/i.test(passengerPrompt));

const transcript = [
  { role: 'agent', text: 'Iberia, buenos días, ¿en qué puedo ayudarle?' },
  { role: 'passenger', text: 'Quiero saber el estado de mi vuelo.' }
];
const evalPrompt = buildEvaluationPrompt(scenario, transcript);
check('el prompt de evaluación incluye la transcripción', evalPrompt.includes('Quiero saber el estado de mi vuelo.'));
check('el prompt de evaluación menciona todos los pasos del guion corporativo', RUBRIC.every((c) => evalPrompt.includes(c.name)));
check('RUBRIC tiene exactamente los 6 pasos del guion corporativo', RUBRIC.length === 6);

console.log(`\nResultados: ${passed} pasados, ${failed} fallidos.`);
if (failed > 0) process.exit(1);
