#!/usr/bin/env node
/**
 * Guarda la clave del asistente SIN escribirla en la página.
 *
 *   node scripts/bot-clave.mjs "tu-clave"
 *
 * En vez de `data-clave="tu-clave"`, deja en el HTML una sal aleatoria y el
 * resultado de derivarla con PBKDF2-SHA256. Quien abra el código fuente ve
 * dos cadenas de hexadecimal que no se pueden deshacer.
 *
 * QUÉ ARREGLA Y QUÉ NO — conviene tenerlo claro:
 *
 *   SÍ · nadie puede LEER tu clave en el código. Si la reutilizas en el
 *        correo o el banco, deja de estar expuesta. Ese era el riesgo serio.
 *   SÍ · la sal impide usar tablas de hashes ya calculadas.
 *   SÍ · 250.000 iteraciones hacen que probar claves a lo bruto sea lento.
 *
 *   NO · la puerta sigue sin ser una cerradura: el widget corre en el
 *        navegador del visitante, y quien sepa hacerlo puede saltárselo desde
 *        la consola. Esconder la clave y cerrar la puerta son cosas distintas;
 *        esto hace lo primero. Para lo segundo hace falta un servidor que
 *        decida quién entra — el Campus.
 */

import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ITERACIONES = 250000;
export const BYTES = 32;

const LANDING = join(
  dirname(fileURLToPath(import.meta.url)),
  '..', '..', 'hyntibia llsm', 'HYNTIBIA', 'hyntibia-v1', 'index.html'
);

/** Mismos parámetros que usa el navegador con crypto.subtle. */
export function derivar(clave, salHex) {
  return pbkdf2Sync(
    Buffer.from(clave, 'utf8'),
    Buffer.from(salHex, 'hex'),
    ITERACIONES,
    BYTES,
    'sha256'
  ).toString('hex');
}

// Ejecutado directamente (no importado por un test)
if (process.argv[1] && process.argv[1].endsWith('bot-clave.mjs')) {
  const clave = process.argv[2];
  if (!clave) {
    console.error('Uso: node scripts/bot-clave.mjs "tu-clave"');
    process.exit(1);
  }
  if (clave.length < 8) {
    console.error('Esa clave es muy corta. Con menos de 8 caracteres, probarlas todas es cuestión de minutos.');
    process.exit(1);
  }

  const sal = randomBytes(16).toString('hex');
  const hash = derivar(clave, sal);

  let html = readFileSync(LANDING, 'utf8');
  const antes = html;

  // Se quita cualquier data-clave en claro que hubiera y se ponen sal + hash.
  html = html.replace(
    /<script src="assets\/hyntibia-bot-widget\.js"[^>]*><\/script>/,
    `<script src="assets/hyntibia-bot-widget.js" data-sal="${sal}" data-clave-hash="${hash}"></script>`
  );

  if (html === antes) {
    console.error('No encontré la etiqueta del widget en index.html. ¿Se movió?');
    process.exit(1);
  }
  if (html.includes('data-clave="')) {
    console.error('Ha quedado un data-clave en claro en la página. Revísalo a mano.');
    process.exit(1);
  }

  writeFileSync(LANDING, html, 'utf8');

  console.log('✓ Clave guardada como hash. Ya no aparece en el código de la página.');
  console.log(`  sal   ${sal}`);
  console.log(`  hash  ${hash.slice(0, 24)}…`);
  console.log('');
  console.log('  Recuerda: esto esconde la clave, no cierra la puerta.');
  console.log('  El widget corre en el navegador del visitante y se puede saltar desde la consola.');
}
