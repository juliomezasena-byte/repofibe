import { assertValidClaims } from '../src/auth.js';

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

console.log('--- TEST RUNNER: auth claims ---');

const projectId = 'simulador-3362613';
const now = Math.floor(Date.now() / 1000);

const validPayload = {
  iss: `https://securetoken.google.com/${projectId}`,
  aud: projectId,
  sub: 'uid-123',
  exp: now + 3600
};

check('claims válidas no lanzan error', (() => {
  try {
    assertValidClaims(validPayload, projectId);
    return true;
  } catch {
    return false;
  }
})());

check('rechaza issuer incorrecto', (() => {
  try {
    assertValidClaims({ ...validPayload, iss: 'https://otro.com' }, projectId);
    return false;
  } catch {
    return true;
  }
})());

check('rechaza audience incorrecto', (() => {
  try {
    assertValidClaims({ ...validPayload, aud: 'otro-proyecto' }, projectId);
    return false;
  } catch {
    return true;
  }
})());

check('rechaza token expirado', (() => {
  try {
    assertValidClaims({ ...validPayload, exp: now - 10 }, projectId);
    return false;
  } catch {
    return true;
  }
})());

check('rechaza payload sin sub (uid)', (() => {
  try {
    assertValidClaims({ ...validPayload, sub: undefined }, projectId);
    return false;
  } catch {
    return true;
  }
})());

console.log(`\nResultados: ${passed} pasados, ${failed} fallidos.`);
if (failed > 0) process.exit(1);
