import assert from 'node:assert/strict';
import procedimientos from '../src/procedimientos.generated.json' with { type: 'json' };

const ids = Object.keys(procedimientos);
assert.ok(ids.length >= 20, `Se esperaban al menos 20 procedimientos, hay ${ids.length}`);
for (const [id, procedimiento] of Object.entries(procedimientos)) {
  if (id.startsWith('_')) continue;
  const expectedId = id.startsWith('_') ? id.slice(1) : id;
  assert.equal(procedimiento.id, expectedId, `id desfasado: ${id}`);
  assert.ok(procedimiento.titulo, `sin titulo: ${id}`);
  const pasos = procedimiento.pasos || procedimiento.steps || procedimiento.fases;
  const ejercicioMaestro = procedimiento.categoria === 'ejercicios-maestros';
  const contenidoEstructurado = Object.keys(procedimiento).some((clave) =>
    !['id', 'titulo', 'aerolinea', 'categoria', 'resumen', 'aplicaSolo', 'fuente', 'pasos', 'steps', 'fases', 'advertencias'].includes(clave)
  );
  const tieneManualOperativo = Array.isArray(pasos) && pasos.length > 0 || ejercicioMaestro || contenidoEstructurado || (procedimiento.resumen && procedimiento.advertencias?.length);
  assert.ok(tieneManualOperativo, `sin contenido operativo: ${id}`);
}
console.log(`test-manual-audit: OK (${ids.length} procedimientos)`);
