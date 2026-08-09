#!/usr/bin/env node
/**
 * Prueba los lectores contra PANTALLAS REALES del sistema, no inventadas.
 *
 * El caso principal es el billete de GARCIABRAVO que el usuario pegó el
 * 08AGO26 y sobre el que el bot corporativo dio tres cosas mal. Si el lector
 * no lo resuelve, el tutor tampoco lo hará.
 */

// Los lectores viven en worker/src/lectores/ porque es el Worker quien los
// ejecuta en runtime. Aquí solo se prueban: una sola copia, sin duplicar.
import { leerBillete } from '../../worker/src/lectores/leer-billete.js';
import { analizarBillete, familiaDeFareBasis, cabinaDeClase, derechosDeFamilia } from '../../worker/src/lectores/derivar.js';

let fallos = 0;
let pasados = 0;

function comprobar(nombre, real, esperado) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (ok) { pasados++; console.log(`  [OK]   ${nombre}`); }
  else { fallos++; console.error(`  [FALLO] ${nombre}\n          esperado: ${JSON.stringify(esperado)}\n          real:     ${JSON.stringify(real)}`); }
}

// ── Pantallas reales ────────────────────────────────────────────

const DTR_GARCIABRAVO = `►DTR:TN 0752527441266·
ISSUED BY: IBERIA LINEAS AEREAS ORG/DST: SCL/SCL FCMI: DOI: 29SEP25
«E/R:»
AIRLINE DATA: KFQQV IB TOUR CODE: TKTD:
PASSENGER: GARCIABRAVO/CONSUELOISIDORA
EXCH: CONJ TKT:
O FM: SCL IB 0118 A 20AUG 1040 OK AON4NQM7 20AUG/20AUG 1PC OPEN FOR USE
O TO: MAD IB 0113 O 18SEP 1320 OK ODL0NQM7 18SEP/18SEP 1PC OPEN FOR USE
  TO: SCL
FC: SCL IB MAD140.00 IB SCL267.50NUC407.50END ROE1.00
FARE: USD 408.00/FOP:MS-WEB,060105000CWDP936570/CLP938038/
EQIV.FARE PD: CLP 390048/
TAXES: CLP 547990/OI:
TOTAL: CLP 938038/TKTN: 075-2527441266 6`;

const DTR_MAD_PAR = `►DTR:TN/ 075-253
ISSUED BY: IBERIA LINEAS AEREAS        ORG/DST: MAD/PAR    FCMI: 1   DOI: 26JUN26
«E/R:X0»
AIRLINE DATA:                     TKTD:
PASSENGER:
EXCH: 075-252          CONJ TKT:
O FM: MAD IB  0581  O 30JUN 1805 OK OWNNACB4      30JUN/30JUN OPC BOARDED
      BN:16
        EMD: 075442      - A0B5  - SEAT ASSIGNMENT       BOARDED
  TO: ORY
FC: MAD IB PAR46.07NUC46.07END ROE0.86815
FARE:       EUR   40.00/FOP:TKT,CCVI/+SFCA,/USD0.00/
TOTAL:      NO ADC/TKTN: 075-253`;

// El 08AGO26 es cuando el usuario pegó el billete. Fecha fija para que el
// test no cambie de resultado mañana.
const HOY = new Date(2026, 7, 8);

// ── 1. Reglas sueltas ───────────────────────────────────────────

console.log('\n--- REGLA DEL FARE BASIS (#3590) ---');
comprobar('AON4NQM7 → OPTIMA', familiaDeFareBasis('AON4NQM7').familia, 'OPTIMA');
comprobar('ODL0NQM7 → OPTIMA', familiaDeFareBasis('ODL0NQM7').familia, 'OPTIMA');
comprobar('ONLONNB7 → BASIC (captura FXP real)', familiaDeFareBasis('ONLONNB7').familia, 'BASIC');
comprobar('OWNNACB4 → BASIC (captura verificación gama)', familiaDeFareBasis('OWNNACB4').familia, 'BASIC');
comprobar('VDL0NNM6 → OPTIMA (captura FXX real)', familiaDeFareBasis('VDL0NNM6').familia, 'OPTIMA');

console.log('\n--- CLASE → CABINA ---');
comprobar('A → Turista Económica', cabinaDeClase('A').cabina, 'TURISTA ECONOMICA');
comprobar('O → Turista Económica', cabinaDeClase('O').cabina, 'TURISTA ECONOMICA');
comprobar('J → Business', cabinaDeClase('J').cabina, 'BUSINESS');
comprobar('W → Turista Premium', cabinaDeClase('W').cabina, 'TURISTA PREMIUM');
comprobar('U es Avios', cabinaDeClase('U').esAvios, true);
comprobar('G es Avios', cabinaDeClase('G').esAvios, true);
comprobar('Y NO es Avios', cabinaDeClase('Y').esAvios, false);

console.log('\n--- FAMILIA → DERECHOS ---');
comprobar('OPTIMA no es reembolsable', derechosDeFamilia('OPTIMA').reembolso, 'NO PERMITIDO');
comprobar('FLEX sí es reembolsable', derechosDeFamilia('FLEX').reembolso, 'PERMITIDO');
comprobar('COMFORT sin radio es ambiguo', derechosDeFamilia('COMFORT').ambiguo, true);
comprobar('COMFORT largo radio → PENALIDAD', derechosDeFamilia('COMFORT', 'LARGO').cambio, 'PENALIDAD');
comprobar('COMFORT corto radio → 1er cambio sin penalidad', derechosDeFamilia('COMFORT', 'CORTO').cambio, '1ER CAMBIO SIN PENALIDAD');

// ── 2. El caso real de GARCIABRAVO ──────────────────────────────

console.log('\n--- BILLETE REAL: GARCIABRAVO (el del FQP) ---');
const b = leerBillete(DTR_GARCIABRAVO);

comprobar('lo lee como Resiber', b.fuente, 'resiber');
comprobar('DOI', b.doi, '29SEP25');
comprobar('pasajero', b.pasajero, 'GARCIABRAVO/CONSUELOISIDORA');
comprobar('localizador', b.localizador, 'KFQQV');
comprobar('origen/destino', [b.origen, b.destino], ['SCL', 'SCL']);
comprobar('número de billete', b.numeroBillete, '075-2527441266');
comprobar('placa', b.placa, '075');
comprobar('dos cupones', b.cupones.length, 2);
comprobar('cupón 1 fare basis', b.cupones[0].fareBasis, 'AON4NQM7');
comprobar('cupón 1 estado', b.cupones[0].estado, 'OPEN FOR USE');
comprobar('cupón 1 ruta', [b.cupones[0].origen, b.cupones[0].destino], ['SCL', 'MAD']);
comprobar('cupón 2 ruta', [b.cupones[1].origen, b.cupones[1].destino], ['MAD', 'SCL']);
comprobar('cupón 2 clase', b.cupones[1].clase, 'O');
comprobar('no es reemisión', b.billeteAnterior, null);

console.log('\n--- ANÁLISIS: las tres cosas que el bot dijo mal ---');
const a = analizarBillete(b, HOY);

comprobar('1) NADA está volado (el bot dijo que SÍ)', a.algunSegmentoVolado, false);
comprobar('2) la familia es OPTIMA (el bot dijo BASIC)', a.familia, 'OPTIMA');
comprobar('3) el DOI es 29SEP25 (el bot dijo 20AUG25)', a.doi, '29SEP25');
comprobar('   → no es reembolsable', a.reembolsable, false);
comprobar('   → el cambio lleva penalidad', a.derechos.cambio, 'PENALIDAD');
comprobar('   → aerolínea por placa', a.aerolinea, 'Iberia');
comprobar('   → faltan 12 días para el vuelo', a.diasHastaElProximoVuelo, 12);
comprobar('   → ventana COMERCIAL (>48 h)', a.ventana, 'COMERCIAL');
comprobar('   → ambos cupones en turista', a.cupones.map((c) => c.cabina), ['TURISTA ECONOMICA', 'TURISTA ECONOMICA']);
comprobar('   → ninguno es Avios', a.cupones.map((c) => c.esAvios), [false, false]);

// ── 3. Un billete distinto: reemisión, con cupón volado y EMD ───

console.log('\n--- BILLETE REAL: MAD-PAR (reemisión, volado, con EMD) ---');
const b2 = leerBillete(DTR_MAD_PAR);
const a2 = analizarBillete(b2, HOY);

comprobar('DOI', b2.doi, '26JUN26');
comprobar('es reemisión del 075-252', b2.billeteAnterior, '075-252');
comprobar('endoso X0', b2.endoso, 'X0');
comprobar('un EMD de asiento', b2.emds.length, 1);
comprobar('el EMD es A0B5 SEAT ASSIGNMENT', [b2.emds[0].codigo, b2.emds[0].descripcion], ['A0B5', 'SEAT ASSIGNMENT']);
comprobar('el cupón SÍ está volado (BOARDED)', a2.algunSegmentoVolado, true);
comprobar('familia BASIC', a2.familia, 'BASIC');
comprobar('total sin cargo (NO ADC)', b2.total.sinCargo, true);
comprobar('avisa de que es reemisión', a2.avisos.some((x) => x.includes('REEMISIÓN')), true);

// ── Resultado ───────────────────────────────────────────────────

console.log(`\n${'='.repeat(50)}`);
console.log(`Resultados: ${pasados} pasados, ${fallos} fallidos.`);
console.log('='.repeat(50));
if (fallos) process.exit(1);

// ═══════════════════════════════════════════════════════════════
//  PNR e HISTÓRICO — pantallas reales
// ═══════════════════════════════════════════════════════════════

const { leerPnr } = await import('../../worker/src/lectores/leer-pnr.js');
const { leerHistorico } = await import('../../worker/src/lectores/leer-historico.js');

// PNR real que el usuario pegó el 08AGO26 (formato Resiber)
const RT_KFQQV = `KFQQV/RP/MADIB/KFQQV/SCL175/75991053/SCL/IB/A/CL//SU
 1.ALVAREZURBINA/MARGARITAANGELICA 2.GARCIABRAVO/CONSUELOISIDORA
 3. IB118 A 20AUG SCLMAD TK2 1040 0520+1ET
 4. IB113 O 18SEP MADSCL HK2 1320 2140 ET
 5.CT/P +56993573248-M
 7.SSR CTCE IB HK1 CONSUELOGARCIABRAVO//GMAIL.COM/ES/P2
 8.SSR CTCM IB HK1 0056993573248/ES/P2
13.SSR TKNE IB HK1 SCLMAD 118 A20AUG 0752527441266C1/P2
14.SSR TKNE IB HK1 SCLMAD 118 A20AUG 0752527441267C1/P1`;

// PNR real del manual de SPLIT (formato Amadeus)
const RT_PARENT = `--- TST AXR RLR ---
-PARENT PNR-
RP/MADIB0900/MADIB0900   MR/SU 13AUG24/1933Z  M2SZ8E
  1.WWW/WILSON(ADT)
  2 IB 156 L 15JUN 7 BOGMAD HK1  1  1320 0600+1 *1A/E*
  3 IB 151 L 25JUN 3 MADBOG HK1  4S 1215 1545  *1A/E*
  6 TK PAX OK13AUG/MADIB0900//ETIB/S2-3
  7 FA PAX 075-2000844503/ETIB/EUR1523.03/13AUG24
  9 FE PAX CHGS WITH REST AND NOREF/S2-3
 10 FP CASH,
  * SP 13AUG/MRSU/MADIB0900-M2Q5RT`;

// Histórico real: cancelación + opción automática (manual/Cambios involutarios/)
const RHA_CANCELACION = `013/022 CS/IB 494 S 21NOV 1 MADEAS UN1 1600 1705/TK
    022 AS/IB 506 S 21NOV 1 MADEAS TK1 1155 1300/TK
    022 RF-MADRIIB 301059 CR-MAD RI IB 30SEP1059Z`;

// Histórico real: cambio de hora (manual/Cambios involutarios/)
const RHA_CAMBIO_HORA = `007/013 TC/IB7263 N 20JAN 5 BGABOG TK2 1420 1514/ 1354 1450`;

console.log('\n--- PNR REAL: KFQQV (formato Resiber) ---');
const pnr = leerPnr(RT_KFQQV);
comprobar('lo lee como Resiber', pnr.fuente, 'resiber');
comprobar('localizador', pnr.localizador, 'KFQQV');
comprobar('dos pasajeros', pnr.pasajeros.length, 2);
comprobar('pasajero 2', pnr.pasajeros[1].nombre, 'GARCIABRAVO/CONSUELOISIDORA');
comprobar('dos segmentos', pnr.segmentos.length, 2);
comprobar('segmento 3 está en TK ← la señal clave', pnr.segmentos[0].estado, 'TK');
comprobar('segmento 3 traducido', pnr.segmentos[0].estadoTexto, 'itinerario modificado o vuelo sugerido');
comprobar('segmento 4 está en HK', pnr.segmentos[1].estado, 'HK');
comprobar('ruta del segmento 3', [pnr.segmentos[0].origen, pnr.segmentos[0].destino], ['SCL', 'MAD']);
comprobar('llega al día siguiente', pnr.segmentos[0].llegaDiaSiguiente, 1);
comprobar('encuentra los billetes por SSR TKNE', pnr.billetes.length, 2);
comprobar('AVISA del TK', pnr.avisos.some((a) => a.includes('TK') && a.includes('INVOLUNTARIO')), true);

console.log('\n--- PNR REAL: M2SZ8E parent (formato Amadeus) ---');
const pnr2 = leerPnr(RT_PARENT);
comprobar('lo lee como Amadeus', pnr2.fuente, 'amadeus');
comprobar('localizador', pnr2.localizador, 'M2SZ8E');
comprobar('rótulo PARENT', pnr2.rotulo, 'PARENT');
comprobar('indicadores TST AXR RLR', pnr2.indicadores, ['TST', 'AXR', 'RLR']);
comprobar('detecta el PNR hermano del split', pnr2.pnrHermano, 'M2Q5RT');
comprobar('un pasajero', pnr2.pasajeros.length, 1);
comprobar('dos segmentos', pnr2.segmentos.length, 2);
comprobar('los dos confirmados', pnr2.segmentos.map((s) => s.estado), ['HK', 'HK']);
comprobar('billete por elemento FA', pnr2.billetes[0].numero, '075-2000844503');

console.log('\n--- HISTÓRICO REAL: cancelación ---');
const hc = leerHistorico(RHA_CANCELACION);
comprobar('tres entradas leídas', hc.entradas.length, 2);
comprobar('detecta la cancelación', hc.cancelaciones.length, 1);
comprobar('el cancelado es el IB494', hc.cancelaciones[0].vuelo, '494');
comprobar('detecta la opción automática', hc.opcionesOfrecidas.length, 1);
comprobar('la opción es el IB506', hc.opcionesOfrecidas[0].vuelo, '506');
comprobar('lee la firma', hc.firmas.length, 1);
comprobar('avisa de los derechos del pasajero', hc.avisos.some((a) => a.includes('bono')), true);

console.log('\n--- HISTÓRICO REAL: cambio de hora ---');
const hh = leerHistorico(RHA_CAMBIO_HORA);
comprobar('un cambio de hora', hh.cambiosDeHora.length, 1);
comprobar('NUEVA salida = 1420', hh.cambiosDeHora[0].horas.nuevaSalida, '1420');
comprobar('ORIGINAL salida = 1354', hh.cambiosDeHora[0].horas.salidaOriginal, '1354');
comprobar('el vuelo se retrasa', hh.cambiosDeHora[0].sentido, 'se retrasa');
comprobar('desfase de 26 minutos', hh.cambiosDeHora[0].desfaseMinutos, 26);
comprobar('avisa del umbral 1h/3h', hh.avisos.some((a) => a.includes('umbral')), true);

console.log(`\n${'='.repeat(50)}`);
console.log(`TOTAL: ${pasados} pasados, ${fallos} fallidos.`);
console.log('='.repeat(50));
if (fallos) process.exit(1);
