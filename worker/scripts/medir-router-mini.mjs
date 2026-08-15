// Validación PEQUEÑA y espaciada (respeta el límite de Gemini) sobre los casos
// difíciles que antes fallaban. Confirma que la Opción A los resuelve.
import { entenderIntencion } from '../src/clasificador.js';
import { detectarIntencion } from '../src/coach.js';
import { generateIntentClassification } from '../src/gemini.js';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const mapa = JSON.parse(readFileSync(join(AQUI, 'mapa-intenciones.json'), 'utf8'));
const ET = Object.keys(mapa);
const KEY = process.env.GEMINI_API_KEY, MODEL = 'gemini-2.5-flash';
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const generar = (p, e) => generateIntentClassification(KEY, MODEL, p, e);

const casos = [
  ['cambiarle el nombre al pasajero', 'correcion-de-nombre'],
  ['cuanto es el gasto de gestion para emitir en bogota en cop', 'emision-colombia-cop'],
  ['el cliente ecuatoriano tiene carnet del conadis, va con descuento por discapacidad', 'descuento-ecuador'],
  ['el ejercicio grande de los dos splits con todos los servicios y ancillaries', 'maestro-split'],
  ['el señor pide una silla de ruedas pero dice que va con oxigeno medico', 'casos-meda'],
  ['necesita menu sin gluten para el pasajero', 'comidas-equipajes-especiales'],
  ['dejame la reserva apartada 72 horas que el cliente paga despues', 'on-hold-72h'],
  ['tengo un on hold ya hecho y ahora el cliente quiere pagarlo y emitirlo', 'emision-reservas-on-hold'],
  ['el cliente quiere cambiar la fecha del vuelo', 'cambio'],
  ['solicita reembolso de un billete de iberia express', 'reembolso']
];

let ok = 0;
for (const [frase, esperado] of casos) {
  let r; try { r = await entenderIntencion(frase, { etiquetas: ET, mapa, generar, deterministaFn: detectarIntencion }); } catch { r = {}; }
  const got = r.intencion || (r.ambiguo ? '(pregunta)' : '(sin ruta)');
  const bien = got === esperado;
  if (bien) ok++;
  console.log(`  ${bien ? 'OK ' : '✗  '} ${(got).padEnd(28)} esperaba ${esperado}   ← "${frase.slice(0, 40)}"`);
  await espera(4000);
}
console.log(`\n${ok}/${casos.length} de los casos difíciles resueltos (antes: casi todos fallaban)`);
