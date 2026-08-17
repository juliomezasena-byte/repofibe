import assert from 'node:assert/strict';

import {
  generateIntentClassificationServidor,
  generateTutorTextServidor,
  preguntarServidor
} from '../worker/src/gemini.js';

const peticiones = [];
globalThis.fetch = async (url, opciones) => {
  peticiones.push({ url: String(url), opciones });
  return {
    ok: true,
    async json() { return { explicacion: 'ok', intencion: 'ninguna', confianza: 'alta' }; }
  };
};

await generateIntentClassificationServidor('/api/gemini', 'clasifica', ['emision'], 'clave-segura');
await generateTutorTextServidor('/api/gemini', 'redacta', 'clave-segura');
await preguntarServidor('/api/gemini', 'pregunta', 'clave-segura');

assert.equal(peticiones.length, 3);
for (const { opciones } of peticiones) {
  assert.equal(opciones.headers['X-Bot-Clave'], 'clave-segura');
  assert.ok(JSON.parse(opciones.body).modo);
}

console.log('✓ Todas las llamadas al puente Vertex llevan la clave de acceso');
