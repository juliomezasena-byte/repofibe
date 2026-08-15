#!/usr/bin/env node
/**
 * Empaqueta el TUTOR COMPLETO para correr en el navegador, sin servidor.
 *
 * A diferencia de construir-bot-hyntibia.mjs (que SOLO lleva los lectores y
 * bloquea los manuales a propósito), este build SÍ incluye los manuales, el
 * árbol y el motor de pasos, porque es la única forma de que el tutor funcione
 * detrás del bloqueo de red de Foundever.
 *
 * TRADE-OFF CONSENTIDO: los manuales quedan dentro del JS de la página (tras la
 * clave). Es material interno de procedimiento (comandos, no credenciales ni
 * datos de pasajeros), para uso propio del agente. Decisión tomada por el
 * usuario para poder usarlo en el trabajo.
 */
import { build } from 'esbuild';
import { statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENTRADA = join(RAIZ, 'worker', 'src', 'tutor-local.js');
const DESTINO = join(
  RAIZ, '..', 'hyntibia llsm', 'HYNTIBIA', 'hyntibia-dashboard', 'static', 'assets', 'hyntibia-tutor.js'
);

await build({
  entryPoints: [ENTRADA],
  bundle: true,
  format: 'iife',
  globalName: 'HyntibIA',      // expone window.HyntibIA.responderLocal / .leerPantalla
  platform: 'browser',
  target: ['es2019'],
  minify: true,
  legalComments: 'none',
  loader: { '.json': 'json' },
  outfile: DESTINO
});

const kb = Math.round(statSync(DESTINO).size / 1024);
console.log(`✓ hyntibia-tutor.js · ${kb} KB  (cerebro completo + manuales, corre en el navegador)`);
console.log(`  → ${DESTINO}`);
