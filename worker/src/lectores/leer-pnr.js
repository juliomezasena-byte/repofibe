/**
 * Lee una pantalla de PNR y saca pasajeros, segmentos y elementos.
 *
 * Entiende los DOS formatos, que se parecen pero no son iguales:
 *
 *   Amadeus:  4 IB 156 L 15JUN 7 BOGMAD HK3  1  1320 0600+1 *1A/E*
 *   Resiber:  3. IB118 A 20AUG SCLMAD TK2 1040 0520+1ET
 *
 * En Amadeus la aerolínea y el vuelo van SEPARADOS y hay día de la semana;
 * en Resiber van pegados y no lo hay. Se detecta solo.
 *
 * Las expresiones están calibradas contra PANTALLAS REALES (ver
 * test-lectores.js). Un parser genérico escrito sin ese corpus devuelve
 * cero segmentos: se probó.
 *
 * Lo que más importa es el ESTADO del segmento: un TK o un UN cambia por
 * completo lo que se le puede ofrecer al pasajero.
 */

// Amadeus:  RP/MADIB0900/MADIB0900   MR/SU 13AUG24/1925Z  M2SZ8E
const RE_CAB_AMADEUS = /^RP\/(\S+?)\/(\S+)\s+.*?\s([A-Z0-9]{6})\s*$/m;
// Resiber:  KFQQV/RP/MADIB/KFQQV/SCL175/75991053/SCL/IB/A/CL//SU
const RE_CAB_RESIBER = /^([A-Z0-9]{5,6})\/RP\/([^/]+)\//m;

const RE_ROTULO = /^-([A-Z]+)\s+PNR-\s*$/m;
const RE_INDICADORES = /^-{2,}\s*([A-Z ]+?)\s*-{2,}\s*$/m;
// * SP 13AUG/MRSU/MADIB0900-M2Q5RT   → el PNR nuevo tras un split
const RE_SPLIT = /^\s*\*\s*SP\s+\S+\/\S+\/\S+-([A-Z0-9]{6})\s*$/m;

/** 1.WWW/DANIEL(ADT)   ·   2.GARCIABRAVO/CONSUELOISIDORA */
const RE_PASAJERO = /(\d{1,2})\.([A-Z][A-Z ]*\/[A-Z][A-Z ]*?)(?:\(([^)]*)\))?(?=\s{2,}\d{1,2}\.|\s+\d{1,2}\.|\s*$)/g;

/**
 * Segmento, en cualquiera de los dos formatos.
 *  1: línea · 2: aerolínea · 3: vuelo · 4: clase · 5: fecha
 *  6: día de semana (solo Amadeus) · 7: ruta · 8: estado · 9: nº plazas
 * 10: resto (terminal, horas, sufijo)
 */
const RE_SEGMENTO =
  /^\s*(\d{1,2})\.?\s+([A-Z]{2})\s?(\d{2,4})\s+([A-Z])\s+(\d{1,2}[A-Z]{3})\s+(?:(\d)\s+)?([A-Z]{6})\s+([A-Z]{2})(\d+)\s+(.*)$/;

/** Horas dentro del resto del segmento: 1320 0600+1 */
const RE_HORAS = /(\d{4})\s+(\d{4})(\+\d)?/;

/**
 * Elementos con código de dos o tres letras.
 * Amadeus separa el número con espacio (" 10 FA PAX …") y Resiber lo pega
 * con un punto ("13.SSR TKNE …"), así que se admiten las dos formas.
 */
const RE_ELEMENTO = /^\s*(\d{1,2})(?:\.\s*|\s+)(AP[EM]?|TK|SSR|OSI|FA|FB|FE|FP|FV|FO|RM|CT\/P|OND INFO)\b\s*(.*)$/;

const ESTADOS = {
  HK: 'confirmado',
  TK: 'itinerario modificado o vuelo sugerido',
  UN: 'cancelado',
  HN: 'pendiente de confirmar',
  NN: 'solicitado',
  LK: 'confirmado (histórico)',
  HL: 'en lista de espera'
};

export function leerPnr(texto) {
  if (!texto || typeof texto !== 'string') {
    return { pasajeros: [], segmentos: [], elementos: [], billetes: [], avisos: ['No se recibió texto que leer.'] };
  }

  const lineas = texto.split(/\r?\n/);
  const p = {
    fuente: null,
    localizador: null,
    oficina: null,
    rotulo: null,
    indicadores: [],
    pnrHermano: null,
    pasajeros: [],
    segmentos: [],
    elementos: [],
    billetes: [],
    avisos: []
  };

  const ca = texto.match(RE_CAB_AMADEUS);
  const cr = texto.match(RE_CAB_RESIBER);
  if (ca) { p.fuente = 'amadeus'; p.oficina = ca[1]; p.localizador = ca[3]; }
  else if (cr) { p.fuente = 'resiber'; p.localizador = cr[1]; p.oficina = cr[2]; }

  const rot = texto.match(RE_ROTULO); if (rot) p.rotulo = rot[1];
  const ind = texto.match(RE_INDICADORES);
  if (ind) p.indicadores = ind[1].split(/\s+/).filter(Boolean);
  const spl = texto.match(RE_SPLIT); if (spl) p.pnrHermano = spl[1];

  for (const linea of lineas) {
    // Segmentos
    const s = linea.match(RE_SEGMENTO);
    if (s) {
      const horas = (s[10] || '').match(RE_HORAS);
      p.segmentos.push({
        linea: Number(s[1]),
        aerolinea: s[2],
        vuelo: s[3],
        clase: s[4],
        fecha: s[5],
        diaSemana: s[6] ? Number(s[6]) : null,
        origen: s[7].slice(0, 3),
        destino: s[7].slice(3, 6),
        estado: s[8],
        estadoTexto: ESTADOS[s[8]] || null,
        plazas: Number(s[9]),
        salida: horas ? horas[1] : null,
        llegada: horas ? horas[2] : null,
        llegaDiaSiguiente: horas && horas[3] ? Number(horas[3].slice(1)) : 0
      });
      continue;
    }

    // Elementos
    const e = linea.match(RE_ELEMENTO);
    if (e) {
      p.elementos.push({ linea: Number(e[1]), codigo: e[2], contenido: (e[3] || '').trim() });
      const fa = e[2] === 'FA' && e[3].match(/(\d{3}-\d{7,})/);
      if (fa) p.billetes.push({ numero: fa[1], elemento: 'FA', linea: Number(e[1]) });
      const tkne = e[2] === 'SSR' && /TKNE/.test(e[3]) && e[3].match(/(\d{13})C(\d)\/P(\d)/);
      if (tkne) p.billetes.push({ numero: tkne[1], cupon: Number(tkne[2]), pasajero: Number(tkne[3]), elemento: 'SSR TKNE', linea: Number(e[1]) });
      continue;
    }

    // Pasajeros — pueden ir varios en la misma línea
    if (/^\s*\d{1,2}\.[A-Z]/.test(linea) && /\//.test(linea) && !RE_ELEMENTO.test(linea)) {
      RE_PASAJERO.lastIndex = 0;
      let m;
      while ((m = RE_PASAJERO.exec(linea)) !== null) {
        const tipo = m[3] || null;
        const inf = tipo && tipo.startsWith('INF');
        p.pasajeros.push({
          n: Number(m[1]),
          nombre: m[2].trim(),
          tipo: tipo ? (inf ? 'ADT' : tipo.split('/')[0]) : 'ADT',
          fechaNacimiento: tipo && tipo.includes('/') ? tipo.split('/')[1] : null,
          infanteAsociado: inf ? tipo.replace(/^INF/, '') : null
        });
      }
    }
  }

  // Avisos: lo que cambia la decisión
  const modificados = p.segmentos.filter((s) => s.estado === 'TK');
  const cancelados = p.segmentos.filter((s) => s.estado === 'UN');
  if (modificados.length) {
    p.avisos.push(
      `${modificados.length} segmento(s) en TK (itinerario modificado): línea(s) ${modificados.map((s) => s.linea).join(', ')}. ` +
      'Puede ser un cambio INVOLUNTARIO — comprobar el histórico con RHA antes de cobrar nada.'
    );
  }
  if (cancelados.length) {
    p.avisos.push(
      `${cancelados.length} segmento(s) en UN (cancelado): línea(s) ${cancelados.map((s) => s.linea).join(', ')}. ` +
      'Cambio involuntario: el pasajero puede elegir entre cambio, bono o reembolso.'
    );
  }
  if (!p.segmentos.length) p.avisos.push('No se reconoció ningún segmento. ¿Es una pantalla de PNR?');

  return p;
}

/** Alias por compatibilidad con quien lo importe en mayúsculas. */
export const leerPNR = leerPnr;
export default leerPnr;
