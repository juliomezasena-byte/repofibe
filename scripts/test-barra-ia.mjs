/**
 * Comprueba, en un navegador LIMPIO (sin caché), que la versión desplegada de
 * hyntibia.com.co ya muestra la barra "⚡ Activar IA" tras la clave. Si aquí
 * aparece pero en el navegador del usuario no, es caché suya (Ctrl+Shift+R).
 */
import { chromium } from 'playwright';

const CLAVE = 'Milu.0315';
const navegador = await chromium.launch();
const pg = await navegador.newPage({ bypassCSP: true });
// Sin caché: fuerza recarga desde el servidor.
await pg.route('**/*', (r) => r.continue());

await pg.goto('https://hyntibia.com.co/landing', { waitUntil: 'networkidle' });

// Abrir el widget
await pg.click('.hb-lanzador');
// Meter la clave
await pg.fill('#hb-clave', CLAVE);
await pg.click('#hb-entrar');
await pg.waitForSelector('#hb-ia', { timeout: 15000 });

const textoBarra = (await pg.textContent('#hb-ia')) || '';
const versionWidget = await pg.evaluate(() =>
  Array.from(document.scripts).map((s) => s.src).find((s) => s.includes('bot-widget')) || ''
);

console.log('script del widget cargado:', versionWidget);
console.log('texto de la barra IA:', JSON.stringify(textoBarra.trim()));

const ok = /Activar IA|IA activa/.test(textoBarra);
console.log(ok
  ? '\n✓ La versión en vivo SÍ muestra la barra de IA. Lo que ve el usuario es caché.'
  : '\n✗ La barra de IA NO aparece en vivo — revisar el widget.');

await navegador.close();
process.exitCode = ok ? 0 : 1;
