#!/usr/bin/env node
/**
 * Empaqueta public/procedimientos/*.json en un solo archivo para el Worker.
 *
 * Cloudflare Workers no tiene sistema de ficheros: los manuales tienen que
 * ir dentro del bundle. Mismo patrón que sync-scenarios.mjs.
 *
 * IMPORTANTE: este script existe para que meter un manual nuevo siga siendo
 * "añadir un JSON y correr esto". Si algún día hace falta tocar código para
 * que un manual funcione, el diseño está mal.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const ORIGEN = join(AQUI, '..', '..', 'public', 'procedimientos');
const DESTINO = join(AQUI, '..', 'src', 'procedimientos.generated.json');

const salida = {};
let pasos = 0;
let procedimientos = 0;
let tablas = 0;

// Los archivos `_*.json` NO son procedimientos: son las tablas de referencia
// (cabinas, beneficios de tarifa, glosario, sistemas…). Van al bundle igual
// que los manuales, porque el Worker las necesita en runtime:
//   · _gama-tarifas-cabinas + _tipos-de-tarifas-beneficios → derivar.js
//   · _glosario                                            → prompts.js
//   · _sistemas                                            → el aviso del ":"
// Antes solo entraba _sistemas, y por eso derivar.js no podía vivir aquí.
for (const f of readdirSync(ORIGEN).filter((f) => f.endsWith('.json'))) {
  const p = JSON.parse(readFileSync(join(ORIGEN, f), 'utf8'));
  if (f.startsWith('_')) {
    // Las tablas se indexan por NOMBRE DE ARCHIVO (con guion bajo), no por su
    // campo `id`. Así nunca colisionan con el id de un procedimiento ni pueden
    // colarse por la búsqueda `procedimientos[id]` del endpoint.
    salida[f.replace(/\.json$/, '')] = p;
    tablas += 1;
  } else {
    if (!p.id) throw new Error(`${f}: procedimiento sin id`);
    if (salida[p.id]) throw new Error(`ID de procedimiento duplicado: ${p.id} (${f})`);
    salida[p.id] = p;
    procedimientos += 1;
    pasos += (p.pasos || []).length;
  }
}

writeFileSync(DESTINO, JSON.stringify(salida, null, 2) + '\n');
console.log(`✓ ${procedimientos} procedimientos · ${pasos} pasos · ${tablas} tablas de referencia → src/procedimientos.generated.json`);
