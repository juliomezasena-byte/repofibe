import { execSync } from 'child_process';
import path from 'path';

const actions = [
  { accion: 'navegar', url: 'https://simulador-3362613.web.app' },
  { accion: 'snapshot' },
  { accion: 'screenshot', archivo: '.fabrica/design-review-despues.png' }
];

const scriptArg = JSON.stringify(actions);
const cmd = `node "C:/Users/mesw/.repofibe/app/nucleo/navegador.mjs" ejecutar ${JSON.stringify(scriptArg)}`;

try {
  const output = execSync(cmd, { encoding: 'utf8' });
  console.log(output);
} catch (err) {
  console.error('Error:', err.stdout || err.message);
}
