#!/usr/bin/env node
/**
 * Prueba el árbol de decisión.
 *
 * Lo importante no es solo que acierte el procedimiento, sino que:
 *  · NUNCA adivine — si le falta un dato, pregunta
 *  · diga CÓMO sabe cada cosa
 *  · avise de lo que cuesta dinero (revalidar vs reemitir, /SC, 250 millas)
 *
 * El caso estrella es el KFQQV real del 08AGO26.
 */

import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { queProcedimiento, DESTINOS } from '../src/arbol.js';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

let fallos = 0, pasados = 0;
function comprobar(nombre, real, esperado) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (ok) { pasados++; console.log(`  [OK]   ${nombre}`); }
  else { fallos++; console.error(`  [FALLO] ${nombre}\n          esperado: ${JSON.stringify(esperado)}\n          real:     ${JSON.stringify(real)}`); }
}
function contiene(nombre, texto, fragmento) {
  const ok = String(texto).toLowerCase().includes(fragmento.toLowerCase());
  if (ok) { pasados++; console.log(`  [OK]   ${nombre}`); }
  else { fallos++; console.error(`  [FALLO] ${nombre}\n          no encontré "${fragmento}" en: ${texto}`); }
}

// ── 0 · Los destinos existen de verdad ──────────────────────────
console.log('\n--- LOS DESTINOS DEL ÁRBOL EXISTEN ---');
const enDisco = new Set(
  readdirSync(join(RAIZ, 'public', 'procedimientos'))
    .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
    .map((f) => f.replace(/\.json$/, ''))
);
for (const id of Object.keys(DESTINOS)) {
  comprobar(`${id} existe en public/procedimientos/`, enDisco.has(id), true);
}

// ── 1 · Sin datos, pregunta. No adivina. ────────────────────────
console.log('\n--- SIN DATOS: PREGUNTA, NO ADIVINA ---');
const r0 = queProcedimiento({});
comprobar('no decide nada', r0.procedimientoId, null);
comprobar('pregunta la intención', r0.siguientePregunta.id, 'intencion');
comprobar('ofrece las 4 ramas', r0.siguientePregunta.opciones.length, 4);

const r1 = queProcedimiento({ intencion: 'cambio' });
comprobar('cambio sin billete → pregunta si voló', r1.siguientePregunta.id, 'volado');
comprobar('sigue sin decidir', r1.procedimientoId, null);

// ── 2 · El caso real KFQQV ──────────────────────────────────────
console.log('\n--- CASO REAL: KFQQV / GARCIABRAVO ---');

const billeteReal = {
  placa: '075', doi: '29SEP25', algunSegmentoVolado: false,
  familia: 'OPTIMA', reembolsable: false,
  diasHastaElProximoVuelo: 12, ventana: 'COMERCIAL', avisos: []
};
const pnrReal = {
  segmentos: [
    { linea: 3, estado: 'TK', origen: 'SCL', destino: 'MAD' },
    { linea: 4, estado: 'HK', origen: 'MAD', destino: 'SCL' }
  ]
};

const rk = queProcedimiento({ intencion: 'cambio', billete: billeteReal, pnr: pnrReal });
comprobar('sabe que NO ha volado nada', rk.camino[0].respuesta, 'No');
contiene('y dice cómo lo sabe', rk.camino[0].comoLoSe, 'OPEN FOR USE');
comprobar('NO decide todavía', rk.procedimientoId, null);
comprobar('pide el histórico', rk.siguientePregunta.id, 'historico');
contiene('avisa del TK', rk.advertencias.join(' '), 'involuntario');
contiene('y de que no hay que cobrar aún', rk.siguientePregunta.porQueImporta, 'no tener que pagar');

// Con el histórico: resulta que NO hay incidencia → es voluntario
const rk2 = queProcedimiento({
  intencion: 'cambio', billete: billeteReal, pnr: pnrReal,
  historico: { cancelaciones: [], cambiosDeHora: [], opcionesOfrecidas: [] },
  respuestas: { involuntario: false }
});
comprobar('ahora sí avanza a la rama voluntaria', rk2.siguientePregunta.id, 'cotizo');
contiene('recomienda empezar por el automático', rk2.avisos.join(' '), '#3111');

const rk3 = queProcedimiento({
  intencion: 'cambio', billete: billeteReal, pnr: pnrReal,
  respuestas: { involuntario: false, cotizo: false }
});
comprobar('→ #3121 manual sin segmento volado', rk3.procedimientoId, 'cambio-manual-sin-segmento-volado');
contiene('explica que la penalidad va en TSM', rk3.avisos.join(' '), 'TSM');

// ── 3 · Las seis hojas del árbol de cambio ──────────────────────
console.log('\n--- LAS SEIS HOJAS ---');

comprobar('voló + cotizó → #3113',
  queProcedimiento({ intencion: 'cambio', respuestas: { volado: true } }).procedimientoId,
  'cambio-manual-con-segmento-volado');

comprobar('sin volar + voluntario + cotizó → #3111',
  queProcedimiento({ intencion: 'cambio', respuestas: { volado: false, involuntario: false, cotizo: true } }).procedimientoId,
  'cambio-voluntario-automatico');

comprobar('sin volar + voluntario + NO cotizó → #3121',
  queProcedimiento({ intencion: 'cambio', respuestas: { volado: false, involuntario: false, cotizo: false } }).procedimientoId,
  'cambio-manual-sin-segmento-volado');

const rev = queProcedimiento({ intencion: 'cambio', respuestas: { volado: false, involuntario: true, cambiaClaseORuta: false } });
comprobar('involuntario + misma clase/ruta → #3639', rev.procedimientoId, 'cambio-involuntario-misma-clase-ruta');
contiene('AVISA de que NO se cobra', rev.avisos.join(' '), 'no se cobra');

const reem = queProcedimiento({ intencion: 'cambio', billete: billeteReal, respuestas: { volado: false, involuntario: true, cambiaClaseORuta: true } });
comprobar('involuntario + cambia clase/ruta → #3638', reem.procedimientoId, 'cambio-involuntario-diferente-clase-ruta');
contiene('avisa de las 250 millas', reem.advertencias.join(' '), '250 MILLAS');
contiene('y de que lleva /SC por estar a +48h', reem.avisos.join(' '), '/SC');

// ── 4 · Reembolsos: lo que se puede saber antes de empezar ──────
console.log('\n--- REEMBOLSO ---');

const rr = queProcedimiento({ intencion: 'reembolso', billete: billeteReal });
comprobar('075 → reembolso Iberia', rr.procedimientoId, 'reembolso-iberia-general');
contiene('AVISA de que OPTIMA no es reembolsable', rr.advertencias.join(' '), 'NO PERMITIDO');
contiene('recuerda comprobar responsabilidad con PV', rr.avisos.join(' '), 'PV');

const rr060 = queProcedimiento({ intencion: 'reembolso', billete: { placa: '060' } });
comprobar('060 → reembolso IBEX', rr060.procedimientoId, 'reembolso-ibex-no-pcc');
contiene('avisa de que está al 10% verbatim', rr060.advertencias.join(' '), '10%');

// ── 5 · Servicios: la restricción por ruta va ANTES ─────────────
console.log('\n--- SERVICIOS ---');

const rs = queProcedimiento({ intencion: 'servicio', respuestas: { servicio: 'AVIH' } });
comprobar('AVIH → su procedimiento', rs.procedimientoId, 'mascota-en-bodega-avih');
contiene('avisa de la matriz de rutas ANTES', rs.advertencias.join(' '), 'restricciones por trayecto');
contiene('y de que no es simétrica', rs.advertencias.join(' '), 'NO es simétrica');
contiene('y de que no vale para Vueling ni LEVEL', rs.avisos.join(' '), 'LEVEL');

comprobar('emisión → su manual',
  queProcedimiento({ intencion: 'emision' }).procedimientoId, 'emision-latam');

console.log(`\n${'='.repeat(50)}`);
console.log(`Resultados: ${pasados} pasados, ${fallos} fallidos.`);
console.log('='.repeat(50));
if (fallos) process.exit(1);
