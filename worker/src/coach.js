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
    claves: [
      'cambio de nombre', 'cambio nombre', 'corregir nombre', 'corrección de nombre',
      'correcion de nombre', 'error en el nombre', 'modificar nombre', 'nu1'
    ]
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
  const limpio = ' ' + texto.toLowerCase().normalize('NFC') + ' ';

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

export default detectarIntencion;
