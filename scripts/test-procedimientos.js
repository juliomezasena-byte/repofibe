#!/usr/bin/env node
/**
 * Guardián de integridad de los procedimientos.
 *
 * Existe por una sola razón: impedir que alguien — persona o IA — rellene
 * con comandos inventados los huecos del material de formación. Un comando
 * falso enseñado como oficial es peor que no enseñar nada.
 *
 * Uso: node scripts/test-procedimientos.js
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'procedimientos');
const CONFIANZAS = ['verbatim', 'derivado', 'hueco'];

const fallos = [];
const avisos = [];
let pasosTotales = 0;

const sistemasDoc = JSON.parse(readFileSync(join(DIR, '_sistemas.json'), 'utf8'));
const SISTEMAS = new Set(sistemasDoc.sistemas.map((s) => s.id));
const AEROLINEAS = new Set(sistemasDoc.aerolineas.map((a) => a.id));

const archivos = readdirSync(DIR).filter((f) => f.endsWith('.json') && !f.startsWith('_'));

if (archivos.length === 0) {
  console.error('✗ No hay procedimientos en public/procedimientos/');
  process.exit(1);
}

for (const archivo of archivos) {
  const p = JSON.parse(readFileSync(join(DIR, archivo), 'utf8'));
  const err = (msg) => fallos.push(`${archivo}: ${msg}`);

  if (!p.id) err('falta "id"');
  if (!p.titulo) err('falta "titulo"');
  if (!p.fuente) err('falta "fuente" (de dónde salió este procedimiento)');
  if (p.aerolinea && !AEROLINEAS.has(p.aerolinea)) {
    err(`aerolinea "${p.aerolinea}" no está en _sistemas.json`);
  }
  if (!Array.isArray(p.pasos) || p.pasos.length === 0) {
    err('no tiene pasos');
    continue;
  }

  for (const paso of p.pasos) {
    pasosTotales++;
    const donde = `paso ${paso.n}`;

    // Regla 1 — todo paso declara a qué sistema pertenece.
    // Sin esto el tutor no puede decir "cámbiate a Resiber ahora".
    if (!paso.sistema) {
      err(`${donde}: no declara "sistema"`);
    } else if (!SISTEMAS.has(paso.sistema)) {
      err(`${donde}: sistema "${paso.sistema}" no existe en _sistemas.json`);
    }

    // Regla 2 — toda confianza es válida y está declarada.
    if (!paso.confianza) {
      err(`${donde}: no declara "confianza" (${CONFIANZAS.join('|')})`);
    } else if (!CONFIANZAS.includes(paso.confianza)) {
      err(`${donde}: confianza "${paso.confianza}" inválida`);
    }

    // Regla 3 — LA REGLA ANTI-ALUCINACIÓN.
    // Un paso marcado como hueco NO puede traer comando: si el material no
    // lo tiene, nadie lo tiene.
    if (paso.confianza === 'hueco') {
      if (paso.comando) {
        err(`${donde}: es "hueco" pero trae comando "${paso.comando}" — ESTO ES EXACTAMENTE LO QUE ESTE TEST EXISTE PARA IMPEDIR`);
      }
      if (!paso.nota) {
        err(`${donde}: es "hueco" y no explica qué falta ni a quién preguntarle`);
      }
    }

    // Regla 4 — lo "derivado" (deducido, o dicho por un bot) se justifica.
    if (paso.confianza === 'derivado' && !paso.nota) {
      err(`${donde}: es "derivado" y no dice de qué se dedujo`);
    }

    // Regla 5 — si hay plantilla, el comando de ejemplo debe existir.
    if (paso.plantilla && !paso.comando) {
      err(`${donde}: tiene "plantilla" pero ningún "comando" de ejemplo`);
    }

    // Regla 6 — la validación regex tiene que compilar y aceptar el ejemplo.
    if (paso.validacion?.tipo === 'regex') {
      let re;
      try {
        re = new RegExp(paso.validacion.patron);
      } catch {
        err(`${donde}: el patrón "${paso.validacion.patron}" no compila`);
      }
      if (re && paso.comando && !re.test(paso.comando)) {
        err(`${donde}: el patrón no acepta su propio comando de ejemplo "${paso.comando}"`);
      }
    }
    if (paso.validacion?.tipo === 'exacto' && paso.validacion.patron !== paso.comando) {
      err(`${donde}: validación "exacto" no coincide con el comando`);
    }

    if (paso.confianza === 'verbatim' && paso.comando && !paso.explicacion) {
      avisos.push(`${archivo} ${donde}: verbatim con comando pero sin explicación`);
    }
  }

  // Un procedimiento cuya fuente es un bot no puede tener pasos verbatim:
  // un resumen de bot nunca es el texto original.
  if (p.fuente.tipo === 'resumen-de-bot') {
    const inventados = p.pasos.filter(
      (s) => s.confianza === 'verbatim' && !s.nota
    );
    for (const s of inventados) {
      err(`paso ${s.n}: marcado "verbatim" pero la fuente del documento es un bot — o lo corroboras con otra fuente y lo anotas, o es "derivado"`);
    }
  }
}

// ── Guardián del glosario ──────────────────────────────────────
// Los manuales usan 33 términos técnicos 636 veces sin definir ninguno.
// El glosario los cubre; esto impide que un manual nuevo introduzca
// vocabulario que nadie ha explicado.
const glosario = JSON.parse(readFileSync(join(DIR, '_glosario.json'), 'utf8'));
const definidos = new Map();
for (const t of glosario.terminos) {
  definidos.set(t.termino.toLowerCase(), t);
  for (const a of t.alias || []) definidos.set(a.toLowerCase(), t);
}

const sinDefinir = [];
const textoProcedimientos = archivos
  .map((f) => readFileSync(join(DIR, f), 'utf8'))
  .join('\n');

// Términos que el glosario declara pero para los que no hay definición:
// se avisa de que se están usando a ciegas.
for (const t of glosario.terminos) {
  if (t.confianza !== 'hueco') continue;
  const patron = t.termino.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const usos = (textoProcedimientos.match(new RegExp(patron, 'gi')) || []).length;
  if (usos > 0 && !t.queSabemos) {
    fallos.push(`_glosario: "${t.termino}" es hueco, se usa ${usos} veces y no dice qué SÍ sabemos de él`);
  }
  if (usos > 0) sinDefinir.push(`  ${t.termino} — ${usos} usos · preguntar a ${t.preguntarA || 'instructor'}`);
}

// Coherencia del propio glosario
for (const t of glosario.terminos) {
  if (!t.confianza) fallos.push(`_glosario: "${t.termino}" no declara confianza`);
  if (t.confianza === 'verbatim' && !t.dondeSeDefine) {
    fallos.push(`_glosario: "${t.termino}" es verbatim pero no dice DÓNDE lo define el material`);
  }
  if (t.confianza === 'derivado' && !t.comoSeDeduce) {
    fallos.push(`_glosario: "${t.termino}" es derivado pero no dice de qué se dedujo`);
  }
  if (t.confianza === 'hueco' && t.definicion) {
    fallos.push(`_glosario: "${t.termino}" es hueco pero trae definición — ESO ES INVENTAR`);
  }
}

const huecos = [];
for (const archivo of archivos) {
  const p = JSON.parse(readFileSync(join(DIR, archivo), 'utf8'));
  for (const paso of p.pasos) {
    if (paso.confianza !== 'verbatim') huecos.push(`  ${p.id} · paso ${paso.n} · ${paso.confianza} · ${paso.proceso}`);
  }
}

console.log(`\nProcedimientos: ${archivos.length}   Pasos: ${pasosTotales}   Glosario: ${glosario.terminos.length} términos`);

if (sinDefinir.length) {
  console.log(`\nVocabulario SIN definir (${sinDefinir.length}) — agenda para el instructor:`);
  sinDefinir.forEach((s) => console.log(s));
}

if (avisos.length) {
  console.log(`\nAvisos (${avisos.length}):`);
  avisos.forEach((a) => console.log(`  ! ${a}`));
}

if (huecos.length) {
  console.log(`\nPasos NO verbatim (${huecos.length}) — lo que falta confirmar con el instructor:`);
  huecos.forEach((h) => console.log(h));
}

if (fallos.length) {
  console.error(`\n✗ ${fallos.length} fallo(s) de integridad:\n`);
  fallos.forEach((f) => console.error(`  ✗ ${f}`));
  process.exit(1);
}

console.log('\n✓ Integridad OK: todo paso declara sistema y confianza, y ningún hueco trae comando inventado.\n');
