#!/usr/bin/env node
/**
 * Genera los manuales LEGIBLES desde los procedimientos en JSON.
 *
 * Una sola fuente, tres salidas: el JSON alimenta al tutor y a la app, y
 * este script lo renderiza como manual para leer. Así nunca se desincronizan
 * — si se corrige un comando en el JSON, el manual cambia solo.
 *
 * Uso: node scripts/generar-manual.mjs
 * Salida: docs/manuales/<id>.md  +  docs/manuales/README.md (índice)
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGEN = join(RAIZ, 'public', 'procedimientos');
const DESTINO = join(RAIZ, 'docs', 'manuales');

mkdirSync(DESTINO, { recursive: true });

const sistemas = JSON.parse(readFileSync(join(ORIGEN, '_sistemas.json'), 'utf8'));
const NOMBRE_SISTEMA = Object.fromEntries(sistemas.sistemas.map((s) => [s.id, s.nombre]));
const NOMBRE_AEROLINEA = Object.fromEntries(sistemas.aerolineas.map((a) => [a.id, `${a.nombre} (${a.placa})`]));

const INSIGNIA = {
  verbatim: '`✔ verbatim`',
  derivado: '`≈ derivado`',
  hueco: '`✖ hueco`'
};

const NIVEL = { critico: '🔴', alto: '🟠', medio: '🟡', bajo: '⚪' };

/** Una fila de la tabla de pasos, en el mismo formato del manual original. */
function filaPaso(p) {
  const sistema = NOMBRE_SISTEMA[p.sistema] || p.sistema;
  const cmd = p.comando ? `\`${p.comando}\`` : '—';
  const variantes = p.variantes?.length
    ? '<br>' + p.variantes.map((v) => `\`${v}\``).join('<br>')
    : '';
  const plantilla = p.plantilla ? `<br><sub>${p.plantilla}</sub>` : '';

  let explicacion = (p.explicacion || '').replace(/\|/g, '\\|');
  if (p.nota) explicacion += `<br><br>⚠️ ${p.nota.replace(/\|/g, '\\|')}`;
  if (p.esBloqueante) explicacion += '<br><br>**Bloqueante:** no continúes sin esto.';
  if (p.resultadoEsperado) explicacion += `<br><br>**Resultado:** ${p.resultadoEsperado.texto}`;

  return `| ${p.n}${p.opcional ? ' *(opc.)*' : ''} | ${sistema} | ${p.proceso} | ${cmd}${variantes}${plantilla} | ${explicacion} | ${INSIGNIA[p.confianza] || p.confianza} |`;
}

function renderizar(p, archivo) {
  const L = [];

  L.push(`# ${p.titulo}`);
  L.push('');
  L.push('> **Generado automáticamente** desde');
  L.push(`> \`public/procedimientos/${archivo}\`. No lo edites a mano: corrige`);
  L.push('> el JSON y vuelve a correr `node scripts/generar-manual.mjs`.');
  L.push('');

  const meta = [];
  if (p.aerolinea) meta.push(`**Aerolínea:** ${NOMBRE_AEROLINEA[p.aerolinea] || p.aerolinea}`);
  if (p.categoria) meta.push(`**Categoría:** ${p.categoria}`);
  if (p.fuente?.documento) meta.push(`**Fuente:** ${p.fuente.documento}`);
  if (meta.length) { L.push(meta.join(' · ')); L.push(''); }

  if (p.resumen) { L.push(p.resumen); L.push(''); }

  if (p.aplicaSolo) {
    L.push(`> **Aplica solo a:** ${p.aplicaSolo}`);
    L.push('');
  }

  // Aviso de fiabilidad de la fuente
  if (p.fuente?.tipo === 'resumen-de-bot') {
    L.push('> 🚨 **La fuente de este manual es un resumen de bot, no el documento');
    L.push('> original.** Los comandos pueden estar mal transcritos. No usar como');
    L.push('> solucionario hasta conseguir los originales.');
    L.push('');
  }
  if (p.fuente?.nota) { L.push(`> ℹ️ ${p.fuente.nota}`); L.push(''); }

  if (p.advertencias?.length) {
    L.push('## Antes de empezar');
    L.push('');
    for (const a of p.advertencias) L.push(`- ${NIVEL[a.nivel] || '•'} ${a.texto}`);
    L.push('');
  }

  if (p.hallazgoClave) {
    L.push(`## ${p.hallazgoClave.titulo}`);
    L.push('');
    L.push(p.hallazgoClave.texto);
    if (p.hallazgoClave.nota) { L.push(''); L.push(`> ⚠️ ${p.hallazgoClave.nota}`); }
    L.push('');
  }

  L.push('## Pasos');
  L.push('');
  L.push('| # | Sistema | Proceso | Transacción | Explicación | Confianza |');
  L.push('|---|---|---|---|---|---|');
  for (const paso of p.pasos || []) L.push(filaPaso(paso));
  L.push('');

  if (p.recuperacionDeError) {
    L.push(`## ${p.recuperacionDeError.titulo}`);
    L.push('');
    L.push('| # | Sistema | Proceso | Transacción |');
    L.push('|---|---|---|---|');
    for (const s of p.recuperacionDeError.pasos) {
      L.push(`| ${s.n} | ${NOMBRE_SISTEMA[s.sistema] || s.sistema} | ${s.proceso} | ${s.comando ? `\`${s.comando}\`` : '—'} |`);
    }
    if (p.recuperacionDeError.nota) { L.push(''); L.push(`> ${p.recuperacionDeError.nota}`); }
    L.push('');
  }

  if (p.matriz?.length) {
    L.push('## Matriz de servicios');
    L.push('');
    L.push('| Servicio | Qué es | Amadeus | Resiber |');
    L.push('|---|---|---|---|');
    const marca = { confirmado: '✅', 'no-visible': '⚠️ no visible', 'no-confirmado': '❔ sin confirmar' };
    for (const m of p.matriz) {
      L.push(`| **${m.servicio}** | ${m.nombre || ''} | ${marca[m.amadeus] || m.amadeus} | ${marca[m.resiber] || m.resiber} |`);
    }
    L.push('');
  }

  if (p.reglasNegocio?.length) {
    L.push('## Reglas de negocio');
    L.push('');
    for (const r of p.reglasNegocio) L.push(`- ${r.texto}`);
    L.push('');
  }

  if (p.erroresComunes?.length) {
    L.push('## Errores comunes');
    L.push('');
    for (const e of p.erroresComunes) {
      L.push(`**${e.sintoma}**`);
      L.push('');
      L.push(`${e.causa}${e.nota ? `<br><sub>${e.nota}</sub>` : ''}`);
      L.push('');
    }
  }

  if (p.huecosConocidos?.length) {
    L.push('## Lo que falta en el material');
    L.push('');
    L.push('Estos puntos **no están en la fuente**. No los inventes: pregúntale');
    L.push('al instructor.');
    L.push('');
    for (const h of p.huecosConocidos) L.push(`- ${h}`);
    L.push('');
  }

  if (p.capturas?.length) {
    L.push('## Capturas originales');
    L.push('');
    for (const c of p.capturas) L.push(`- [\`${c}\`](../../${c})`);
    L.push('');
  }

  return L.join('\n');
}

// ─────────────────────────────────────────────────────────────────

const archivos = readdirSync(ORIGEN).filter((f) => f.endsWith('.json') && !f.startsWith('_'));
const indice = [];

for (const archivo of archivos) {
  const p = JSON.parse(readFileSync(join(ORIGEN, archivo), 'utf8'));
  writeFileSync(join(DESTINO, `${p.id}.md`), renderizar(p, archivo) + '\n');

  const total = (p.pasos || []).length;
  const verbatim = (p.pasos || []).filter((s) => s.confianza === 'verbatim').length;
  indice.push({ id: p.id, titulo: p.titulo, categoria: p.categoria || '—', total, verbatim, fuente: p.fuente?.tipo });
  console.log(`  ✓ ${p.id}.md  (${verbatim}/${total} pasos verbatim)`);
}

// Índice
const I = ['# Manuales', '',
  '> Generados desde `public/procedimientos/*.json` con',
  '> `node scripts/generar-manual.mjs`. **No edites estos archivos a mano.**',
  '',
  '| Manual | Categoría | Pasos | Verbatim | Fuente |',
  '|---|---|---|---|---|'];

for (const m of indice.sort((a, b) => a.categoria.localeCompare(b.categoria))) {
  const pct = m.total ? Math.round((m.verbatim / m.total) * 100) : 0;
  const aviso = m.fuente === 'resumen-de-bot' ? ' 🚨 bot' : '';
  I.push(`| [${m.titulo}](${m.id}.md) | ${m.categoria} | ${m.total} | ${m.verbatim} (${pct}%) | ${m.fuente || '—'}${aviso} |`);
}

const totalPasos = indice.reduce((a, m) => a + m.total, 0);
const totalVerb = indice.reduce((a, m) => a + m.verbatim, 0);
I.push('', `**Total: ${indice.length} manuales · ${totalPasos} pasos · ${totalVerb} verbatim (${Math.round(totalVerb / totalPasos * 100)}%)**`, '',
  'Los catálogos de comandos viven aparte:',
  '- `public/procedimientos/_transacciones-utiles.json` — Amadeus',
  '- `public/profiles/resiber/commands_meta.json` — Resiber');

writeFileSync(join(DESTINO, 'README.md'), I.join('\n') + '\n');
console.log(`\n✓ ${indice.length} manuales en docs/manuales/  (${totalVerb}/${totalPasos} pasos verbatim)\n`);
