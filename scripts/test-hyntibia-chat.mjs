// Prueba el chat de hyntibia contra el WORKER EN VIVO, en un navegador real.
// Es la única prueba que cuenta: el widget local llama al endpoint público
// desplegado. Si esto pasa, funciona en producción.
import { chromium } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';

const LANDING = 'c:/Users/mesw/Desktop/hyntibia llsm/HYNTIBIA/hyntibia-dashboard/static/landing.html';
const CLAVE = process.argv[2] || 'Milu.0315';

// Verificación estática: el widget apunta al endpoint PÚBLICO, no al de login.
const widget = readFileSync('c:/Users/mesw/Desktop/hyntibia llsm/HYNTIBIA/hyntibia-dashboard/static/assets/hyntibia-bot-widget.js', 'utf8');
let fallos = 0;
const ok = (n, v) => { if (!v) fallos++; console.log(`  ${v ? '[OK]  ' : '[FALLO]'} ${n}`); };

console.log('\n--- EL WIDGET LLAMA AL ENDPOINT CORRECTO ---');
ok('usa /coach/publico (no /tutor/paso)', /\/coach\/publico/.test(widget) && !/\/tutor\/paso/.test(widget));
ok('manda el token X-Bot-Clave', /X-Bot-Clave/.test(widget));

const nav = await chromium.launch();
const pg = await nav.newPage();
const errores = [];
pg.on('pageerror', (e) => errores.push(e.message));

await pg.goto(pathToFileURL(LANDING).href);
await pg.waitForTimeout(1200);

console.log('\n--- ENTRAR CON LA CLAVE ---');
await pg.click('.hb-lanzador');
await pg.waitForTimeout(400);
await pg.fill('#hb-clave', CLAVE);
await pg.click('#hb-entrar');
await pg.waitForTimeout(3000); // PBKDF2 250k iteraciones
const enChat = await pg.locator('#hb-in').isVisible().catch(() => false);
ok('la clave abre el chat', enChat);
ok('saluda al abrir', /tu tutor/i.test(await pg.locator('.hb-b-coach').first().innerText().catch(() => '')));

console.log('\n--- CONVERSACIÓN REAL CONTRA EL WORKER EN VIVO ---');
await pg.fill('#hb-in', 'el pasajero quiere cambiar la fecha');
await pg.getByLabel('Enviar').click();
// esperar la respuesta del worker (encamina, sin Gemini → rápido)
await pg.waitForSelector('.hb-opt', { timeout: 20000 }).catch(() => {});
const miMsg = await pg.locator('.hb-b-alumno').first().innerText().catch(() => '');
ok('mi mensaje aparece en el hilo', /cambiar la fecha/i.test(miMsg));
const preg = await pg.locator('.hb-preg').innerText().catch(() => '');
ok('el worker encamina y pregunta si voló algo', /vol/i.test(preg));

console.log('\n--- RESPONDER UN BOTÓN NO REPREGUNTA LA INTENCIÓN ---');
// clic en "No, ninguno" (o el que contenga "No")
const noBtn = pg.locator('.hb-opt', { hasText: /no/i }).first();
await noBtn.click().catch(() => {});
await pg.waitForTimeout(6000); // puede resolver a procedimiento → Gemini
const textoTrasNo = await pg.locator('#hb-acciones').innerText().catch(() => '');
const hiloTexto = await pg.locator('#hb-hilo').innerText().catch(() => '');
ok('NO vuelve a preguntar "qué necesita el pasajero"', !/qué necesita el pasajero/i.test(textoTrasNo));
ok('avanza (otra pregunta o un paso con comando)',
  /vol|involuntario|cotiz|Paso \d/i.test(textoTrasNo + hiloTexto));

console.log('\n--- SIN EXCEPCIONES DE JS ---');
ok('la página no lanzó excepciones', errores.length === 0);
errores.slice(0, 3).forEach((e) => console.log('     ' + e.slice(0, 120)));

await pg.screenshot({ path: 'c:/Users/mesw/AppData/Local/Temp/claude/c--Users-mesw-Desktop-Practica/7b830269-c55c-47ef-991d-f249000a2d2f/scratchpad/hyntibia-chat.png' });

await nav.close();
console.log('\n' + (fallos ? `✗ ${fallos} fallos` : '✓ El chat de hyntibia funciona contra el worker en vivo') + '\n');
process.exit(fallos ? 1 : 0);
