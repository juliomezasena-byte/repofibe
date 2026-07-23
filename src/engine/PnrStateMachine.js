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
      viewedHelp: false
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
  process(parsedCommand, flightsCatalog = []) {
    if (!parsedCommand || !parsedCommand.success) {
      return { success: false, error: parsedCommand?.error || 'FORMAT ERROR' };
    }

    const { handler, params, rawInput } = parsedCommand;

    switch (handler) {
      case 'ENCODE_CITY':
        return this.handleEncodeCity(params, rawInput);

      case 'DECODE_CITY':
        return this.handleDecodeCity(params, rawInput);

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

      case 'SHOW_HELP':
        this.state.viewedHelp = true;
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

  handleAvailability(params, flightsCatalog) {
    const origin = params.origin || 'BOG';
    const destination = params.destination || 'MIA';
    const date = params.date || '25NOV';

    // Filtrar catálogo de vuelos por ruta
    let matches = flightsCatalog.filter(
      f => f.origin === origin && f.destination === destination
    );

    if (matches.length === 0) {
      // Vuelo sintético por defecto si no está en el JSON
      matches = [
        {
          line: 1,
          airline: 'AV',
          flightNumber: '0026',
          classes: { J: 4, Y: 9, M: 5 },
          origin,
          destination,
          departure: '08:15',
          arrival: '12:45',
          equipment: '788',
          priceUSD: 420
        }
      ];
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
    // Parser flexible de nombres
    const rawName = rawInput.replace(/^NM\d?/, '').trim();
    if (!rawName) {
      return { success: false, error: 'FORMAT ERROR - NAME' };
    }

    const newPassenger = {
      id: this.state.passengers.length + 1,
      name: rawName
    };

    this.state.passengers.push(newPassenger);
    return { success: true, passenger: newPassenger };
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
    const line = parseInt(params.lineNumber || '0', 10);
    if (!line) {
      return { success: false, error: 'CHECK LINE NUMBER' };
    }

    let deleted = false;
    // Mapear elementos por su orden visual en PNR
    // 1..passengers, then segments, then contacts
    let currentIndex = 1;

    for (let i = 0; i < this.state.passengers.length; i++) {
      if (currentIndex === line) {
        this.state.passengers.splice(i, 1);
        deleted = true;
        break;
      }
      currentIndex++;
    }

    if (!deleted) {
      for (let i = 0; i < this.state.segments.length; i++) {
        if (currentIndex === line) {
          this.state.segments.splice(i, 1);
          deleted = true;
          break;
        }
        currentIndex++;
      }
    }

    if (!deleted) {
      for (let i = 0; i < this.state.contacts.length; i++) {
        if (currentIndex === line) {
          this.state.contacts.splice(i, 1);
          deleted = true;
          break;
        }
        currentIndex++;
      }
    }

    if (!deleted) {
      return { success: false, error: 'CHECK LINE NUMBER' };
    }

    return { success: true, message: `ELEMENT ${line} CANCELLED` };
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

  handleEncodeCity(params, rawInput) {
    const query = rawInput.replace(/^DAN\s*/, '').trim().toUpperCase();
    const dictionary = {
      'LIMA': { code: 'LIM', city: 'LIMA', country: 'PERU' },
      'BOGOTA': { code: 'BOG', city: 'BOGOTA', country: 'COLOMBIA' },
      'MADRID': { code: 'MAD', city: 'MADRID', country: 'SPAIN' },
      'MIAMI': { code: 'MIA', city: 'MIAMI', country: 'UNITED STATES' },
      'MEXICO': { code: 'MEX', city: 'MEXICO CITY', country: 'MEXICO' },
      'BARCELONA': { code: 'BCN', city: 'BARCELONA', country: 'SPAIN' }
    };

    const match = dictionary[query] || { code: query.slice(0, 3), city: query, country: 'INTERNATIONAL' };
    return { success: true, type: 'ENCODE_CITY', data: match };
  }

  handleDecodeCity(params, rawInput) {
    const code = rawInput.replace(/^DAC\s*/, '').trim().toUpperCase();
    const dictionary = {
      'LIM': { code: 'LIM', name: 'LIMA / JORGE CHAVEZ INTL', country: 'PERU' },
      'BOG': { code: 'BOG', name: 'BOGOTA / EL DORADO INTL', country: 'COLOMBIA' },
      'MAD': { code: 'MAD', name: 'MADRID / ADOLFO SUAREZ BARAJAS', country: 'SPAIN' },
      'MIA': { code: 'MIA', name: 'MIAMI / MIAMI INTL', country: 'UNITED STATES' },
      'MEX': { code: 'MEX', name: 'MEXICO CITY / BENITO JUAREZ INTL', country: 'MEXICO' },
      'BCN': { code: 'BCN', name: 'BARCELONA / EL PRAT INTL', country: 'SPAIN' }
    };

    const match = dictionary[code] || { code, name: `${code} AIRPORT`, country: 'GLOBAL' };
    return { success: true, type: 'DECODE_CITY', data: match };
  }

  handleConvertCurrency(params, rawInput) {
    const amount = parseFloat(params.amount || '35');
    const from = params.fromCurrency || 'USD';
    const to = params.toCurrency || 'COP';

    // Tasas fijas sintéticas para simulación GDS
    const rates = {
      'USD_COP': 4150.0,
      'EUR_USD': 1.08,
      'USD_EUR': 0.92,
      'EUR_COP': 4480.0,
      'COP_USD': 0.00024
    };

    const key = `${from}_${to}`;
    const rate = rates[key] || 4150.0;
    const converted = (amount * rate).toFixed(2);

    return {
      success: true,
      type: 'CURRENCY_CONVERSION',
      data: {
        amount,
        fromCurrency: from,
        toCurrency: to,
        rate,
        convertedAmount: converted
      }
    };
  }

  handleSchedule(params, flightsCatalog) {
    const origin = params.origin || 'LIM';
    const destination = params.destination || 'COP';
    const date = params.date || '13MAR';

    let matches = flightsCatalog.filter(
      f => f.origin === origin && f.destination === destination
    );

    if (matches.length === 0) {
      matches = [
        {
          line: 1,
          airline: 'AV',
          flightNumber: '0142',
          origin,
          destination,
          departure: '10:30',
          arrival: '13:45',
          equipment: 'A320',
          stops: 0
        },
        {
          line: 2,
          airline: 'LA',
          flightNumber: '2410',
          origin,
          destination,
          departure: '17:10',
          arrival: '20:25',
          equipment: 'B789',
          stops: 0
        }
      ];
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
