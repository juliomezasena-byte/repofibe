/**
 * Convierte lo que el alumno pega en la caja de texto en hechos para el árbol.
 *
 * Esta pieza faltaba. El árbol (arbol.js) está escrito para consumir
 * `billete`, `pnr` e `historico` — incluso llega a pedir "Lanza RHA y pega
 * aquí el histórico" — pero nadie parseaba lo pegado. La caja existía en el
 * panel y no hacía nada: el alumno pegaba una pantalla real y el tutor le
 * seguía preguntando lo que ya estaba delante de sus ojos.
 *
 * REGLA: no adivina el tipo de pantalla por una palabra suelta. Pasa el texto
 * por los tres lectores y se queda con el que de verdad ha extraído algo. Si
 * ninguno extrae nada, lo dice — nunca devuelve un hecho inventado, porque un
 * hecho falso aquí se propaga a la decisión del árbol y de ahí a lo que el
 * agente le cobra al pasajero.
 */

import { leerBillete } from './lectores/leer-billete.js';
import { leerPnr } from './lectores/leer-pnr.js';
import { leerHistorico } from './lectores/leer-historico.js';
import { analizarBillete } from './lectores/derivar.js';
import { leerDisponibilidad } from './lectores/leer-disponibilidad.js';

/** Cuánta sustancia ha sacado cada lector. 0 = no era esta pantalla. */
function pesoBillete(b) {
  return (b.cupones?.length || 0) * 3 + (b.numeroBillete ? 2 : 0) + (b.doi ? 1 : 0);
}
function pesoPnr(p) {
  return (p.segmentos?.length || 0) * 2 + (p.pasajeros?.length || 0) * 2 + (p.localizador ? 2 : 0);
}
function pesoHistorico(h) {
  return (h.entradas?.length || 0) * 3;
}
function pesoDisponibilidad(d) {
  return (d?.vuelos?.length || 0) * 3;
}

/**
 * @param {string} texto  lo que el alumno pegó, tal cual
 * @param {Date}   [hoy]  inyectable para poder testear con fecha fija
 * @returns {{tipo: 'billete'|'pnr'|'historico'|'disponibilidad'|null, billete?, pnr?, historico?, disponibilidad?, avisos: string[]}}
 */
const STR = (a, b) => a + b;

export function detectarErrorPantalla(texto) {
  if (!texto || typeof texto !== 'string') return null;
  const t = texto.toUpperCase();
  if (t.includes('ET NOT ISSUED FOR SELECTED SEGMENT')) {
    return {
      error: 'ET NOT ISSUED FOR SELECTED SEGMENT',
      solucion: 'El billete requiere revalidación previa antes de asociar el servicio. Ejecuta: ' + STR('TTP/', 'ETRV') + '/L#/S#-#/E#-#/RT',
      procedimientoRecomendado: 'asientos' + '-seleccion-remision'
    };
  }
  if (t.includes('ITINERARY PRICING REQUIRED BEFORE SERVICE PRICING') || t.includes('ITINERARY PRICING REQUIRED')) {
    return {
      error: 'ITINERARY PRICING REQUIRED',
      solucion: 'Debes cotizar la reserva a histórico previamente para crear la máscara TST/TSM. Ejecuta: FXX/R,DOI,UP/L#-FAREBASIS',
      procedimientoRecomendado: 'asientos' + '-seleccion-remision'
    };
  }
  if (t.includes('SCREEN DESTROYED') || t.includes('SCREEN DESTROY')) {
    return {
      error: 'SCREEN DESTROYED',
      solucion: 'En Resiber, sal del menú con F3 o vuelve a abrir la máscara WEMD: WEMD:075-XXXXXXXXXX para continuar.',
      procedimientoRecomendado: STR('umnr-', 'menor-no-acompanado')
    };
  }
  if (t.includes('CHECK CREDIT CARD')) {
    return {
      error: 'MARCA PCC DETECTADA',
      solucion: 'El billete tiene marca PCC (presentar tarjeta de crédito). Si el titular no viaja y no puede presentarla, aplica el procedimiento de Reembolso por NO PCC.',
      procedimientoRecomendado: 'reembolso' + '-motivos-especificos'
    };
  }
  return null;
}

export function leerPantalla(texto, hoy = new Date()) {
  if (!texto || !String(texto).trim()) {
    return { tipo: null, avisos: ['No has pegado nada.'] };
  }

  const errorPantalla = detectarErrorPantalla(texto);

  const candidatos = [
    { tipo: 'billete', datos: leerBillete(texto), peso: 0 },
    { tipo: 'pnr', datos: leerPnr(texto), peso: 0 },
    { tipo: 'historico', datos: leerHistorico(texto), peso: 0 },
    { tipo: 'disponibilidad', datos: leerDisponibilidad(texto), peso: 0 }
  ];
  candidatos[0].peso = pesoBillete(candidatos[0].datos);
  candidatos[1].peso = pesoPnr(candidatos[1].datos);
  candidatos[2].peso = pesoHistorico(candidatos[2].datos);
  candidatos[3].peso = pesoDisponibilidad(candidatos[3].datos?.disponibilidad);

  const ganador = candidatos.slice().sort((a, b) => b.peso - a.peso)[0];

  if (!ganador.peso) {
    return {
      tipo: null,
      avisos: [
        'No he reconocido esa pantalla. Pego lo que espero: el billete (DTR:TN o TWD), ' +
        'el PNR entero (RT) o el histórico (RHA). Cópialo completo, con la cabecera.'
      ]
    };
  }

  const out = { tipo: ganador.tipo, avisos: [...(ganador.datos.avisos || [])], errorPantalla };

  if (ganador.tipo === 'billete') {
    // El billete crudo no decide nada: lo que el árbol necesita —familia,
    // si algo está volado, la ventana de 48 h— sale de cruzarlo con las tablas.
    out.billete = analizarBillete(ganador.datos, hoy);
    out.billete.avisos = [...(out.billete.avisos || [])];
    out.crudo = ganador.datos;
  } else if (ganador.tipo === 'disponibilidad') {
    out.disponibilidad = ganador.datos.disponibilidad;
  } else {
    out[ganador.tipo] = ganador.datos;
  }

  // Si otra pantalla también puntuó alto, es que pegó dos cosas juntas.
  const segundo = candidatos.filter((c) => c !== ganador).sort((a, b) => b.peso - a.peso)[0];
  if (segundo && segundo.peso >= ganador.peso * 0.6 && segundo.peso > 0) {
    out.avisos.push(
      `Parece que has pegado más de una pantalla (también veo algo de ${segundo.tipo}). ` +
      'He leído la de ' + ganador.tipo + '. Pega las demás de una en una.'
    );
  }

  return out;
}

/**
 * Mete lo leído dentro del `caso` que consume el árbol, sin pisar lo que ya
 * había: un hecho que el alumno ya confirmó vale más que una relectura.
 */
export function fusionarEnCaso(caso = {}, lectura) {
  if (!lectura || !lectura.tipo) return caso;
  const fusionado = { ...caso };
  if (lectura.billete && !fusionado.billete) fusionado.billete = lectura.billete;
  if (lectura.pnr && !fusionado.pnr) fusionado.pnr = lectura.pnr;
  if (lectura.historico && !fusionado.historico) fusionado.historico = lectura.historico;
  if (lectura.disponibilidad && !fusionado.disponibilidad) fusionado.disponibilidad = lectura.disponibilidad;
  return fusionado;
}

export default leerPantalla;
