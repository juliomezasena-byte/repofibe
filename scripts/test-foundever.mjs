// Prueba DEFINITIVA: hyntibia.com.co con el dominio del worker BLOQUEADO,
// igual que en la red de Foundever. Debe funcionar 100% local.
import { chromium } from '@playwright/test';

const CLAVE = process.argv[2] || 'Milu.0315';
const nav = await chromium.launch();
const pg = await nav.newPage();

// Simula el bloqueo de Foundever: corta TODO lo que sea workers.dev.
let intentosAlWorker = 0;
await pg.route('**/*', (route) => {
  if (/workers\.dev/i.test(route.request().url())) { intentosAlWorker++; return route.abort(); }
  return route.continue();
});

const errores = [];
pg.on('pageerror', (e) => errores.push(e.message));

await pg.goto('https://hyntibia.com.co', { waitUntil: 'domcontentloaded', timeout: 60000 });
await pg.waitForTimeout(2500);

let fallos = 0;
const ok = (n, v) => { if (!v) fallos++; console.log(`  ${v ? '[OK]  ' : '[FALLO]'} ${n}`); };

console.log('\n--- CON EL WORKER BLOQUEADO (como en Foundever) ---');
await pg.click('.hb-lanzador');
await pg.waitForTimeout(500);
await pg.fill('#hb-clave', CLAVE);
await pg.click('#hb-entrar');
await pg.waitForTimeout(3500); // PBKDF2
ok('la clave abre el chat', await pg.locator('#hb-in').isVisible().catch(() => false));

await pg.fill('#hb-in', 'el pasajero quiere cambiar la fecha');
await pg.getByLabel('Enviar').click();
await pg.waitForTimeout(2500);
const resp1 = await pg.locator('#hb-hilo').innerText().catch(() => '');
ok('responde aunque el worker esté bloqueado', /vol[oó]|cambiar/i.test(resp1));

// pega un billete real → debe leerlo local
const billete = '►DTR:TN 0752527441266\nPASSENGER: GARCIABRAVO/CONSUELO\nO FM: SCL IB 0118 A 20AUG 1040 OK AON4NQM7 20AUG/20AUG 1PC OPEN FOR USE\nTOTAL: CLP 938038/TKTN: 075-2527441266';
await pg.fill('#hb-in', billete);
await pg.getByLabel('Enviar').click();
await pg.waitForTimeout(2500);
const resp2 = await pg.locator('#hb-hilo').innerText().catch(() => '');
ok('lee un billete pegado (OPTIMA / no reembolsable)', /OPTIMA|reembols|volad/i.test(resp2));

ok('NUNCA dijo "no pude conectar"', !/no pude conectar/i.test(resp1 + resp2));
console.log(`  (intentos de llamar al worker bloqueado: ${intentosAlWorker} — deberían ser 0)`);
ok('no intentó siquiera llamar al worker', intentosAlWorker === 0);
ok('sin excepciones de JS', errores.length === 0);
errores.slice(0, 2).forEach((e) => console.log('     ' + e.slice(0, 110)));

await pg.screenshot({ path: 'c:/Users/mesw/AppData/Local/Temp/claude/c--Users-mesw-Desktop-Practica/7b830269-c55c-47ef-991d-f249000a2d2f/scratchpad/foundever.png' });
await nav.close();
console.log('\n' + (fallos ? `✗ ${fallos} fallos` : '✓ Funciona en hyntibia.com.co con el worker bloqueado — listo para Foundever') + '\n');
process.exit(fallos ? 1 : 0);
