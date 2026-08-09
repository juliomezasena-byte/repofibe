/**
 * Lee la salida de RHA (Amadeus) o RTC (Resiber): el histórico de la reserva.
 *
 * Es donde se comprueba si un cambio fue INVOLUNTARIO, que es lo que decide
 * si el pasajero paga o no paga. Dos lecturas críticas, ambas sacadas de las
 * capturas reales de manual/Cambios involutarios/:
 *
 *   Cambio de hora:  TK2 1420 1514/ 1354 1450
 *                        └─NUEVA──┘  └ORIGINAL┘
 *   Cancelación:     CS/…UN1  → el vuelo cancelado
 *                    AS/…TK1  → la opción que el sistema agendó solo
 *
 * Leer el desfase al revés cambia lo que se le ofrece al pasajero.
 */

const CODIGOS = {
  OS: 'segmento creado al inicio con la reserva',
  AS: 'segmento agregado',
  CS: 'estatus del segmento cambiado',
  XS: 'segmento eliminado',
  TC: 'cambio de horario'
};

/**
 * Línea de histórico:
 *   013/022 CS/IB 494 S 21NOV 1 MADEAS UN1 1600 1705/TK
 *   007/013 TC/IB7263 N 20JAN 5 BGABOG TK2 1420 1514/ 1354 1450
 *       022 AS/IB 506 S 21NOV 1 MADEAS TK1 1155 1300/TK
 *
 *  1: secuencia · 2: código · 3: aerolínea · 4: vuelo · 5: clase
 *  6: fecha · 7: día semana · 8: ruta · 9: estado · 10: plazas · 11: resto
 */
const RE_LINEA =
  /^\s*(\d{3}(?:\/\d{3})?)\s+([A-Z]{2})\/([A-Z]{2})\s?(\d{2,4}|OPEN)\s+([A-Z])\s+(\d{1,2}[A-Z]{3})\s+(?:(\d)\s+)?([A-Z]{6})(?:\s+([A-Z]{2})(\d+))?\s*(.*)$/;

/** Línea de firma:  022 RF-MADRIIB 301059 CR-MAD RI IB 30SEP1059Z */
const RE_FIRMA = /^\s*(\d{3})\s+RF-(\S+)\s+(\S+)/;

/** Horas: "1420 1514/ 1354 1450" → nuevas y originales. */
const RE_DOS_PARES = /^(\d{4})\s+(\d{4})(\+\d)?\s*\/\s*(\d{4})\s+(\d{4})(\+\d)?/;
/** "1600 1705/TK" → un solo par + sufijo, NO horas originales. */
const RE_UN_PAR = /^(\d{4})\s+(\d{4})(\+\d)?\s*\/\s*([A-Z].*)?$/;

function minutos(hhmm, diaExtra = 0) {
  return Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(2)) + diaExtra * 1440;
}

export function leerHistorico(texto) {
  if (!texto || typeof texto !== 'string') {
    return { entradas: [], cambiosDeHora: [], cancelaciones: [], opcionesOfrecidas: [], avisos: ['No se recibió texto que leer.'] };
  }

  const h = {
    entradas: [],
    cambiosDeHora: [],
    cancelaciones: [],
    opcionesOfrecidas: [],
    firmas: [],
    avisos: []
  };

  for (const linea of texto.split(/\r?\n/)) {
    const f = linea.match(RE_FIRMA);
    if (f) { h.firmas.push({ secuencia: f[1], oficina: f[2], referencia: f[3] }); continue; }

    const m = linea.match(RE_LINEA);
    if (!m) continue;

    const e = {
      secuencia: m[1],
      codigo: m[2],
      codigoTexto: CODIGOS[m[2]] || null,
      aerolinea: m[3],
      vuelo: m[4],
      clase: m[5],
      fecha: m[6],
      diaSemana: m[7] ? Number(m[7]) : null,
      origen: m[8].slice(0, 3),
      destino: m[8].slice(3, 6),
      estado: m[9] || null,
      plazas: m[10] ? Number(m[10]) : null,
      horas: null
    };

    const resto = (m[11] || '').trim();
    const dos = resto.match(RE_DOS_PARES);
    const uno = !dos && resto.match(RE_UN_PAR);

    if (dos) {
      // La NUEVA hora va PRIMERO; la ORIGINAL después de la barra.
      e.horas = {
        nuevaSalida: dos[1], nuevaLlegada: dos[2], nuevoDiaExtra: dos[3] ? Number(dos[3].slice(1)) : 0,
        salidaOriginal: dos[4], llegadaOriginal: dos[5], diaExtraOriginal: dos[6] ? Number(dos[6].slice(1)) : 0
      };
      const desfase = minutos(dos[1], e.horas.nuevoDiaExtra) - minutos(dos[4], e.horas.diaExtraOriginal);
      h.cambiosDeHora.push({
        ...e,
        desfaseMinutos: desfase,
        desfaseHoras: Math.round(Math.abs(desfase) / 6) / 10,
        sentido: desfase > 0 ? 'se retrasa' : desfase < 0 ? 'se adelanta' : 'sin cambio'
      });
    } else if (uno) {
      e.horas = { salida: uno[1], llegada: uno[2], diaExtra: uno[3] ? Number(uno[3].slice(1)) : 0, sufijo: uno[4] || null };
    }

    h.entradas.push(e);

    if (e.estado === 'UN') h.cancelaciones.push(e);
    if (e.codigo === 'AS' && e.estado === 'TK') h.opcionesOfrecidas.push(e);
  }

  // Avisos: lo que cambia la decisión
  if (h.cancelaciones.length) {
    h.avisos.push(
      `${h.cancelaciones.length} vuelo(s) CANCELADO(S) (UN). Es un cambio involuntario: el pasajero puede elegir ` +
      'entre cambio ±30 días, bono o reembolso a la misma forma de pago.'
    );
  }
  if (h.opcionesOfrecidas.length) {
    h.avisos.push(
      `El sistema ya agendó ${h.opcionesOfrecidas.length} opción(es) automáticamente (líneas AS con TK). ` +
      'Búscalas antes de ponerte a montar una alternativa a mano.'
    );
  }
  for (const c of h.cambiosDeHora) {
    h.avisos.push(
      `Cambio de hora en ${c.aerolinea}${c.vuelo} ${c.origen}-${c.destino}: ${c.sentido} ${c.desfaseHoras} h ` +
      `(original ${c.horas.salidaOriginal}, nueva ${c.horas.nuevaSalida}). ` +
      'El umbral para que el pasajero pueda elegir es 1 h en corto/medio radio y 3 h en largo radio.'
    );
  }
  if (!h.entradas.length) h.avisos.push('No se reconoció ninguna entrada. ¿Es una salida de RHA o RTC?');

  return h;
}

export default leerHistorico;
