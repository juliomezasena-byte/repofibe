import assert from 'node:assert/strict';
import { checkInterpretation, getInteractiveDefinition, getPreflightDefinition } from '../src/lib/interactiveExercises.js';

const availability = getInteractiveDefinition('SN 12 APR MEX SDQ');
assert.equal(availability.id, 'availability');
assert.equal(checkInterpretation(availability, 'availability').correct, true);
assert.equal(checkInterpretation(availability, 'sale').correct, false);

const sale = getInteractiveDefinition('SS 3 Y 1');
assert.equal(sale.id, 'sale');
assert.equal(sale.options.filter((option) => option.correct).length, 1);

const preflight = getPreflightDefinition({ suggestedFlow: ['AN15DECMADBCN'] });
assert.equal(preflight.options.find((option) => option.correct).id, 'availability');

const unknown = getInteractiveDefinition('COMANDO-NO-DOCUMENTADO');
assert.equal(unknown.id, 'generic');
assert.equal(checkInterpretation(unknown, 'evidence').correct, true);

console.log('Interactive exercise contract: 4/4 checks passed.');
