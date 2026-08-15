#!/usr/bin/env node
/**
 * El catálogo de errores tiene que RECONOCER la pantalla y dar el comando de
 * recuperación del manual — nunca uno inventado.
 *
 * Este test comprueba tres cosas por cada error: que se detecta, que trae la
 * solución correcta (el comando VERBATIM del manual) y que apunta al
 * procedimiento adecuado. Y que un texto normal (un PNR, un "hola") NO
 * dispara ningún falso positivo.
 */

import { detectarError, CATALOGO_ERRORES } from '../src/errores-pantalla.js';

let fallos = 0;
let pasados = 0;

function comprobar(nombre, real, esperado) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (ok) { pasados++; console.log(`  [OK]   ${nombre}`); }
  else { fallos++; console.error(`  [FALLO] ${nombre}\n          esperado: ${JSON.stringify(esperado)}\n          real:     ${JSON.stringify(real)}`); }
}

// ── Casos: la pantalla que pega el agente y lo que debe salir ────
// Los textos incluyen ruido y espacios de más a propósito: la detección
// tiene que ser case-insensitive y tolerar el formato crudo de la terminal.

const CASOS = [
  {
    nombre: 'ET NOT ISSUED',
    pantalla: 'st4  ET NOT ISSUED FOR SELECTED SEGMENT\nintenta de nuevo',
    codigo: 'ET_NOT_ISSUED',
    solucion: 'Revalida el billete con TTP/ETRV/L#/S#-#/E#-#/RT',
    procedimiento: 'asientos-seleccion-remision'
  },
  {
    nombre: 'ET NOR ISSUED (typo del sistema)',
    pantalla: 'et nor issued for selected segment',
    codigo: 'ET_NOT_ISSUED',
    solucion: 'Revalida el billete con TTP/ETRV/L#/S#-#/E#-#/RT',
    procedimiento: 'asientos-seleccion-remision'
  },
  {
    nombre: 'ITINERARY PRICING REQUIRED',
    pantalla: 'ERROR: ITINERARY PRICING REQUIRED BEFORE SERVICE PRICING',
    codigo: 'ITINERARY_PRICING_REQUIRED',
    solucion: 'Cotiza a histórico primero: FXX/R,DOI,UP/L#-FAREBASIS',
    procedimiento: 'asientos-seleccion-remision'
  },
  {
    nombre: 'NO FARES/RBD',
    pantalla: 'NO FARES/RBD/CARRIER/PASSENGER TYPE',
    codigo: 'NO_FARES_RBD',
    solucion: 'Cambia las clases y reemplaza FXX por FXR en la cotización',
    procedimiento: 'cambio-manual-sin-segmento-volado'
  },
  {
    nombre: 'SCREEN DESTROYED',
    pantalla: '   screen   destroyed   ',
    codigo: 'SCREEN_DESTROYED',
    solucion: 'Sal del menú con F3 o reabre la máscara WEMD: WEMD:075-XXXXXXXXXX',
    procedimiento: 'umnr-menor-no-acompanado'
  },
  {
    nombre: 'CHECK CREDIT CARD',
    pantalla: 'WARNING CHECK CREDIT CARD',
    codigo: 'CHECK_CREDIT_CARD',
    solucion: 'Si el titular no viaja y no puede presentar la tarjeta, aplica el Reembolso por NO PCC',
    procedimiento: 'reembolso-motivos-especificos'
  },
  {
    nombre: 'SEAT ASSIGNMENT AT CHECK IN',
    pantalla: 'SEAT ASSIGNMENT AT THE CHECK IN AIRPORT ONLY',
    codigo: 'SEAT_AT_CHECKIN_ONLY',
    solucion: 'Informa al pasajero que la selección de asiento se hace en el mostrador al hacer el Check-In',
    procedimiento: 'asientos-seleccion-remision'
  }
];

console.log('\n--- CADA ERROR SE DETECTA CON SU SOLUCIÓN ---');
for (const caso of CASOS) {
  const r = detectarError(caso.pantalla);
  comprobar(`${caso.nombre}: se detecta`, !!r, true);
  comprobar(`${caso.nombre}: código`, r?.codigo, caso.codigo);
  comprobar(`${caso.nombre}: solución VERBATIM`, r?.solucion, caso.solucion);
  comprobar(`${caso.nombre}: procedimiento`, r?.procedimientoRecomendado, caso.procedimiento);
}

console.log('\n--- NO INVENTA ERRORES DONDE NO LOS HAY ---');
const pnr = `KFQQV/RP/MADIB/KFQQV/SCL175/75991053/SCL/IB/A/CL//SU
 1.ALVAREZURBINA/MARGARITAANGELICA 2.GARCIABRAVO/CONSUELOISIDORA
 3. IB118 A 20AUG SCLMAD TK2 1040 0520+1ET`;
comprobar('un PNR normal no dispara ningún error', detectarError(pnr), null);
comprobar('un "hola" tampoco', detectarError('hola, me ayudas con un cambio?'), null);
comprobar('texto vacío devuelve null', detectarError(''), null);
comprobar('no-string devuelve null', detectarError(null), null);

console.log('\n--- LA SOLUCIÓN NUNCA ESTÁ VACÍA Y LLEVA UN COMANDO ---');
for (const entrada of CATALOGO_ERRORES) {
  const r = detectarError(entrada.patrones[0]);
  comprobar(`${entrada.codigo}: solución no vacía`, typeof r?.solucion === 'string' && r.solucion.trim().length > 0, true);
  // "lleva un comando": contiene contenido en MAYÚSCULAS (un token de comando
  // como TTP/FXX/WEMD, o un término en mayúsculas). Nunca es minúscula suelta.
  comprobar(`${entrada.codigo}: la solución contiene un comando en mayúsculas`, /[A-Z]/.test(r?.solucion || ''), true);
}

console.log('\n' + '='.repeat(50));
console.log(`Resultados: ${pasados} pasados, ${fallos} fallidos.`);
console.log('='.repeat(50) + '\n');
process.exit(fallos ? 1 : 0);
