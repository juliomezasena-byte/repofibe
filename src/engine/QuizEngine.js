/**
 * QuizEngine.js
 * Generador de preguntas de teoría GDS (idea de Juan Pablo).
 * Las preguntas se GENERAN desde los catálogos existentes (commands_meta,
 * locations, flights) — cero contenido manual, nunca se desincroniza.
 * Determinista por semilla: mismo seed => mismo quiz (testeable).
 */

// PRNG mulberry32 — pequeño, determinista, suficiente para barajar preguntas.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Banco estático de sintaxis (formatos del manual con distractores plausibles)
const SYNTAX_BANK = [
  {
    prompt: 'Vender 3 puestos en clase J del vuelo 3. ¿Cuál es el comando correcto?',
    correct: 'SS3J3',
    distractors: ['SSJ33', 'SS33J', 'J3SS3']
  },
  {
    prompt: 'Consultar los vuelos del 12 de abril de Ciudad de México a Santo Domingo. ¿Cuál es correcto?',
    correct: 'SN 12 APR MEX SDQ',
    distractors: ['SN MEX SDQ 12 APR', 'SN 12 APR SDQ MEX', 'SN APR 12 MEX SDQ']
  },
  {
    prompt: 'Convertir 35 dólares de gastos de gestión a pesos dominicanos. ¿Cuál es correcto?',
    correct: 'FQC 35USD/DOP',
    distractors: ['FQC DOP/35USD', 'FQC USD35/DOP', 'FQC 35DOP/USD']
  },
  {
    prompt: 'Registrar al pasajero adulto Carlos García. ¿Cuál es el formato correcto?',
    correct: 'NM1GARCIA/CARLOS MR',
    distractors: ['NM1CARLOS/GARCIA MR', 'NM1 MR GARCIA/CARLOS', 'NMGARCIA/CARLOS 1MR']
  },
  {
    prompt: 'Fijar el plazo de confirmación para el 24 de julio. ¿Cuál es correcto?',
    correct: 'TKXL 24JUL',
    distractors: ['TK 24JUL XL', 'TKXL JUL24', 'XLTK 24JUL']
  },
  {
    prompt: 'Borrar las celdas 4, 5 y 6 del PNR de una sola vez. ¿Cuál es correcto?',
    correct: 'XE4-6',
    distractors: ['XE4,5', 'XE 4 A 6', 'XE456']
  }
];

// Banco de flujo del manual (qué comando sigue en el proceso de clase)
const FLOW_BANK = [
  {
    prompt: 'Después de facturar las tarifas con FXX, ¿con qué comando sumas el valor total del vuelo?',
    correct: 'DF',
    distractors: ['RM', 'FQC', 'TTP']
  },
  {
    prompt: 'Después de calcular el total con DF, ¿dónde registras los valores por pasajero y el total?',
    correct: 'RM',
    distractors: ['OS', 'SR', 'DF']
  },
  {
    prompt: '¿Qué comando ejecutas ANTES de vender puestos con SS?',
    correct: 'SN',
    distractors: ['ER', 'RM', 'TTP']
  },
  {
    prompt: 'Ya tienes el nombre de la ciudad pero necesitas su código IATA. ¿Qué comando usas?',
    correct: 'DAN',
    distractors: ['DAC', 'DF', 'SN']
  },
  {
    prompt: 'Al terminar toda la gestión, ¿con qué comando guardas la reserva?',
    correct: 'ER',
    distractors: ['IG', 'SO', 'RT']
  },
  {
    prompt: 'El cliente pregunta si su tiquete permite cambios o reembolsos. ¿Qué comando consultas?',
    correct: 'FQN1*PE',
    distractors: ['FXX', 'DF', 'RM']
  }
];

export class QuizEngine {
  constructor({ commands = [], locations = [], flights = [] } = {}) {
    this.commands = commands.filter((c) => c.description && c.name);
    this.locations = locations;
    this.flights = flights;
  }

  static TYPES = ['cmd-func', 'func-cmd', 'iata-city', 'city-iata', 'syntax', 'rbd', 'flow'];

  // Tips de "cómo se usa" para los comandos que más confunden (idea de Juan
  // Pablo: que la explicación diga cómo se usa, no solo qué es).
  static get USAGE_TIPS() {
    return {
      SN: 'Recuerda el orden: FECHA + ORIGEN + DESTINO. No inviertas los IATA.',
      AN: 'Igual que SN pero muestra clases abiertas. Ojo con el orden ORIGEN→DESTINO.',
      SS: 'Se lee: NRO_PASAJEROS + CLASE + NRO_VUELO. Ej: SS1Y1 = 1 puesto, clase Y, vuelo 1.',
      NM: 'El número va DESPUÉS de NM: NM1APELLIDO/NOMBRE. El niño lleva (CHD/fecha), el infante (INF...).',
      FQC: 'La emisión va en USD y se convierte a la moneda del país del cliente. Ej: FQC 35USD/DOP.',
      FXX: 'Factura por tipo de pasajero (ADT/CHD/INF) en la moneda de la OFICINA (el último dato tras la coma).',
      FXP: 'Como FXX pero GUARDA la tarifa (crea el TST) para poder emitir.',
      DF: 'Suma todas las tarifas. Usa * para multiplicar (valor*cantidad) y ; para separar.',
      RM: 'Nota libre. Se usa para el desglose por pasajero, el total y la política de reembolso.',
      DAN: 'Nombre de ciudad → código IATA. Ej: DAN MEXICO → MEX.',
      DAC: 'Código IATA → nombre de ciudad. Ej: DAC MEX → CIUDAD DE MEXICO.',
      RF: 'Recibido De: quién solicita la reserva. Es OBLIGATORIO para cerrar con ER.',
      ER: 'Cierra y guarda el PNR. Antes necesitas nombre, itinerario, teléfono, TK y RF.',
      XE: 'Borra líneas: XE1 (una), XE1-3 (rango), XE4,8 (lista).'
    };
  }

  explainCommand(cmd) {
    const partes = [`${cmd.code} — ${cmd.name}: ${cmd.description}`];
    if (cmd.syntax && cmd.syntax.length) partes.push(`SINTAXIS: ${cmd.syntax[0]}`);
    if (cmd.examples && cmd.examples.length) partes.push(`EJEMPLO: ${cmd.examples[0]}`);
    const tip = QuizEngine.USAGE_TIPS[cmd.code];
    if (tip) partes.push(`💡 ${tip}`);
    return partes.join('\n');
  }

  pick(arr, rnd) {
    return arr[Math.floor(rnd() * arr.length)];
  }

  shuffle(arr, rnd) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /** Arma opciones únicas (correcta + 3 distractores) y las baraja. */
  buildOptions(correct, distractorPool, rnd) {
    const options = [correct];
    const pool = this.shuffle(distractorPool.filter((d) => d && d !== correct), rnd);
    for (const d of pool) {
      if (options.length >= 4) break;
      if (!options.includes(d)) options.push(d);
    }
    const shuffled = this.shuffle(options, rnd);
    return { options: shuffled, correctIndex: shuffled.indexOf(correct) };
  }

  generateQuestion(type, rnd) {
    switch (type) {
      case 'cmd-func': {
        const cmd = this.pick(this.commands, rnd);
        const sameCat = this.commands.filter((c) => c.code !== cmd.code && c.category === cmd.category);
        const others = this.commands.filter((c) => c.code !== cmd.code);
        const pool = (sameCat.length >= 3 ? sameCat : others).map((c) => c.description);
        const { options, correctIndex } = this.buildOptions(cmd.description, pool, rnd);
        return {
          type,
          prompt: `¿Para qué sirve el comando ${cmd.code}?`,
          options,
          correctIndex,
          explain: this.explainCommand(cmd)
        };
      }

      case 'func-cmd': {
        const cmd = this.pick(this.commands, rnd);
        const pool = this.commands.filter((c) => c.code !== cmd.code).map((c) => c.code);
        const { options, correctIndex } = this.buildOptions(cmd.code, pool, rnd);
        return {
          type,
          prompt: `¿Qué comando usas para esto?: "${cmd.description}"`,
          options,
          correctIndex,
          explain: this.explainCommand(cmd)
        };
      }

      case 'iata-city': {
        const loc = this.pick(this.locations, rnd);
        const pool = this.locations.filter((l) => l.city !== loc.city).map((l) => l.city);
        const { options, correctIndex } = this.buildOptions(loc.city, pool, rnd);
        return {
          type,
          prompt: `¿Qué ciudad corresponde al código IATA ${loc.code}?`,
          options,
          correctIndex,
          explain: `${loc.code} = ${loc.name} (${loc.country})`
        };
      }

      case 'city-iata': {
        const loc = this.pick(this.locations, rnd);
        // Distractores de OTRAS ciudades (WAS/IAD/DCA son todas Washington)
        const pool = this.locations.filter((l) => l.city !== loc.city).map((l) => l.code);
        const { options, correctIndex } = this.buildOptions(loc.code, pool, rnd);
        return {
          type,
          prompt: `¿Cuál es un código IATA de ${loc.city}?`,
          options,
          correctIndex,
          explain: `${loc.city} → ${loc.code} (${loc.name})`
        };
      }

      case 'syntax': {
        const item = this.pick(SYNTAX_BANK, rnd);
        const { options, correctIndex } = this.buildOptions(item.correct, item.distractors, rnd);
        return {
          type,
          prompt: item.prompt,
          options,
          correctIndex,
          explain: `Formato correcto: ${item.correct}`
        };
      }

      case 'rbd': {
        const flight = this.pick(this.flights, rnd);
        const entries = Object.entries(flight.classes || { Y: 9 });
        const abiertas = entries.filter(([, v]) => typeof v === 'number' && v > 0);
        const cerradas = entries.filter(([, v]) => v === 'C');
        const preguntarCerrada = cerradas.length > 0 && rnd() < 0.5;

        if (preguntarCerrada) {
          const [letra] = this.pick(cerradas, rnd);
          const correct = 'La clase está cerrada (no se puede vender)';
          const { options, correctIndex } = this.buildOptions(correct, [
            'Clase confirmada',
            'Cabina C (Business)',
            'Quedan C puestos'
          ], rnd);
          return {
            type,
            prompt: `En la escalera del vuelo ${flight.airline}${flight.flightNumber} aparece "${letra}C". ¿Qué significa la C?`,
            options,
            correctIndex,
            explain: `Una letra seguida de C = clase CERRADA. Solo se venden clases con número (puestos disponibles).`
          };
        }

        const [letra, puestos] = this.pick(abiertas, rnd);
        const correct = `Hay ${puestos} puesto(s) disponibles en clase ${letra}`;
        const { options, correctIndex } = this.buildOptions(correct, [
          `La clase ${letra} está cerrada`,
          `El vuelo hace ${puestos} escalas`,
          `Faltan ${puestos} días para el vuelo`
        ], rnd);
        return {
          type,
          prompt: `En la escalera del vuelo ${flight.airline}${flight.flightNumber} aparece "${letra}${puestos}". ¿Qué significa?`,
          options,
          correctIndex,
          explain: `Letra + número = clase abierta con esa cantidad de puestos. ${letra}${puestos} = ${puestos} puesto(s) en ${letra}.`
        };
      }

      case 'flow': {
        const item = this.pick(FLOW_BANK, rnd);
        const { options, correctIndex } = this.buildOptions(item.correct, item.distractors, rnd);
        return {
          type,
          prompt: item.prompt,
          options,
          correctIndex,
          explain: `Respuesta: ${item.correct}`
        };
      }

      default:
        return null;
    }
  }

  /**
   * Genera un quiz de n preguntas variadas. Mismo seed => mismo quiz.
   */
  generateQuiz(count = 10, seed = Date.now()) {
    const rnd = mulberry32(seed);
    const questions = [];
    const types = QuizEngine.TYPES;
    let guard = 0;

    while (questions.length < count && guard < count * 20) {
      guard++;
      const type = types[questions.length % types.length];
      const q = this.generateQuestion(type, rnd);
      if (!q || q.options.length < 4 || q.correctIndex < 0) continue;
      // Evitar prompts repetidos en el mismo quiz
      if (questions.some((x) => x.prompt === q.prompt)) continue;
      q.id = questions.length + 1;
      questions.push(q);
    }
    return questions;
  }
}
