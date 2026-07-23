/**
 * PnrStateMachine.js
 * Máquina de estados finitos que gestiona el PNR activo (Passenger Name Record).
 * Aplica transacciones y verifica los elementos obligatorios de reserva (PRINT).
 */

export class PnrStateMachine {
  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      code: null,
      passengers: [],
      segments: [],
      contacts: [],
      ticketing: null,
      receivedFrom: null,
      ssrs: [],
      osis: [],
      remarks: [],
      tst: null,
      isTicketed: false,
      isTransacted: false,
      lastAvailability: null,
      viewedHelp: false,
      hasEncoded: false,
      hasDecoded: false,
      hasConverted: false,
      usedDf: false,
      usedMoveDay: false,
      viewedPenalties: false,
      usedFxx: false,
      usedPaging: false,
      helpTopics: [],
      pagedDisplay: null
    };
  }

  setState(newState) {
    this.reset();
    if (!newState) return;
    this.state = {
      ...this.state,
      ...newState,
      passengers: newState.passengers ? [...newState.passengers] : [],
      segments: newState.segments ? [...newState.segments] : [],
      contacts: newState.contacts ? [...newState.contacts] : [],
      ssrs: newState.ssrs ? [...newState.ssrs] : [],
      osis: newState.osis ? [...newState.osis] : [],
      remarks: newState.remarks ? [...newState.remarks] : []
    };
  }

  getState() {
    return { ...this.state };
  }

  /**
   * Procesa la intención derivada del DslParser.
   */
  process(parsedCommand, flightsCatalog = [], locationsCatalog = []) {
    if (!parsedCommand || !parsedCommand.success) {
      return { success: false, error: parsedCommand?.error || 'FORMAT ERROR' };
    }

    const { handler, params, rawInput } = parsedCommand;

    switch (handler) {
      case 'ENCODE_CITY':
        return this.handleEncodeCity(params, rawInput, locationsCatalog);

      case 'DECODE_CITY':
        return this.handleDecodeCity(params, rawInput, locationsCatalog);

      case 'CONVERT_CURRENCY':
        return this.handleConvertCurrency(params, rawInput);

      case 'QUERY_SCHEDULE':
        return this.handleSchedule(params, flightsCatalog);

      case 'QUERY_AVAILABILITY':
        return this.handleAvailability(params, flightsCatalog);

      case 'SELL_SEGMENT':
        return this.handleSellSegment(params);

      case 'ADD_NAME':
        return this.handleAddName(params, rawInput);

      case 'ADD_CONTACT':
        return this.handleAddContact(params, rawInput);

      case 'SET_TICKETING':
        return this.handleSetTicketing(params, rawInput);

      case 'SET_RECEIVED_FROM':
        return this.handleSetReceivedFrom(params, rawInput);

      case 'END_AND_REDISPLAY':
      case 'END_TRANSACT':
        return this.handleEndTransact();

      case 'IGNORE_TRANSACTION':
        this.reset();
        return { success: true, message: 'IGNORED - WORK AREA CLEAN' };

      case 'REDISPLAY_PNR':
        return { success: true, pnr: this.state };

      case 'CANCEL_ELEMENT':
        return this.handleCancelElement(params);

      case 'CANCEL_ITINERARY':
        this.state.segments = [];
        return { success: true, message: 'ITINERARY CANCELLED' };

      case 'PRICE_INFORMATIVE':
        return this.handlePrice(false);

      case 'PRICE_AND_STORE':
        return this.handlePrice(true);

      case 'ADD_SSR':
        return this.handleAddSsr(params, rawInput);

      case 'ADD_OSI':
        return this.handleAddOsi(params, rawInput);

      case 'SUM_FARES':
        return this.handleFareSummation(params, rawInput);

      case 'ADD_REMARK':
        return this.handleAddRemark(params, rawInput);

      case 'MOVE_NEXT_DAY':
        return this.handleMoveDay(1, flightsCatalog);

      case 'MOVE_PREV_DAY':
        return this.handleMoveDay(-1, flightsCatalog);

      case 'MOVE_ORIG_DAY':
        return this.handleMoveDay(0, flightsCatalog);

      case 'SHOW_FARE_RULES':
        return this.handleFareComponents(params);

      case 'PAGE_DOWN':
        return this.handlePaging(1);

      case 'PAGE_UP':
        return this.handlePaging(-1);

      case 'SHOW_HELP':
        this.state.viewedHelp = true;
        this.state.helpTopics.push((params.topic || 'GENERAL').toUpperCase());
        return { success: true, type: 'HELP', topic: params.topic };

      case 'ISSUE_TICKET':
        return this.handleIssueTicket();

      case 'SIGN_OUT':
        this.reset();
        return { success: true, message: 'SIGNED OUT' };

      default:
        return { success: false, error: 'HANDLER NOT IMPLEMENTED' };
    }
  }

  /**
   * Escalera RBD completa estilo Amadeus (J..G): número = puestos abiertos,
   * 'C' = clase cerrada, 0 = agotada. Determinista según la semilla.
   */
  buildClassLadder(seed = 1) {
    const ORDEN = ['J', 'C', 'D', 'I', 'W', 'P', 'E', 'Y', 'B', 'M', 'H', 'K', 'L', 'Q', 'T', 'U', 'N', 'V', 'X', 'G'];
    const ladder = {};
    ORDEN.forEach((letra, i) => {
      const v = (seed * 7 + i * 3) % 11;
      ladder[letra] = v === 0 ? 'C' : v === 1 ? 0 : Math.min(9, v);
    });
    // Y (turista base) siempre abierta para no bloquear los ejercicios
    ladder.Y = 9;
    return ladder;
  }

  /**
   * Opciones sintéticas cuando la ruta no está en el catálogo: directos +
   * una opción con escala vía el hub de Iberia (MAD), como en clase.
   */
  buildSyntheticFlights(origin, destination) {
    return [
      {
        line: 1,
        airline: 'AV',
        flightNumber: '0026',
        classes: this.buildClassLadder(2),
        origin,
        destination,
        departure: '08:15',
        arrival: '12:45',
        equipment: '788',
        stops: 0,
        priceUSD: 420
      },
      {
        line: 2,
        airline: 'LA',
        flightNumber: '2410',
        classes: this.buildClassLadder(5),
        origin,
        destination,
        departure: '17:10',
        arrival: '20:25',
        equipment: 'B789',
        stops: 0,
        priceUSD: 380
      },
      {
        line: 3,
        airline: 'IB',
        flightNumber: '6402',
        classes: this.buildClassLadder(8),
        origin,
        destination,
        departure: '19:30',
        arrival: '14:55',
        equipment: '350',
        stops: 1,
        via: 'MAD',
        priceUSD: 650
      }
    ];
  }

  handleAvailability(params, flightsCatalog) {
    const origin = params.origin || 'BOG';
    const destination = params.destination || 'MIA';
    const date = params.date || '25NOV';

    // Filtrar catálogo de vuelos por ruta
    let matches = flightsCatalog.filter(
      f => f.origin === origin && f.destination === destination
    );

    if (matches.length === 0) {
      matches = this.buildSyntheticFlights(origin, destination);
    }

    this.state.lastAvailability = { date, origin, destination, flights: matches };
    return { success: true, type: 'AVAILABILITY', data: this.state.lastAvailability };
  }

  handleSellSegment(params) {
    if (!this.state.lastAvailability || !this.state.lastAvailability.flights.length) {
      return { success: false, error: 'NO AVAILABILITY DISPLAYED' };
    }

    const lineNum = parseInt(params.line || '1', 10);
    const count = parseInt(params.count || '1', 10);
    const bookingClass = params.class || 'Y';

    const flight = this.state.lastAvailability.flights.find(f => f.line === lineNum) || this.state.lastAvailability.flights[0];

    const classStatus = flight.classes ? flight.classes[bookingClass] : 9;
    if (classStatus === 0 || classStatus === 'C' || classStatus === 'X') {
      return { success: false, error: `CLASS ${bookingClass} CLOSED / NO SEATS AVAILABLE` };
    }

    const segment = {
      id: this.state.segments.length + 1,
      flight: `${flight.airline}${flight.flightNumber}`,
      class: bookingClass,
      date: this.state.lastAvailability.date,
      route: `${flight.origin}-${flight.destination}`,
      status: `HK${count}`,
      departure: flight.departure,
      arrival: flight.arrival,
      priceUSD: flight.priceUSD || 350
    };

    this.state.segments.push(segment);
    return { success: true, segment };
  }

  handleAddName(params, rawInput) {
    // Formato Amadeus: NM{cantidad}{APELLIDO}/{NOMBRE1} {TITULO1}/{NOMBRE2} {TITULO2}...
    // Ej: NM1GARCIA/CARLOS MR  ->  1 pax
    //     NM2PEREZ/JUAN MR/MARIA MRS  ->  2 pax (mismo apellido)
    const match = rawInput.match(/^NM(\d+)?(.+)$/i);
    const body = (match ? match[2] : '').trim();
    if (!body.includes('/')) {
      return { success: false, error: 'FORMAT ERROR - NAME' };
    }

    const count = parseInt((match && match[1]) || '1', 10) || 1;

    // Las barras dentro de paréntesis pertenecen al detalle del pasajero
    // (CHD/10MAY18) o (INFPEREZ/ANA/01JAN25) y NO separan pasajeros.
    const MASK = String.fromCharCode(1);
    const masked = body.replace(/\([^)]*\)/g, (g) => g.replace(/\//g, MASK));
    const [surname, ...rest] = masked.split('/');
    const firstNames = rest
      .map((s) => s.replace(new RegExp(MASK, 'g'), '/').trim())
      .filter(Boolean);

    const added = firstNames.slice(0, count).map((firstName) => {
      const passenger = {
        id: this.state.passengers.length + 1,
        name: `${surname.trim()}/${firstName}`
      };
      this.state.passengers.push(passenger);
      return passenger;
    });

    if (added.length === 0) {
      return { success: false, error: 'FORMAT ERROR - NAME' };
    }

    return { success: true, passengers: added, passenger: added[0] };
  }

  handleAddContact(params, rawInput) {
    const text = rawInput.replace(/^AP/, '').trim();
    const contact = {
      id: this.state.contacts.length + 1,
      text: `AP${text}`
    };
    this.state.contacts.push(contact);
    return { success: true, contact };
  }

  handleSetTicketing(params, rawInput) {
    this.state.ticketing = rawInput.trim();
    return { success: true, ticketing: this.state.ticketing };
  }

  handleSetReceivedFrom(params, rawInput) {
    const person = rawInput.replace(/^RF/, '').trim();
    if (!person) {
      return { success: false, error: 'FORMAT ERROR - RECEIVED FROM' };
    }
    this.state.receivedFrom = person;
    return { success: true, receivedFrom: person };
  }

  handleEndTransact() {
    // Validación de elementos obligatorios PNR (PRINT)
    if (this.state.passengers.length === 0) {
      return { success: false, error: 'NEED NAME' };
    }
    if (this.state.segments.length === 0) {
      return { success: false, error: 'NEED ITINERARY' };
    }
    if (this.state.contacts.length === 0) {
      return { success: false, error: 'NEED PHONE ELEMENT' };
    }
    if (!this.state.ticketing) {
      return { success: false, error: 'NEED TICKETING ELEMENT' };
    }
    if (!this.state.receivedFrom) {
      return { success: false, error: 'NEED RECEIVED FROM' };
    }

    // Generar código PNR aleatorio si no existe
    if (!this.state.code) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      this.state.code = code;
    }

    this.state.isTransacted = true;
    return { success: true, code: this.state.code, pnr: this.state };
  }

  handleCancelElement(params) {
    // Del manual: XE1 (una celda), XE1-3 (rango), XE4,8 (lista).
    const spec = (params.lineNumber || '').trim();
    let lines = [];

    if (/^\d{1,2}$/.test(spec)) {
      lines = [parseInt(spec, 10)];
    } else if (/^\d{1,2}-\d{1,2}$/.test(spec)) {
      const [from, to] = spec.split('-').map((n) => parseInt(n, 10));
      if (from > to) return { success: false, error: 'CHECK LINE RANGE' };
      for (let i = from; i <= to; i++) lines.push(i);
    } else if (/^\d{1,2}(,\d{1,2})+$/.test(spec)) {
      lines = spec.split(',').map((n) => parseInt(n, 10));
    } else {
      return { success: false, error: 'CHECK LINE NUMBER' };
    }

    // Mapa visual del PNR — DEBE coincidir con el orden en que formatPnr
    // numera las líneas: pasajeros, segmentos, contactos, SSRs, OSIs,
    // remarks y ticketing. (Bug hallado por el profesor: XE3,4 sobre dos
    // remarks fallaba porque los remarks no estaban en este mapa.)
    const elementos = [
      ...this.state.passengers.map((_, i) => ({ tipo: 'passengers', idx: i })),
      ...this.state.segments.map((_, i) => ({ tipo: 'segments', idx: i })),
      ...this.state.contacts.map((_, i) => ({ tipo: 'contacts', idx: i })),
      ...this.state.ssrs.map((_, i) => ({ tipo: 'ssrs', idx: i })),
      ...this.state.osis.map((_, i) => ({ tipo: 'osis', idx: i })),
      ...this.state.remarks.map((_, i) => ({ tipo: 'remarks', idx: i })),
      ...(this.state.ticketing ? [{ tipo: 'ticketing' }] : [])
    ];

    const invalidas = lines.filter((l) => l < 1 || l > elementos.length);
    if (invalidas.length > 0) {
      return { success: false, error: 'CHECK LINE NUMBER' };
    }

    // Borrar de mayor a menor para que los índices no se corran.
    const ordenadas = [...new Set(lines)].sort((a, b) => b - a);
    for (const l of ordenadas) {
      const el = elementos[l - 1];
      if (el.tipo === 'ticketing') {
        this.state.ticketing = null;
      } else {
        this.state[el.tipo].splice(el.idx, 1);
      }
    }

    const listado = [...new Set(lines)].sort((a, b) => a - b).join(',');
    return { success: true, message: `ELEMENT ${listado} CANCELLED` };
  }

  handlePrice(storeTst = false) {
    if (this.state.segments.length === 0) {
      return { success: false, error: 'NO ITINERARY TO PRICE' };
    }

    const totalPrice = this.state.segments.reduce((acc, s) => acc + (s.priceUSD || 350), 0);
    const fareBasis = `${this.state.segments[0].class}FLEX`;

    if (storeTst) {
      this.state.tst = {
        priceUSD: totalPrice,
        currency: 'USD',
        fareBasis
      };
    }

    // Bandera pedagógica: el estudiante facturó (FXX o FXP)
    this.state.usedFxx = true;

    return {
      success: true,
      priceUSD: totalPrice,
      currency: 'USD',
      fareBasis,
      tstStored: storeTst
    };
  }

  handleAddSsr(params, rawInput) {
    const code = rawInput.replace(/^SR/, '').trim();
    this.state.ssrs.push(code);
    return { success: true, ssr: code };
  }

  handleAddOsi(params, rawInput) {
    const text = rawInput.replace(/^OS/, '').trim();
    this.state.osis.push(text);
    return { success: true, osi: text };
  }

  handleIssueTicket() {
    if (!this.state.tst) {
      return { success: false, error: 'NO TST PRESENT FOR ISSUANCE' };
    }
    if (!this.state.isTransacted) {
      return { success: false, error: 'END TRANSACT REQUIRED (ER/ET) BEFORE TTP' };
    }

    this.state.isTicketed = true;
    return {
      success: true,
      ticketNumber: `791-${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      message: 'ELECTRONIC TICKET ISSUED OK'
    };
  }

  handleEncodeCity(params, rawInput, locationsCatalog = []) {
    // DAN {ciudad}: nombre (con o sin espacios múltiples) -> código IATA.
    const query = rawInput.replace(/^DAN\s*/i, '').trim().toUpperCase().replace(/\s+/g, ' ');
    if (!query) {
      return { success: false, error: 'FORMAT ERROR - CITY NAME' };
    }

    // Prioridad: ciudad exacta > empieza por > contiene (así "DAN WASHIN" también resuelve)
    const match =
      locationsCatalog.find((l) => l.city === query) ||
      locationsCatalog.find((l) => l.city.startsWith(query)) ||
      locationsCatalog.find((l) => l.city.includes(query));

    if (!match) {
      return { success: false, error: `NO MATCH FOR CITY NAME - ${query}` };
    }

    this.state.hasEncoded = true;
    return { success: true, type: 'ENCODE_CITY', data: match };
  }

  handleDecodeCity(params, rawInput, locationsCatalog = []) {
    // DAC {iata}: código de 3 letras -> nombre real. Código desconocido = error
    // honesto (como Amadeus), nunca datos inventados.
    const code = rawInput.replace(/^DAC\s*/i, '').trim().toUpperCase();
    const match = locationsCatalog.find((l) => l.code === code);

    if (!match) {
      return { success: false, error: `CHECK IATA CITY CODE - NO MATCH FOR ${code}` };
    }

    this.state.hasDecoded = true;
    return { success: true, type: 'DECODE_CITY', data: match };
  }

  handleConvertCurrency(params, rawInput) {
    const amount = parseFloat(params.amount || '35');
    const from = (params.fromCurrency || 'USD').toUpperCase();
    const to = (params.toCurrency || 'COP').toUpperCase();

    // Tasas BSR sintéticas expresadas como: 1 USD = X moneda.
    // Permite convertir el gasto de gestión (emitido en USD) a la moneda
    // del país desde el que llama el cliente. Valores aproximados de clase.
    const usdRates = {
      USD: 1,
      COP: 4150.0,     // Colombia
      DOP: 59.0,       // República Dominicana
      MXN: 18.5,       // México
      PEN: 3.75,       // Perú
      EUR: 0.92,       // Zona Euro
      ARS: 950.0,      // Argentina
      CLP: 950.0,      // Chile
      BRL: 5.10,       // Brasil
      PAB: 1.0         // Panamá
    };

    let rate;
    if (from === 'USD' && usdRates[to] !== undefined) {
      rate = usdRates[to];
    } else if (to === 'USD' && usdRates[from] !== undefined) {
      rate = 1 / usdRates[from];
    } else if (usdRates[from] !== undefined && usdRates[to] !== undefined) {
      rate = usdRates[to] / usdRates[from];
    } else {
      return { success: false, error: 'CHECK CURRENCY CODE' };
    }

    const converted = (amount * rate).toFixed(2);
    this.state.hasConverted = true;

    return {
      success: true,
      type: 'CURRENCY_CONVERSION',
      data: {
        amount,
        fromCurrency: from,
        toCurrency: to,
        rate: Number(rate.toFixed(4)),
        convertedAmount: converted
      }
    };
  }

  handleSchedule(params, flightsCatalog) {
    const origin = params.origin || 'LIM';
    const destination = params.destination || 'BOG';
    const date = params.date || '13MAR';

    let matches = flightsCatalog.filter(
      f => f.origin === origin && f.destination === destination
    );

    if (matches.length === 0) {
      matches = this.buildSyntheticFlights(origin, destination);
    }

    this.state.lastAvailability = { date, origin, destination, flights: matches };

    return {
      success: true,
      type: 'SCHEDULE',
      data: { date, origin, destination, flights: matches }
    };
  }

  handleFareSummation(params, rawInput) {
    const rawExpr = (rawInput.slice(2).trim() || '').replace(/\s+/g, '');
    const tokens = rawExpr.split(';').filter(Boolean);

    let items = [];
    let totalSum = 0;

    for (const token of tokens) {
      if (token.includes('*')) {
        const parts = token.split('*');
        const val1 = parseFloat(parts[0]) || 0;
        const val2 = parseFloat(parts[1]) || 0;
        const subtotal = val1 * val2;
        totalSum += subtotal;
        items.push({ text: token, subtotal, isMultiplier: true, val1, val2 });
      } else {
        const val = parseFloat(token) || 0;
        totalSum += val;
        items.push({ text: token, subtotal: val, isMultiplier: false, val1: val });
      }
    }

    this.state.usedDf = true;

    return {
      success: true,
      type: 'FARE_SUMMATION',
      data: {
        rawInput,
        items,
        totalSum
      }
    };
  }

  /**
   * MN (+1) / MY (-1) / MO (original): moverse entre días del itinerario mostrado.
   */
  handleMoveDay(delta, flightsCatalog) {
    const la = this.state.lastAvailability;
    if (!la) {
      return { success: false, error: 'NO DISPLAY - RUN SN/AN FIRST' };
    }

    const MESES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const shiftDate = (dateStr, days) => {
      const m = (dateStr || '').replace(/\s+/g, '').match(/^(\d{1,2})([A-Z]{3})$/);
      if (!m || MESES.indexOf(m[2]) < 0) return dateStr;
      const d = new Date(2026, MESES.indexOf(m[2]), parseInt(m[1], 10) + days);
      return `${d.getDate()}${MESES[d.getMonth()]}`;
    };

    const originalDate = la.originalDate || la.date;
    const newDate = delta === 0 ? originalDate : shiftDate(la.date, delta);

    const result = this.handleAvailability(
      { origin: la.origin, destination: la.destination, date: newDate },
      flightsCatalog
    );
    // Conservar el día original para que MO pueda regresar
    this.state.lastAvailability.originalDate = originalDate;
    this.state.usedMoveDay = true;
    return result;
  }

  /**
   * FQN{n}*PE: fare components / condiciones del ticket (reembolsos y cambios).
   * Genera una pantalla paginada navegable con MD/MU.
   */
  handleFareComponents(params) {
    const ticketNum = parseInt(params.ticket || '1', 10);
    const fare = this.state.tst;
    const base = fare ? `${fare.currency} ${fare.priceUSD}.00` : 'USD 450.00';

    const pages = [
      [
        `FQN${ticketNum}*PE - FARE COMPONENTS TKT ${ticketNum}`,
        `FC1  ${base}  FARE BASIS ${fare?.fareBasis || 'YFLEX'}`,
        ``,
        `CANCELLATIONS:`,
        `  BEFORE DEPARTURE - REFUND PERMITTED`,
        `  CHARGE: GG + DF APLICAN`,
        `  AFTER DEPARTURE  - REFUND NOT PERMITTED`
      ].join('\n'),
      [
        `FQN${ticketNum}*PE - FARE COMPONENTS TKT ${ticketNum} (CONT.)`,
        `CHANGES:`,
        `  BEFORE DEPARTURE - CHANGES PERMITTED`,
        `  PENALTY: NO PENTY + DF + GG`,
        `  AFTER DEPARTURE  - CHANGES WITH PENALTY`,
        ``,
        `NOTA: REGISTRA LAS CONDICIONES CON RM *FECHA* FC1,2 ...`
      ].join('\n')
    ];

    this.state.pagedDisplay = { pages, index: 0 };
    this.state.viewedPenalties = true;

    return { success: true, type: 'PAGED', data: { page: pages[0], index: 0, total: pages.length } };
  }

  /**
   * MD (+1) / MU (-1): navegar entre páginas de la última pantalla larga.
   */
  handlePaging(delta) {
    const pd = this.state.pagedDisplay;
    if (!pd || !pd.pages || pd.pages.length === 0) {
      return { success: false, error: 'NO PAGED DISPLAY - RUN FQN/FXX FIRST' };
    }

    const newIndex = pd.index + delta;
    if (newIndex >= pd.pages.length) {
      return { success: false, error: 'NO MORE PAGES' };
    }
    if (newIndex < 0) {
      return { success: false, error: 'ALREADY ON FIRST PAGE' };
    }

    pd.index = newIndex;
    this.state.usedPaging = true;
    return { success: true, type: 'PAGED', data: { page: pd.pages[newIndex], index: newIndex, total: pd.pages.length } };
  }

  handleAddRemark(params, rawInput) {
    const remarkText = rawInput.slice(2).trim();
    if (!remarkText) {
      return { success: false, error: 'FORMAT ERROR - MISSING REMARK TEXT' };
    }

    const newRemark = {
      id: this.state.remarks.length + 1,
      text: remarkText
    };

    this.state.remarks.push(newRemark);
    this.state.isTransacted = false;

    return {
      success: true,
      type: 'ADD_REMARK',
      data: newRemark,
      message: `RM LINE ${newRemark.id} ADDED`
    };
  }
}
