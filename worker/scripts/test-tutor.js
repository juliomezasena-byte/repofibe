#!/usr/bin/env node
/**
 * Prueba el selector de paso.
 *
 * Lo que hay que demostrar:
 *  · el comando sale de la PLANTILLA del manual, no de una predicción
 *  · un paso `hueco` NUNCA devuelve comando
 *  · avisa del salto entre Amadeus y Resiber con el conmutador ":"
 *  · el caso KFQQV produce el FQP correcto  ← prueba de aceptación
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { siguientePaso, validarComando, construirComando, construirFqp } from '../src/tutor.js';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const cargar = (id) => JSON.parse(readFileSync(join(RAIZ, 'public', 'procedimientos', `${id}.json`), 'utf8'));

let fallos = 0, pasados = 0;
function comprobar(nombre, real, esperado) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (ok) { pasados++; console.log(`  [OK]   ${nombre}`); }
  else { fallos++; console.error(`  [FALLO] ${nombre}\n          esperado: ${JSON.stringify(esperado)}\n          real:     ${JSON.stringify(real)}`); }
}
function contiene(nombre, texto, frag) {
  const ok = String(texto).toLowerCase().includes(frag.toLowerCase());
  if (ok) { pasados++; console.log(`  [OK]   ${nombre}`); }
  else { fallos++; console.error(`  [FALLO] ${nombre}\n          no encontré "${frag}" en: ${texto}`); }
}

// ── 1 · Plantillas ──────────────────────────────────────────────
console.log('\n--- CONSTRUIR DESDE PLANTILLA ---');
comprobar('rellena la plantilla',
  construirComando('FQN{lineaOfertada}*PE', { lineaOfertada: '02' }).comando, 'FQN02*PE');
comprobar('marca lo que falta, NO lo inventa',
  construirComando('FHE {numeroBillete}/P{pasajero}', { pasajero: 1 }).faltan, ['numeroBillete']);
comprobar('y no se da por completo', construirComando('XE {linea}', {}).completo, false);

// ── 2 · LA PRUEBA DE ACEPTACIÓN: el FQP del caso KFQQV ──────────
console.log('\n--- PRUEBA DE ACEPTACIÓN: el FQP de GARCIABRAVO ---');

const cuponesReales = [
  { origen: 'SCL', destino: 'MAD', aerolinea: 'IB', clase: 'A', fecha: '20AUG' },
  { origen: 'MAD', destino: 'SCL', aerolinea: 'IB', clase: 'O', fecha: '18SEP' }
];

const fqp = construirFqp({ cupones: cuponesReales, doi: '29SEP25', familia: 'OPTIMA', paraPenalidad: true });
comprobar('FQP de PENALIDAD (con ,UP)', fqp.comando,
  'FQPSCL/AIB/CA/D20AUGMAD-/AIB/CO/D18SEPSCL/R,29SEP25,UP/FF-OPTIMA');

const fqpDif = construirFqp({ cupones: cuponesReales, doi: '29SEP25', familia: 'OPTIMA', paraPenalidad: false });
comprobar('FQP de DIFERENCIA (sin UP)', fqpDif.comando,
  'FQPSCL/AIB/CA/D20AUGMAD-/AIB/CO/D18SEPSCL/R,29SEP25/FF-OPTIMA');

const fqpTipos = construirFqp({ cupones: cuponesReales, doi: '29SEP25', familia: 'BASIC', paraPenalidad: false, tiposPasajero: 'CHADIN' });
contiene('con varios tipos de pasajero mete /RCHADIN', fqpTipos.comando, '/RCHADIN,29SEP25');

comprobar('sin DOI no inventa nada',
  construirFqp({ cupones: cuponesReales, familia: 'OPTIMA' }).faltan, ['doi']);

// ── 3 · Recorrer un procedimiento real ──────────────────────────
console.log('\n--- RECORRER generar-split ---');
const split = cargar('generar-split');

const p1 = siguientePaso(split, {});
comprobar('arranca por el primer paso', p1.paso.n, 1);
comprobar('sistema Amadeus', p1.paso.sistema, 'amadeus');
comprobar('el comando sale del manual', p1.paso.comando, 'SP 1');
comprobar('marcado verbatim', p1.paso.confianza, 'verbatim');

const p2 = siguientePaso(split, { pasoActual: 1, comandoEscrito: 'SP 1' });
comprobar('acepta el comando bueno', p2.veredicto.correcto, true);
comprobar('y avanza', p2.paso.n, 1.1);

// Preguntar sobre el paso (sin escribir comando) NO debe avanzarlo.
const preg = siguientePaso(split, { pasoActual: 1, comandoEscrito: null, soloResponder: true });
comprobar('soloResponder se queda en el paso actual', preg.paso.n, 1);
const sinPreg = siguientePaso(split, { pasoActual: 1, comandoEscrito: null });
comprobar('sin soloResponder, comandoEscrito null sí avanza', sinPreg.paso.n, 1.1);

const p2b = siguientePaso(split, { pasoActual: 1, comandoEscrito: 'XE 1' });
comprobar('rechaza el comando malo', p2b.veredicto.correcto, false);
comprobar('NO avanza: repite el paso', p2b.paso.n, 1);
contiene('avisa de la trampa entre sistemas', p2b.veredicto.pista, 'RTA');

// 'SP 7' SÍ es válido: el manual valida con regex ^SPs?d+$, y separar al
// pasajero 7 es tan correcto como separar al 1. El regex del manual manda.
const p2ok = siguientePaso(split, { pasoActual: 1, comandoEscrito: 'SP 7' });
comprobar('SP 7 es válido: el regex del manual acepta cualquier pasajero', p2ok.veredicto.correcto, true);

// 'SP' a secas tiene la transacción bien pero le falta el pasajero
const p2c = siguientePaso(split, { pasoActual: 1, comandoEscrito: 'SP' });
comprobar('reconoce la transacción correcta con sintaxis incompleta', p2c.veredicto.parcial, true);
contiene('y lo dice', p2c.veredicto.motivo, 'parámetros');

// ── 4 · El salto entre sistemas ─────────────────────────────────
console.log('\n--- EL SALTO AMADEUS ↔ RESIBER ---');
const avih = cargar('mascota-en-bodega-avih');

// paso 3 es Resiber, paso 4 es Amadeus
const salto = siguientePaso(avih, { pasoActual: 3, comandoEscrito: 'ITP:/RESERVA/EMAIL' });
comprobar('detecta el salto de sistema', salto.saltoDeSistema, { de: 'resiber', a: 'amadeus' });
contiene('explica el conmutador ":"', salto.avisos.join(' '), 'teclea ":"');
contiene('y qué responde el sistema', salto.avisos.join(' '), 'CONECTADO AMADEUS');

// ── 5 · Los huecos NUNCA devuelven comando ──────────────────────
console.log('\n--- UN HUECO NO SE RELLENA ---');
const conHueco = {
  pasos: [
    { n: 1, sistema: 'amadeus', proceso: 'Uno normal', comando: 'RT', confianza: 'verbatim' },
    { n: 2, sistema: 'resiber', proceso: 'Uno sin documentar', comando: null, confianza: 'hueco', nota: 'No está en el material.' }
  ]
};
const h = siguientePaso(conHueco, { pasoActual: 1, comandoEscrito: 'RT' });
comprobar('llega al hueco', h.paso.n, 2);
comprobar('y NO devuelve comando', h.paso.comando, null);
comprobar('lo marca como hueco', h.paso.confianza, 'hueco');
contiene('y dice que se pregunte', h.avisos.join(' '), 'no lo inventes');
comprobar('validar un hueco nunca da correcto',
  validarComando({ confianza: 'hueco' }, 'LOQUESEA').correcto, false);

// ── 6 · Fin de procedimiento ────────────────────────────────────
console.log('\n--- FINAL ---');
const ultimo = split.pasos[split.pasos.length - 1].n;
const fin = siguientePaso(split, { pasoActual: ultimo, comandoEscrito: 'RTAXR' });
comprobar('detecta que ha terminado', fin.terminado, true);

console.log(`\n${'='.repeat(50)}`);
console.log(`Resultados: ${pasados} pasados, ${fallos} fallidos.`);
console.log('='.repeat(50));
if (fallos) process.exit(1);
