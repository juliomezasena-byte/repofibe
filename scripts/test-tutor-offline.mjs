// Verifica que el tutor offline funciona EN UN NAVEGADOR real, sin red.
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const BUNDLE = 'c:/Users/mesw/Desktop/hyntibia llsm/HYNTIBIA/hyntibia-dashboard/static/assets/hyntibia-tutor.js';
const codigo = readFileSync(BUNDLE, 'utf8');

const nav = await chromium.launch();
const pg = await nav.newPage();

// Espía la red: si el tutor intentara hablar con un servidor, lo veríamos.
const peticionesRed = [];
pg.on('request', (req) => { const u = req.url(); if (/^https?:/.test(u)) peticionesRed.push(u); });

const errores = [];
pg.on('pageerror', (e) => errores.push(e.message));
await pg.setContent('<!doctype html><html><body></body></html>');
await pg.addScriptTag({ content: codigo });

const r = await pg.evaluate(async () => {
  const api = window.HyntibIA;
  if (!api || !api.responderLocal) return { error: 'no expone responderLocal' };
  const t1 = await api.responderLocal({ consulta: 'el pasajero quiere cambiar la fecha', caso: {} });
  const t2 = await api.responderLocal({ caso: { intencion: 'cambio', respuestas: { volado: false } } });
  const billete = '►DTR:TN 0752527441266\nPASSENGER: GARCIABRAVO/CONSUELO\nO FM: SCL IB 0118 A 20AUG 1040 OK AON4NQM7 20AUG/20AUG 1PC OPEN FOR USE\nTOTAL: CLP 938038/TKTN: 075-2527441266';
  const t3 = await api.responderLocal({ caso: { pantallas: [billete] } });
  return {
    t1: t1.decision && t1.decision.siguientePregunta && t1.decision.siguientePregunta.id,
    intencion: t1.decision && t1.decision.intencionActiva,
    t2: t2.decision && t2.decision.siguientePregunta && t2.decision.siguientePregunta.id,
    familia: t3.lectura && t3.lectura.billete && t3.lectura.billete.familia
  };
});

let fallos = 0;
const ok = (n, v) => { if (!v) fallos++; console.log(`  ${v ? '[OK]  ' : '[FALLO]'} ${n}`); };

console.log('\n--- EL TUTOR CORRE EN EL NAVEGADOR, SIN RED ---');
ok('expone la API (responderLocal)', !r.error);
ok('"cambiar la fecha" → pregunta si voló', r.t1 === 'volado');
ok('recuerda la intención (cambio)', r.intencion === 'cambio');
ok('responder "no voló" avanza el árbol', r.t2 === 'involuntario');
ok('lee un billete real → familia OPTIMA', r.familia === 'OPTIMA');
ok('NO hizo ninguna llamada de red (http/https)', peticionesRed.length === 0);
peticionesRed.slice(0, 3).forEach((u) => console.log('     red: ' + u.slice(0, 80)));
ok('sin excepciones de JS', errores.length === 0);
errores.slice(0, 3).forEach((e) => console.log('     ' + e.slice(0, 120)));

await nav.close();
console.log('\n' + (fallos ? `✗ ${fallos} fallos` : '✓ El tutor completo funciona en el navegador, sin tocar la red') + '\n');
process.exit(fallos ? 1 : 0);
