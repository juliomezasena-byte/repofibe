/**
 * Lee una pantalla AN/SN de Amadeus sin escoger un vuelo por el alumno.
 *
 * La disponibilidad es contexto de trabajo: sirve para no volver a pedir AN
 * y para ofrecer las lÃ­neas/clases realmente visibles. Nunca convierte una
 * clase en una venta hasta que el alumno la selecciona.
 */

function clasesDe(texto) {
  return [...String(texto || '').matchAll(/(?:^|\s)([A-Z])([0-9A])(?=\s|$)/g)]
    .map((m) => ({ clase: m[1], cupos: m[2] === 'A' ? '9+' : Number(m[2]) }))
    .filter((c) => c.cupos !== 0);
}

/** @returns {{tipo:'disponibilidad', disponibilidad: object, avisos: string[]}|null} */
export function leerDisponibilidad(texto) {
  if (!texto || !/(?:\*\*\s*IBERIA\s*-\s*(?:AN|SN)\s*\*\*|^\s*\d+\s+IB\s+\d+)/im.test(texto)) {
    return null;
  }

  const consulta = /\bIBERIA\s*-\s*(AN|SN)\b/i.exec(texto)?.[1]?.toUpperCase() || 'AN';
  const fecha = /\b(\d{1,2}[A-Z]{3})\b/i.exec(texto)?.[1]?.toUpperCase() || null;
  const vuelos = [];

  for (const linea of String(texto).split(/\r?\n/)) {
    const m = /^\s*(\d+)\s+([A-Z0-9]{2})\s+(\d+)\s+(.+?)\s+\/([A-Z]{3})\d[A-Z]\s+([A-Z]{3})\s+\d+\s+(\d{4})\s+(\d{4})/i.exec(linea);
    if (!m) continue;
    const clases = clasesDe(m[4]);
    if (!clases.length) continue;
    vuelos.push({
      linea: Number(m[1]),
      aerolinea: m[2].toUpperCase(),
      vuelo: m[3],
      origen: m[5].toUpperCase(),
      destino: m[6].toUpperCase(),
      salida: m[7],
      llegada: m[8],
      clases
    });
  }

  if (!vuelos.length) return null;
  return {
    tipo: 'disponibilidad',
    disponibilidad: { sistema: 'amadeus', consulta, fecha, vuelos },
    avisos: [`LeÃ­ una pantalla ${consulta} con ${vuelos.length} vuelo(s) y sus clases disponibles.`]
  };
}

export default leerDisponibilidad;
