import { spawnSync } from 'child_process';
import path from 'path';

const actions = [
  { accion: 'navegar', url: 'http://localhost:3000/' },
  { accion: 'screenshot', archivo: '.fabrica/design-review-antes.png' }
];

const result = spawnSync('node', [
  'C:\\Users\\mesw\\.repofibe\\app\\nucleo\\navegador.mjs',
  'ejecutar',
  JSON.stringify(actions)
], { encoding: 'utf-8' });

console.log(result.stdout);
if (result.stderr) console.error(result.stderr);
