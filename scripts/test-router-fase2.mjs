/**
 * FASE 2 — Verifica el router en vivo: el "se queda pegado".
 * Empieza una emisión y luego cambia de tema a reembolso; debe SOLTAR el
 * procedimiento viejo y reencaminar, no seguir pidiendo la fecha del vuelo.
 */
import { chromium } from 'playwright';

const CLAVE = 'Milu.0315';
const nav = await chromium.launch();
const pg = await nav.newPage();
await pg.goto('https://hyntibia.com.co/tutor', { waitUntil: 'networkidle' });
await pg.waitForSelector('#c', { timeout: 15000 });
await pg.fill('#c', CLAVE); await pg.click('#ent');
await pg.waitForSelector('#in', { timeout: 15000 });

async function decir(q) {
  const antes = (await pg.$$('.b.coach')).length;
  await pg.fill('#in', q); await pg.click('.send');
  await pg.waitForFunction((n) => {
    const b = document.querySelectorAll('.b.coach');
    return b.length > n && b[b.length - 1].textContent.trim() !== '…' && b[b.length - 1].textContent.length > 20;
  }, antes, { timeout: 45000 });
  const b = await pg.$$eval('.b.coach', (els) => els.map((e) => e.textContent.trim()));
  return b[b.length - 1] || '';
}

console.log('TURNO 1 (empezar emisión): "quiero hacer una reserva de bogota a madrid"');
const r1 = await decir('quiero hacer una reserva de bogota a madrid');
console.log('  ' + r1.slice(0, 140));

console.log('\nTURNO 2 (cambiar de tema): "mejor un reembolso, el cliente ya no va a viajar"');
const r2 = await decir('mejor un reembolso, el cliente ya no va a viajar');
console.log('  ' + r2.slice(0, 200));

const cambio = /reembolso|devoluci|devolver|075|060|OPEN|penalidad/i.test(r2);
const pegado = /fecha de vuelo|buscar fechas|disponibilidad|AN FECHA/i.test(r2);
console.log('\n' + (cambio && !pegado
  ? '✓ Router: soltó la emisión y cambió a reembolso (ya no se queda pegado)'
  : '✗ Sigue pegado en la emisión (cambio=' + cambio + ' pegado=' + pegado + ')'));
await nav.close();
process.exitCode = (cambio && !pegado) ? 0 : 1;
