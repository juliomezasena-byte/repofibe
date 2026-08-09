// Arranca el build + preview para E2E con VITE_E2E_MOCK_AUTH forzado por
// child_process.spawn (cross-platform, no depende de sintaxis de shell
// como `VAR=1 cmd` o `set VAR=1 && cmd`, que difiere entre sh y cmd.exe).
import { spawn } from 'child_process';

const env = { ...process.env, VITE_E2E_MOCK_AUTH: '1' };

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env, stdio: 'inherit', shell: true });
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
const SALIDA = 'dist-e2e';

async function main() {
  await run('npx', ['vite', 'build', '--outDir', SALIDA]);
  await run('npx', ['vite', 'preview', '--outDir', SALIDA, '--port', '4173']);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
