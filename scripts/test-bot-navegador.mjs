// Prueba el widget en la landing REAL, con un navegador de verdad.
import { chromium } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';

// La landing REAL de producción (la de hyntibia-v1 es otra versión distinta).
const LANDING = 'c:/Users/mesw/Desktop/hyntibia llsm/HYNTIBIA/hyntibia-dashboard/static/landing.html';

// Este test NO conoce la clave, y no debe: en la página solo hay una sal y un
// hash PBKDF2, y este repo está en git. Se comprueba que la puerta RECHAZA lo
// que no vale; para probar el lector se entra por sessionStorage, que es lo
// que el widget mira cuando ya entraste antes.
//
// Si quieres comprobar además que TU clave abre:
//     node scripts/test-bot-navegador.mjs "tu-clave"
const CLAVE = process.argv[2] || null;
const html = readFileSync(LANDING, 'utf8');
if (!/data-clave-hash="[0-9a-f]{64}"/.test(html)) {
  console.error('index.html no tiene un hash de clave válido. Genera uno con scripts/bot-clave.mjs');
  process.exit(1);
}
if (/data-clave="/.test(html)) {
  console.error('¡Hay una clave EN CLARO en index.html! Genera el hash con scripts/bot-clave.mjs');
  process.exit(1);
}
const AQUI = 'C:/Users/mesw/AppData/Local/Temp/claude/c--Users-mesw-Desktop-Practica/7b830269-c55c-47ef-991d-f249000a2d2f/scratchpad';

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

const navegador = await chromium.launch();
const pagina = await navegador.newPage();

// Se distinguen dos cosas que no son lo mismo:
//   · excepciones de JavaScript → nunca son aceptables
//   · recursos que no cargan    → al abrir con file:// las rutas absolutas
//     (/assets/foto.webp) no resuelven; en el servidor real sí. Se cuentan
//     aparte para no dar por roto lo que solo es el protocolo del archivo.
const errores = [];
const recursos = [];
pagina.on('pageerror', (e) => errores.push(e.message));
pagina.on('console', (m) => {
  if (m.type() !== 'error') return;
  if (/Failed to load resource/i.test(m.text())) recursos.push(m.text());
  else errores.push(m.text());
});

await pagina.goto(pathToFileURL(LANDING).href);
await pagina.waitForTimeout(1200);

const ok = (n, v) => console.log(`  ${v ? '[OK]  ' : '[FALLO]'} ${n}`);

console.log('\n--- EL LANZADOR APARECE ---');
const lanzador = pagina.locator('.hb-lanzador');
ok('se ve el botón', await lanzador.isVisible());
ok('la landing no lanza ninguna excepción de JavaScript', errores.length === 0);
if (errores.length) {
  console.log('     excepciones:');
  errores.forEach((e, i) => console.log('     ' + (i + 1) + '. ' + String(e).slice(0, 130)));
}
if (recursos.length) {
  console.log(`     (${recursos.length} recursos no cargan por abrir con file://; en el servidor sí resuelven)`);
}

console.log('\n--- LA CLAVE PROTEGE LA ENTRADA ---');
await lanzador.click();
await pagina.waitForTimeout(300);
ok('se abre el panel', await pagina.locator('.hb-panel').isVisible());
ok('pide la clave', await pagina.locator('#hb-clave').isVisible());

await pagina.fill('#hb-clave', 'incorrecta');
await pagina.click('#hb-entrar');
await pagina.waitForTimeout(2500); // derivar 250.000 vueltas tarda a propósito
ok('rechaza una clave mala', await pagina.locator('#hb-err').isVisible());
ok('y no deja pasar al lector', !(await pagina.locator('#hb-pantalla').isVisible().catch(() => false)));

console.log('\n--- LA CLAVE NO ESTÁ EN NINGUNA PARTE DE LA PÁGINA ---');
const fuente = await pagina.content();
ok('el HTML servido no trae data-clave en claro', !/data-clave="/.test(fuente));
ok('sí trae la sal y el hash', /data-sal="[0-9a-f]{32}"/.test(fuente) && /data-clave-hash="[0-9a-f]{64}"/.test(fuente));

if (CLAVE) {
  await pagina.fill('#hb-clave', CLAVE);
  await pagina.click('#hb-entrar');
  await pagina.waitForTimeout(2500);
  ok('con la clave buena entra', await pagina.locator('#hb-in').isVisible());
} else {
  // Se entra por la puerta de atrás legítima para poder probar el lector.
  await pagina.evaluate(() => sessionStorage.setItem('hyntibia-bot-abierto-v1', '1'));
  await pagina.reload();
  await pagina.waitForTimeout(600);
  await pagina.click('.hb-lanzador');
  await pagina.waitForTimeout(300);
  console.log('  (sin clave: se prueba el chat entrando por sessionStorage)');
}

console.log('\n--- EL CHAT ESTÃ LISTO ---');
if (false) {
await pagina.click('#hb-leer');
await pagina.waitForTimeout(600);

const salida = await pagina.locator('#hb-salida').innerText();
ok('dice la familia OPTIMA', /OPTIMA/.test(salida));
ok('dice el DOI 29SEP25', /29SEP25/.test(salida));
ok('dice que no hay nada volado', /todo sin volar/i.test(salida));
ok('dice que NO es reembolsable', /No seg[uú]n su familia/i.test(salida));
ok('identifica la aerolínea', /Iberia/.test(salida));

console.log('\n--- LA MEMORIA GUARDA SIN DATOS PERSONALES ---');
const memoria = await pagina.evaluate(() => localStorage.getItem('hyntibia-bot-memoria-v1'));
ok('guarda el caso', !!memoria && JSON.parse(memoria).casos.length === 1);
ok('NO guarda el nombre del pasajero', !/GARCIABRAVO/i.test(memoria || ''));
ok('NO guarda el número de billete', !/2527441266/.test(memoria || ''));
ok('NO guarda la forma de pago', !/CWDP936570/.test(memoria || ''));
ok('sí guarda la familia (para aprender)', /OPTIMA/.test(memoria || ''));

}

console.log('\n--- EL CHAT ESTÃ LISTO ---');
ok('muestra el campo de conversaciÃ³n', await pagina.locator('#hb-in').isVisible());
ok('saluda al abrir', /tu tutor/i.test(await pagina.locator('#hb-hilo').innerText()));
ok('no muestra el lector antiguo', !(await pagina.locator('#hb-pantalla').isVisible().catch(() => false)));

console.log('\n--- CAPTURA ---');
await pagina.screenshot({ path: `${AQUI}/bot-hyntibia.png`, fullPage: false });
console.log(`  guardada en ${AQUI}/bot-hyntibia.png`);

await navegador.close();
console.log(errores.length ? `\nErrores JS: ${errores.length}` : '\nSin errores de JS.\n');
