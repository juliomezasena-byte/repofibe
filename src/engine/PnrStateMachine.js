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
      pagedDisplay: null,
      baggage: [],
      tsm: null,
      fop: null,
      tsmIssued: false,
      fees: [],
      // Structured evidence for scenarios that require specific operations
      // rather than a generic final PNR state.
      infants: [],
      pricingHistory: [],
      cancelOperations: []
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
      remarks: newState.remarks ? [...newState.remarks] : [],
      baggage: newState.baggage ? [...newState.baggage] : [],
      infants: newState.infants ? [...newState.infants] : [],
      pricingHistory: newState.pricingHistory ? [...newState.pricingHistory] : [],
      cancelOperations: newState.cancelOperations ? [...newState.cancelOperations] : []
    };
  }

  getState() {
    return { ...this.state };
  }

  /**
   * Elementos que se muestran con número de línea en un PNR. ResponseGenerator
   * y XE consumen esta única fuente para evitar que la numeración visual y el
   * mapa de cancelación vuelvan a divergir.
   */
  static getNumberedPnrElements(pnr = {}) {
    const entries = [];
    const add = (type, values = []) => values.forEach((value, index) => {
      entries.push({ type, index, value });
    });

    add('passengers', pnr.passengers || []);
    add('segments', pnr.segments || []);
    add('contacts', pnr.contacts || []);
    add('ssrs', pnr.ssrs || []);
    add('osis', pnr.osis || []);
    add('baggage', pnr.baggage || []);
    add('remarks', pnr.remarks || []);
    if (pnr.ticketing) entries.push({ type: 'ticketing', value: pnr.ticketing });

    return entries;
  }

  /**
   * Procesa la intención derivada del DslParser.
   */
  process(parsedCommand, flightsCatalog = [], locationsCatalog = [], activeScenario = null) {
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
        return this.handlePrice(false, params, rawInput, locationsCatalog);

      case 'PRICE_AND_STORE':
        return this.handlePrice(true, params, rawInput, locationsCatalog);

      case 'ADD_SSR':
        return this.handleAddSsr(params, rawInput);

      case 'ADD_OSI':
        return this.handleAddOsi(params, rawInput);

      case 'SUM_FARES':
        return this.handleFareSummation(params, rawInput);

      case 'ADD_REMARK':
        return this.handleAddRemark(params, rawInput);

      case 'ADD_BAGGAGE':
        return this.handleAddBaggage(rawInput);

      case 'SAVE_BAGGAGE':
        return this.handleSaveBaggage();

      case 'SHOW_TSM':
        return this.handleShowTsm();

      case 'SET_FOP':
        return this.handleSetFop(rawInput);

      case 'ISSUE_TSM':
        return this.handleIssueTsm(rawInput);

      case 'MOVE_NEXT_DAY':
        return this.handleMoveDay(1, flightsCatalog);

      case 'MOVE_PREV_DAY':
        return this.handleMoveDay(-1, flightsCatalog);

      case 'MOVE_ORIG_DAY':
        return this.handleMoveDay(0, flightsCatalog);

      case 'SHOW_FARE_RULES':
        return this.handleFareComponents(params);

      case 'SHOW_TST':
        return this.handleShowTst(rawInput);

      case 'PAGING_UP':
        return this.handlePaging(-1);

      case 'ISSUE_TICKET':
        return this.handleIssueTicket(params, activeScenario);

      case 'ADD_FOP':
        return this.handleFP(params, rawInput);

      case 'ADD_TTO':
        return this.handleTTO(params, rawInput);

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

  // Clases RBD por cabina según especificación de David
  static get RBD_BUSINESS() { return ['J', 'C', 'D', 'R', 'I', 'U']; } // U = Avios Business
  static get RBD_PREMIUM() { return ['W', 'E', 'T', 'P']; } // P = Avios Turista Premium
  static get RBD_ECONOMY() { return ['Y', 'B', 'H', 'K', 'M', 'N', 'L', 'V', 'G', 'S', 'Q', 'O', 'X', 'A', 'Z', 'F']; } // Orden ajustado por feedback

  /**
   * Escalera RBD estilo Amadeus.
   *  - Largo radio (3 cabinas): Business + Turista Premium + Economy.
   *  - Medio/Corto radio (2 cabinas): Business + Economy (sin premium).
   */
  buildClassLadder(seed = 1, cabins = 3) {
    const orden = cabins === 3
      ? [...PnrStateMachine.RBD_BUSINESS, ...PnrStateMachine.RBD_PREMIUM, ...PnrStateMachine.RBD_ECONOMY]
      : [...PnrStateMachine.RBD_BUSINESS, ...PnrStateMachine.RBD_ECONOMY];
    const ladder = {};
    orden.forEach((letra, i) => {
      const v = (seed * 7 + i * 3) % 11;
      ladder[letra] = v === 0 ? 'C' : v === 1 ? 0 : Math.min(9, v);
    });
    // Cabinas vendibles siempre abiertas
    ladder.Y = 4 + Math.floor(Math.random() * 6); // 4-9
    ladder.C = 2 + Math.floor(Math.random() * 6);
    ladder.J = 2 + Math.floor(Math.random() * 6);
    return ladder;
  }

  // Aerolíneas / equipos / hubs para generar variedad realista.
  static get AIRLINE_POOL() {
    return ['AV', 'LA', 'AA', 'IB', 'UX', 'AM', 'CM', 'DL', 'AF', 'AR', 'JJ', 'AD', 'BA', 'KL', 'TP'];
  }
  // Widebody = largo radio (3 cabinas). Narrowbody = corto radio (2 cabinas).
  static get EQUIP_WIDE() { return ['788', 'B789', '350', '330', '77W']; }
  static get EQUIP_NARROW() { return ['738', '320', '321', 'A320', '737', '319', '73H']; }
  static get HUB_POOL() {
    return ['MAD', 'BOG', 'PTY', 'MEX', 'MIA', 'LIM', 'GRU', 'SCL'];
  }

  /**
   * Genera vuelos DINÁMICOS para cualquier ruta (petición de David: que no
   * salgan siempre los mismos 3). Cada consulta produce 3-5 opciones con
   * aerolíneas, horarios, escaleras y equipos aleatorios, y una mezcla de
   * directos y con escala. Y/C/J quedan abiertas para no romper ejercicios.
   */
  generateDynamicFlights(origin, destination) {
    const rnd = Math.random;
    const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
    const pad2 = (n) => String(n).padStart(2, '0');
    const n = 3 + Math.floor(rnd() * 3); // 3-5 opciones

    const airlines = PnrStateMachine.AIRLINE_POOL;
    const usadas = new Set();
    const flights = [];

    for (let i = 0; i < n; i++) {
      let air;
      do { air = pick(airlines); } while (usadas.has(air) && usadas.size < airlines.length);
      usadas.add(air);

      // Tipo de vuelo: Largo, Medio o Corto Radio
      const radioRnd = rnd();
      let tipoRadio = 'CORTO'; // 1 cabina (Economy) o 2 cabinas (Business/Econ)
      let equipment = pick(PnrStateMachine.EQUIP_NARROW);
      let cabins = 2; // Asumimos 2 cabinas para corto/medio (Business + Economy)
      let durH = 1 + Math.floor(rnd() * 2);

      if (radioRnd < 0.33) {
        tipoRadio = 'LARGO';
        equipment = pick(PnrStateMachine.EQUIP_WIDE);
        cabins = 3;
        durH = 6 + Math.floor(rnd() * 6);
      } else if (radioRnd < 0.66) {
        tipoRadio = 'MEDIO';
        durH = 3 + Math.floor(rnd() * 3);
      }

      const depH = Math.floor(rnd() * 24);
      const depM = pick([0, 15, 30, 45]);
      const arrH = (depH + durH) % 24;

      const hasStop = origin !== destination && rnd() < 0.35;
      const via = hasStop ? pick(PnrStateMachine.HUB_POOL.filter((h) => h !== origin && h !== destination)) : null;

      flights.push({
        airline: air,
        flightNumber: String(1000 + Math.floor(rnd() * 8999)),
        classes: this.buildClassLadder(1 + Math.floor(rnd() * 10), cabins),
        cabins,
        tipoRadio,
        origin,
        destination,
        departure: `${pad2(depH)}:${pad2(depM)}`,
        arrival: `${pad2(arrH)}:${pad2(depM)}`,
        equipment,
        stops: hasStop ? 1 : 0,
        via,
        priceUSD: (tipoRadio === 'LARGO' ? 400 : tipoRadio === 'MEDIO' ? 250 : 120) + Math.floor(rnd() * 40) * 10
      });
    }

    // Ordenar por hora de salida y numerar las líneas 1..N.
    flights.sort((a, b) => a.departure.localeCompare(b.departure));
    flights.forEach((f, i) => { f.line = i + 1; });
    return flights;
  }

  handleAvailability(params, flightsCatalog) {
    const origin = params.origin || 'BOG';
    const destination = params.destination || 'MIA';
    const date = params.date || '25NOV';

    // Vuelos dinámicos en cada consulta (variedad para aprender).
    const matches = this.generateDynamicFlights(origin, destination);

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

    if (!flight.classes || flight.classes[bookingClass] === undefined) {
      return { success: false, error: `INVALID CLASS` };
    }
    const classStatus = flight.classes[bookingClass];
    if (classStatus === 0 || classStatus === 'C' || classStatus === 'X') {
      return { success: false, error: `CLASS ${bookingClass} CLOSED / NO SEATS AVAILABLE` };
    }

    // Si el vuelo tiene escala, vendemos 2 segmentos
    if (flight.via) {
      const seg1 = {
        id: this.state.segments.length + 1,
        flight: `${flight.airline}${flight.flightNumber}`,
        class: bookingClass,
        date: this.state.lastAvailability.date,
        route: `${flight.origin}-${flight.via}`,
        status: `HK${count}`,
        departure: flight.departure,
        arrival: '12:00', // Mock time
        priceUSD: (flight.priceUSD || 350) / 2
      };
      this.state.segments.push(seg1);

      const seg2 = {
        id: this.state.segments.length + 1,
        flight: `${flight.airline}${flight.flightNumber}`,
        class: bookingClass,
        date: this.state.lastAvailability.date,
        route: `${flight.via}-${flight.destination}`,
        status: `HK${count}`,
        departure: '14:00', // Mock time
        arrival: flight.arrival,
        priceUSD: (flight.priceUSD || 350) / 2
      };
      this.state.segments.push(seg2);

      return { success: true, segment: seg1 }; // Devuelve el primer segmento para el mensaje de éxito genérico
    } else {
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

      // An infant travels linked to the adult and does not consume a separate
      // passenger line. Preserve its structured data for scenario evaluation.
      const infantMatch = firstName.match(/\(\s*INF([A-Z]+)\/([A-Z]+)\/(\d{2}[A-Z]{3}\d{2})\s*\)/i);
      if (infantMatch) {
        this.state.infants.push({
          surname: infantMatch[1].toUpperCase(),
          firstName: infantMatch[2].toUpperCase(),
          dateOfBirth: infantMatch[3].toUpperCase(),
          linkedPassengerId: passenger.id
        });
      }
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
    const elementos = PnrStateMachine.getNumberedPnrElements(this.state);

    const invalidas = lines.filter((l) => l < 1 || l > elementos.length);
    if (invalidas.length > 0) {
      return { success: false, error: 'CHECK LINE NUMBER' };
    }

    // Borrar de mayor a menor para que los índices no se corran.
    const ordenadas = [...new Set(lines)].sort((a, b) => b - a);
    let baggageCancelled = false;
    for (const l of ordenadas) {
      const el = elementos[l - 1];
      if (el.type === 'ticketing') {
        this.state.ticketing = null;
      } else {
        this.state[el.type].splice(el.index, 1);
        baggageCancelled ||= el.type === 'baggage';
      }
    }

    // El TSM existe únicamente para el servicio XBAG. Al cancelar el último
    // equipaje, también se invalida su documento y su forma de pago asociada.
    if (baggageCancelled && this.state.baggage.length === 0) {
      this.state.tsm = null;
      this.state.fop = null;
      this.state.tsmIssued = false;
    }

    const listado = [...new Set(lines)].sort((a, b) => a - b).join(',');
    this.state.cancelOperations.push({ spec, lines: [...new Set(lines)].sort((a, b) => a - b) });
    return { success: true, message: `ELEMENT ${listado} CANCELLED` };
  }

  // Tasas BSR (1 USD = X). Compartidas con FQC. La facturación FXX se emite
  // en la moneda de la OFICINA del país desde donde se gestiona el vuelo.
  static get USD_RATES() {
    return {
      USD: 1, COP: 4150.0, DOP: 59.0, MXN: 18.5, PEN: 3.75, EUR: 0.92,
      ARS: 950.0, CLP: 950.0, BRL: 5.10, PAB: 1.0
    };
  }

  static get COUNTRY_CURRENCY() {
    return {
      'COLOMBIA': 'COP', 'DOMINICAN REPUBLIC': 'DOP', 'MEXICO': 'MXN',
      'PERU': 'PEN', 'ARGENTINA': 'ARS', 'CHILE': 'CLP', 'BRAZIL': 'BRL',
      'PANAMA': 'PAB', 'UNITED STATES': 'USD', 'ECUADOR': 'USD',
      'SPAIN': 'EUR', 'FRANCE': 'EUR', 'ITALY': 'EUR', 'GERMANY': 'EUR',
      'NETHERLANDS': 'EUR', 'PORTUGAL': 'EUR'
    };
  }

  /**
   * Resuelve la moneda de facturación a partir de la oficina (código IATA
   * al final de FXX/...,OFICINA). Devuelve { currency, rate } donde rate es
   * 1 USD = rate moneda. Sin oficina reconocida => USD (rate 1).
   */
  resolveOfficeCurrency(rawInput, locationsCatalog = []) {
    // Toma el último bloque tras la última coma: "FXX/FF-OPTIMA/RAD*IN, MAD"
    const parts = (rawInput || '').split(',');
    const officeRaw = parts.length > 1 ? parts[parts.length - 1].trim().toUpperCase() : '';
    const office = (officeRaw.match(/[A-Z]{3}/) || [])[0];
    if (!office) return { currency: 'USD', rate: 1, office: null };

    const loc = locationsCatalog.find((l) => l.code === office);
    const currency = loc ? (PnrStateMachine.COUNTRY_CURRENCY[loc.country] || 'USD') : 'USD';
    const rate = PnrStateMachine.USD_RATES[currency] || 1;
    return { currency, rate, office };
  }

  /**
   * Cuenta los tipos de pasajero para facturar por separado (petición de
   * David: FXX debe soltar la tarifa por tipo, no una sola). El infante viaja
   * en el nombre del adulto (INF...), así que ese pax cuenta ADT + INF.
   */
  detectPaxTypes(rawInput = '') {
    let adt = 0, chd = 0, inf = 0;
    for (const p of this.state.passengers || []) {
      const nm = (p.name || '').toUpperCase();
      if (nm.includes('(INF')) { adt++; inf++; }       // adulto con infante en brazos
      else if (nm.includes('(CH')) { chd++; }          // niño (pax propio)
      else { adt++; }
    }
    if (adt + chd + inf === 0) {
      // Sin nombres aún: derivar de los modificadores del comando (RAD/CH/IN).
      const toks = (rawInput.toUpperCase().match(/[A-Z]+/g) || []);
      if (toks.includes('RAD')) adt = 1;
      if (toks.includes('CH')) chd = 1;
      if (toks.includes('IN')) inf = 1;
      if (adt + chd + inf === 0) adt = 1;
    }
    return { adt, chd, inf };
  }

  handlePrice(storeTst = false, params = {}, rawInput = '', locationsCatalog = []) {
    if (this.state.segments.length === 0) {
      return { success: false, error: 'NO ITINERARY TO PRICE' };
    }

    const baseUSD = this.state.segments.reduce((acc, s) => {
      const p = s.priceUSD || 350;
      const c = s.class || 'Y';
      const businessKeys = ['J', 'C', 'D', 'R', 'I', 'U'];
      const premiumKeys = ['W', 'E', 'T', 'P'];
      if (businessKeys.includes(c)) return acc + (p * 3);
      if (premiumKeys.includes(c)) return acc + (p * 1.5);
      return acc + p;
    }, 0);
    const taxesUSD = 45;
    const fareBasis = `${this.state.segments[0].class}FLEX`;

    // Facturar en la moneda de la oficina (bug hallado por David: MAD -> EUR).
    const { currency, rate, office } = this.resolveOfficeCurrency(rawInput, locationsCatalog);
    const baseFare = Math.round(baseUSD * rate);
    const taxes = Math.round(taxesUSD * rate);

    // Desglose por tipo de pasajero: ADT completo, CHD 75%, INF 10%.
    const { adt, chd, inf } = this.detectPaxTypes(rawInput);
    const perPax = [];
    if (adt > 0) perPax.push({ type: 'ADT', count: adt, fare: baseFare, taxes });
    if (chd > 0) perPax.push({ type: 'CHD', count: chd, fare: Math.round(baseFare * 0.75), taxes: Math.round(taxes * 0.75) });
    if (inf > 0) perPax.push({ type: 'INF', count: inf, fare: Math.round(baseFare * 0.10), taxes: Math.round(taxes * 0.10) });
    const total = perPax.reduce((acc, p) => acc + (p.fare + p.taxes) * p.count, 0);
    const normalizedInput = rawInput.trim().toUpperCase().replace(/\s+/g, '');
    const fareFamily = (normalizedInput.match(/\/FF-([A-Z0-9-]+)/) || [])[1] || null;
    const modifiers = [...normalizedInput.matchAll(/\/RAD\*([A-Z]+(?:\*[A-Z]+)*)/g)]
      .map((match) => `RAD*${match[1]}`);
    this.state.pricingHistory.push({
      command: storeTst ? 'FXP' : 'FXX',
      fareFamily,
      modifiers,
      office
    });

    if (storeTst) {
      this.state.tst = { number: 1, priceUSD: baseUSD, currency, total, fareBasis };
    }

    // Bandera pedagógica: el estudiante facturó (FXX o FXP)
    this.state.usedFxx = true;

    return {
      success: true,
      priceUSD: baseUSD,
      currency,
      office,
      baseFare,
      taxes,
      total,
      perPax,
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

  handleIssueTicket(params, activeScenario = null) {
    const strictRules = activeScenario?.config?.strictTicketingRules || {};

    if (!this.state.tst) {
      return { success: false, error: 'NO TST PRESENT FOR ISSUANCE' };
    }

    if (strictRules.requireFOP && !this.state.fop) {
      return { success: false, error: 'NEED FORM OF PAYMENT' };
    }

    if (strictRules.requireTTO && (!this.state.fees || this.state.fees.length === 0)) {
      return { success: false, error: 'NEED TICKETING OVERRIDE' };
    }

    if (!this.state.isTransacted) {
      return { success: false, error: 'END TRANSACT REQUIRED (ER/ET) BEFORE TTP' };
    }

    this.state.isTicketed = true;
    
    // Simulate auto RT if /RT modifier is passed
    const modifier = params?.modifier || '';
    const autoRT = modifier.includes('RT');

    return {
      success: true,
      ticketNumber: `075-${Math.floor(1000000 + Math.random() * 9000000)}`,
      autoRT,
      message: 'OK ETICKET'
    };
  }

  handleFP(params, rawInput) {
    let fop = params.fop || rawInput.replace(/^FP\s*/i, '');
    this.state.fop = fop.trim();
    return { success: true, message: '*' };
  }

  handleTTO(params, rawInput) {
    if (!this.state.tst) {
      return { success: false, error: 'NO TST EXISTS' };
    }
    const feeStr = params.params || rawInput.replace(/^TTO\//i, '');
    this.state.fees.push(feeStr);
    return { success: true, message: '*' };
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

    // Vuelos dinámicos en cada consulta (variedad para aprender).
    const matches = this.generateDynamicFlights(origin, destination);

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

  // ── Módulo de servicio de equipaje (EMD) — flujo del manual de David ──

  // SRXBAG/P{pax}/S{segmento}: solicita equipaje extra.
  handleAddBaggage(rawInput) {
    const pax = (rawInput.match(/\/P(\d+)/i) || [])[1];
    const seg = (rawInput.match(/\/S(\d+)/i) || [])[1];
    if (!pax || !seg) {
      return { success: false, error: 'FORMAT ERROR - CHECK /P PAX /S SEGMENT' };
    }
    const item = { code: 'XBAG', pax: parseInt(pax, 10), seg: parseInt(seg, 10) };
    this.state.baggage.push(item);
    return { success: true, type: 'BAGGAGE', message: `SR XBAG - PAX ${pax} SEGMENT ${seg} - HK` };
  }

  // FXG: guarda el servicio y crea el TSM (documento del servicio).
  handleSaveBaggage() {
    if (this.state.baggage.length === 0) {
      return { success: false, error: 'NO BAGGAGE SERVICE TO STORE' };
    }
    this.state.tsm = { number: 1, service: 'XBAG', status: 'STORED' };
    return { success: true, message: 'TSM 001 STORED - XBAG SERVICE' };
  }

  // TQM: muestra el TSM y abre el registro para la forma de pago.
  handleShowTsm() {
    if (!this.state.tsm) {
      return { success: false, error: 'NO TSM PRESENT - USE FXG FIRST' };
    }
    return { success: true, type: 'TSM', data: { tsm: this.state.tsm, fop: this.state.fop } };
  }

  // TMI/FP-{forma}: agrega la forma de pago al TSM.
  handleSetFop(rawInput) {
    if (!this.state.tsm) {
      return { success: false, error: 'NO TSM PRESENT - USE FXG FIRST' };
    }
    const m = rawInput.match(/FP-?\s*([A-Z]+)/i);
    if (!m) {
      return { success: false, error: 'FORMAT ERROR - TMI/FP-' };
    }
    this.state.fop = m[1].toUpperCase();
    return { success: true, message: `FP ${this.state.fop} ADDED TO TSM 001` };
  }

  // TTM/M{n}/RT: emite el EMD del servicio.
  handleIssueTsm(rawInput) {
    if (!this.state.tsm) {
      return { success: false, error: 'NO TSM TO ISSUE' };
    }
    if (!this.state.fop) {
      return { success: false, error: 'NEED FORM OF PAYMENT (TMI/FP-)' };
    }
    this.state.tsm.status = 'ISSUED';
    this.state.tsmIssued = true;
    return {
      success: true,
      emd: `3-${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      message: 'OK EMD ISSUED'
    };
  }

  // TQT / TQT/T{n}: mostrar el TST guardado (revisar valores de la tarifa).
  handleShowTst(rawInput) {
    if (!this.state.tst) {
      return { success: false, error: 'NO TST PRESENT - USE FXP FIRST' };
    }
    const match = rawInput.match(/^TQT(?:\/T(\d+))?$/i);
    if (!match) {
      return { success: false, error: 'FORMAT ERROR - TQT' };
    }

    const line = parseInt(match[1] || '1', 10);
    const storedNumber = this.state.tst.number || 1;
    if (line !== storedNumber) {
      return { success: false, error: 'CHECK TST NUMBER' };
    }

    return { success: true, type: 'TST_VIEW', data: { line: String(line), tst: this.state.tst, fees: this.state.fees || [] } };
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
