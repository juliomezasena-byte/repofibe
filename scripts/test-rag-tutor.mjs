/**
 * Verifica el "cerebro de preguntas" (RAG) EN VIVO en hyntibia.com.co/tutor,
 * sin llave (por el puente Vertex). Una pregunta de conocimiento debe traer una
 * respuesta citada del manual, no "consulta tu instructor".
 */
import { chromium } from 'playwright';

const CLAVE = 'Milu.0315';
const nav = await chromium.launch();
const pg = await nav.newPage();
await pg.goto('https://hyntibia.com.co/tutor', { waitUntil: 'networkidle' });
await pg.waitForSelector('#c', { timeout: 15000 });
await pg.fill('#c', CLAVE);
await pg.click('#ent');
await pg.waitForSelector('#in', { timeout: 15000 });

async function preguntar(q) {
  await pg.fill('#in', q);
  await pg.click('.send');
  await pg.waitForFunction(() => {
    const b = document.querySelectorAll('.b.coach');
    const last = b[b.length - 1];
    return last && last.textContent.trim() !== '…' && last.textContent.length > 25;
  }, { timeout: 40000 });
  const b = await pg.$$eval('.b.coach', (els) => els.map((e) => e.textContent.trim()));
  return b[b.length - 1] || '';
}

console.log('PREGUNTA 1: "¿Qué es un FHE?"');
const r1 = await preguntar('¿Qué es un FHE?');
console.log('  ' + r1.slice(0, 220));
const ok1 = /FHE|reemisi|billete/i.test(r1) && /Fuente|seg[uú]n|Glosario/i.test(r1);

console.log('\nPREGUNTA 2: "¿Cuál es la diferencia entre cambio voluntario e involuntario?"');
const r2 = await preguntar('¿Cuál es la diferencia entre cambio voluntario e involuntario?');
console.log('  ' + r2.slice(0, 220));
const ok2 = r2.length > 60 && /voluntario|involuntario/i.test(r2);

console.log('\n' + (ok1 && ok2
  ? '✓ RAG en vivo: responde preguntas de conocimiento CITANDO el manual'
  : '✗ Alguna pregunta no trajo respuesta citada (ok1=' + ok1 + ' ok2=' + ok2 + ')'));
await nav.close();
process.exitCode = ok1 && ok2 ? 0 : 1;
