#!/usr/bin/env node
/**
 * Prueba el asistente EN LA WEB PUBLICADA, no en el archivo local.
 *
 * Es la única comprobación que cuenta de verdad: un archivo puede estar bien
 * y el despliegue servir otra cosa (ya pasó una vez — el bot acabó en una
 * landing que no era la de producción).
 *
 *   node scripts/test-bot-produccion.mjs            (sin la clave)
 *   node scripts/test-bot-produccion.mjs "clave"    (comprueba que abre)
 */
import { chromium } from '@playwright/test';

const URL = 'https://hyntibia.com.co';
const CLAVE = process.argv[2] || null;

const DTR = `►DTR:TN 0752527441266·
ISSUED BY: IBERIA LINEAS AEREAS ORG/DST: SCL/SCL FCMI: DOI: 29SEP25
«E/R:»
AIRLINE DATA: KFQQV IB TOUR CODE: TKTD:
PASSENGER: GARCIABRAVO/CONSUELOISIDORA
EXCH: CONJ TKT:
O FM: SCL IB 0118 A 20AUG 1040 OK AON4NQM7 20AUG/20AUG 1PC OPEN FOR USE
O TO: MAD IB 0113 O 18SEP 1320 OK ODL0NQM7 18SEP/18SEP 1PC OPEN FOR USE
  TO: SCL
FC: SCL IB MAD140.00 IB SCL267.50NUC407.50END ROE1.00
FARE: USD 408.00/FOP:MS-WEB,060105000CWDP936570/CLP938038/
TOTAL: CLP 938038/TKTN: 075-2527441266 6`;

let fallos = 0;
const ok = (n, v) => { if (!v) fallos++; console.log(`  ${v ? '[OK]  ' : '[FALLO]'} ${n}`); };

const nav = await chromium.launch();
const pg = await nav.newPage();
const excepciones = [];
pg.on('pageerror', (e) => excepciones.push(e.message));

await pg.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
await pg.waitForTimeout(4000); // deja pasar varios ciclos del intervalo de 3 s

console.log(`\n--- ${URL} ---`);
ok('carga la página', (await pg.title()).length > 0);
ok('aparece el asistente', await pg.locator('.hb-lanzador').isVisible());
ok('ninguna excepción de JavaScript', excepciones.length === 0);
excepciones.slice(0, 3).forEach((e) => console.log('        ' + e.slice(0, 110)));

console.log('\n--- LA CLAVE NO VIAJA EN CLARO ---');
const html = await pg.content();
ok('el HTML servido no trae la clave', !/data-clave="/.test(html));
ok('solo sal y hash', /data-sal="[0-9a-f]{32}"/.test(html) && /data-clave-hash="[0-9a-f]{64}"/.test(html));

console.log('\n--- LA PUERTA ---');
await pg.click('.hb-lanzador');
await pg.waitForTimeout(400);
ok('se abre el panel', await pg.locator('.hb-panel').isVisible());
ok('pide la clave', await pg.locator('#hb-clave').isVisible());

await pg.fill('#hb-clave', 'noEsLaClave');
await pg.click('#hb-entrar');
await pg.waitForTimeout(2500);
ok('rechaza una clave mala', await pg.locator('#hb-err').isVisible());

if (CLAVE) {
  await pg.fill('#hb-clave', CLAVE);
  await pg.click('#hb-entrar');
  await pg.waitForTimeout(2500);
  ok('abre con la clave buena', await pg.locator('#hb-pantalla').isVisible());
} else {
  await pg.evaluate(() => sessionStorage.setItem('hyntibia-bot-abierto-v1', '1'));
  await pg.reload({ waitUntil: 'networkidle' });
  await pg.waitForTimeout(1200);
  await pg.click('.hb-lanzador');
  await pg.waitForTimeout(400);
}

console.log('\n--- LEE UN BILLETE REAL, EN PRODUCCIÓN ---');
await pg.fill('#hb-pantalla', DTR);
await pg.click('#hb-leer');
await pg.waitForTimeout(800);
const salida = await pg.locator('#hb-salida').innerText();
ok('familia OPTIMA', /OPTIMA/.test(salida));
ok('DOI 29SEP25', /29SEP25/.test(salida));
ok('nada volado', /todo sin volar/i.test(salida));
ok('no reembolsable', /No seg[uú]n su familia/i.test(salida));

console.log('\n--- NADA DEL PASAJERO SE GUARDA ---');
const memoria = await pg.evaluate(() => localStorage.getItem('hyntibia-bot-memoria-v1'));
ok('no guarda el nombre', !/GARCIABRAVO/i.test(memoria || ''));
ok('no guarda el número de billete', !/2527441266/.test(memoria || ''));
ok('no guarda la forma de pago', !/CWDP936570/.test(memoria || ''));
ok('sí guarda la familia', /OPTIMA/.test(memoria || ''));

console.log('\n--- Y NINGÚN MANUAL INTERNO SE PUBLICÓ ---');
const motor = await (await pg.request.get(URL + '/assets/hyntibia-bot.js')).text();
ok('sin pasos de manual', !/"pasos":/.test(motor));
ok('sin números de documento', !/#\d{4}\b/.test(motor));
ok('sin ids de procedimiento', !/cambio-manual-sin-segmento|reembolso-ibex/.test(motor));

await nav.close();
console.log('\n' + (fallos ? `✗ ${fallos} fallos` : '✓ Todo correcto en producción') + '\n');
process.exit(fallos ? 1 : 0);
