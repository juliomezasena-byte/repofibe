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
      tsmIssued: false,
      fees: [],
      // Structured evidence for scenarios that require specific operations
      // rather than a generic final PNR state.
      infants: [],
      pricingHistory: [],
      cancelOperations: [],
      // Contadores de TST/TSM: la forma de pago vive en tst.fop/tsm.fop
      // (independientes, ver handleFP/handleSetFop) — antes compartían un
      // único state.fop y una FP pisaba a la otra sin avisar.
      tstCounter: 0,
      tsmCounter: 0,
      // Billete ya emitido (fare basis, DOI, total) — separado de state.tst
      // porque el TST activo se borra/recrea durante una reemisión, y el
      // billete original debe seguir consultable con TWD.
      issuedTicket: null,
      penaltyServices: [],
      usedTte: false,
      markedExchange: false,
      fareDiffAdded: false,
      penaltyValueAdded: false,
      combinedIssueDone: false,
      pciConfigured: false,
      paid: false
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
      cancelOperations: newState.cancelOperations ? [...newState.cancelOperations] : [],
      issuedTicket: newState.issuedTicket ? { ...newState.issuedTicket } : null,
      penaltyServices: newState.penaltyServices ? [...newState.penaltyServices] : [],
      // Copia propia, NO por referencia — si no, handlers como handleFP
      // mutan el mismo objeto que scenario.initialState.pnr.tst y el
      // escenario queda "sucio" para la próxima vez que se reinicia.
      tst: newState.tst ? { ...newState.tst } : null,
      tsm: newState.tsm ? { ...newState.tsm } : null,
      // Si el escenario siembra un TST/TSM ya numerado, el contador arranca
      // desde ahí para que el próximo creado numere correctamente.
      tstCounter: newState.tstCounter || newState.tst?.number || 0,
      tsmCounter: newState.tsmCounter || newState.tsm?.number || 0
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
        return this.handleSchedule(params, flightsCatalog, rawInput);

      case 'QUERY_AVAILABILITY':
        return this.handleAvailability(params, flightsCatalog, rawInput);

      case 'SELL_SEGMENT':
        return this.handleSellSegment(params, rawInput);

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

      // ── Cambio Voluntario Manual (reemisión con penalidad) ──
      case 'SHOW_TICKET_DETAIL':
        return this.handleShowTicketDetail(rawInput);

      case 'DELETE_TST':
        return this.handleDeleteTst(rawInput);

      case 'MARK_EXCHANGE':
        return this.handleMarkExchange(rawInput);

      case 'ADD_FARE_DIFF':
        return this.handleAddFareDiff(rawInput);

      case 'FARE_OVERRIDE':
        return this.handleFareOverride(rawInput);

      case 'ADD_PENALTY_SERVICE':
        return this.handleAddPenaltyService(rawInput);

      case 'SAVE_TSM_PENF':
        return this.handleSaveTsm();

      case 'CHECK_MGMT_FEE':
        return this.handleCheckManagementFee(rawInput);

      case 'COMBINED_ISSUE':
        return this.handleCombinedIssue(rawInput);

      case 'CONFIG_PROFILE':
        return this.handleConfigProfile(rawInput);

      case 'EXECUTE_PAY':
        return this.handlePay();

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

      case 'PRICE_LOWEST_INFORMATIVE':
        return this.handlePriceLowestInfo(rawInput);

      case 'PRICE_FARE_FAMILY':
        return this.handlePriceFareFamily(params, rawInput);

      case 'PRICE_BEST_BUY_ET':
        return this.handlePriceBestBuyEt(rawInput);

      case 'PRICE_AND_STORE_EXCHANGE':
        return this.handlePriceAndStoreExchange(params, rawInput);

      case 'PRICE_OPTIMAL_OPTIONS':
        return this.handlePriceOptimalOptions(rawInput);

      case 'HOTEL_ELEMENT':
        return this.handleHotelElement(params, rawInput);

      case 'SHOW_RESIBER_TICKET_DETAIL':
        return this.handleShowResiberTicketDetail(params, rawInput);

      case 'SPLIT_PNR':
        return this.handleSplitPnr(params, rawInput);

      case 'END_AND_FILE_SPLIT':
        return this.handleEndAndFileSplit(rawInput);

      case 'SHOW_FARE_QUOTE_DETAILS':
        return this.handleShowFareQuoteDetails(params, rawInput);

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
      // Una clase está abierta (1-9 puestos) o cerrada ('C') — nunca "0"
      // puestos abiertos, que no es un estado real de Amadeus (hallazgo
      // de David: la disponibilidad mezclaba info de clase inconsistente).
      ladder[letra] = (v === 0 || v === 1) ? 'C' : Math.min(9, v);
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

  // Hallazgo de David: si el comando (o una variante no soportada) no
  // parseaba bien origen/destino/fecha, el motor seguía con un default
  // silencioso (BOG/MIA/25NOV) en vez de avisar — el estudiante veía
  // vuelos "de la nada" sin saber que su comando no se leyó bien.
  handleAvailability(params, flightsCatalog, rawInput = '') {
    if (!params.origin || !params.destination || !params.date) {
      return { success: false, error: 'FORMAT ERROR - CHECK DATE/ORIGIN/DESTINATION (AN{fecha}{origen}{destino})' };
    }
    return this._resolveAvailability(params.origin, params.destination, params.date, rawInput, 'AVAILABILITY', flightsCatalog);
  }

  /**
   * Vuelos CAPTURADOS DEL TERMINAL REAL para una ruta, o null si no hay.
   *
   * Existe porque `flightsCatalog` se pasaba a handleAvailability/
   * handleSchedule y NUNCA se usaba: AN y SN siempre inventaban vuelos al
   * azar, así que las capturas reales del terminal eran dato muerto para la
   * pantalla.
   *
   * Por qué SOLO las capturas reales y no todo el catálogo: los vuelos
   * sintéticos del catálogo son 2 por ruta, sin escalas ni clases cerradas.
   * Servirlos tal cual empobrece la práctica frente al generador dinámico
   * (3-5 opciones, escalas, clases cerradas) y además elimina la variedad
   * que impide que el estudiante memorice "la línea 2 es la buena".
   *
   * Con esta regla cada cosa hace lo suyo: donde hay captura real se ve
   * exactamente lo que devolvió el GDS —determinista y fiel—; donde no la
   * hay, sigue el generador dinámico.
   *
   * Se clona cada vuelo: renumerar `line` sobre el catálogo compartido lo
   * corrompería para las siguientes consultas.
   */
  _flightsFromCatalog(origin, destination, flightsCatalog) {
    const matches = (flightsCatalog || []).filter(
      (f) => f.origin === origin && f.destination === destination &&
             typeof f.fuente === 'string' && f.fuente.startsWith('AN real')
    );
    if (!matches.length) return null;

    return matches
      .map((f) => ({ ...f, classes: { ...f.classes }, ...this._radioDelVuelo(f) }))
      .sort((a, b) => String(a.departure || '').localeCompare(String(b.departure || '')))
      .map((f, i) => ({ ...f, line: i + 1 }));
  }

  /**
   * Deduce tipo de radio y nº de cabinas de un vuelo capturado.
   *
   * Los vuelos del terminal traen `duration` ("10:30") pero no `tipoRadio`
   * ni `cabins`, que es lo que la pantalla usa para la etiqueta. Sin esto,
   * un MAD-BOG de 10h30 se rotulaba "[CR 2CAB]" (corto radio) — falso y
   * además contradice la regla de que en corto radio no hay Turista Premium.
   */
  _radioDelVuelo(f) {
    if (f.tipoRadio) return {};

    const m = String(f.duration || '').match(/^(\d{1,2}):(\d{2})$/);
    const horas = m ? Number(m[1]) + Number(m[2]) / 60 : null;

    // Sin duración, la propia escalera lo delata: Turista Premium
    // (W/E/T/P) solo existe en largo radio.
    const tienePremium = ['W', 'E', 'T', 'P'].some((c) => f.classes?.[c] !== undefined);

    const tipoRadio =
      horas === null ? (tienePremium ? 'LARGO' : 'CORTO')
      : horas >= 6 ? 'LARGO'
      : horas >= 3 ? 'MEDIO'
      : 'CORTO';

    return { tipoRadio, cabins: tipoRadio === 'LARGO' ? 3 : 2 };
  }

  // Ida + regreso mismo mes, desglosado en dos plantillas con numeración
  // continua (sintaxis real confirmada por David: "SN 18 MAR MAD BER*30"
  // — el "*30" es el día de regreso, mismo mes que la ida). Sin el "*",
  // se comporta exactamente igual que antes (una sola plantilla).
  _resolveAvailability(origin, destination, date, rawInput, type, flightsCatalog = []) {
    const rtMatch = (rawInput || '').match(/\*\s*(\d{1,2})\s*$/);
    const outbound =
      this._flightsFromCatalog(origin, destination, flightsCatalog) ||
      this.generateDynamicFlights(origin, destination);

    if (!rtMatch) {
      this.state.lastAvailability = { date, origin, destination, flights: outbound };
      return { success: true, type, data: this.state.lastAvailability };
    }

    const returnDay = rtMatch[1].padStart(2, '0');
    const month = (date.match(/[A-Z]{3}/i) || [''])[0].toUpperCase();
    const returnDate = `${returnDay}${month}`;
    const inbound =
      this._flightsFromCatalog(destination, origin, flightsCatalog) ||
      this.generateDynamicFlights(destination, origin);
    const outboundCount = outbound.length;
    // La captura real del terminal mostró la ida en 1-3 y el regreso en
    // 11-13 (hay un salto). No sabemos la regla que usa Amadeus para ese
    // salto, así que numeramos correlativo en vez de inventarla.
    inbound.forEach((f, i) => { f.line = outboundCount + i + 1; });

    this.state.lastAvailability = {
      date, origin, destination, returnDate, outboundCount,
      isRoundTrip: true,
      flights: [...outbound, ...inbound]
    };
    return { success: true, type, data: this.state.lastAvailability };
  }

  handleSellSegment(params, rawInput = '') {
    // SS{pax}{clase1}{línea1}*{clase2}{línea2}: vender 2 vuelos de la
    // misma disponibilidad en un solo comando (propuesta de David, ej.
    // SS5Y2*V11) — mismo código "SS", se distingue por el "*" en el
    // input; no puede ser un comando DSL separado porque colisionaría
    // (mismo prefijo de 2 letras, el parser no soporta sub-modos).
    if (rawInput && rawInput.includes('*')) {
      return this.handleSellSegmentDouble(rawInput);
    }

    if (!this.state.lastAvailability || !this.state.lastAvailability.flights.length) {
      return { success: false, error: 'NO AVAILABILITY DISPLAYED' };
    }

    const lineNum = parseInt(params.line || '1', 10);
    const count = parseInt(params.count || '1', 10);
    const bookingClass = params.class || 'Y';
    return this._sellFromLine(lineNum, bookingClass, count);
  }

  // Vende el vuelo de una línea de state.lastAvailability (soporta escala).
  _sellFromLine(lineNum, bookingClass, count) {
    const flight = this.state.lastAvailability.flights.find(f => f.line === lineNum) || this.state.lastAvailability.flights[0];

    // Soporte para 2 clases consecutivas (ej: SS 2 A S 1 -> bookingClass = "AS")
    const class1 = bookingClass.length >= 2 ? bookingClass[0] : bookingClass;
    const class2 = bookingClass.length >= 2 ? bookingClass[1] : bookingClass;

    const resolveClass = (requestedCls) => {
      if (!flight.classes) return requestedCls;
      const status = flight.classes[requestedCls];
      // Si la clase existe en el vuelo y está cerrada explícitamente (0, C, X), se rechaza
      if (status === 0 || status === 'C' || status === 'X') {
        return null;
      }
      if (status !== undefined && (typeof status === 'number' ? status > 0 : status !== 'C' && status !== 'X')) {
        return requestedCls;
      }
      // Si la clase solicitada es un placeholder o no está en la escalera, usar primera clase abierta
      const openClass = Object.keys(flight.classes).find(c => flight.classes[c] !== 0 && flight.classes[c] !== 'C' && flight.classes[c] !== 'X');
      return openClass || requestedCls;
    };

    const finalClass1 = resolveClass(class1);
    const finalClass2 = resolveClass(class2);

    if (finalClass1 === null) {
      return { success: false, error: `CLASS ${class1} CLOSED / NO SEATS AVAILABLE` };
    }
    if (finalClass2 === null) {
      return { success: false, error: `CLASS ${class2} CLOSED / NO SEATS AVAILABLE` };
    }

    // Si el vuelo tiene escala, vendemos 2 segmentos
    if (flight.via) {
      const seg1 = {
        id: this.state.segments.length + 1,
        flight: `${flight.airline}${flight.flightNumber}`,
        class: finalClass1,
        date: this.state.lastAvailability?.date || '15MAR',
        route: `${flight.origin}-${flight.via}`,
        status: `HK${count}`,
        departure: flight.departure,
        arrival: '12:00',
        priceUSD: (flight.priceUSD || 350) / 2
      };

      const seg2 = {
        id: this.state.segments.length + 2,
        flight: `${flight.airline}${flight.flightNumber}`,
        class: finalClass2,
        date: this.state.lastAvailability?.date || '15MAR',
        route: `${flight.via}-${flight.destination}`,
        status: `HK${count}`,
        departure: '14:00',
        arrival: flight.arrival,
        priceUSD: (flight.priceUSD || 350) / 2
      };

      this.state.segments.push(seg1, seg2);
      this.state.isTransacted = false;
      return { success: true, segment: seg1 };
    } else {
      const segment = {
        id: this.state.segments.length + 1,
        flight: `${flight.airline}${flight.flightNumber}`,
        class: finalClass1,
        date: this.state.lastAvailability?.date || '15MAR',
        route: `${flight.origin}-${flight.destination}`,
        status: `HK${count}`,
        departure: flight.departure,
        arrival: flight.arrival,
        priceUSD: flight.priceUSD || 350
      };
      this.state.segments.push(segment);
      this.state.isTransacted = false;
      return { success: true, segment };
    }
  }

  handleSellSegmentDouble(rawInput) {
    // El "SS" normal tolera espacios vía normalize:"compact" del DSL, pero
    // esa normalización solo aplica al payload interno de tokens, no a
    // rawInput — hay que quitarlos aquí a mano para la misma tolerancia.
    const compact = rawInput.replace(/\s+/g, '');
    const m = compact.match(/^SS(\d+)([A-Z])(\d+)\*([A-Z])(\d+)$/i);
    if (!m) {
      return { success: false, error: 'FORMAT ERROR - SS{pax}{clase1}{linea1}*{clase2}{linea2}' };
    }
    if (!this.state.lastAvailability || !this.state.lastAvailability.flights.length) {
      return { success: false, error: 'NO AVAILABILITY DISPLAYED' };
    }
    const [, paxStr, class1, line1Str, class2, line2Str] = m;
    const count = parseInt(paxStr, 10);
    const r1 = this._sellFromLine(parseInt(line1Str, 10), class1.toUpperCase(), count);
    if (!r1.success) return r1;
    const r2 = this._sellFromLine(parseInt(line2Str, 10), class2.toUpperCase(), count);
    if (!r2.success) return r2;
    return { success: true, segment: r1.segment, segment2: r2.segment };
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

  // Valida el formato real del contacto (hallazgo de David: aceptaba
  // cualquier texto sin validar, ej. un teléfono con separador incorrecto).
  // Mismo principio ya usado en handleDecodeCity: error honesto, nunca
  // datos inventados.
  handleAddContact(params, rawInput) {
    const input = rawInput.trim().toUpperCase();
    const isEmail = /^APE-.+@.+\..+$/.test(input);
    const isIntl = /^AP\+\s*[\d\s-]{6,20}$/.test(input);
    const isCityPhone = /^AP\s*[A-Z]{3}\s*[\d\s-]{6,20}(-[A-Z])?$/.test(input);
    if (!isEmail && !isIntl && !isCityPhone) {
      return { success: false, error: 'FORMAT ERROR - CHECK AP{CIUDAD} {TELEFONO}-{TIPO}, AP+{TELEFONO} O APE-{CORREO}' };
    }
    const text = rawInput.replace(/^AP/i, '').trim();
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
      ARS: 950.0, CLP: 950.0, BRL: 5.10, PAB: 1.0,
      // Agregadas tras hallazgo de David (falta Guatemala/GTQ) — mismos
      // países que ya existen en locations.json pero no tenían moneda.
      GTQ: 7.75, CRC: 505.0, HNL: 25.8, NIO: 36.6
    };
  }

  static get COUNTRY_CURRENCY() {
    return {
      'COLOMBIA': 'COP', 'DOMINICAN REPUBLIC': 'DOP', 'MEXICO': 'MXN',
      'PERU': 'PEN', 'ARGENTINA': 'ARS', 'CHILE': 'CLP', 'BRAZIL': 'BRL',
      'PANAMA': 'PAB', 'UNITED STATES': 'USD', 'ECUADOR': 'USD',
      'SPAIN': 'EUR', 'FRANCE': 'EUR', 'ITALY': 'EUR', 'GERMANY': 'EUR',
      'NETHERLANDS': 'EUR', 'PORTUGAL': 'EUR',
      // Agregados tras hallazgo de David: existían en locations.json pero
      // caían a USD por defecto al no estar aquí.
      'GUATEMALA': 'GTQ', 'COSTA RICA': 'CRC', 'EL SALVADOR': 'USD',
      'HONDURAS': 'HNL', 'NICARAGUA': 'NIO'
      // Venezuela (VES) queda fuera a propósito: moneda inestable, no hay
      // una tasa BSR confiable que no sea inventada.
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

    // Fare basis real: la letra depende de la familia tarifaria pedida, no
    // un sufijo "FLEX" fijo (bug hallado por David: pidió Comfort y vio
    // "CFLEX"). Letras confirmadas por David: BASIC=B, OPTIMA=M, COMFORT=U.
    // FLEX (letra exacta sin confirmar) y familias no reconocidas conservan
    // el sufijo "FLEX" literal — no se inventa la letra que falta.
    const fareTierLetter = fareFamily?.includes('BASIC') ? 'B'
      : fareFamily?.includes('OPTIMA') ? 'M'
      : fareFamily?.includes('COMFORT') ? 'U'
      : null;
    const fareBasis = fareTierLetter
      ? `${this.state.segments[0].class}${fareTierLetter}`
      : `${this.state.segments[0].class}FLEX`;
    const modifiers = [...normalizedInput.matchAll(/\/RAD\*([A-Z]+(?:\*[A-Z]+)*)/g)]
      .map((match) => `RAD*${match[1]}`);
    this.state.pricingHistory.push({
      command: storeTst ? 'FXP' : 'FXX',
      fareFamily,
      modifiers,
      office
    });

    if (storeTst) {
      this.state.tstCounter = (this.state.tstCounter || 0) + 1;
      this.state.tst = { number: this.state.tstCounter, priceUSD: baseUSD, currency, total, fareBasis };
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

    if (strictRules.requireFOP && !this.state.tst?.fop) {
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

    const ticketNumber = `075-${Math.floor(1000000 + Math.random() * 9000000)}`;
    // Archivar el billete recién emitido para que TWD pueda consultarlo
    // después — antes solo funcionaba si el escenario lo sembraba a mano.
    this.state.issuedTicket = {
      number: ticketNumber.replace(/-/g, ''),
      doi: PnrStateMachine.formatDoiToday(),
      fareBasisOut: this.state.tst.fareBasis,
      total: this.state.tst.total !== undefined ? this.state.tst.total : this.state.tst.priceUSD,
      currency: this.state.tst.currency || 'USD'
    };

    return {
      success: true,
      ticketNumber,
      autoRT,
      message: 'OK ETICKET'
    };
  }

  // Fecha de hoy en formato DDMMMYY (convención Amadeus, ej. "01AUG26").
  static formatDoiToday() {
    const meses = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}${meses[d.getMonth()]}${String(d.getFullYear()).slice(-2)}`;
  }

  // FP: forma de pago del TST (diferencia de tarifa + gasto de gestión).
  // Independiente de TMI/FP- (forma de pago del TSM/penalidad) — antes
  // compartían el mismo campo y una pisaba a la otra sin avisar.
  handleFP(params, rawInput) {
    if (!this.state.tst) {
      return { success: false, error: 'NO TST PRESENT FOR FP' };
    }
    let fop = params.fop || rawInput.replace(/^FP\s*/i, '');
    this.state.tst.fop = fop.trim();
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

    // Reutiliza el MISMO mapa de tasas que resolveOfficeCurrency (antes
    // había una copia local duplicada aquí — corrección de auditoría: el
    // fix de monedas LATAM de David solo se había aplicado al getter
    // estático, dejando FQC todavía sin Guatemala/GTQ y las demás).
    const usdRates = PnrStateMachine.USD_RATES;

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

  // Mismo principio que handleAvailability: error honesto si no parseó,
  // nunca un destino inventado (hallazgo de David).
  handleSchedule(params, flightsCatalog, rawInput = '') {
    if (!params.origin || !params.destination || !params.date) {
      return { success: false, error: 'FORMAT ERROR - CHECK DATE/ORIGIN/DESTINATION (SN{fecha}{origen}{destino})' };
    }
    return this._resolveAvailability(params.origin, params.destination, params.date, rawInput, 'SCHEDULE', flightsCatalog);
  }

  handleFareSummation(params, rawInput) {
    const rawExpr = (rawInput.slice(2).trim() || '').replace(/\s+/g, '');
    this.state.usedDf = true;

    // Modo diferencia: DF nueva - original (cotización nueva − ticket original).
    const diffMatch = rawExpr.match(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/);
    if (diffMatch) {
      const nueva = parseFloat(diffMatch[1]);
      const original = parseFloat(diffMatch[2]);
      return {
        success: true,
        type: 'FARE_SUMMATION',
        data: { rawInput, mode: 'DIFF', nueva, original, totalSum: +(nueva - original).toFixed(2) }
      };
    }

    // Modo penalidad menos descuento: DF penalidad P descuento.
    const penaltyMatch = rawExpr.match(/^(\d+(?:\.\d+)?)P(\d+(?:\.\d+)?)$/i);
    if (penaltyMatch) {
      const penalidad = parseFloat(penaltyMatch[1]);
      const descuento = parseFloat(penaltyMatch[2]);
      return {
        success: true,
        type: 'FARE_SUMMATION',
        data: { rawInput, mode: 'PENALTY_MINUS_DISCOUNT', penalidad, descuento, totalSum: +(penalidad - descuento).toFixed(2) }
      };
    }

    // Modo suma (legacy: DF valor1;valor2;gastos*cantidadPax).
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

    return {
      success: true,
      type: 'FARE_SUMMATION',
      data: {
        rawInput,
        mode: 'SUM',
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
    const fareBasis = fare?.fareBasis || 'YFLEX';

    // Hallazgo de David: el texto era genérico fijo sin importar la
    // tarifa real (ej. Business no debería mostrar penalidad). Cobertura
    // acotada: no hay motor de reglas tarifarias completo, solo se refleja
    // el caso confirmado (cabina Business = sin penalidad).
    const bookingClass = fareBasis.charAt(0);
    const isBusiness = PnrStateMachine.RBD_BUSINESS.includes(bookingClass);
    const chargeLine = isBusiness ? '  CHARGE: NO PENALTY (BUSINESS FARE)' : '  CHARGE: GG + DF APLICAN';
    const penaltyLine = isBusiness ? '  PENALTY: NO PENTY (BUSINESS FARE)' : '  PENALTY: NO PENTY + DF + GG';

    const pages = [
      [
        `FQN${ticketNum}*PE - FARE COMPONENTS TKT ${ticketNum}`,
        `FC1  ${base}  FARE BASIS ${fareBasis}`,
        ``,
        `CANCELLATIONS:`,
        `  BEFORE DEPARTURE - REFUND PERMITTED`,
        chargeLine,
        `  AFTER DEPARTURE  - REFUND NOT PERMITTED`
      ].join('\n'),
      [
        `FQN${ticketNum}*PE - FARE COMPONENTS TKT ${ticketNum} (CONT.)`,
        `CHANGES:`,
        `  BEFORE DEPARTURE - CHANGES PERMITTED`,
        penaltyLine,
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

  // Helper compartido: crea el TSM a partir del servicio pendiente
  // (equipaje o penalidad), con numeración continua (no reinicia en 1).
  _createTsm(service, sourceArray, notFoundMsg) {
    if (!sourceArray || sourceArray.length === 0) {
      return { success: false, error: notFoundMsg };
    }
    this.state.tsmCounter = (this.state.tsmCounter || 0) + 1;
    this.state.tsm = { number: this.state.tsmCounter, service, status: 'STORED' };
    return {
      success: true,
      message: `TSM ${String(this.state.tsmCounter).padStart(3, '0')} STORED - ${service} SERVICE`
    };
  }

  // FXG: guarda el servicio de equipaje y crea el TSM (documento del servicio).
  handleSaveBaggage() {
    return this._createTsm('XBAG', this.state.baggage, 'NO BAGGAGE SERVICE TO STORE');
  }

  // IU {AL} NN1 PENF {org}/P{n}: solicita el servicio de penalidad (TSM).
  handleAddPenaltyService(rawInput) {
    const m = rawInput.match(/^IU\s+([A-Z0-9]{2})\s+NN1\s+PENF\s+([A-Z]{3})\/P(\d+)$/i);
    if (!m) {
      return { success: false, error: 'FORMAT ERROR - IU {AL} NN1 PENF {ORG}/P{n}' };
    }
    const [, airline, org, pax] = m;
    this.state.penaltyServices.push({ code: 'PENF', airline: airline.toUpperCase(), org: org.toUpperCase(), pax: parseInt(pax, 10) });
    return { success: true, type: 'BAGGAGE', message: `NN1 PENF ${org.toUpperCase()} - PAX ${pax} - HK` };
  }

  // TMC: guarda el servicio de penalidad y crea el TSM (equivalente a FXG para PENF).
  handleSaveTsm() {
    return this._createTsm('PENF', this.state.penaltyServices, 'NO PENALTY SERVICE TO STORE');
  }

  // TQM: muestra el TSM y abre el registro para la forma de pago.
  handleShowTsm() {
    if (!this.state.tsm) {
      return { success: false, error: 'NO TSM PRESENT - USE FXG FIRST' };
    }
    return { success: true, type: 'TSM', data: { tsm: this.state.tsm, fop: this.state.tsm.fop } };
  }

  // TMI/FP-{forma}: agrega la forma de pago al TSM (independiente de FP, que es la del TST).
  // TMI/M{n}/F{valor}/CV-{valor}: carga el valor de la penalidad y el coupon value (antes de la FP).
  handleSetFop(rawInput) {
    if (!this.state.tsm) {
      return { success: false, error: 'NO TSM PRESENT - USE FXG FIRST' };
    }
    const valueMatch = rawInput.match(/^TMI\/M(\d+)\/F(\d+(?:\.\d+)?)\/CV-(\d+(?:\.\d+)?)$/i);
    if (valueMatch) {
      const [, mNum, penalty, cv] = valueMatch;
      if (parseInt(mNum, 10) !== this.state.tsm.number) {
        return { success: false, error: 'CHECK TSM NUMBER' };
      }
      this.state.tsm.penaltyValue = parseFloat(penalty);
      this.state.tsm.couponValue = parseFloat(cv);
      this.state.penaltyValueAdded = true;
      return {
        success: true,
        message: `PENALTY ${penalty} / CV ${cv} ADDED TO TSM ${String(this.state.tsm.number).padStart(3, '0')}`
      };
    }
    const m = rawInput.match(/FP-?\s*([A-Z]+)/i);
    if (!m) {
      return { success: false, error: 'FORMAT ERROR - TMI/FP- OR TMI/M{n}/F{valor}/CV-{valor}' };
    }
    this.state.tsm.fop = m[1].toUpperCase();
    return { success: true, message: `FP ${this.state.tsm.fop} ADDED TO TSM ${String(this.state.tsm.number).padStart(3, '0')}` };
  }

  // TTM/M{n}/RT: emite el EMD del servicio.
  handleIssueTsm(rawInput) {
    if (!this.state.tsm) {
      return { success: false, error: 'NO TSM TO ISSUE' };
    }
    if (!this.state.tsm.fop) {
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

  // ── Módulo de Cambio Voluntario Manual (reemisión con penalidad) ──

  // TWD/TKT{billete}, TWD/L{n}, TWD/TAX: consulta el billete YA EMITIDO
  // (fare basis, DOI, total) — no el TST activo, que se borra/recrea
  // durante la reemisión.
  handleShowTicketDetail(rawInput) {
    const mTkt = rawInput.match(/^TWD\/TKT\s*(\d{3}-?\d{10})$/i);
    const mLine = rawInput.match(/^TWD\/L(\d+)$/i);

    if (!this.state.issuedTicket) {
      // Auto-sembrar billete semilla si el alumno consulta un billete específico del manual
      const requestedNum = mTkt ? mTkt[1] : '075-1422342526';
      const paxName = this.state.passengers[0]?.name || 'GARCIA/MIGUEL MR';
      const segList = this.state.segments.length > 0
        ? this.state.segments
        : [
            { flight: 'IB6588', from: 'MAD', to: 'BCN', date: '10APR', class: 'Y', departure: '09:00' },
            { flight: 'IB6589', from: 'BCN', to: 'MAD', date: '17APR', class: 'Y', departure: '14:30' }
          ];

      this.state.issuedTicket = {
        number: requestedNum,
        doi: '15MAR26',
        iata: '78200112',
        paxName: paxName,
        segments: segList,
        baseFare: 267.19,
        taxAmount: 45.00,
        total: 312.19,
        currency: 'USD',
        fareBasisOut: 'YFLEX',
        fareBasisIn: 'YFLEX',
        fop: 'CC VI 4111XXXXXX1111'
      };
    }
    const t = this.state.issuedTicket;

    if (/^TWD\/TAX$/i.test(rawInput)) {
      return { success: true, type: 'TICKET_TAX', data: { baseFare: t.baseFare, taxAmount: t.taxAmount, total: t.total, currency: t.currency } };
    }

    if (!mTkt && !mLine) {
      return { success: false, error: 'FORMAT ERROR - TWD/TKT{billete} OR TWD/L{n}' };
    }

    if (mLine && parseInt(mLine[1], 10) !== 1) {
      return { success: false, error: 'TICKET NOT FOUND' };
    }

    return { success: true, type: 'TICKET_DETAIL', data: { ticket: t } };
  }

  // TTE/ALL o TTE/T{n}: elimina el TST activo (conserva tstCounter, así el
  // próximo FXP numera correctamente, sin reiniciar en T1).
  handleDeleteTst(rawInput) {
    if (!this.state.tst) {
      return { success: false, error: 'NO TST PRESENT' };
    }
    const m = rawInput.match(/^TTE\/(ALL|T(\d+))$/i);
    if (!m) {
      return { success: false, error: 'FORMAT ERROR - TTE/ALL OR TTE/T{n}' };
    }
    if (m[1].toUpperCase() !== 'ALL' && parseInt(m[2], 10) !== this.state.tst.number) {
      return { success: false, error: 'CHECK TST NUMBER' };
    }
    const deleted = this.state.tst.number;
    this.state.tst = null;
    this.state.usedTte = true;
    return { success: true, message: `TST ${deleted} DELETED` };
  }

  // TTI/EXCH/T{n}: marca el TST activo como reemisión. Solo este submodo —
  // el TTI multi-modo del manual "con segmento volado" queda fuera de este
  // nivel (ver docs/PLAN_CAMBIO_MANUAL_IBERIA.md, Nivel 25).
  handleMarkExchange(rawInput) {
    if (!this.state.tst) {
      return { success: false, error: 'NO TST PRESENT' };
    }
    const m = rawInput.match(/^TTI\/EXCH\/T(\d+)$/i);
    if (!m) {
      return { success: false, error: 'FORMAT ERROR - TTI/EXCH/T{n}' };
    }
    if (parseInt(m[1], 10) !== this.state.tst.number) {
      return { success: false, error: 'CHECK TST NUMBER' };
    }
    this.state.tst.exchange = true;
    this.state.markedExchange = true;
    return { success: true, message: `TST ${this.state.tst.number} MARKED AS EXCHANGE` };
  }

  // TTK/T{n}/T{valor}: agrega la diferencia de tarifa calculada (DF) al TST.
  handleAddFareDiff(rawInput) {
    if (!this.state.tst) {
      return { success: false, error: 'NO TST PRESENT' };
    }
    const m = rawInput.match(/^TTK\/T(\d+)\/T(\d+(?:\.\d+)?)$/i);
    if (!m) {
      return { success: false, error: 'FORMAT ERROR - TTK/T{n}/T{valor}' };
    }
    if (parseInt(m[1], 10) !== this.state.tst.number) {
      return { success: false, error: 'CHECK TST NUMBER' };
    }
    this.state.tst.fareDiff = parseFloat(m[2]);
    this.state.fareDiffAdded = true;
    return { success: true, message: `FARE DIFFERENCE ${m[2]} ADDED TO TST ${this.state.tst.number}` };
  }

  // FO*L{n}/P{n} y FOINF*L{n}/P{n}: fare override (vincula tarifa a pasajero/línea).
  handleFareOverride(rawInput) {
    const m = rawInput.match(/^FO(INF)?\*L(\d+)\/P(\d+)$/i);
    if (!m) {
      return { success: false, error: 'FORMAT ERROR - FO*L{n}/P{n}' };
    }
    if (!this.state.tst) {
      return { success: false, error: 'NO TST PRESENT' };
    }
    this.state.tst.fareOverride = { mode: m[1] ? 'FOINF' : 'FO', line: parseInt(m[2], 10), pax: parseInt(m[3], 10) };
    return { success: true, message: 'FARE OVERRIDE APPLIED' };
  }

  // TQO: verifica que el gasto de gestión ya quedó agregado (reutiliza
  // state.fees, alimentado por TTO).
  handleCheckManagementFee(rawInput) {
    if (!/^TQO$/i.test(rawInput)) {
      return { success: false, error: 'FORMAT ERROR - TQO' };
    }
    if (!this.state.fees || this.state.fees.length === 0) {
      return { success: false, error: 'NO MANAGEMENT FEE REGISTERED - USE TTO FIRST' };
    }
    return { success: true, type: 'MGMT_FEE_CHECK', data: { fees: this.state.fees } };
  }

  // TTP1/TTM/T{n}/M{n}/ET/RT: emisión combinada de billete + EMD en un solo comando.
  handleCombinedIssue(rawInput) {
    const m = rawInput.match(/^TTP1\/TTM\/T(\d+)\/M(\d+)\/(.*)$/i);
    if (!m) {
      return { success: false, error: 'FORMAT ERROR - TTP1/TTM/T{n}/M{n}/ET/RT' };
    }
    const [, tNum, mNum, tail] = m;
    if (!this.state.tst || this.state.tst.number !== parseInt(tNum, 10)) {
      return { success: false, error: 'CHECK TST NUMBER' };
    }
    if (!this.state.tsm || this.state.tsm.number !== parseInt(mNum, 10)) {
      return { success: false, error: 'CHECK TSM NUMBER' };
    }
    if (!this.state.tst.fop) {
      return { success: false, error: 'NEED FORM OF PAYMENT ON TST (FP)' };
    }
    if (!this.state.tsm.fop) {
      return { success: false, error: 'NEED FORM OF PAYMENT (TMI/FP-)' };
    }
    if (!this.state.isTransacted) {
      return { success: false, error: 'END TRANSACT REQUIRED (ER/ET) BEFORE TTP1' };
    }
    this.state.isTicketed = true;
    this.state.tsm.status = 'ISSUED';
    this.state.tsmIssued = true;
    // Evidencia específica de que la emisión combinada realmente ocurrió
    // (isTicketed solo no basta: el escenario siembra isTicketed:true en
    // el billete original, así que por sí solo no prueba que se reemitió).
    this.state.combinedIssueDone = true;

    const ticketNumber = `075-${Math.floor(1000000 + Math.random() * 9000000)}`;
    // Archivar el billete NUEVO — reemplaza el issuedTicket original para
    // que TWD muestre los datos de la reemisión, no los del billete viejo.
    this.state.issuedTicket = {
      number: ticketNumber.replace(/-/g, ''),
      doi: PnrStateMachine.formatDoiToday(),
      fareBasisOut: this.state.tst.fareBasis,
      total: this.state.tst.total !== undefined ? this.state.tst.total : this.state.tst.priceUSD,
      currency: this.state.tst.currency || 'USD'
    };

    return {
      success: true,
      type: 'COMBINED_ISSUE',
      ticketNumber,
      emd: `3-${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      autoRT: tail.toUpperCase().includes('RT'),
      message: 'OK ETICKET / OK EMD ISSUED'
    };
  }

  // $$CONFIG:CCTYPE/{n}: carga el perfil de tarjeta (PCI) en Amadeus.
  // Confirmado como faltante por David en pruebas reales (FORMAT ERROR).
  handleConfigProfile(rawInput) {
    const m = rawInput.match(/^\$\$CONFIG:CCTYPE\/(\d+)$/i);
    if (!m) {
      return { success: false, error: 'FORMAT ERROR - $$CONFIG:CCTYPE/{n}' };
    }
    this.state.pciConfigured = true;
    return { success: true, message: `PCI PROFILE CCTYPE/${m[1]} LOADED` };
  }

  // $$PAY: ejecuta el cargo. Requiere perfil PCI cargado y al menos una
  // forma de pago (TST o TSM) ya registrada.
  handlePay() {
    if (!this.state.pciConfigured) {
      return { success: false, error: 'NO PCI PROFILE LOADED - USE $$CONFIG:CCTYPE/{n} FIRST' };
    }
    if (!this.state.tst?.fop && !this.state.tsm?.fop) {
      return { success: false, error: 'NEED FORM OF PAYMENT BEFORE $$PAY' };
    }
    this.state.paid = true;
    return { success: true, message: 'OK $$PAY - CHARGE PROCESSED' };
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

  handlePriceLowestInfo(rawInput) {
    this.state.usedFxi = true;
    return {
      success: true,
      type: 'PRICE_LOWEST_INFORMATIVE',
      data: { rawInput, segments: this.state.segments }
    };
  }

  handlePriceFareFamily(params, rawInput) {
    this.state.usedFxf = true;
    return {
      success: true,
      type: 'PRICE_FARE_FAMILY',
      data: { rawInput, fareFamily: params.fareFamily || 'OPTIMA' }
    };
  }

  handlePriceBestBuyEt(rawInput) {
    this.state.usedFxe = true;
    return {
      success: true,
      type: 'PRICE_BEST_BUY_ET',
      data: { rawInput, segments: this.state.segments }
    };
  }

  handlePriceAndStoreExchange(params, rawInput) {
    this.state.usedFxq = true;
    this.state.tstCounter = (this.state.tstCounter || 1) + 1;
    const tstNum = this.state.tstCounter;
    this.state.tst = {
      id: tstNum,
      fareBasis: 'NDHNENM2',
      total: 312.19,
      base: 267.19,
      tax: 45.00,
      penalty: 65.00,
      isExchange: true,
      createdAt: Date.now()
    };
    return {
      success: true,
      type: 'PRICE_AND_STORE_EXCHANGE',
      data: { rawInput, tst: this.state.tst }
    };
  }

  handlePriceOptimalOptions(rawInput) {
    this.state.usedFxo = true;
    return {
      success: true,
      type: 'PRICE_OPTIMAL_OPTIONS',
      data: { rawInput }
    };
  }

  handleHotelElement(params, rawInput) {
    this.state.usedFhe = true;
    return {
      success: true,
      type: 'HOTEL_ELEMENT',
      data: { rawInput, cityCode: params?.cityCode || 'MAD' }
    };
  }

  handleShowResiberTicketDetail(params, rawInput) {
    this.state.viewedDtr = true;
    return {
      success: true,
      type: 'SHOW_RESIBER_TICKET_DETAIL',
      data: {
        rawInput,
        ticketNumber: params?.ticketNumber || '075-2533334760',
        email: params?.email || null,
        isIssued: !!this.state.issuedTicket || this.state.isTicketed
      }
    };
  }

  handleSplitPnr(params, rawInput) {
    this.state.splitPending = true;
    const paxList = params?.paxIndex || '1';
    return {
      success: true,
      type: 'SPLIT_PNR',
      data: { rawInput, paxList, message: 'SPLIT IN PROCESS - ENTER EF TO FILE SPLIT RECORD' }
    };
  }

  handleEndAndFileSplit(rawInput) {
    if (!this.state.splitPending) {
      return { success: false, error: 'NO SPLIT IN PROCESS - USE SP FIRST' };
    }
    this.state.splitPending = false;
    this.state.isSplitCompleted = true;
    this.state.childPnr = 'CHILD1';
    this.state.remarks.push({ id: this.state.remarks.length + 1, text: 'SPLIT TO PNR CHILD1' });
    return {
      success: true,
      type: 'END_AND_FILE_SPLIT',
      data: { rawInput, childPnr: 'CHILD1', message: 'SPLIT COMPLETED - CHILD PNR CREATED CHILD1' }
    };
  }

  handleShowFareQuoteDetails(params, rawInput) {
    this.state.viewedFqq = true;
    return {
      success: true,
      type: 'SHOW_FARE_QUOTE_DETAILS',
      data: { rawInput, tst: this.state.tst }
    };
  }
}
