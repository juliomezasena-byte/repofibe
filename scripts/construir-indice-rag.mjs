#!/usr/bin/env node
/**
 * FASE 1 · RAG — Construye el índice de conocimiento para el "cerebro de
 * preguntas". Trocea los 50 procedimientos en fragmentos citables y los escribe
 * como JSON en el folder de la función del servidor.
 *
 * Extrae TODO el material útil para exámenes:
 *   · resumen + aplicaSolo + advertencias de cada procedimiento
 *   · cada paso (proceso + explicación + comando)
 *   · el GLOSARIO término por término (define FHE, TST, segmento… que los
 *     manuales dan por sabidos)
 *   · tablas de referencia (gama de tarifas, cabinas, oficinas/gastos…)
 *
 * Sin embeddings: cada fragmento guarda su texto y su FUENTE (el título del
 * manual) para citar. La búsqueda léxica vive en la función del servidor.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROCS = JSON.parse(readFileSync(join(RAIZ, 'worker', 'src', 'procedimientos.generated.json'), 'utf8'));
const DESTINO = join(RAIZ, '..', 'hyntibia llsm', 'HYNTIBIA', 'hyntibia-dashboard', 'functions', 'rag-indice.json');

const RUIDO = new Set(['confianza', 'apariciones', 'comoSeDeduce', 'color', 'medidoCon', 'nivel', 'capturas', 'enlacesOficiales']);

/** Aplana cualquier valor (string/num/array/objeto anidado) a texto legible. */
function aTexto(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v.replace(/\s+/g, ' ').trim();
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return v.map(aTexto).filter(Boolean).join('; ');
  if (typeof v === 'object') {
    const partes = [];
    for (const [k, val] of Object.entries(v)) {
      if (RUIDO.has(k)) continue;
      const s = aTexto(val);
      if (s) partes.push(/^(texto|definicion|descripcion|nota|resumen)$/.test(k) ? s : `${k}: ${s}`);
    }
    return partes.join(' · ');
  }
  return '';
}

const recorta = (s, n = 1200) => (s.length > n ? s.slice(0, n) + '…' : s);
const chunks = [];
const push = (id, proc, titulo, fuente, texto) => {
  const t = recorta(aTexto(texto));
  if (t) chunks.push({ id, proc, titulo, fuente, texto: `[${titulo}] ${t}` });
};

const CAMPOS_REF = ['gamaTarifas', 'cabinas', 'discrepancias', 'elementosDelPnr', 'huecosConocidos', 'porQueExiste', 'disciplina', 'tabla', 'oficinas', 'gastos'];

for (const [id, p] of Object.entries(PROCS)) {
  const titulo = aTexto(p.titulo) || id;

  // 1 · RESUMEN del procedimiento
  const overview = [
    aTexto(p.resumen),
    p.aplicaSolo ? `Aplica solo cuando: ${aTexto(p.aplicaSolo)}` : '',
    p.advertencias ? `Advertencias: ${aTexto(p.advertencias)}` : '',
    p.categoria ? `Categoría: ${aTexto(p.categoria)}` : '',
    p.aerolinea ? `Aerolínea: ${aTexto(p.aerolinea)}` : ''
  ].filter(Boolean).join('. ');
  push(`${id}#resumen`, id, titulo, titulo, overview);

  // 2 · Un fragmento por PASO
  for (const paso of (p.pasos || [])) {
    const cuerpo = [aTexto(paso.proceso), aTexto(paso.explicacion), paso.comando ? `Comando: ${aTexto(paso.comando)}` : '']
      .filter(Boolean).join('. ');
    push(`${id}#p${paso.n}`, id, titulo, `${titulo} · paso ${paso.n}${paso.sistema ? ' (' + aTexto(paso.sistema) + ')' : ''}`, cuerpo);
  }

  // 3 · GLOSARIO término por término (alto valor para "¿qué es X?")
  if (Array.isArray(p.terminos)) {
    for (const t of p.terminos) {
      if (t && t.termino && t.definicion) push(`${id}#t-${t.termino}`, id, titulo, `${titulo}: ${t.termino}`, `${t.termino}: ${t.definicion}`);
    }
  }

  // 4 · Tablas/campos de referencia ricos (tarifas, cabinas, oficinas…)
  for (const campo of CAMPOS_REF) {
    if (p[campo]) push(`${id}#${campo}`, id, titulo, `${titulo} · ${campo}`, `${campo}: ${aTexto(p[campo])}`);
  }
}

// 5 · FASE 4b — texto OCR de las imágenes del manual (lo que no estaba en el
//     texto ya extraído: PIDs por país, monedas, tablas escaneadas…).
const OCR = join(RAIZ, 'scripts', 'manual-ocr.json');
if (existsSync(OCR)) {
  const imagenes = JSON.parse(readFileSync(OCR, 'utf8'));
  let nImg = 0, nChunkOcr = 0;
  for (const item of imagenes) {
    const carpeta = aTexto(item.carpeta) || 'manual';
    const titulo = `Manual (imagen): ${carpeta}`;
    const trozos = String(item.texto || '').match(/[\s\S]{1,1000}/g) || [];
    trozos.forEach((trozo, i) => {
      const t = trozo.replace(/\s+/g, ' ').trim();
      if (t.length > 20) { chunks.push({ id: `ocr#${carpeta}#${nImg}-${i}`, proc: `_ocr`, titulo, fuente: titulo, texto: `[${titulo}] ${t}` }); nChunkOcr++; }
    });
    nImg++;
  }
  console.log(`  + OCR: ${nImg} imágenes → ${nChunkOcr} fragmentos`);
}

writeFileSync(DESTINO, JSON.stringify({ generado: new Date().toISOString(), n: chunks.length, chunks }));
const kb = Math.round(JSON.stringify(chunks).length / 1024);
console.log(`✓ rag-indice.json · ${chunks.length} fragmentos · ${kb} KB`);
console.log(`  → ${DESTINO}`);
