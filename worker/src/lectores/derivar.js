/**
 * Cruza los hechos leídos de una pantalla con las tablas del material.
 *
 * Aquí vive el razonamiento que el bot corporativo se saltó con el billete
 * de GARCIABRAVO: leer el fare basis, sacar la familia, y de ahí saber si el
 * billete es reembolsable — sin cotizar nada.
 *
 * Nada de esto necesita un modelo de lenguaje.
 */

// Las tablas vienen del bundle, no del disco: Cloudflare Workers no tiene
// sistema de ficheros. `sync-procedimientos.mjs` las mete ahí desde
// public/procedimientos/, que sigue siendo la única fuente de verdad.
import material from '../procedimientos.generated.json' with { type: 'json' };

const beneficios = material['_tipos-de-tarifas-beneficios'];
const cabinas = material['_gama-tarifas-cabinas'];

const MESES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** Estados de cupón que significan "ya usado". */
const ESTADOS_VOLADOS = ['USED', 'BOARDED', 'FLOWN', 'LIFTED', 'CHECKED IN'];

/**
 * Familia tarifaria a partir del fare basis.
 * Regla de #3590: la ÚLTIMA LETRA manda. AON4NQM7 → M → OPTIMA.
 */
export function familiaDeFareBasis(fareBasis) {
  if (!fareBasis) return null;
  const letras = String(fareBasis).toUpperCase().replace(/[^A-Z]/g, '');
  const ultima = letras.slice(-1);
  const mapa = { B: 'BASIC', M: 'OPTIMA', U: 'COMFORT', S: 'FLEX', Y: 'FLEX' };
  const familia = mapa[ultima] || null;
  return familia
    ? { familia, letra: ultima, regla: '#3590 — la última letra del fare basis da la familia' }
    : { familia: null, letra: ultima, aviso: `La última letra "${ultima}" no está en la tabla de #3590 (B/M/U/S/Y).` };
}

/** Cabina a partir de la clase del segmento. */
export function cabinaDeClase(clase) {
  if (!clase) return null;
  for (const c of cabinas.cabinas.mapa) {
    if (c.clases.includes(clase.toUpperCase())) {
      return {
        cabina: c.cabina,
        esAvios: (cabinas.cabinas.clasesAvios?.clases?.[c.cabina] || []).includes(clase.toUpperCase())
      };
    }
  }
  return { cabina: null, aviso: `La clase "${clase}" no está en el diagrama de cabinas. Aparece en pantalla AN pero no en el material (caso de F y Z).` };
}

/** Derechos de la familia: ¿reembolsable? ¿el cambio lleva penalidad? */
export function derechosDeFamilia(familia, radio = null) {
  if (!familia) return null;
  const candidatas = beneficios.tabla.familias.filter((f) =>
    f.tarifa === familia || f.tarifa.startsWith(familia + ' ')
  );
  if (!candidatas.length) return null;

  // COMFORT y BUSCOMFORT se comportan distinto según el radio
  if (candidatas.length > 1) {
    if (!radio) {
      return {
        ambiguo: true,
        motivo: `${familia} se comporta distinto según el radio y no se ha podido determinar cuál es.`,
        opciones: candidatas
      };
    }
    const largo = radio === 'LARGO';
    const elegida = candidatas.find((f) => (largo ? /LARGO/.test(f.tarifa) : /CORTO/.test(f.tarifa)));
    if (elegida) return elegida;
  }
  return candidatas[0];
}

function aFecha(ddmmm, anioRef) {
  const m = String(ddmmm || '').match(/^(\d{1,2})([A-Z]{3})$/);
  if (!m || MESES.indexOf(m[2]) < 0) return null;
  return new Date(anioRef, MESES.indexOf(m[2]), Number(m[1]));
}

/**
 * Analiza un billete ya leído y devuelve lo que hace falta para decidir.
 * @param {object} billete  salida de leerBillete()
 * @param {Date}   hoy      para poder testear con una fecha fija
 */
export function analizarBillete(billete, hoy = new Date()) {
  const out = {
    placa: billete.placa,
    aerolinea: billete.placa === '075' ? 'Iberia' : billete.placa === '060' ? 'Iberia Express' : null,
    doi: billete.doi,
    algunSegmentoVolado: false,
    cupones: [],
    familia: null,
    reembolsable: null,
    avisos: []
  };

  for (const c of billete.cupones) {
    const volado = ESTADOS_VOLADOS.some((e) => c.estado.toUpperCase().includes(e));
    const fam = familiaDeFareBasis(c.fareBasis);
    const cab = cabinaDeClase(c.clase);
    const fecha = aFecha(c.fecha, hoy.getFullYear());
    const dias = fecha ? Math.round((fecha - hoy) / 86400000) : null;

    out.cupones.push({
      n: c.n,
      ruta: `${c.origen}-${c.destino || '?'}`,
      vuelo: `${c.aerolinea}${c.vuelo}`,
      clase: c.clase,
      cabina: cab?.cabina,
      esAvios: cab?.esAvios,
      fecha: c.fecha,
      diasHastaElVuelo: dias,
      fareBasis: c.fareBasis,
      familia: fam?.familia,
      estado: c.estado,
      volado
    });
    if (volado) out.algunSegmentoVolado = true;
  }

  // La familia del billete: la del primer cupón que la tenga
  const conFamilia = out.cupones.find((c) => c.familia);
  if (conFamilia) {
    out.familia = conFamilia.familia;
    const distintas = new Set(out.cupones.map((c) => c.familia).filter(Boolean));
    if (distintas.size > 1) {
      out.avisos.push(`Los cupones tienen familias DISTINTAS (${[...distintas].join(', ')}). Cotizar cupón a cupón.`);
    }
    const d = derechosDeFamilia(out.familia);
    if (d && !d.ambiguo) {
      out.reembolsable = d.reembolso === 'PERMITIDO';
      out.derechos = { cambio: d.cambio, reembolso: d.reembolso, asiento: d.asiento, equipajeBodega: d.equipajeBodega };
    } else if (d?.ambiguo) {
      out.avisos.push(d.motivo);
    }
  }

  // Ventana de 48 h — la que parte el procedimiento de involuntarios
  const proximo = out.cupones.filter((c) => !c.volado && c.diasHastaElVuelo !== null)
    .sort((a, b) => a.diasHastaElVuelo - b.diasHastaElVuelo)[0];
  if (proximo) {
    out.diasHastaElProximoVuelo = proximo.diasHastaElVuelo;
    out.ventana = proximo.diasHastaElVuelo * 24 > 48 ? 'COMERCIAL' : 'OPERATIVA';
  }

  // Vigencia de 18 meses para reembolso
  if (billete.doi) {
    const m = billete.doi.match(/^(\d{1,2})([A-Z]{3})(\d{2})$/);
    if (m) {
      const emision = new Date(2000 + Number(m[3]), MESES.indexOf(m[2]), Number(m[1]));
      const meses = (hoy - emision) / (30.44 * 86400000);
      out.mesesDesdeEmision = Math.round(meses * 10) / 10;
      if (meses > 18) out.avisos.push('El billete supera los 18 MESES desde el DOI: fuera de vigencia para reembolso.');
    }
  }

  if (billete.billeteAnterior) {
    out.avisos.push(`Este billete es una REEMISIÓN del ${billete.billeteAnterior}. Aplican las condiciones del TKT OPEN.`);
  }

  return out;
}
