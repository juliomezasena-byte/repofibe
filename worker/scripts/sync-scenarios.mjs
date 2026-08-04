import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = path.join(__dirname, '../../public/profiles/amadeus/scenarios.json');
const outPath = path.join(__dirname, '../src/scenarios.generated.json');

const raw = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

if (!Array.isArray(raw.scenarios) || raw.scenarios.length === 0) {
  console.error('[FAIL] scenarios.json no tiene un array "scenarios" con elementos.');
  process.exit(1);
}

const minimal = raw.scenarios.map((s) => {
  if (!s.id || !s.title || !s.description) {
    throw new Error(`Escenario incompleto (falta id/title/description): ${JSON.stringify(s)}`);
  }
  return { id: s.id, title: s.title, description: s.description };
});

fs.writeFileSync(outPath, JSON.stringify(minimal, null, 2) + '\n');
console.log(`[OK] ${minimal.length} escenarios sincronizados en scenarios.generated.json`);
