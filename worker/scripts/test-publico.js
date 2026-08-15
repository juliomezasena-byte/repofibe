#!/usr/bin/env node
import { consumirCupoPublico, responderCoachPublico } from '../src/publico.js';

let pasados = 0;
let fallos = 0;
function comprobar(nombre, real, esperado) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (ok) { pasados++; console.log(`  [OK]   ${nombre}`); }
  else { fallos++; console.error(`  [FALLO] ${nombre}\n          esperado: ${JSON.stringify(esperado)}\n          real:     ${JSON.stringify(real)}`); }
}

function kvFalso(inicial = {}) {
  const store = new Map(Object.entries(inicial));
  return {
    async get(k) { return store.has(k) ? store.get(k) : null; },
    async put(k, v) { store.set(k, v); },
    _store: store
  };
}

const HOY = new Date().toISOString().slice(0, 10);
const env = { PUBLIC_DAILY_GLOBAL_CAP: '5' };

console.log('\n--- CUOTA GLOBAL Y POR IP ---');
{
  const kv = kvFalso({ [`pub:global:${HOY}`]: '0' });
  const r = await consumirCupoPublico(kv, '1.2.3.4', env);
  comprobar('una IP dentro del límite queda permitida', r.allowed, true);
  comprobar('crea contador por IP', kv._store.has(`pub:ip:1.2.3.4:${HOY}`), true);
}
{
  const kv = kvFalso({ [`pub:global:${HOY}`]: '5' });
  const r = await consumirCupoPublico(kv, '9.9.9.9', env);
  comprobar('el techo global frena', r.allowed, false);
  comprobar('motivo global correcto', r.motivo, 'tope_global');
}
{
  const kv = kvFalso();
  const r1 = await consumirCupoPublico(kv, '5.5.5.5', env);
  comprobar('primera llamada permitida', r1.allowed, true);
  comprobar('global queda en 1', kv._store.get(`pub:global:${HOY}`), '1');
  comprobar('crea contador por IP', kv._store.has(`pub:ip:5.5.5.5:${HOY}`), true);
  await consumirCupoPublico(kv, '5.5.5.5', env);
  await consumirCupoPublico(kv, '5.5.5.5', env);
  await consumirCupoPublico(kv, '5.5.5.5', env);
  await consumirCupoPublico(kv, '5.5.5.5', env);
  const r6 = await consumirCupoPublico(kv, '5.5.5.5', env);
  comprobar('la sexta supera el techo global', r6.allowed, false);
}

console.log('\n--- EL COACH NO ADIVINA ---');
{
  const r = await responderCoachPublico({ caso: {} }, {});
  comprobar('caso vacio pregunta intencion', r.decision?.siguientePregunta?.id, 'intencion');
  comprobar('caso vacio no da comando', r.paso, undefined);
}
{
  const r = await responderCoachPublico({ consulta: 'Créame una reserva a BOG' }, {});
  comprobar('petición natural de reserva activa emisión', r.decision?.intencionActiva, 'emision');
  comprobar('petición natural no devuelve menú de intención', r.decision?.siguientePregunta?.id, undefined);
  comprobar('sin fecha y origen no muestra comando de ejemplo', r.paso?.comando, null);
  comprobar('pide los datos concretos que faltan', /fecha|origen|destino/i.test(r.explicacion || ''), true);
}
{
  const r = await responderCoachPublico({ consulta: 'Créame una reserva de 2 ADT, 1 CHD y 1 INF de MAD a BOG el 11MAR' }, {});
  comprobar('reserva completa conserva emisión', r.decision?.intencionActiva, 'emision');
  comprobar('reserva completa monta AN con los datos escritos', r.paso?.comando, 'AN 11MAR MADBOG');
  comprobar('reserva completa calcula las plazas explícitas', r.paso?.faltanDatos?.length, 0);
}
{
  const r = await responderCoachPublico({ consulta: '¿Qué significa AN y cómo sigo con este paso?' }, {});
  comprobar('pregunta técnica sobre AN entra en emisión', r.decision?.intencionActiva, 'emision');
}
{
  const r = await responderCoachPublico({ consulta: 'Ayúdame con el comando FHE de la reemisión' }, {});
  comprobar('pregunta técnica sobre FHE entra en cambios', r.decision?.intencionActiva, 'cambio');
}
{
  const r = await responderCoachPublico({ consulta: 'el pasajero quiere cambiar la fecha' }, {});
  comprobar('cambio pregunta si volo', r.decision?.siguientePregunta?.id, 'volado');
  comprobar('explica que necesita para seguir', /necesito|entiendo/i.test(r.explicacion || ''), true);
}
{
  const r = await responderCoachPublico({ consulta: 'que le devuelvan el dinero' }, {});
  comprobar('reembolso pregunta placa', r.decision?.siguientePregunta?.id, 'placa');
}

console.log('\n--- RESPUESTAS ESCRITAS AVANZAN ---');
{
  const t1 = await responderCoachPublico({ consulta: 'quiere cambiar la fecha', caso: {} }, {});
  comprobar('turno 1 devuelve intencion', t1.decision?.intencionActiva, 'cambio');
  comprobar('turno 1 pregunta si volo', t1.decision?.siguientePregunta?.id, 'volado');

  const t2 = await responderCoachPublico({
    consulta: 'no ha volado ningun tramo',
    caso: { intencion: 'cambio', respuestas: {}, pantallas: [] }
  }, {});
  comprobar('texto libre extrae volado', t2.decision?.respuestaExtraida?.id, 'volado');
  comprobar('texto libre avanza la rama', t2.decision?.siguientePregunta?.id, 'involuntario');
}

console.log('\n--- PROCEDIMIENTO DESCONOCIDO ---');
{
  const r = await responderCoachPublico({ procedimientoId: 'no-existe-xyz' }, {});
  comprobar('devuelve error controlado', r.error, 'procedimiento_desconocido');
}

console.log(`\nResultados: ${pasados} pasados, ${fallos} fallidos.\n`);
process.exit(fallos ? 1 : 0);
