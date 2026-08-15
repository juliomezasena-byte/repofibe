import assert from 'node:assert/strict';
import {
  createScenarioSession,
  createProcedureSession,
  getPrimaryAction,
  transitionSession,
  sameSessionIdentity,
  toSafeSessionSnapshot,
  writeSafeSessionSnapshot,
  readSafeSessionSnapshot
} from '../src/lib/exerciseSession.js';

const scenario = {
  id: 'scenario-test',
  title: 'Consulta de prueba',
  description: 'TAREA: Ejecuta la consulta',
  initialState: { searchDate: '12APR', searchOrigin: 'MEX', searchDestination: 'SDQ' },
  suggestedFlow: ['SN 12 APR MEX SDQ']
};

const procedure = {
  id: 'proc-test',
  procedimientoId: 'manual-test',
  titulo: 'Manual de prueba',
  descripcion: 'Caso manual',
  seedPnr: { passengers: [], segments: [] }
};

const scenarioSession = createScenarioSession(scenario);
assert.equal(scenarioSession.kind, 'scenario');
assert.equal(scenarioSession.exerciseId, 'scenario-test');
assert.equal(scenarioSession.station, 'amadeus');
assert.equal(scenarioSession.currentStep, 'brief');
assert.equal(getPrimaryAction(scenarioSession).label, 'Ver el caso');

const ready = transitionSession(scenarioSession, { type: 'brief_viewed' });
assert.equal(ready.currentStep, 'ready');
assert.equal(getPrimaryAction(ready).label, 'Ejecutar en terminal');

const executed = transitionSession(ready, { type: 'command_executed', command: 'SN 12 APR MEX SDQ' });
assert.equal(executed.currentStep, 'interpreting');
assert.equal(executed.history.length, 1);
assert.equal(getPrimaryAction(executed).label, 'Analizar la salida');

const recovered = transitionSession(executed, { type: 'interpretation_submitted', correct: false });
assert.equal(recovered.currentStep, 'recovery');
assert.equal(getPrimaryAction(recovered).label, 'Ver pista y reintentar');

const procedureSession = createProcedureSession(procedure, { station: 'manual' });
assert.equal(procedureSession.kind, 'procedure');
assert.equal(procedureSession.exerciseId, 'proc-test');
assert.equal(procedureSession.station, 'manual');
assert.equal(getPrimaryAction(procedureSession).label, 'Leer el caso');

assert.equal(sameSessionIdentity(scenarioSession, createScenarioSession(scenario)), true);
assert.equal(sameSessionIdentity(scenarioSession, procedureSession), false);

const sensitiveSession = {
  ...scenarioSession,
  pnr: { passengers: [{ name: 'PRIVATE/PASSENGER' }] },
  pastedScreen: 'PRIVATE SCREEN'
};
const safeSnapshot = toSafeSessionSnapshot(sensitiveSession);
assert.equal(safeSnapshot.scenarioId, 'scenario-test');
assert.equal('pnr' in safeSnapshot, false);
assert.equal('pastedScreen' in safeSnapshot, false);

const storage = new Map();
const fakeStorage = {
  setItem: (key, value) => storage.set(key, value),
  getItem: (key) => storage.get(key) || null
};
assert.equal(writeSafeSessionSnapshot(sensitiveSession, fakeStorage), true);
assert.equal(readSafeSessionSnapshot(fakeStorage).exerciseId, 'scenario-test');
assert.equal(readSafeSessionSnapshot(fakeStorage).mode, 'guided');

console.log('exercise-session: 16/16 assertions passed');
