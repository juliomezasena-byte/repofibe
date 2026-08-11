#!/usr/bin/env node
/**
 * El auditor de la llamada tiene que evaluar el TRABAJO, no solo el trato.
 *
 * Antes puntuaba con 6 pilares —saludo, filtro de seguridad, personalización,
 * parafraseo, esperas y reglas de producto— y todos son de CÓMO hablas. Con
 * eso se sacaba buena nota cobrándole penalidad a un pasajero de un vuelo
 * cancelado, que es el error más caro que existe en el puesto.
 *
 * La regla que se guarda aquí: si el escenario declara un procedimiento, el
 * auditor recibe sus pasos reales y un pilar extra. Si NO lo declara, no se
 * inventa ninguno.
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildEvaluationPrompt, RUBRIC } from '../src/prompts.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
const procedimientos = JSON.parse(readFileSync(join(AQUI, '..', 'src', 'procedimientos.generated.json'), 'utf8'));
const escenarios = JSON.parse(readFileSync(join(AQUI, '..', 'src', 'scenarios.generated.json'), 'utf8'));

let pasados = 0;
let fallos = 0;

function comprobar(nombre, real, esperado) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (ok) { pasados++; console.log(`  [OK]   ${nombre}`); }
  else { fallos++; console.error(`  [FALLO] ${nombre}\n          esperado: ${JSON.stringify(esperado)}\n          real:     ${JSON.stringify(real)}`); }
}

const transcripcion = [
  { role: 'agent', text: 'Iberia, buenos días, ¿con quién tengo el gusto?' },
  { role: 'passenger', text: 'Soy Juan Gómez, me cancelaron el vuelo.' }
];

console.log('\n--- SIN PROCEDIMIENTO DECLARADO: no se inventa ---');
const sinProc = buildEvaluationPrompt(
  { id: 'scenario-1', description: 'Consulta de horarios.' },
  transcripcion,
  procedimientos
);
comprobar('no aparece ningún bloque de procedimiento', /PROCEDIMIENTO QUE APLICA/.test(sinProc), false);
comprobar('se piden los 6 pilares de siempre', new RegExp(`estos ${RUBRIC.length} pilares`).test(sinProc), true);
comprobar('sin séptimo pilar', /7\. Procedimiento correcto/.test(sinProc), false);

console.log('\n--- CON PROCEDIMIENTO DECLARADO: el auditor lo recibe ---');
const escenario = escenarios.find((e) => e.id === 'scenario-23');
comprobar('el escenario 23 declara su manual', escenario?.procedimientoId, 'cambio-manual-sin-segmento-volado');

const proc0 = procedimientos[escenario.procedimientoId];
const conProc = buildEvaluationPrompt(escenario, transcripcion, procedimientos);
comprobar('lleva el bloque de procedimiento', /PROCEDIMIENTO QUE APLICA/.test(conProc), true);
// Se comprueba contra el título REAL del manual, no contra uno inventado:
// "Cambio de vuelo MANUAL — sin segmento volado", y su fuente #3121.
comprobar('nombra el manual real', conProc.includes(proc0.titulo), true);
comprobar('y de qué documento sale', /#3121/.test(conProc), true);
comprobar('añade el séptimo pilar', /7\. Procedimiento correcto/.test(conProc), true);
comprobar('pide 7 pilares, no 6', new RegExp(`estos ${RUBRIC.length + 1} pilares`).test(conProc), true);
comprobar('le prohíbe inventarse pasos', /No inventes pasos/.test(conProc), true);

// Los pasos que se le pasan son los del manual, no un resumen del modelo
const proc = procedimientos['cambio-manual-sin-segmento-volado'];
const primerPasoConComando = (proc.pasos || []).find((p) => p.comando);
comprobar('incluye comandos reales del manual', conProc.includes(primerPasoConComando.comando), true);

console.log('\n--- UN MANUAL QUE NO EXISTE NO PUEDE COLARSE ---');
const inventado = buildEvaluationPrompt(
  { id: 'x', description: 'y', procedimientoId: 'procedimiento-que-no-existe' },
  transcripcion,
  procedimientos
);
comprobar('un id desconocido no añade bloque', /PROCEDIMIENTO QUE APLICA/.test(inventado), false);
comprobar('ni séptimo pilar', /7\. Procedimiento correcto/.test(inventado), false);

console.log('\n--- TODO ESCENARIO QUE DECLARA MANUAL, LO DECLARA BIEN ---');
const declarados = escenarios.filter((e) => e.procedimientoId);
comprobar('hay al menos uno declarado', declarados.length > 0, true);
comprobar('todos apuntan a un manual que existe',
  declarados.every((e) => !!procedimientos[e.procedimientoId]), true);

console.log('\n' + '='.repeat(50));
console.log(`Resultados: ${pasados} pasados, ${fallos} fallidos.`);
console.log('='.repeat(50) + '\n');
process.exit(fallos ? 1 : 0);
