/**
 * Catálogo de errores de terminal Amadeus/Resiber.
 *
 * Cuando el agente pega una pantalla con un error, el tutor tiene que
 * RECONOCERLO y decirle EXACTAMENTE cómo recuperarse. La regla de oro es la
 * misma que en el resto del tutor: el comando de solución sale del manual
 * VERBATIM. Aquí no se inventa sintaxis nueva — cada `solucion` es el remedio
 * documentado, tal cual, porque un comando inventado en una terminal de
 * emisión se traduce en algo que el agente le cobra (o le rompe) al pasajero.
 *
 * Esta lógica vivía inline en pantalla.js (detectarErrorPantalla). Se extrae
 * aquí como catálogo de datos para poder ampliarla sin tocar el lector de
 * pantallas: cada entrada es un objeto puro y `detectarError` recorre el
 * catálogo devolviendo el primero que casa.
 */

/**
 * El catálogo. Cada entrada:
 *   - codigo:  identificador estable para el tutor/telemetría.
 *   - patrones: fragmentos que aparecen en la pantalla (se comparan
 *               normalizados: mayúsculas y espacios colapsados).
 *   - error:   el mensaje de error tal como lo ve el agente.
 *   - causa:   por qué salió, en una frase.
 *   - solucion: el comando/acción del manual, VERBATIM.
 *   - procedimientoRecomendado: a qué procedimiento del árbol mandarlo.
 */
export const CATALOGO_ERRORES = [
  {
    codigo: 'ET_NOT_ISSUED',
    patrones: [
      'ET NOT ISSUED FOR SELECTED SEGMENT',
      'ET NOR ISSUED FOR SELECTED SEGMENT'
    ],
    error: 'ET NOT ISSUED FOR SELECTED SEGMENT',
    causa: 'El billete necesita revalidación antes de asociar el servicio.',
    solucion: 'Revalida el billete con TTP/ETRV/L#/S#-#/E#-#/RT',
    procedimientoRecomendado: 'asientos-seleccion-remision'
  },
  {
    codigo: 'ITINERARY_PRICING_REQUIRED',
    patrones: [
      'ITINERARY PRICING REQUIRED BEFORE SERVICE PRICING',
      'ITINERARY PRICING REQUIRED'
    ],
    error: 'ITINERARY PRICING REQUIRED',
    causa: 'Hay que cotizar a histórico antes de crear la máscara.',
    solucion: 'Cotiza a histórico primero: FXX/R,DOI,UP/L#-FAREBASIS',
    procedimientoRecomendado: 'asientos-seleccion-remision'
  },
  {
    codigo: 'NO_FARES_RBD',
    patrones: [
      'NO FARES/RBD/CARRIER/PASSENGER TYPE'
    ],
    error: 'NO FARES/RBD/CARRIER/PASSENGER TYPE',
    causa: 'La tarifa no está disponible para las clases seleccionadas.',
    solucion: 'Cambia las clases y reemplaza FXX por FXR en la cotización',
    procedimientoRecomendado: 'cambio-manual-sin-segmento-volado'
  },
  {
    codigo: 'SCREEN_DESTROYED',
    patrones: [
      'SCREEN DESTROYED',
      'SCREEN DESTROY'
    ],
    error: 'SCREEN DESTROYED',
    causa: 'La máscara de Resiber se cerró.',
    solucion: 'Sal del menú con F3 o reabre la máscara WEMD: WEMD:075-XXXXXXXXXX',
    procedimientoRecomendado: 'umnr-menor-no-acompanado'
  },
  {
    codigo: 'CHECK_CREDIT_CARD',
    patrones: [
      'CHECK CREDIT CARD'
    ],
    error: 'CHECK CREDIT CARD',
    causa: 'El billete tiene marca PCC (presentar tarjeta).',
    solucion: 'Si el titular no viaja y no puede presentar la tarjeta, aplica el Reembolso por NO PCC',
    procedimientoRecomendado: 'reembolso-motivos-especificos'
  },
  {
    codigo: 'SEAT_AT_CHECKIN_ONLY',
    patrones: [
      'SEAT ASSIGNMENT AT THE CHECK IN AIRPORT ONLY'
    ],
    error: 'SEAT ASSIGNMENT AT THE CHECK IN AIRPORT ONLY',
    causa: 'Ese vuelo solo asigna asiento en el aeropuerto.',
    solucion: 'Informa al pasajero que la selección de asiento se hace en el mostrador al hacer el Check-In',
    procedimientoRecomendado: 'asientos-seleccion-remision'
  }
];

/**
 * Normaliza para comparar sin depender de mayúsculas ni de cuántos espacios
 * (o saltos de línea) meta la terminal entre palabras.
 */
function normalizar(texto) {
  return String(texto).toUpperCase().replace(/\s+/g, ' ').trim();
}

/**
 * @param {string} texto  lo que el agente pegó, tal cual
 * @returns {{codigo, error, causa, solucion, procedimientoRecomendado} | null}
 */
export function detectarError(texto) {
  if (!texto || typeof texto !== 'string') return null;
  const t = normalizar(texto);
  for (const entrada of CATALOGO_ERRORES) {
    const casa = entrada.patrones.some((p) => t.includes(normalizar(p)));
    if (casa) {
      return {
        codigo: entrada.codigo,
        error: entrada.error,
        causa: entrada.causa,
        solucion: entrada.solucion,
        procedimientoRecomendado: entrada.procedimientoRecomendado
      };
    }
  }
  return null;
}

export default detectarError;
