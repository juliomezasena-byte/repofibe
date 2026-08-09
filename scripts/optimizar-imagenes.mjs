#!/usr/bin/env node
/**
 * Convierte a WebP los iconos del menú.
 *
 * Los cuatro JPG de las tarjetas pesaban entre 450 y 630 KB cada uno: ~2 MB
 * solo para pintar el menú. En la red de un call center eso se nota en el
 * primer pintado, que es justo el momento en que el alumno decide si la
 * herramienta le parece seria.
 *
 * Usa el Chromium de Playwright, que ya está instalado para los e2e: no hace
 * falta añadir `sharp` ni ImageMagick solo para esto. El navegador decodifica
 * el JPG en un canvas y lo vuelve a codificar con `toDataURL('image/webp')`.
 *
 * Es idempotente: si el .webp ya existe y es más nuevo que el .jpg, no hace
 * nada.
 */

import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join, dirname, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'images');
const CALIDAD = 0.82;

// Todo JPG que siga en public/images/ es un JPG que se despliega. Los que ya
// no se usan viven en assets-originales/, fuera del deploy.
const jpgs = readdirSync(DIR).filter((f) => f.toLowerCase().endsWith('.jpg'));
if (!jpgs.length) {
  console.log('No hay iconos que convertir.');
  process.exit(0);
}

const pendientes = jpgs.filter((f) => {
  const destino = join(DIR, basename(f, extname(f)) + '.webp');
  if (!existsSync(destino)) return true;
  return statSync(destino).mtimeMs < statSync(join(DIR, f)).mtimeMs;
});

if (!pendientes.length) {
  console.log(`✓ Los ${jpgs.length} iconos ya están en WebP y al día.`);
  process.exit(0);
}

const navegador = await chromium.launch();
const pagina = await navegador.newPage();

let antes = 0;
let despues = 0;

for (const archivo of pendientes) {
  const origen = join(DIR, archivo);
  const jpg = readFileSync(origen);
  const dataUri = `data:image/jpeg;base64,${jpg.toString('base64')}`;

  const webpBase64 = await pagina.evaluate(async ({ uri, calidad }) => {
    const img = new Image();
    img.src = uri;
    await img.decode();
    const lienzo = document.createElement('canvas');
    lienzo.width = img.naturalWidth;
    lienzo.height = img.naturalHeight;
    lienzo.getContext('2d').drawImage(img, 0, 0);
    return lienzo.toDataURL('image/webp', calidad).split(',')[1];
  }, { uri: dataUri, calidad: CALIDAD });

  const webp = Buffer.from(webpBase64, 'base64');
  const destino = join(DIR, basename(archivo, extname(archivo)) + '.webp');
  writeFileSync(destino, webp);

  antes += jpg.length;
  despues += webp.length;
  const ahorro = Math.round((1 - webp.length / jpg.length) * 100);
  console.log(`  ${archivo.padEnd(24)} ${(jpg.length / 1024).toFixed(0).padStart(4)} KB → ${(webp.length / 1024).toFixed(0).padStart(4)} KB  (-${ahorro}%)`);
}

await navegador.close();

console.log(`\n✓ ${pendientes.length} iconos · ${(antes / 1024 / 1024).toFixed(2)} MB → ${(despues / 1024 / 1024).toFixed(2)} MB` +
  ` (-${Math.round((1 - despues / antes) * 100)}%)\n`);
