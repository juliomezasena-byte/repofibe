#!/usr/bin/env node
/**
 * El router inteligente: la IA ENTIENDE pero no puede hacer daño.
 *
 * Se prueba con la IA MOCKEADA (sin red): lo que importa aquí no es si Gemini
 * acierta —eso se mide aparte, en vivo— sino que los GUARDARRAÍLES aguanten:
 *   · una etiqueta fuera del conjunto NUNCA se encamina
 *   · "ambiguo" o confianza baja → se PREGUNTA, no se adivina
 *   · si la IA falla, no se inventa nada
 *   · el determinista se cortocircuita salvo cuando huele a trampa
 */
import { clasificarIntencion, entenderIntencion, hayConflicto, construirPromptClasificacion } from '../src/clasificador.js';
import { detectarIntencion } from '../src/coach.js';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const mapa = JSON.parse(readFileSync(join(AQUI, 'mapa-intenciones.json'), 'utf8'));
const ETIQUETAS = Object.keys(mapa);

let pasados = 0, fallos = 0;
function comprobar(nombre, real, esperado) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (ok) { pasados++; console.log(`  [OK]   ${nombre}`); }
  else { fallos++; console.error(`  [FALLO] ${nombre}\n          esperado: ${JSON.stringify(esperado)}\n          real:     ${JSON.stringify(real)}`); }
}
/** Una IA falsa que devuelve lo que le programemos. */
const iaQueDice = (intencion, confianza = 'alta') => async () => ({ intencion, confianza });

console.log('\n--- EL PROMPT LE ENSEÑA LOS SIGNIFICADOS Y LAS TRAMPAS ---');
const prompt = construirPromptClasificacion('el nombre está mal escrito', ETIQUETAS, mapa);
comprobar('incluye la etiqueta correcion-de-nombre', prompt.includes('correcion-de-nombre'), true);
comprobar('mete el texto del agente', prompt.includes('el nombre está mal escrito'), true);
comprobar('avisa de la trampa nombre vs vuelo', /NOMBRE.*no es cambiar el VUELO/i.test(prompt), true);

console.log('\n--- GUARDARRAÍLES DEL CLASIFICADOR (IA mockeada) ---');
comprobar('una etiqueta válida pasa',
  (await clasificarIntencion('x', { etiquetas: ETIQUETAS, mapa, generar: iaQueDice('reembolso') })).intencion, 'reembolso');
comprobar('una etiqueta INVENTADA (fuera del set) → null',
  (await clasificarIntencion('x', { etiquetas: ETIQUETAS, mapa, generar: iaQueDice('formatear-disco-duro') })).intencion, null);
comprobar('"ambiguo" → no adivina, marca ambiguo',
  (await clasificarIntencion('x', { etiquetas: ETIQUETAS, mapa, generar: iaQueDice('ambiguo') })).ambiguo, true);
comprobar('"ninguna" → null sin ambiguo',
  await clasificarIntencion('x', { etiquetas: ETIQUETAS, mapa, generar: iaQueDice('ninguna') }).then(r => [r.intencion, r.ambiguo]), [null, false]);
comprobar('confianza baja → mejor preguntar (ambiguo)',
  (await clasificarIntencion('x', { etiquetas: ETIQUETAS, mapa, generar: iaQueDice('cambio', 'baja') })).ambiguo, true);
comprobar('si la IA revienta → null, no inventa',
  (await clasificarIntencion('x', { etiquetas: ETIQUETAS, mapa, generar: async () => { throw new Error('boom'); } })).intencion, null);

console.log('\n--- EL ROUTER (Opción A: IA para lo general, determinista para lo específico) ---');
// Etiqueta ESPECÍFICA (no tiene variante debajo): resuelve sin gastar IA.
let llamoIA = false;
const espiaIA = async () => { llamoIA = true; return { intencion: 'reembolso', confianza: 'alta' }; };
const r1 = await entenderIntencion('correccion de nombre', { etiquetas: ETIQUETAS, mapa, generar: espiaIA, deterministaFn: detectarIntencion });
comprobar('una etiqueta específica resuelve sin IA', r1.via, 'determinista');
comprobar('y NO gasta la IA', llamoIA, false);

// Etiqueta GENERAL (split tiene maestro-split debajo): SÍ pasa por la IA.
let llamoIA2 = false;
const espiaIA2 = async () => { llamoIA2 = true; return { intencion: 'split', confianza: 'alta' }; };
await entenderIntencion('separar pasajeros', { etiquetas: ETIQUETAS, mapa, generar: espiaIA2, deterministaFn: detectarIntencion });
comprobar('una etiqueta general SÍ consulta la IA', llamoIA2, true);

// La trampa: "cambiarle el nombre" el determinista lo manda a cambio; el
// conflicto lo defiere a la IA, que lo corrige a correcion-de-nombre.
comprobar('hayConflicto detecta nombre en un "cambio"', hayConflicto('cambiarle el nombre al pasajero', 'cambio'), true);
const r2 = await entenderIntencion('cambiarle el nombre al pasajero',
  { etiquetas: ETIQUETAS, mapa, generar: iaQueDice('correcion-de-nombre'), deterministaFn: detectarIntencion });
comprobar('la trampa nombre→ ya NO va a cambio de vuelo', r2.intencion, 'correcion-de-nombre');
comprobar('y quedó resuelta por la IA', r2.via, 'ia');

// Silla + oxígeno médico → MEDA, no PMR.
comprobar('hayConflicto: silla PERO con oxígeno médico', hayConflicto('pide silla pero va con oxigeno medico', 'pmr-silla-de-ruedas'), true);

// Nada reconocible + IA dice ninguna → se pregunta.
const r3 = await entenderIntencion('oye una cosa rápida',
  { etiquetas: ETIQUETAS, mapa, generar: iaQueDice('ninguna'), deterministaFn: detectarIntencion });
comprobar('sin intención → via ninguna', r3.via, 'ninguna');

console.log('\n' + '='.repeat(50));
console.log(`Resultados: ${pasados} pasados, ${fallos} fallidos.`);
console.log('='.repeat(50) + '\n');
process.exit(fallos ? 1 : 0);
