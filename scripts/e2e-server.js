// Sirve la salida aislada que `build:e2e` prepara antes de lanzar Playwright.
// El modo evita inyectar VITE_E2E_MOCK_AUTH en Windows gestionado, donde esa
// variable hacía que esbuild no pudiera resolver el vite.config.js.
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const env = { ...process.env };

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env,
      stdio: 'inherit',
      shell: options.shell ?? (process.platform === 'win32'),
      cwd: ROOT
    });
    activeChild = child;
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${command} exited with code ${code}`))));
    child.on('error', reject);
  });
}

// El build de E2E va a SU PROPIA carpeta, nunca a dist/.
//
// Antes compilaba sobre dist/ con VITE_E2E_MOCK_AUTH=1, así que la secuencia
// normal de trabajo —compilar, pasar los tests, desplegar— subía a producción
// el build que se salta el login: el sitio real mandaba "Bearer mock-token" y
// el Worker respondía 500 (Invalid Compact JWS). Pasó el 09AGO26.
//
// Con outDir separado, `firebase deploy` no puede recoger el build de pruebas
// ni aunque los tests se ejecuten justo antes.
// `dist-flow-test` falla en algunos equipos Windows gestionados porque el
// proceso de esbuild intenta resolverlo como una ruta fuera del workspace.
// `dist-e2e` ya es la salida aislada del runner y no se publica en Firebase.
const SALIDA = 'dist-test';
let activeChild = null;

function stop() {
  if (activeChild && !activeChild.killed) activeChild.kill();
  process.exit(0);
}

process.on('SIGTERM', stop);
process.on('SIGINT', stop);

async function main() {
  const staticServer = resolve(ROOT, 'scripts', 'e2e-static-server.mjs');
  await run(process.execPath, [staticServer, SALIDA, '4173'], { shell: false });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
