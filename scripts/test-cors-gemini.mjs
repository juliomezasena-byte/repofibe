/**
 * ¿Puede un NAVEGADOR llamar directo a Gemini? (CORS)
 * Esto decide si la arquitectura cliente es viable o si hay que ir por servidor.
 * Corre el fetch DENTRO de la página (contexto navegador real), no en node.
 */
import { chromium } from 'playwright';

const KEY = process.env.GEMINI_TEST_KEY || '';
const nav = await chromium.launch();
const pg = await nav.newPage();
await pg.goto('https://hyntibia.com.co/tutor', { waitUntil: 'domcontentloaded' });

const res = await pg.evaluate(async (key) => {
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=' + key;
  const t0 = Date.now();
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: 'responde: OK' }] }] })
    });
    const j = await r.json();
    return { ok: true, status: r.status, ms: Date.now() - t0, texto: j?.candidates?.[0]?.content?.parts?.[0]?.text || j?.error?.message || '(sin texto)' };
  } catch (e) {
    return { ok: false, ms: Date.now() - t0, error: String(e) };
  }
}, KEY);

console.log('Desde el NAVEGADOR (hyntibia.com.co):');
console.log(JSON.stringify(res, null, 2));
console.log(res.ok
  ? '\n✓ El navegador SÍ puede llamar a Gemini (no hay bloqueo CORS). La lentitud es latencia.'
  : '\n✗ El navegador NO puede llamar a Gemini directo → hay que ir por SERVIDOR (proxy).');
await nav.close();
