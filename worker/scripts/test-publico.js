#!/usr/bin/env node
/**
 * El coach público de hyntibia: que el TECHO DE GASTO frene de verdad y que el
 * encaminado sea el mismo del tutor con login.
 *
 * No se prueba Gemini (eso es red): se prueban las partes deterministas, que
 * son las que protegen la factura y las que anclan la conversación. El que los
 * comandos salgan del manual ya lo garantizan test-tutor.js y test-coach.js;
 * aquí solo se comprueba que este handler REUTILIZA esas piezas bien.
 */
import { consumirCupoPublico, responderCoachPublico } from '../src/publico.js';

let pasados = 0, fallos = 0;
function comprobar(nombre, real, esperado) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (ok) { pasados++; console.log(`  [OK]   ${nombre}`); }
  else { fallos++; console.error(`  [FALLO] ${nombre}\n          esperado: ${JSON.stringify(esperado)}\n          real:     ${JSON.stringify(real)}`); }
}

/** KV falso en memoria, con la misma forma que Cloudflare KV. */
function kvFalso(inicial = {}) {
  const store = new Map(Object.entries(inicial));
  return {
    async get(k) { return store.has(k) ? store.get(k) : null; },
    async put(k, v) { store.set(k, v); },
    _store: store
  };
}

const HOY = new Date().toISOString().slice(0, 10);
const env = { PUBLIC_DAILY_IP_CAP: '3', PUBLIC_DAILY_GLOBAL_CAP: '5' };

console.log('\n--- EL TOPE POR IP FRENA ---');
{
  const kv = kvFalso({ [`pub:ip:1.2.3.4:${HOY}`]: '3' }); // ya en el tope
  const r = await consumirCupoPublico(kv, '1.2.3.4', env);
  comprobar('en el tope por IP → no permitido', r.allowed, false);
  comprobar('con el motivo correcto', r.motivo, 'tope_ip');
}

console.log('\n--- EL TOPE GLOBAL FRENA (aunque la IP tenga cupo) ---');
{
  const kv = kvFalso({ [`pub:global:${HOY}`]: '5' }); // techo global alcanzado
  const r = await consumirCupoPublico(kv, '9.9.9.9', env);
  comprobar('techo global → no permitido', r.allowed, false);
  comprobar('el global manda sobre el de IP', r.motivo, 'tope_global');
}

console.log('\n--- CONSUME Y CUENTA ---');
{
  const kv = kvFalso();
  const r1 = await consumirCupoPublico(kv, '5.5.5.5', env);
  comprobar('primera vez → permitido', r1.allowed, true);
  comprobar('global quedó en 1', kv._store.get(`pub:global:${HOY}`), '1');
  comprobar('la IP quedó en 1', kv._store.get(`pub:ip:5.5.5.5:${HOY}`), '1');
  await consumirCupoPublico(kv, '5.5.5.5', env);
  const r3 = await consumirCupoPublico(kv, '5.5.5.5', env);
  comprobar('tercera aún permitida (tope IP = 3)', r3.allowed, true);
  const r4 = await consumirCupoPublico(kv, '5.5.5.5', env);
  comprobar('cuarta ya no (pasó el tope de IP)', r4.allowed, false);
}

console.log('\n--- ENCAMINA IGUAL QUE EL TUTOR CON LOGIN (sin Gemini) ---');
{
  const r = await responderCoachPublico({ consulta: 'el pasajero quiere cambiar la fecha' }, {});
  comprobar('cambio → el árbol pregunta si voló algo', r.decision?.siguientePregunta?.id, 'volado');
  comprobar('y deja dicho de dónde salió', /escribiste/.test(r.decision?.encaminadoPor || ''), true);
  comprobar('sin procedimiento todavía, no hay comando', r.paso, undefined);
}
{
  const r = await responderCoachPublico({ consulta: 'que le devuelvan el dinero' }, {});
  comprobar('reembolso → pregunta la placa', r.decision?.siguientePregunta?.id, 'placa');
}
{
  // El widget siempre manda al menos caso:{} al abrir → el árbol arranca
  // preguntando qué necesita el pasajero.
  const r = await responderCoachPublico({ caso: {} }, {});
  comprobar('caso vacío → pregunta qué necesita', r.decision?.siguientePregunta?.id, 'intencion');
}

console.log('\n--- MULTI-TURNO: no vuelve a preguntar la intención ---');
{
  // Turno 1: texto libre. Devuelve la intención activa para que el cliente
  // la conserve.
  const t1 = await responderCoachPublico({ consulta: 'quiere cambiar la fecha', caso: {} }, {});
  comprobar('turno 1 devuelve la intención activa', t1.decision?.intencionActiva, 'cambio');
  comprobar('turno 1 pregunta si voló', t1.decision?.siguientePregunta?.id, 'volado');

  // Turno 2: el cliente reenvía la intención + la respuesta, SIN texto libre
  // (fue un clic de botón). El árbol NO debe repreguntar la intención.
  const t2 = await responderCoachPublico({ caso: { intencion: 'cambio', respuestas: { volado: false } } }, {});
  comprobar('turno 2 NO vuelve a preguntar la intención',
    t2.decision?.siguientePregunta?.id !== 'intencion', true);
  comprobar('turno 2 avanza en la rama de cambio',
    ['involuntario', 'cotizo'].includes(t2.decision?.siguientePregunta?.id) || !!t2.paso, true);
}

console.log('\n--- UN PROCEDIMIENTO QUE NO EXISTE NO REVIENTA ---');
{
  const r = await responderCoachPublico({ procedimientoId: 'no-existe-xyz' }, {});
  comprobar('devuelve error controlado', r.error, 'procedimiento_desconocido');
}

console.log('\n' + '='.repeat(50));
console.log(`Resultados: ${pasados} pasados, ${fallos} fallidos.`);
console.log('='.repeat(50) + '\n');
process.exit(fallos ? 1 : 0);
