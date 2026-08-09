/**
 * ResponseGenerator.js
 * Generador de pantallas CRT Amadeus en formato de 80 columnas.
 * Formatea disponibilidades, PNRs guardados, cotizaciones FXX/FXP y errores GDS nativos.
 */

import { PnrStateMachine } from './PnrStateMachine.js';

export class ResponseGenerator {
  /**
   * @param {Object} profileConfig - Perfil DSL (commands_meta.json) para la ayuda por comando.
   */
  constructor(profileConfig = null, equipmentCatalog = {}) {
    this.commandsSpec = profileConfig?.commands || [];
    this.equipmentCatalog = equipmentCatalog;
  }

  // cabins (2 o 3) viene del propio vuelo (tipoRadio ya calculado en
  // generateDynamicFlights) — antes se derivaba de equipment.json de forma
  // independiente, y podía no coincidir con el ladder de clases realmente
  // generado para ese vuelo, ocultando clases que sí existían (hallazgo
  // de David: "no comprende los vuelos de largo/corto/medio radio").
  formatFlightClasses(classesObj, cabins = 3) {
    const hasBusiness = true;
    const hasPremium = cabins === 3;

    // Orden REAL de la escalera de Iberia, verificado contra una captura de
    // AN del terminal MAD905 (docs/fuentes/an/mad-bog-15mar.txt):
    //   J C D R I U | W E T P | Y B H K M L F V S G Z N Q O X
    // El orden anterior de economy (…M N L V G S Q O X A Z F) no coincidía
    // con ninguna pantalla real: colocaba N, F y Z fuera de sitio.
    // 'A' no aparece en la escalera de IB; se deja al final porque el
    // generador dinámico la usa para otras aerolíneas.
    const businessKeys = ['J', 'C', 'D', 'R', 'I', 'U'];
    const premiumKeys = ['W', 'E', 'T', 'P'];
    const economyKeys = ['Y', 'B', 'H', 'K', 'M', 'L', 'F', 'V', 'S', 'G', 'Z', 'N', 'Q', 'O', 'X', 'A'];

    let out = [];
    if (hasBusiness) {
      businessKeys.forEach(k => {
        if (classesObj[k] !== undefined) out.push(`${k}${classesObj[k]}`);
      });
    }
    if (hasPremium) {
      premiumKeys.forEach(k => {
        if (classesObj[k] !== undefined) out.push(`${k}${classesObj[k]}`);
      });
    }
    economyKeys.forEach(k => {
      if (classesObj[k] !== undefined) out.push(`${k}${classesObj[k]}`);
    });

    if (out.length === 0) out.push('Y9');
    return out.join(' ');
  }

  setProfileConfig(profileConfig) {
    this.commandsSpec = profileConfig?.commands || [];
  }

  /**
   * Genera el texto formateado de la terminal Amadeus.
   * @param {Object} result - Resultado retornado por la PnrStateMachine o DslParser.
   * @param {Object} pnrState - Estado actual del PNR.
   * @returns {string} - Cadena de texto formateada para la terminal CRT.
   */
  formatResponse(result, pnrState) {
    if (!result) {
      return 'FORMAT ERROR';
    }

    if (!result.success) {
      return `*** ${result.error || 'FORMAT ERROR'} ***`;
    }

    // 1. Codificación/Decodificación DAN / DAC
    if (result.type === 'ENCODE_CITY') {
      return `DAN ENCODE NAME RESULT:\nCITY: ${result.data.city}\nIATA CODE: ${result.data.code}\nCOUNTRY: ${result.data.country}`;
    }
    if (result.type === 'DECODE_CITY') {
      return `DAC DECODE CODE RESULT:\nIATA CODE: ${result.data.code}\nLOCATION: ${result.data.name}\nCOUNTRY: ${result.data.country}`;
    }

    // 2. Conversión de Moneda FQC
    if (result.type === 'CURRENCY_CONVERSION') {
      const d = result.data;
      return [
        `** AMADEUS CURRENCY CONVERSION - FQC **`,
        `AMOUNT CONVERTED: ${d.amount} ${d.fromCurrency}`,
        `EXCHANGE RATE BSR: 1 ${d.fromCurrency} = ${d.rate} ${d.toCurrency}`,
        `TOTAL AMOUNT     : ${d.convertedAmount} ${d.toCurrency}`
      ].join('\n');
    }

    // 3. Programación Neutral SN — con escalera de clases RBD completa:
    // número = puestos abiertos, C = clase cerrada (no se vende).
    if (result.type === 'SCHEDULE') {
      const { date, origin, destination, flights } = result.data;
      let lines = [`SN ${date} ${origin}${destination}`];
      lines.push(`** AMADEUS SCHEDULE NEUTRAL - SN ** ${origin} ${destination}  ${date}`);
      (flights || []).forEach((f, idx) => {
        const classStr = this.formatFlightClasses(f.classes || { Y: 9 }, f.cabins || 3);
        const viaStr = f.via ? ` VIA ${f.via}` : '';
        const cabStr = f.tipoRadio === 'LARGO' ? ' [LR 3CAB]' : f.tipoRadio === 'MEDIO' ? ' [MR 2CAB]' : ' [CR 2CAB]';
        lines.push(
          `${f.line || idx + 1}  ${f.airline} ${f.flightNumber}  ${classStr}`
        );
        lines.push(
          `   ${f.origin}${f.destination} ${f.departure} ${f.arrival} E${f.stops || 0}/${f.equipment || 'A320'}${viaStr}${cabStr}`
        );
      });
      return lines.join('\n');
    }

    // 4. Respuestas de Disponibilidad (AN)
    if (result.type === 'AVAILABILITY') {
      return this.formatAvailability(result.data);
    }

    // 5. Facturación de Tarifas (DF) — 3 modos: suma, diferencia, penalidad-descuento
    if (result.type === 'FARE_SUMMATION') {
      const d = result.data;
      if (d.mode === 'DIFF') {
        return [
          `** AMADEUS DIFERENCIA DE TARIFA - DF **`,
          `COTIZACION NUEVA : ${d.nueva.toLocaleString()}`,
          `TICKET ORIGINAL  : ${d.original.toLocaleString()}`,
          `----------------------------------------`,
          `DIFERENCIA (DF)  : ${d.totalSum.toLocaleString()}`
        ].join('\n');
      }
      if (d.mode === 'PENALTY_MINUS_DISCOUNT') {
        return [
          `** AMADEUS PENALIDAD - DF **`,
          `PENALIDAD        : ${d.penalidad.toLocaleString()}`,
          `DESCUENTO        : ${d.descuento.toLocaleString()}`,
          `----------------------------------------`,
          `PENALIDAD NETA   : ${d.totalSum.toLocaleString()}`
        ].join('\n');
      }
      let lines = [`** AMADEUS DETAILED FARE SUMMATION - DF **`];
      lines.push(`EXPRESSION: ${d.rawInput}`);
      lines.push(`DESGLOSE DE TARIFAS Y GASTOS:`);
      d.items.forEach((item, idx) => {
        lines.push(`  PARTE ${idx + 1}: ${item.text.padEnd(20)} = ${item.subtotal.toLocaleString()}`);
      });
      lines.push(`----------------------------------------`);
      lines.push(`VALOR TOTAL DEL VUELO: ${d.totalSum.toLocaleString()}`);
      return lines.join('\n');
    }

    // 6. Registro de Notas (RM)
    if (result.type === 'ADD_REMARK') {
      return `${result.message}\nRM: ${result.data.text}`;
    }

    if (result.type === 'PRICE_LOWEST_INFORMATIVE') {
      return `LAST LOWEST FARE QUOTE - FXI\nLOWEST FARE AVAILABLE FOR ITINERARY: 267.19 USD\nSTATUS: ALREADY BOOKED BEST FARE`;
    }

    if (result.type === 'PRICE_FARE_FAMILY') {
      return `** AMADEUS FARE FAMILY PRICING - FXF **\nFARES AVAILABLE:\n  BASIC     : 180.00 USD (1 BAG 23K, NO CHANGES)\n  OPTIMA    : 240.00 USD (1 BAG 23K, SEAT SELECTION)\n  FLEX      : 310.00 USD (2 BAGS 23K, FREE CHANGES)\n  BUSFLEX   : 650.00 USD (BUSINESS CABIN, PREMIUM MEAL)`;
    }

    if (result.type === 'PRICE_BEST_BUY_ET') {
      return `BEST BUY E-TICKET FARE - FXE\nTOTAL FARE: 267.19 USD + TAX 45.00 USD = 312.19 USD\nELIGIBLE FOR ELECTRONIC TICKETING`;
    }

    if (result.type === 'PRICE_AND_STORE_EXCHANGE') {
      const t = result.data.tst;
      return `** TST ${t.id} STORED - EXCHANGE RECORD (FXQ) **\nFARE BASIS: ${t.fareBasis}\nNEW FARE  : ${t.base} USD + TAX ${t.tax} USD = ${t.total} USD\nPENALTY CP: ${t.penalty} USD\nTST ${t.id} CREATED FOR REISSUE EMISSION`;
    }

    if (result.type === 'PRICE_OPTIMAL_OPTIONS') {
      return `OPTIMAL FARE OPTIONS SEARCH - FXO\nOPTION 1: IB781 MAD-BER (SAME DAY - SAVE 45 USD)\nOPTION 2: IB785 MAD-BER (+1 DAY - SAVE 70 USD)`;
    }

    if (result.type === 'HOTEL_ELEMENT') {
      return `HOTEL AVAILABILITY SEARCH - FHE ${result.data.cityCode}\n01 NH MADRID ZURBANO  MAD  120 EUR/NIGHT  AVAIL\n02 HOTEL IBERIA CENTRAL MAD  150 EUR/NIGHT  AVAIL`;
    }

    if (result.type === 'SHOW_RESIBER_TICKET_DETAIL') {
      const d = result.data;
      return [
        `** RESIBER / AMADEUS TICKET DISPLAY - DTR **`,
        `TICKET: ${d.ticketNumber}   DOI: 30JUL26`,
        `PASSENGER: DA SILVA/RONALDO (CHD)`,
        `CPN 1  MAD IB 781  11MAR  OPEN FOR USE`,
        `CPN 2  BER IB 788  11APR  OPEN FOR USE`,
        d.email ? `E-MAIL CONFIRMATION SENT TO: ${d.email}` : `TICKET STATUS: OK FOR ISSUANCE / EXCHANGE`
      ].join('\n');
    }

    if (result.type === 'SPLIT_PNR') {
      return result.data.message;
    }

    if (result.type === 'END_AND_FILE_SPLIT') {
      return result.data.message;
    }

    if (result.type === 'SHOW_FARE_QUOTE_DETAILS') {
      return `** FARE CALCULATION DETAIL - FQQ **\nBOG IB MAD M250.00NUC250.00END ROE 1.00\nTAX: CO 35.00 YQ 120.00 TOTAL: 405.00 USD`;
    }

    // Ver TST (TQT / TQT/T1)
    if (result.type === 'TST_VIEW') {
      const t = result.data.tst;
      const fees = result.data.fees || [];
      const cur = t.currency || 'USD';
      const val = t.total !== undefined ? t.total : t.priceUSD;
      const lines = [
        `** TST 00${result.data.line} - REGISTRO DE TARIFA **`,
        `FARE BASIS: ${t.fareBasis || 'YFLEX'}`,
        `BASE FARE : ${cur} ${t.priceUSD}.00`,
        `TOTAL     : ${cur} ${val}.00`,
        `STATUS    : STORED - LISTO PARA EMISION`
      ];
      if (fees.length > 0) {
        lines.push(`FEES: ${fees.join(', ')}`);
      }
      return lines.join('\n');
    }

    // Servicio de equipaje (SRXBAG / FXG / TQM / TTM)
    if (result.type === 'BAGGAGE') {
      return result.message;
    }
    if (result.type === 'TSM') {
      const fop = result.data.fop ? `FP: ${result.data.fop}` : 'FP: PENDIENTE (use TMI/FP-)';
      return [
        `** TSM 001 - EMD SERVICE **`,
        `SERVICE: XBAG (EQUIPAJE EXTRA)`,
        `STATUS : ${result.data.tsm.status}`,
        fop,
        `PARA EMITIR: TTM/M1/RT`
      ].join('\n');
    }
    // Módulo de Detalle del Billete Electrónico (TWD / TKT) - Formato 80 Colamnas Amadeus Nativo
    if (result.type === 'TICKET_DETAIL') {
      const t = result.data.ticket;
      const paxName = t.paxName || 'GARCIA/MIGUEL MR';
      const cur = t.currency || 'USD';
      const segments = (t.segments && t.segments.length > 0)
        ? t.segments
        : [
            { flight: 'IB6588', from: 'MAD', to: 'BCN', date: '10APR', class: 'Y', departure: '0900' },
            { flight: 'IB6589', from: 'BCN', to: 'MAD', date: '17APR', class: 'Y', departure: '1430' }
          ];

      const lines = [
        `RP/MAD1A0980/MAD1A0980            IB/GS  ${t.doi || '15MAR26'}/1420Z   2A4Z9`,
        `TWD/TKT ${t.number}`,
        ` 1.${paxName.padEnd(30)}`,
        ` TKT: ${t.number.padEnd(20)} NAME: ${paxName}`,
        ` ISSUED: ${t.doi || '15MAR26'}         IATA: ${t.iata || '78200112'}        FOID: PP123456`
      ];

      segments.forEach((seg, idx) => {
        const cpnNum = idx + 1;
        const flt = seg.flight || 'IB6588';
        const cls = seg.class || 'Y';
        const dt = seg.date || '10APR';
        const dep = (seg.departure || '09:00').replace(':', '');
        const fb = idx === 0 ? (t.fareBasisOut || 'YFLEX') : (t.fareBasisIn || t.fareBasisOut || 'YFLEX');
        const from = seg.from || (seg.route ? seg.route.split('-')[0] : 'MAD');
        const to = seg.to || (seg.route ? seg.route.split('-')[1] : 'BCN');
        lines.push(` CPN ${cpnNum}  ${from} ${flt} ${cls} ${dt} ${dep}  OK  ${fb.padEnd(8)}  O (OPEN)`);
      });

      const base = t.baseFare ? `${cur} ${t.baseFare}` : `${cur} ${t.total ? (t.total * 0.85).toFixed(2) : '267.19'}`;
      const taxes = t.taxAmount ? `${cur} ${t.taxAmount}` : `${cur} ${t.total ? (t.total * 0.15).toFixed(2) : '45.00'}`;
      const tot = t.total ? `${cur} ${t.total}` : `${cur} 312.19`;

      lines.push(` FARE  : ${base}`);
      lines.push(` TAXES : ${taxes} CO`);
      lines.push(` TOTAL : ${tot}`);
      lines.push(` FOP   : ${t.fop || 'CC VI 4111XXXXXX1111'}`);
      lines.push(` FC: ${segments[0]?.from || segments[0]?.route?.split('-')[0] || 'MAD'} IB ${segments[0]?.to || segments[0]?.route?.split('-')[1] || 'BCN'} ${base}END`);

      return lines.join('\n');
    }
    if (result.type === 'TICKET_TAX') {
      const d = result.data;
      return [
        `** TWD/TAX - DESGLOSE DE TASAS **`,
        `FARE  : ${d.currency} ${d.baseFare}`,
        `TAXES : ${d.currency} ${d.taxAmount}`,
        `TOTAL : ${d.currency} ${d.total}`
      ].join('\n');
    }
    if (result.type === 'MGMT_FEE_CHECK') {
      return [`** TQO - GASTO DE GESTION **`, ...result.data.fees.map((f) => `  ${f}`)].join('\n');
    }
    if (result.type === 'COMBINED_ISSUE') {
      return `OK ETKT ${result.ticketNumber} PASSENGER ISSUED\nOK EMD ${result.emd} ISSUED\nOK TTP1/TTM COMPLETED`;
    }

    if (result.emd) {
      return `OK EMD ${result.emd} ISSUED\nOK TTM COMPLETED`;
    }

    // 7. Pantallas paginadas (FQN*PE, navegables con MD/MU)
    if (result.type === 'PAGED') {
      const d = result.data;
      return [
        d.page,
        ``,
        `--- PAGE ${d.index + 1}/${d.total} ---  MD: SIGUIENTE  MU: ANTERIOR`
      ].join('\n');
    }

    // 2. Ayuda (HE)
    if (result.type === 'HELP') {
      return this.formatHelp(result.topic);
    }

    // 3. Cotizaciones (FXX / FXP)
    if (result.priceUSD !== undefined) {
      return this.formatPricing(result);
    }

    // 4. Emisión de tiquete (TTP)
    if (result.ticketNumber) {
      return `OK ETKT ${result.ticketNumber} PASSENGER ISSUED\nOK TTP COMPLETED`;
    }

    // 5. Render de PNR activo (ER, RT, etc.)
    const passengers = (pnrState && pnrState.passengers) || [];
    const segments = (pnrState && pnrState.segments) || [];
    if (pnrState && (pnrState.code || passengers.length > 0 || segments.length > 0)) {
      return this.formatPnr(pnrState);
    }

    if (result.message) {
      return result.message;
    }

    return 'OK';
  }

  formatAvailability(data) {
    const { date, origin, destination, flights } = data;
    let lines = [`AN ${date} ${origin}${destination}`];
    lines.push(`** AMADEUS AVAILABILITY - AN ** ${origin} ${destination}  ${date}`);

    (flights || []).forEach((f, idx) => {
      const lineNo = f.line || idx + 1;
      const classStr = this.formatFlightClasses(f.classes || { Y: 9 }, f.cabins || 3);
      const viaStr = f.via ? ` VIA ${f.via}` : '';
      const cabStr = f.tipoRadio === 'LARGO' ? ' [LR 3CAB]' : f.tipoRadio === 'MEDIO' ? ' [MR 2CAB]' : ' [CR 2CAB]';

      lines.push(`${lineNo}  ${f.airline} ${f.flightNumber} ${classStr}`);
      lines.push(
        `   ${f.origin}${f.destination} ${f.departure} ${f.arrival} E${f.stops || 0}/${f.equipment}${viaStr}${cabStr}`
      );
    });

    return lines.join('\n');
  }

  formatPnr(pnr) {
    let lines = [];
    const codeStr = pnr.code ? `RP/${pnr.code}` : '--- PNR DRAFT ---';
    lines.push(`--- RLR --- ${codeStr}`);

    PnrStateMachine.getNumberedPnrElements(pnr).forEach((element, index) => {
      const lineIndex = index + 1;
      switch (element.type) {
        case 'passengers':
          lines.push(`${lineIndex}. ${element.value.name}`);
          break;
        case 'segments': {
          const s = element.value;
          lines.push(`${lineIndex}  ${s.flight} ${s.class}  ${s.date} ${s.route.replace('-', '')} ${s.status}  1 ${s.departure || '0800'} ${s.arrival || '1200'}  +1`);
          break;
        }
        case 'contacts':
          lines.push(`${lineIndex} ${element.value.text}`);
          break;
        case 'ssrs':
          lines.push(`${lineIndex} SSR ${element.value}`);
          break;
        case 'osis':
          lines.push(`${lineIndex} OS ${element.value}`);
          break;
        case 'baggage':
          lines.push(`${lineIndex} SSR ${element.value.code} HK1 /P${element.value.pax}/S${element.value.seg}`);
          break;
        case 'remarks':
          lines.push(`${lineIndex} RM ${element.value.text}`);
          break;
        case 'ticketing':
          lines.push(`${lineIndex} ${element.value}`);
          break;
      }
    });

    // TSM / EMD del servicio
    if (pnr.tsm) {
      const num = String(pnr.tsm.number || 1).padStart(3, '0');
      lines.push(`TSM ${num} - ${pnr.tsm.service || 'XBAG'} ${pnr.tsm.status}${pnr.tsm.fop ? ' FP:' + pnr.tsm.fop : ''}`);
    }

    if (pnr.tst?.fop && !pnr.tsm) {
      lines.push(`${PnrStateMachine.getNumberedPnrElements(pnr).length + 1}. FP ${pnr.tst.fop}`);
    }

    // TST
    if (pnr.tst) {
      const c = pnr.tst.currency || 'USD';
      const v = pnr.tst.total !== undefined ? pnr.tst.total : pnr.tst.priceUSD;
      const num = String(pnr.tst.number || 1).padStart(3, '0');
      lines.push(`TST ${num} - ${c} ${v}.00 EQUIV FARE ${pnr.tst.fareBasis || ''}`.trimEnd());
      if (pnr.tst.exchange) lines.push(`  EXCHANGE MARKED - FARE DIFF: ${pnr.tst.fareDiff ?? 'PENDING'}`);
    }



    if (pnr.isTicketed) {
      // Hallazgo de David: se emitía el billete pero el número nunca
      // aparecía en el PNR redesplegado (solo el marcador genérico) — el
      // estudiante no tenía forma de referenciarlo después de emitir.
      if (pnr.issuedTicket?.number) {
        lines.push(`TKT: ${pnr.issuedTicket.number}`);
      }
      lines.push(`* TICKETED ELECTRONICALLY *`);
    }

    return lines.join('\n');
  }

  formatPricing(result) {
    // Facturación en la moneda de la oficina, DESGLOSADA por tipo de pasajero
    // (petición de David: la tarifa individual de ADT/CHD/INF, no una sola).
    const cur = result.currency || 'USD';
    const total = result.total !== undefined ? result.total
      : (result.baseFare !== undefined ? result.baseFare : result.priceUSD) + 45;
    const officeLine = result.office ? ` - OFFICE ${result.office}` : '';
    const nombre = { ADT: 'ADULTO', CHD: 'NIÑO ', INF: 'INFANTE' };

    const lines = [`LAST TKT DATE - ${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${officeLine}`];
    lines.push('TARIFA POR PASAJERO:');

    const perPax = result.perPax && result.perPax.length
      ? result.perPax
      : [{ type: 'ADT', count: 1, fare: result.baseFare ?? result.priceUSD, taxes: result.taxes ?? 45 }];

    perPax.forEach((p) => {
      const sub = (p.fare + p.taxes) * p.count;
      lines.push(`  ${p.type} x${p.count}  ${cur} ${p.fare}.00 + ${cur} ${p.taxes}.00 TAX = ${cur} ${sub}.00`);
    });

    lines.push('----------------------------------------');
    lines.push(`TOTAL (${cur}): ${total}.00`);
    lines.push(result.tstStored ? 'TST 001 STORED IN PNR OK' : 'FXX INFORMATIVE PRICING ONLY');
    return lines.join('\n');
  }

  formatHelp(topic) {
    if (!topic) {
      return [
        `*** CRYPTIC TRAINER - AMADEUS GDS HELP MANUAL ***`,
        `COMANDOS DISPONIBLES:`,
        `  AN : Disponibilidad de vuelos (ej: AN25NOVBOGMIA)`,
        `  SS : Vender segmento (ej: SS1Y1)`,
        `  NM : Registrar nombres (ej: NM1GARCIA/CARLOS MR)`,
        `  AP : Agregar contacto (ej: APBOG 573001234567-M)`,
        `  TK : Opción de emisión (ej: TK OK)`,

        `  ER : Guardar y mostrar PNR`,
        `  ET : Guardar y limpiar pantalla`,
        `  IG : Ignorar cambios`,
        `  RT : Volver a mostrar PNR`,
        `  FXP: Cotizar y crear TST`,
        `  TTP: Emitir tiquete electrónico`
      ].join('\n');
    }

    const code = topic.toUpperCase();
    const spec = this.commandsSpec.find((c) => c.code === code);
    if (!spec) {
      return `*** NO HELP AVAILABLE FOR: ${code} ***\nEscriba HE para ver la lista de comandos.`;
    }

    const lines = [`*** HELP - ${spec.code} : ${spec.name} ***`];
    if (spec.description) lines.push(spec.description);
    if (spec.syntax && spec.syntax.length) {
      lines.push('', 'SINTAXIS:');
      spec.syntax.forEach((s) => lines.push(`  ${s}`));
    }
    if (spec.examples && spec.examples.length) {
      lines.push('', 'EJEMPLOS:');
      spec.examples.forEach((e) => lines.push(`  ${e}`));
    }
    return lines.join('\n');
  }
}
