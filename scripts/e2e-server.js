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

async function main() {
  await run('npm', ['run', 'build']);
  await run('npx', ['vite', 'preview', '--port', '4173']);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
