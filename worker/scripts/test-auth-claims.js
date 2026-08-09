import { assertValidClaims, verifyFirebaseIdToken } from '../src/auth.js';

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

// Un fallo de credenciales tiene que devolver 401, no 500. El 09AGO26 el
// sitio mandó "Bearer mock-token"; jose lanzó "Invalid Compact JWS", que no
// casaba con la lista de palabras del clasificador, y el usuario vio un 500
// —como si el servidor estuviera roto— en vez de "vuelve a iniciar sesión".
check('todo error de auth trae status 401', (() => {
  const casos = [
    { ...validPayload, iss: 'https://otro.com' },
    { ...validPayload, aud: 'otro-proyecto' },
    { ...validPayload, exp: now - 10 },
    { ...validPayload, sub: undefined }
  ];
  return casos.every((p) => {
    try {
      assertValidClaims(p, projectId);
      return false;
    } catch (err) {
      return err.status === 401 && err.name === 'ErrorDeAutenticacion';
    }
  });
})());

check('un token que ni siquiera es un JWT da 401, no 500', await (async () => {
  try {
    await verifyFirebaseIdToken('mock-token', projectId);
    return false;
  } catch (err) {
    // Lo que importa es el código: el mensaje de jose puede cambiar de versión.
    return err.status === 401;
  }
})());

console.log(`\nResultados: ${passed} pasados, ${failed} fallidos.`);
if (failed > 0) process.exit(1);
