/**
 * ResponseGenerator.js
 * Generador de pantallas CRT Amadeus en formato de 80 columnas.
 * Formatea disponibilidades, PNRs guardados, cotizaciones FXX/FXP y errores GDS nativos.
 */

export class ResponseGenerator {
  /**
   * @param {Object} profileConfig - Perfil DSL (commands_meta.json) para la ayuda por comando.
   */
  constructor(profileConfig = null) {
    this.commandsSpec = profileConfig?.commands || [];
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

    // 3. Programación Neutral SN
    if (result.type === 'SCHEDULE') {
      const { date, origin, destination, flights } = result.data;
      let lines = [`SN ${date} ${origin}${destination}`];
      lines.push(`** AMADEUS SCHEDULE NEUTRAL - SN ** ${origin} ${destination}  ${date}`);
      (flights || []).forEach((f, idx) => {
        lines.push(
          `${idx + 1}  ${f.airline} ${f.flightNumber}  ${f.origin}${f.destination} ${f.departure} ${f.arrival} E0/${f.equipment || 'A320'}`
        );
      });
      return lines.join('\n');
    }

    // 4. Respuestas de Disponibilidad (AN)
    if (result.type === 'AVAILABILITY') {
      return this.formatAvailability(result.data);
    }

    // 5. Facturación de Tarifas (DF)
    if (result.type === 'FARE_SUMMATION') {
      const d = result.data;
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
      const classStr = Object.entries(f.classes || { Y: 9 })
        .map(([cls, seats]) => `${cls}${seats}`)
        .join(' ');

      lines.push(
        `${lineNo}  ${f.airline} ${f.flightNumber} ${classStr.padEnd(20)} ${f.origin}${f.destination} ${f.departure} ${f.arrival} E0/${f.equipment} ${f.stops ? f.stops : 'S'}`
      );
    });

    return lines.join('\n');
  }

  formatPnr(pnr) {
    let lines = [];
    const codeStr = pnr.code ? `RP/${pnr.code}` : '--- PNR DRAFT ---';
    lines.push(`--- RLR --- ${codeStr}`);

    let lineIndex = 1;

    // Pasajeros
    (pnr.passengers || []).forEach((p) => {
      lines.push(`${lineIndex}. ${p.name}`);
      lineIndex++;
    });

    // Segmentos
    (pnr.segments || []).forEach((s) => {
      lines.push(
        `${lineIndex}  ${s.flight} ${s.class}  ${s.date} ${s.route.replace('-', '')} ${s.status}  1 ${s.departure || '0800'} ${s.arrival || '1200'}  +1`
      );
      lineIndex++;
    });

    // Contactos
    (pnr.contacts || []).forEach((c) => {
      lines.push(`${lineIndex} ${c.text}`);
      lineIndex++;
    });

    // SSRs
    (pnr.ssrs || []).forEach((ssr) => {
      lines.push(`${lineIndex} SSR ${ssr}`);
      lineIndex++;
    });

    // OSIs
    (pnr.osis || []).forEach((osi) => {
      lines.push(`${lineIndex} OS ${osi}`);
      lineIndex++;
    });

    // Remarks (RM)
    (pnr.remarks || []).forEach((rm) => {
      lines.push(`${lineIndex} RM ${rm.text}`);
      lineIndex++;
    });

    // Ticketing
    if (pnr.ticketing) {
      lines.push(`${lineIndex} ${pnr.ticketing}`);
      lineIndex++;
    }

    // TST
    if (pnr.tst) {
      lines.push(`TST 001 - USD ${pnr.tst.priceUSD}.00 EQUIV FARE ${pnr.tst.fareBasis}`);
    }

    // Received From
    if (pnr.receivedFrom) {
      lines.push(`RF-${pnr.receivedFrom}`);
    }

    if (pnr.isTicketed) {
      lines.push(`* TICKETED ELECTRONICALLY *`);
    }

    return lines.join('\n');
  }

  formatPricing(result) {
    return [
      `LAST TKT DATE - ${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
      `AL PASSENGER`,
      `USD ${result.priceUSD}.00  BASE FARE`,
      `USD 45.00    TAXES / FEES`,
      `USD ${result.priceUSD + 45}.00 TOTAL`,
      result.tstStored ? 'TST 001 STORED IN PNR OK' : 'FXX INFORMATIVE PRICING ONLY'
    ].join('\n');
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
        `  RF : Recibido de (ej: RF CARLOS)`,
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
