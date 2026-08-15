/**
 * El puente entre "el alumno escribe en sus palabras" y "el árbol de decisión".
 *
 * El tutor conversacional NO le pregunta a la IA "¿cómo se resuelve esto?" —
 * eso reintroduce la alucinación que todo el sistema evita. En vez de eso,
 * traduce lo que el alumno escribe a una de las cuatro intenciones que el
 * árbol (arbol.js) ya sabe encaminar, y de ahí los comandos salen del manual.
 *
 * Es DETERMINISTA a propósito: un mapa de palabras, sin modelo. Si no está
 * seguro, devuelve null y el coach pregunta en vez de adivinar.
 */

// Cada intención con las palabras que un agente de verdad usa al describirla.
// El orden importa: se evalúan de la más específica a la más general.
const SEÑALES = [
  {
    intencion: 'agregar-docs',
    claves: ['agregar docs', 'agregar docs', 'documentos apis', 'datos del pasaporte', 'fecha de nacimiento', 'doca', 'doco', 'known traveller', 'global entry', 'visa o redress']
  },
  {
    intencion: 'transporte-ceniza',
    claves: ['ceniza', 'cenizas', 'urna funeraria', 'certificado de incineracion', 'certificado de incineración']
  },
  {
    intencion: 'casos-meda',
    claves: ['meda', 'valoracion medica', 'valoración médica', 'incad', 'hospitalizacion reciente', 'hospitalización reciente', 'escolta medica', 'escolta médica']
  },
  {
    intencion: 'formas-pago-latam',
    claves: ['formas de pago', 'tarjeta', 'tarjeta de credito', 'tarjeta de crédito', 'cuotas', 'franquicia', 'pcc']
  },
  {
    intencion: 'emision-reservas-on-hold',
    claves: ['emision de reservas on hold', 'emision de reserva on hold']
  },
  {
    intencion: 'emision-reservas-on-hold',
    claves: ['emitir reserva on hold', 'emitir la reserva on hold', 'emision reserva on hold', 'emisión reserva on hold', 'emitir dentro de 72 horas', 'pagar on hold', 'emitir el hold']
  },
  {
    intencion: 'on-hold-72h',
    claves: ['on hold', 'hold 72', 'mantener la reserva 72', 'reserva por 72 horas', 'pago inicial no reembolsable']
  },
  {
    intencion: 'comunicaciones-cortadas-latam',
    claves: ['comunicaciones cortadas latam']
  },
  {
    intencion: 'comunicaciones-cortadas-latam',
    claves: ['comunicacion cortada', 'comunicación cortada', 'cobro sin emision', 'cobro sin emisión', 'importe retenido sin billete', 'web cobro pero no emitio', 'web cobro pero no emitió', 'cobraron pero no emitieron', 'cobro pero no emitieron', 'cobro y no emision', 'cobro y no emisión']
  },
  {
    intencion: 'facturas-latam',
    claves: ['factura', 'facturación', 'facturacion', 'peticion factura', 'petición factura', 'comprobante fiscal', 'ruc']
  },
  {
    intencion: 'generalidades-latam',
    claves: ['generalidades', 'antes de iniciar cualquier proceso', 'filtro de seguridad', 'responsabilidad del billete', 'dna 075', 'dtr tn', 'estado de cupones']
  },
  {
    intencion: 'emision-colombia-cop',
    claves: [
      'reserva colombia cobrada en cop', 'colombia cop', 'bog001',
      'cobrada en cop', 'cobro en cop', 'pesos colombianos'
    ]
  },
  {
    intencion: 'descuento-panama',
    claves: [
      'descuento panama', 'pty001',
      'adulto mayor panama', 'jubilado panama'
    ]
  },
  {
    intencion: 'descuento-ecuador',
    claves: [
      'descuento ecuador', 'descuento pais ecuador', 'uio001',
      'descuento discapacidad', 'descuento discapacitado', 'descuento joven',
      'descuento adulto mayor ecuador'
    ]
  },
  {
    intencion: 'cambio',
    claves: [
      'fhe', 'fxi', 'etrv', 'fqp', 'ttm', 'ttk', 'revalidar', 'reemision',
      'reemision', 'cambio de vuelo'
    ]
  },
  {
    intencion: 'emision',
    claves: [
      'ayuda con an', 'ayudame con an', 'que significa an', 'comando an',
      'sn ', 'ss ', 'fxx', 'fxp', 'nm1', 'ape-', 'ap+', 'tkok', 'tkxl',
      'tqt', 'ibp-', 'iepj-', 'itr-', 'agregar nombres', 'nombre del pasajero',
      'datos de contacto', 'cotizar la reserva', 'cotizacion', 'tarifa'
    ]
  },
  {
    intencion: 'split',
    claves: ['split', 'separar pasajeros']
  },
  {
    intencion: 'maestro-split',
    claves: [
      '2 split', 'dos split', 'realizar 2 split', 'reserva 1', 'reserva 2', 'reserva 3',
      'super split', 'súper split', 'ejercicio maestro',
      'reserva solo adulto', 'reserva de chd'
    ]
  },
  {
    intencion: 'split',
    claves: [
      'split', 'separar', 'dividir', 'dividir reserva', 'separar pasajeros', 'dividir PNR', 'separar pasajero'
    ]
  },
  {
    intencion: 'correcion-de-nombre',
    claves: ['correccion de nombre', 'correccion nombre']
  },
  {
    intencion: 'correcion-de-nombre',
    claves: [
      'cambio de nombre', 'cambio nombre', 'corregir nombre', 'corrección de nombre',
      'correcion de nombre', 'error en el nombre', 'modificar nombre', 'nu1'
    ]
  },
  {
    intencion: 'pmr-silla-de-ruedas',
    claves: ['pasajero con movilidad reducida', 'movilidad reducida']
  },
  {
    intencion: 'pmr-silla-de-ruedas',
    claves: [
      'silla de ruedas', 'silla ruedas', 'wchr', 'wchc', 'wchs', 'pmr', 'pasajero discapacitado', 'discapacidad'
    ]
  },
  {
    intencion: 'comidas-equipajes-especiales',
    claves: [
      'comida', 'menu especial', 'menú especial', 'spml', 'vgml', 'ksml', 'equipaje especial',
      'equipo de golf', 'golf', 'bicicleta', 'bike', 'speq'
    ]
  },
  {
    intencion: 'reembolso',
    // Va antes que 'cambio': "quiere que le devuelvan el dinero del cambio"
    // es un reembolso, no un cambio.
    claves: [
      'reembolso', 'reembolsar', 'devolucion', 'devolución', 'devolver',
      'devuelvan', 'devuelvan', 'le regresen', 'plata de vuelta', 'refund',
      'anular y devolver', 'cancelar y devolver'
    ]
  },
  {
    intencion: 'servicio',
    claves: [
      'mascota', 'perro', 'gato', 'avih', 'petc', 'svan',
      'menor', 'umnr', 'no acompañado', 'sin acompañante',
      'equipaje', 'maleta', 'xbag', 'bulto', 'exceso de equipaje',
      'servicio especial', 'asistencia'
    ]
  },
  {
    intencion: 'cambio',
    claves: [
      'cambio', 'cambiar', 'cambiarle', 'modificar', 'mover el vuelo',
      'mover la fecha', 'cambiar fecha', 'cambiar la fecha', 'cambiar de fecha',
      'reprogramar', 'reagendar', 'adelantar el vuelo', 'aplazar',
      'otra fecha', 'otro vuelo', 'reemision', 'reemisión', 'reemitir',
      'involuntario', 'le cancelaron', 'cancelaron el vuelo'
    ]
  },
  {
    intencion: 'emision',
    claves: [
      'emitir', 'emision', 'emisión', 'comprar', 'compra', 'billete nuevo',
      'boleto nuevo', 'reserva nueva', 'reservar', 'vender', 'nueva reserva',
      'crear reserva', 'crear una reserva',
      'creame una reserva', 'creame reserva', 'hazme una reserva',
      'necesito una reserva', 'necesito reservar', 'necesito hacer una reserva',
      'quiero hacer una reserva', 'quiero una reserva', 'reserva de',
      'reserva desde', 'necesito un vuelo', 'quiero viajar', 'volar de',
      'monta una reserva', 'armame una reserva', 'prepara una reserva',
      'sacar un billete', 'sacar un tiquete', 'tiquete nuevo'
    ]
  }
];

/**
 * @param {string} texto  lo que el alumno escribió, en sus palabras
 * @returns {{intencion: string, comoLoSe: string} | null}
 */
export function detectarIntencion(texto) {
  if (!texto || typeof texto !== 'string') return null;
  // Las peticiones llegan con conjugaciones y acentos distintos:
  // "créame", "creame", "crear" y "necesito reservar" deben entrar en la
  // misma rama. La decisión sigue siendo determinista; solo normalizamos la
  // forma escrita antes de comparar señales.
  const limpio = ' ' + texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') + ' ';
  const comandos = [
    { intencion: 'emision', patrones: [/\b(?:an|sn)\s+\d{1,2}[a-z]{3}/i, /\bss\s*\d+/i, /\b(?:fxx|fxp|nm\d|ape-|ap\+|tkok|tkxl|tqt|ibp-|iepj-|itr-)/i] },
    { intencion: 'cambio', patrones: [/\b(?:fhe|fxi|etrv|fqp|ttm|ttk)\b/i, /revalidar/i, /reemisi[oó]n/i] },
    { intencion: 'split', patrones: [/\bsp\s*\d+/i, /\bsplit\b/i] }
  ];
  for (const grupo of comandos) {
    const golpe = grupo.patrones.find((patron) => patron.test(texto));
    if (golpe) return { intencion: grupo.intencion, comoLoSe: 'Lo deduje del comando o concepto técnico que escribiste.' };
  }

  for (const { intencion, claves } of SEÑALES) {
    const golpe = claves.find((k) => limpio.includes(k));
    if (golpe) {
      return { intencion, comoLoSe: `Lo deduje de que escribiste "${golpe}".` };
    }
  }
  return null;
}

/** ¿El texto es solo un saludo, sin caso dentro? */
export function esSaludo(texto) {
  if (!texto) return false;
  const t = texto.toLowerCase().trim();
  if (t.length > 40) return false; // un saludo no trae un caso pegado
  return /^(hola|buenas|buenos dias|buenos días|buenas tardes|buenas noches|hey|qué tal|que tal|holi|ey)\b/.test(t)
    && !detectarIntencion(texto);
}

/**
 * Extrae solo la composiciÃ³n de pasajeros cuando el alumno la escribe de
 * forma explÃ­cita. Si falta un tipo, no lo inventa.
 */
export function extraerPasajeros(texto) {
  if (!texto || typeof texto !== 'string') return null;
  const encontrados = { ADT: 0, CHD: 0, INF: 0 };
  const patron = /(?:^|[^\w])([0-9]+)\s*(ADT|ADULT(?:O|OS)?|CHD|CHILD(?:REN)?|INF|INFANTE(?:S)?)(?=$|[^\w])/giu;
  for (const m of texto.matchAll(patron)) {
    const tipo = m[2].toUpperCase();
    const clave = tipo.startsWith('AD') ? 'ADT' : tipo.startsWith('CH') ? 'CHD' : 'INF';
    encontrados[clave] += Number(m[1]);
  }
  const total = encontrados.ADT + encontrados.CHD + encontrados.INF;
  return total ? { ...encontrados, plazas: encontrados.ADT + encontrados.CHD, total } : null;
}

/**
 * Extrae únicamente datos explícitos de una petición de reserva.
 * No calcula fechas ni completa aeropuertos: si el usuario solo dice BOG,
 * devolvemos destino=BOG y el árbol seguirá pidiendo origen y fecha.
 */
export function extraerDatosDeReserva(texto) {
  if (!texto || typeof texto !== 'string') return {};
  const limpio = texto.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ' ');
  const datos = {};
  const iata = '[A-Z]{3}';

  // El agente suele decir ciudades, no códigos: "Madrid a Bogotá".
  // La conversión es un catálogo cerrado y explícito; no se le pide a Gemini
  // que adivine aeropuertos. Se amplía cuando los manuales/operación aporten
  // más ciudades frecuentes.
  const ciudades = [
    { codigo: 'MAD', nombres: ['MADRID'] },
    { codigo: 'BOG', nombres: ['BOGOTA'] },
    { codigo: 'BCN', nombres: ['BARCELONA'] },
    { codigo: 'LIM', nombres: ['LIMA'] },
    { codigo: 'MDE', nombres: ['MEDELLIN', 'MEDELLIN'] },
    { codigo: 'CLO', nombres: ['CALI'] },
    { codigo: 'UIO', nombres: ['QUITO'] },
    { codigo: 'MEX', nombres: ['MEXICO', 'CIUDAD DE MEXICO'] }
  ];
  const ciudadPorNombre = (valor) => ciudades.find((ciudad) => ciudad.nombres.includes(valor))?.codigo || null;
  const nombresCiudad = ciudades.flatMap((ciudad) => ciudad.nombres).join('|');
  const rutaPorCiudades = limpio.match(new RegExp(`\\b(?:DE|DESDE)\\s+(${nombresCiudad})\\s+(?:A|HASTA|HACIA)\\s+(${nombresCiudad})\\b`))
    || limpio.match(new RegExp(`\\bORIGEN\\s+(${nombresCiudad})\\s+(?:DESTINO|A|HACIA)\\s+(${nombresCiudad})\\b`));
  if (rutaPorCiudades) {
    datos.origen = ciudadPorNombre(rutaPorCiudades[1]);
    datos.destino = ciudadPorNombre(rutaPorCiudades[2]);
  } else {
    const ciudadesMencionadas = ciudades.filter((ciudad) => ciudad.nombres.some((nombre) =>
      new RegExp(`\\b${nombre}\\b`).test(limpio)
    ));
    if (ciudadesMencionadas.length === 2) {
      datos.origen = ciudadesMencionadas[0].codigo;
      datos.destino = ciudadesMencionadas[1].codigo;
    }
  }

  // Si hay separador, aceptamos MAD-BOG/MAD/BOG. Sin separador se procesa
  // abajo como MADBOG; exigirlo aquí evita partir MADRID en MAD-RID.
  const rutaCompacta = limpio.match(new RegExp(`\\b(${iata})\\s*[-/]\\s*(${iata})\\b`));
  const rutaConPalabras = limpio.match(new RegExp(`\\b(?:DE|DESDE)\\s+(${iata})\\s+(?:A|HASTA|HACIA)\\s+(${iata})\\b`));
  const codigosConocidos = new Set(ciudades.map((ciudad) => ciudad.codigo));
  const paresIata = [...limpio.matchAll(/\b([A-Z]{3})\s+([A-Z]{3})\b/g)];
  const parIataValido = paresIata.reverse().find((m) => codigosConocidos.has(m[1]) && codigosConocidos.has(m[2]))
    || (/(reserva|vuelo|viaj|origen|destino|desde|hacia)/i.test(limpio) ? paresIata[0] : null);
  // Una palabra natural como "CREAME" tiene seis letras y no es MADBOG.
  // La forma compacta solo es fiable junto a AN/SN o después de "de/desde";
  // en cualquier otro caso pedimos origen y destino explícitos.
  const rutaUnidaComando = limpio.match(/\b(?:AN|SN)\s+\d{1,2}[A-Z]{3}\s+([A-Z]{6})\b/);
  const rutaUnidaConFecha = limpio.match(/\b\d{1,2}[A-Z]{3}\s+([A-Z]{6})\b/);
  const rutaUnidaNatural = limpio.match(/\b(?:DE|DESDE)\s+([A-Z]{6})\b/);
  const rutaConFechaValida = rutaUnidaConFecha
    && codigosConocidos.has(rutaUnidaConFecha[1].slice(0, 3))
    && codigosConocidos.has(rutaUnidaConFecha[1].slice(3));
  const rutaUnida = rutaUnidaComando || (rutaConFechaValida ? rutaUnidaConFecha : null) || (rutaUnidaNatural && !ciudades.some((ciudad) => ciudad.nombres.includes(rutaUnidaNatural[1]))
    && !['PANAMA'].includes(rutaUnidaNatural[1])
    ? rutaUnidaNatural
    : null);
  const ruta = rutaCompacta || rutaConPalabras || parIataValido;
  if (ruta) {
    datos.origen = ruta[1];
    datos.destino = ruta[2];
  } else if (rutaUnida) {
    const compacta = rutaUnida[1];
    datos.origen = compacta.slice(0, 3);
    datos.destino = compacta.slice(3);
  } else {
    const destino = limpio.match(new RegExp(`\\b(?:A|HASTA|HACIA|PARA)\\s+(${iata})\\b`));
    if (destino) datos.destino = destino[1];
  }

  const fechaCorta = limpio.match(/\b(\d{1,2})\s*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\b/);
  const meses = { ENERO: 'JAN', FEBRERO: 'FEB', MARZO: 'MAR', ABRIL: 'APR', MAYO: 'MAY', JUNIO: 'JUN', JULIO: 'JUL', AGOSTO: 'AUG', SEPTIEMBRE: 'SEP', SETIEMBRE: 'SEP', OCTUBRE: 'OCT', NOVIEMBRE: 'NOV', DICIEMBRE: 'DEC' };
  const mesesNumericos = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const fechaNatural = limpio.match(new RegExp(`\\b(\\d{1,2})\\s+(?:DE\\s+)?(${Object.keys(meses).join('|')})\\b`));
  const fechaNumerica = limpio.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-]\d{2,4})?\b/);
  if (fechaCorta) datos.fecha = `${fechaCorta[1]}${fechaCorta[2]}`;
  else if (fechaNatural) datos.fecha = `${fechaNatural[1]}${meses[fechaNatural[2]]}`;
  else if (fechaNumerica && Number(fechaNumerica[2]) >= 1 && Number(fechaNumerica[2]) <= 12) {
    datos.fecha = `${fechaNumerica[1]}${mesesNumericos[Number(fechaNumerica[2]) - 1]}`;
  }

  return datos;
}

/** Detecta el mercado panameño sin convertirlo en elegibilidad automática. */
export function extraerContextoPanama(texto) {
  if (!texto || typeof texto !== 'string') return {};
  const limpio = texto.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (!/\bPANAMA\b|\bPTY001\b/.test(limpio)) return {};
  return {
    paisMercado: 'PANAMA',
    mercado: 'PTY001',
    ...(/\bUSD\b|DOLARES? AMERICANOS?/.test(limpio) ? { moneda: 'USD' } : {}),
    ...(/DESCUENTO|JUBILAD|ADULTO MAYOR|TERCERA EDAD|\b55\b|\b60\b/.test(limpio) ? { descuentoPais: true } : {})
  };
}

/** Detecta el mercado ecuatoriano sin convertirlo en elegibilidad automática. */
/** Detecta el mercado colombiano y su moneda de cobro sin asumir elegibilidad. */
export function extraerContextoColombia(texto) {
  if (!texto || typeof texto !== 'string') return {};
  const limpio = texto.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (!/\bCOLOMBIA\b|\bBOG001\b/.test(limpio)) return {};
  return {
    paisMercado: 'COLOMBIA',
    mercado: 'BOG001',
    ...( /\bCOP\b|PESOS? COLOMBIANOS?/.test(limpio) ? { moneda: 'COP', cobroCOP: true } : {})
  };
}

export function extraerContextoEcuador(texto) {
  if (!texto || typeof texto !== 'string') return {};
  const limpio = texto.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (!/\bECUADOR\b|\bUIO001\b/.test(limpio)) return {};
  const descuentoTipo = /DISCAPAC|CONADIS/.test(limpio)
    ? 'discapacidad'
    : /JOVEN|12\s*A\s*24|12\s*[-A]\s*24/.test(limpio)
      ? 'joven'
      : /ADULTO MAYOR|TERCERA EDAD|65\s*A[NÑ]OS?/.test(limpio)
        ? 'adulto-mayor'
        : null;
  return {
    paisMercado: 'ECUADOR',
    mercado: 'UIO001',
    ...( /\bUSD\b|DOLARES? AMERICANOS?/.test(limpio) ? { moneda: 'USD' } : {}),
    ...(descuentoTipo ? { descuentoPais: true, descuentoTipo } : {})
  };
}

/** Encuentra una transacción completa mencionada dentro de una duda. */
export function extraerComandoEscrito(texto) {
  if (!texto || typeof texto !== 'string') return null;
  const patrones = [
    /\b(?:AN|SN)\s+\d{1,2}[A-Z]{3}\s+[A-Z]{6}(?:\s*\*\s*\d{1,2}[A-Z]{3})?/i,
    /\bSS\s+\d+\s+[A-Z]\s+\d+/i,
    /\b(?:FXX|FXP|FXI|FQP|FQD|TTP|ETRV|TTO|TMC|TMI|FHE|FOL|FOINF|XE|SP|NM|NU|SR|AP[+M]?|TKOK|ER|IR|TQT|IBP|IEPJ|ITR)\b[^\n]*/i
  ];
  for (const patron of patrones) {
    const encontrado = texto.match(patron)?.[0]?.trim();
    if (encontrado && encontrado.length > 2) return encontrado;
  }
  return null;
}

export default detectarIntencion;
