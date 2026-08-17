import { spawn } from 'node:child_process';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const buildEntry = path.join(ROOT, 'scripts', 'build-e2e.mjs');
const serverEntry = path.join(ROOT, 'scripts', 'e2e-static-server.mjs');
const playwrightEntry = path.join(ROOT, 'node_modules', '@playwright', 'test', 'cli.js');
let server = null;

function runNode(entry, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [entry, ...args], {
      cwd: ROOT,
      stdio: 'inherit',
      windowsHide: true
    });
    child.on('error', reject);
    child.on('exit', (code, signal) => resolve(code ?? (signal ? 1 : 0)));
  });
}

function waitForServer(timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const poll = () => {
      const request = http.get('http://127.0.0.1:4173/', (response) => {
        response.resume();
        if (response.statusCode && response.statusCode < 500) return resolve();
        retry();
      });
      request.on('error', retry);
      request.setTimeout(500, () => request.destroy());
    };
    const retry = () => {
      if (Date.now() >= deadline) return reject(new Error('El servidor E2E no inició a tiempo'));
      setTimeout(poll, 100);
    };
    poll();
  });
}

function stopServer() {
  if (!server || server.exitCode !== null) return;
  server.kill('SIGTERM');
  setTimeout(() => {
    if (server.exitCode === null) server.kill();
  }, 1200).unref?.();
}

try {
  const buildResult = await runNode(buildEntry);
  if (buildResult !== 0) {
    process.exitCode = buildResult;
    throw new Error(`La compilacion E2E termino con codigo ${buildResult}`);
  }

  server = spawn(process.execPath, [serverEntry, 'dist-e2e', '4173'], {
    cwd: ROOT,
    stdio: 'inherit',
    windowsHide: true
  });
  await waitForServer();
  const result = await new Promise((resolve, reject) => {
    const runner = spawn(process.execPath, [playwrightEntry, 'test', ...process.argv.slice(2)], {
      cwd: ROOT,
      env: { ...process.env, E2E_EXTERNAL_SERVER: '1' },
      stdio: 'inherit',
      windowsHide: true
    });
    runner.on('error', reject);
    runner.on('exit', (code, signal) => resolve(code ?? (signal ? 1 : 0)));
  });
  process.exitCode = result;
} finally {
  stopServer();
}
