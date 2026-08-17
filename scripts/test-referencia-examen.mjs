import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { prepararReferenciasRag } from './lib/referencias-rag.mjs';

const referencias = JSON.parse(readFileSync(new URL('./referencia-examen.json', import.meta.url), 'utf8'));
const resultado = prepararReferenciasRag(referencias);

assert.equal(resultado.verificadas.length, 5);
assert.equal(resultado.pendientes.length, 3);
assert.equal(new Set(resultado.verificadas.map((r) => r.id)).size, resultado.verificadas.length);

for (const ref of resultado.verificadas) {
  assert.match(ref.fuente, /·/);
  assert.ok(ref.texto.length > 40);
  assert.doesNotMatch(ref.fuente, /^Referencia:/);
}

const indexado = JSON.stringify(resultado.verificadas);
assert.doesNotMatch(indexado, /Tasa Q1|Tasa ZK|Derecho de Retracto|Ley de Desistimiento/i);

console.log(`✓ Referencias RAG: ${resultado.verificadas.length} verificadas; ${resultado.pendientes.length} pendientes excluidas`);
