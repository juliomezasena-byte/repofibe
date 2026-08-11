/**
 * Traduce el `seedPnr` de un ejercicio a la forma que usa PnrStateMachine.
 *
 * Los ejercicios están escritos con nombres legibles para una persona
 * (`flightNumber`, `bookingClass`, `from`, `to`), pero el motor guarda otra
 * cosa: `flight`, `class`, `route`. Cargar el seed tal cual dejaba el PNR con
 * los campos vacíos, y el renderizador tiraba de sus valores por defecto
 * ("Y", "10APR", "MAD"), así que el ejercicio arrancaba con datos que no eran
 * los suyos — y encima parecía que funcionaba.
 *
 * Que exista este archivo no es un capricho: la forma del motor es la fuente
 * de verdad y el test comprueba que lo que sale de aquí tiene las mismas
 * claves que lo que produce el propio motor al vender un segmento.
 */

/** Un segmento del ejercicio → un segmento del motor. */
export function adaptarSegmento(seg, indice = 0) {
  const origen = seg.from || (seg.route ? String(seg.route).split('-')[0] : null);
  const destino = seg.to || (seg.route ? String(seg.route).split('-')[1] : null);

  return {
    id: seg.id ?? seg.line ?? indice + 1,
    flight: seg.flight || seg.flightNumber || null,
    class: seg.class || seg.bookingClass || null,
    date: seg.date || null,
    route: origen && destino ? `${origen}-${destino}` : (seg.route || null),
    status: seg.status || 'HK1',
    departure: seg.departure || null,
    arrival: seg.arrival || null,
    priceUSD: seg.priceUSD ?? null,
    // Se conservan: el renderizador los lee directamente en algunas pantallas.
    from: origen,
    to: destino
  };
}

/** Un pasajero del ejercicio → un pasajero del motor (que numera desde 1). */
export function adaptarPasajero(pax, indice = 0) {
  return {
    id: pax.id ?? indice + 1,
    name: pax.name,
    ...(pax.type ? { type: pax.type } : {})
  };
}

/**
 * Estado completo listo para `pnrFsm.setState()`.
 * Devuelve `null` si no hay semilla: así el llamante no tiene que decidir.
 */
export function aEstadoDelMotor(seed) {
  if (!seed) return null;

  return {
    passengers: (seed.passengers || []).map(adaptarPasajero),
    segments: (seed.segments || []).map(adaptarSegmento),
    contacts: seed.contacts || [],
    ticketing: seed.ticketing || null,
    issuedTicket: seed.issuedTicket || null,
    isTicketed: !!seed.isTicketed,
    tsm: seed.tsm || null,
    tsmIssued: !!seed.tsmIssued
  };
}

export default aEstadoDelMotor;
