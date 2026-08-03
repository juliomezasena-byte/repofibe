import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getDailyPlan, getDailyRecommendation, recordScenarioCompletion } from '../src/lib/learningPath.js';
import { getLessonContent } from '../src/lib/lessonContent.js';

const scenarios = JSON.parse(fs.readFileSync('public/profiles/amadeus/scenarios.json', 'utf8')).scenarios;
const curriculum = JSON.parse(fs.readFileSync('public/profiles/amadeus/curriculum.json', 'utf8'));
const scenarioIds = new Set(scenarios.map((scenario) => scenario.id));
const nodeIds = new Set(curriculum.nodes.map((node) => node.scenarioId));

assert.equal(curriculum.nodes.length, scenarios.length, 'cada escenario debe tener un nodo');
assert.equal(nodeIds.size, curriculum.nodes.length, 'no debe haber nodos duplicados');
assert.deepEqual([...nodeIds].sort(), [...scenarioIds].sort(), 'nodos y escenarios deben coincidir');
for (const node of curriculum.nodes) {
  assert.ok(curriculum.phases.some((phase) => phase.id === node.phaseId), `${node.scenarioId}: fase inexistente`);
  for (const prerequisite of node.prerequisites) assert.ok(nodeIds.has(prerequisite), `${node.scenarioId}: prerrequisito inexistente`);
}

const firstLesson = getLessonContent(scenarios.find((scenario) => scenario.id === 'scenario-1'));
assert.equal(firstLesson.title, 'Consultar disponibilidad');
assert.ok(firstLesson.objective.length > 20, 'la lección debe tener un objetivo claro');
assert.ok(firstLesson.steps.length >= 3, 'la lección debe tener pasos guiados');
const fallbackLesson = getLessonContent(scenarios.find((scenario) => scenario.id === 'scenario-24'));
assert.ok(fallbackLesson.steps.length >= 3, 'toda lección debe tener guía aunque use respaldo');

const now = Date.UTC(2026, 7, 2, 12);
let progress = {};
assert.equal(getDailyRecommendation(scenarios, curriculum, progress, now), 'scenario-1');
let dailyPlan = getDailyPlan(scenarios, curriculum, progress, now);
assert.equal(dailyPlan.newMission, 'scenario-1', 'la ruta vacía debe proponer el primer ejercicio');
assert.equal(dailyPlan.review, null, 'la ruta vacía no debe inventar un repaso');
progress = recordScenarioCompletion(progress, 'scenario-1', 100, curriculum, now);
assert.equal(getDailyRecommendation(scenarios, curriculum, progress, now), 'scenario-2');
dailyPlan = getDailyPlan(scenarios, curriculum, progress, now);
assert.equal(dailyPlan.review, null, 'un ejercicio recién completado no está vencido');
assert.equal(dailyPlan.newMission, 'scenario-2', 'después de completar un nodo debe avanzar al siguiente disponible');
progress['scenario-1'].nextReviewAt = now - 1;
dailyPlan = getDailyPlan(scenarios, curriculum, progress, now);
assert.equal(dailyPlan.review, 'scenario-1', 'un nodo vencido debe aparecer como repaso');
assert.equal(dailyPlan.newMission, 'scenario-2', 'el repaso no debe ocultar el ejercicio nuevo');
progress = recordScenarioCompletion(progress, 'scenario-1', 100, curriculum, now);
assert.equal(progress['scenario-1'].consolidated, false, 'dos intentos el mismo día no consolidan');
progress = recordScenarioCompletion(progress, 'scenario-1', 100, curriculum, now + 2 * 24 * 60 * 60 * 1000);
assert.equal(progress['scenario-1'].consolidated, true, 'dos sesiones separadas consolidan');

console.log('Learning path: OK (24 nodos, prerrequisitos válidos, misión diaria y consolidación)');
