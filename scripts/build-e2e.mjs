import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const viteEntry = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');

const result = await new Promise((resolve, reject) => {
  const build = spawn(
    process.execPath,
    [viteEntry, 'build', '--mode', 'test', '--outDir', 'dist-e2e'],
    {
      cwd: ROOT,
      env: { ...process.env, VITE_E2E_MOCK_AUTH: '1' },
      stdio: 'inherit',
      windowsHide: true
    }
  );

  build.on('error', reject);
  build.on('exit', (code, signal) => resolve(code ?? (signal ? 1 : 0)));
});

process.exitCode = result;
