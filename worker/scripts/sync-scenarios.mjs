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

// Los procedimientos empaquetados, para comprobar que un escenario no declare
// un manual que no existe: si lo hiciera, el auditor de la llamada evaluaría
// contra la nada y nadie se enteraría.
const procedimientos = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../src/procedimientos.generated.json'), 'utf8')
);

const minimal = raw.scenarios.map((s) => {
  if (!s.id || !s.title || !s.description) {
    throw new Error(`Escenario incompleto (falta id/title/description): ${JSON.stringify(s)}`);
  }
  if (s.procedimientoId && !procedimientos[s.procedimientoId]) {
    throw new Error(
      `${s.id} declara el procedimiento "${s.procedimientoId}", que no existe en public/procedimientos/.`
    );
  }
  // `procedimientoId` viaja al Worker: es lo que permite al auditor evaluar si
  // el agente siguió el manual, no solo si habló bien. Va opcional a propósito
  // — un escenario sin manual declarado se evalúa solo por trato, sin inventar.
  return {
    id: s.id,
    title: s.title,
    description: s.description,
    ...(s.procedimientoId ? { procedimientoId: s.procedimientoId } : {})
  };
});

const conProc = minimal.filter((s) => s.procedimientoId).length;

fs.writeFileSync(outPath, JSON.stringify(minimal, null, 2) + '\n');
console.log(`[OK] ${minimal.length} escenarios sincronizados · ${conProc} con procedimiento declarado`);
