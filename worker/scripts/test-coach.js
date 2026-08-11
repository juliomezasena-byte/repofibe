#!/usr/bin/env node
/**
 * El puente texto-libre → intención tiene que ser fiable Y prudente:
 *   · reconoce cómo habla un agente de verdad
 *   · cuando no está seguro, devuelve null (para que el coach PREGUNTE, no
 *     adivine)
 *   · nunca confunde un reembolso con un cambio
 */
import { detectarIntencion, esSaludo, extraerPasajeros } from '../src/coach.js';
import { buildGeneralCoachPrompt, buildTutorPrompt } from '../src/prompts.js';

let pasados = 0, fallos = 0;
function comprobar(nombre, real, esperado) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (ok) { pasados++; console.log(`  [OK]   ${nombre}`); }
  else { fallos++; console.error(`  [FALLO] ${nombre}\n          esperado: ${JSON.stringify(esperado)}\n          real:     ${JSON.stringify(real)}`); }
}
const intencionDe = (t) => detectarIntencion(t)?.intencion ?? null;

console.log('\n--- COMO HABLA UN AGENTE DE VERDAD ---');
comprobar('quiere cambiar la fecha', intencionDe('el pasajero quiere cambiar la fecha de su vuelo'), 'cambio');
comprobar('mover el vuelo dos días', intencionDe('necesito mover el vuelo dos días'), 'cambio');
comprobar('le cancelaron el vuelo', intencionDe('a la señora le cancelaron el vuelo'), 'cambio');
comprobar('quiere el reembolso', intencionDe('el cliente quiere que le devuelvan el dinero'), 'reembolso');
comprobar('anular y devolver', intencionDe('hay que anular y devolver la plata'), 'reembolso');
comprobar('viaja con su perro', intencionDe('la pasajera viaja con su perro en cabina'), 'servicio');
comprobar('un menor solo', intencionDe('tengo un menor no acompañado'), 'servicio');
comprobar('equipaje extra', intencionDe('quiere agregar una maleta extra'), 'servicio');
comprobar('emitir un billete', intencionDe('cómo emito un billete nuevo'), 'emision');
comprobar('comprar boleto', intencionDe('el cliente quiere comprar un boleto'), 'emision');
comprobar('crear reserva', intencionDe('necesito crear reserva de 2 ADT'), 'emision');

console.log('\n--- COMPOSICIÃ“N DE PASAJEROS ---');
comprobar('2 ADT + 1 CHD + 1 INF', extraerPasajeros('crear reserva de 2 ADT - 1 CHD - 1 INF'),
  { ADT: 2, CHD: 1, INF: 1, plazas: 3, total: 4 });
comprobar('sin tipos explÃ­citos no inventa pasajeros', extraerPasajeros('crear una reserva familiar'), null);

console.log('\n--- NO CONFUNDE REEMBOLSO CON CAMBIO ---');
// "devolver" gana a "cambio" cuando ambos aparecen
comprobar('devolver el dinero del cambio → reembolso',
  intencionDe('quiere que le devuelvan el dinero, no cambiar'), 'reembolso');

console.log('\n--- CUANDO NO SABE, NO ADIVINA ---');
comprobar('texto vago → null', intencionDe('oye una pregunta rápida'), null);
comprobar('vacío → null', intencionDe(''), null);
comprobar('nulo → null', detectarIntencion(null), null);

console.log('\n--- SALUDOS ---');
comprobar('"hola" es saludo', esSaludo('hola'), true);
comprobar('"buenos días" es saludo', esSaludo('buenos días'), true);
comprobar('un saludo con caso NO es solo saludo', esSaludo('hola, quiero cambiar la fecha'), false);
comprobar('una pregunta no es saludo', esSaludo('cómo emito'), false);

console.log('\n--- LLEVA EL PORQUÉ (para mostrárselo al alumno) ---');
comprobar('la detección explica de dónde salió',
  /escribiste/.test(detectarIntencion('quiere cambiar la fecha')?.comoLoSe || ''), true);

console.log('\n--- EL COACH GENERAL NO DA COMANDOS (ancla anti-alucinación) ---');
const coach = buildGeneralCoachPrompt({ consulta: '¿qué comando uso para emitir un billete?', lectura: null });
comprobar('le prohíbe escribir comandos', /NUNCA escribas un comando/.test(coach), true);
comprobar('explica que aún no hay procedimiento', /todav[ií]a no hay procedimiento/i.test(coach), true);
comprobar('le pide que diga qué gestión necesita', /comprar|cambiar|reembolso|servicio/i.test(coach), true);
comprobar('NO trae la vieja orden de "mejor práctica"', /mejor pr[aá]ctica en Amadeus/i.test(coach), false);

console.log('\n--- UNA PREGUNTA LIBRE EN UN PASO SE ANCLA AL MANUAL ---');
const pasoFalso = {
  n: 2, sistema: 'amadeus', confianza: 'verbatim',
  proceso: 'Guardar la cotización', comando: 'FXP',
  explicacion: 'Crea la máscara TST con la tarifa.'
};
const conPregunta = buildTutorPrompt({
  procedimiento: { titulo: 'Cambio manual', fuente: { documento: '#3121' } },
  paso: pasoFalso, veredicto: null, nivel: 'principiante',
  pregunta: '¿y si el sistema no me cotiza?'
});
comprobar('incluye la pregunta del alumno', conPregunta.includes('¿y si el sistema no me cotiza?'), true);
comprobar('le dice que no se salga del contexto', /SIN salirte del contexto/i.test(conPregunta), true);
comprobar('sigue prohibiendo comandos inventados', /NUNCA escribas un comando/i.test(conPregunta), true);
comprobar('el único comando presente es el del paso (FXP)',
  (conPregunta.match(/\bFXP\b/g) || []).length >= 1, true);

console.log('\n' + '='.repeat(50));
console.log(`Resultados: ${pasados} pasados, ${fallos} fallidos.`);
console.log('='.repeat(50) + '\n');
process.exit(fallos ? 1 : 0);
