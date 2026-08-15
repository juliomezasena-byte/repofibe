/** Resolver determinista: el modelo puede explicar, nunca escoger un id fuera del catálogo. */
import { detectarIntencion, extraerDatosDeReserva, extraerPasajeros } from './coach.js';
import { queProcedimiento } from './arbol.js';

export function resolverProcedimiento({ texto = '', caso = null } = {}) {
  const intencion = caso?.intencion || detectarIntencion(texto)?.intencion || null;
  const datos = extraerDatosDeReserva(texto);
  const pasajeros = extraerPasajeros(texto);
  const casoConIntencion = {
    ...(caso || {}),
    ...(intencion ? { intencion } : {}),
    ...(Object.keys(datos).length ? { datos: { ...(caso?.datos || {}), ...datos } } : {}),
    ...(pasajeros ? { pasajeros } : {})
  };
  const decision = queProcedimiento(casoConIntencion || {});
  return {
    ...decision,
    intencion,
    source: decision.procedimientoId ? 'deterministic-tree' : 'clarifying-question',
    allowedProcedureId: decision.procedimientoId || null
  };
}
