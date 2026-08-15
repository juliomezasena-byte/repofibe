/**
 * Prueba EN VIVO la página completa hyntibia.com.co/tutor:
 *  1. la clave abre el chat
 *  2. con la IA activa (llave en localStorage), un caso real se encamina bien
 * La llave se lee de GEMINI_TEST_KEY (no se escribe en disco).
 */
import { chromium } from 'playwright';

const CLAVE = 'Milu.0315';
const nav = await chromium.launch();
const pg = await nav.newPage();
// SIN llave en localStorage: la IA debe venir del PUENTE del servidor (Vertex).

await pg.goto('https://hyntibia.com.co/tutor', { waitUntil: 'networkidle' });

// Puerta de clave
await pg.waitForSelector('#c', { timeout: 15000 });
await pg.fill('#c', CLAVE);
await pg.click('#ent');

// Chat abierto
await pg.waitForSelector('#in', { timeout: 15000 });
const saludo = await pg.textContent('#hilo');
const iaTxt = (await pg.textContent('#ia')) || '';
console.log('IA:', iaTxt.trim());
console.log('saludo visible:', /asistente de Amadeus/i.test(saludo || ''));

// Caso trampa real
await pg.fill('#in', 'cambiarle el nombre al pasajero porque quedó mal escrito');
await pg.click('.send');
// Espera a que el "…" se reemplace por la respuesta real
await pg.waitForFunction(() => {
  const b = document.querySelectorAll('.b.coach');
  const last = b[b.length - 1];
  return last && last.textContent && last.textContent.trim() !== '…' && last.textContent.length > 20;
}, { timeout: 75000 });

const burbujas = await pg.$$eval('.b.coach', (els) => els.map((e) => e.textContent.trim()));
const ultima = burbujas[burbujas.length - 1] || '';
console.log('\nrespuesta al caso del nombre:\n  ' + ultima.slice(0, 260));

const ok = /nombre|apellido|3108|3110|correc/i.test(ultima);
console.log('\n' + (ok ? '✓ /tutor: la clave abre, el chat responde y encamina el caso del nombre' : '✗ la respuesta no parece de corrección de nombre'));
await nav.close();
process.exitCode = ok ? 0 : 1;
