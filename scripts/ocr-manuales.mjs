#!/usr/bin/env node
/**
 * FASE 4b · OCR de los manuales. Los manuales originales son IMÁGENES
 * (capturas de WhatsApp, PNG). El índice RAG solo tenía el texto ya extraído a
 * procedimientos; aquí transcribimos TODAS las imágenes con Vertex (visión) para
 * meter al buscador lo que falta (PIDs por país, monedas, tablas…).
 *
 * Usa la cuenta de servicio del proyecto (vertex-sa.json). Salida:
 * scripts/manual-ocr.json  → lo consume construir-indice-rag.mjs.
 */
import { createRequire } from 'module';
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const FUNCS = 'C:/Users/mesw/Desktop/hyntibia llsm/HYNTIBIA/hyntibia-dashboard/functions/';
const require = createRequire(FUNCS + 'index.js');
const { GoogleAuth } = require('google-auth-library');
const SA = FUNCS + 'vertex-sa.json';
const VERTEX_ENDPOINT = 'https://us-central1-aiplatform.googleapis.com/v1/projects/hyntibia-learning/locations/us-central1/publishers/google/models/gemini-2.5-flash:generateContent';
const auth = new GoogleAuth({ keyFile: SA, scopes: ['https://www.googleapis.com/auth/cloud-platform'] });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const ES_IMG = /\.(png|jpe?g|webp)$/i;

function listar(dir, acc = []) {
  for (const nombre of readdirSync(dir)) {
    const p = join(dir, nombre);
    const st = statSync(p);
    if (st.isDirectory()) listar(p, acc);
    else if (ES_IMG.test(nombre) && st.size > 3000 && st.size < 4_000_000) acc.push(p);
  }
  return acc;
}

async function ocr(imgPath) {
  const b64 = readFileSync(imgPath).toString('base64');
  const mime = /\.png$/i.test(imgPath) ? 'image/png' : (/\.webp$/i.test(imgPath) ? 'image/webp' : 'image/jpeg');
  const client = await auth.getClient();
  const { token } = await client.getAccessToken();
  const r = await fetch(VERTEX_ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [
        { text: 'Esta es una página de un manual de procedimientos de call center de Iberia/Amadeus (pantallas de terminal, tablas de PIDs/oficinas/monedas, comandos, notas). Transcribe TODO su texto de forma ordenada y legible (respeta tablas como "clave: valor"). No inventes ni resumas: solo lo que se lee. Si no hay texto útil, responde "SIN TEXTO".' },
        { inlineData: { mimeType: mime, data: b64 } }
      ] }],
      generationConfig: { temperature: 0 }
    })
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`${r.status} ${j?.error?.message || ''}`.slice(0, 120));
  return (j?.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
}

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR_MANUAL = join(RAIZ, 'manual');
if (!existsSync(DIR_MANUAL)) { console.error('No existe manual/'); process.exit(1); }

const imgs = listar(DIR_MANUAL);
console.log(`Imágenes a transcribir: ${imgs.length}`);
const salida = [];
for (let i = 0; i < imgs.length; i++) {
  const img = imgs[i];
  const carpeta = img.split(/[\\/]/).slice(-2, -1)[0];
  try {
    const texto = await ocr(img);
    if (texto && !/^SIN TEXTO/i.test(texto)) {
      salida.push({ archivo: img.replace(RAIZ, '').replace(/^[\\/]/, ''), carpeta, texto });
      console.log(`  [${i + 1}/${imgs.length}] ${carpeta} · ${texto.length} chars ✓`);
    } else {
      console.log(`  [${i + 1}/${imgs.length}] ${carpeta} · (sin texto)`);
    }
  } catch (e) {
    console.log(`  [${i + 1}/${imgs.length}] ${carpeta} · ✗ ${e.message}`);
  }
  await wait(400); // no martillar Vertex
}
writeFileSync(join(RAIZ, 'scripts', 'manual-ocr.json'), JSON.stringify(salida));
console.log(`\n✓ OCR listo: ${salida.length} imágenes con texto → scripts/manual-ocr.json`);
