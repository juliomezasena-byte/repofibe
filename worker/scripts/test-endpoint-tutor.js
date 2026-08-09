#!/usr/bin/env node
/**
 * Prueba el endpoint /tutor/paso con la IA MOCKEADA.
 *
 * Este test es el guardián del diseño. Si alguien convierte el tutor en un
 * chat que le pasa el manual al modelo, se pone rojo:
 *
 *  · el comando devuelto es BYTE A BYTE el del manual
 *  · un paso `hueco` NUNCA llega siquiera a llamar a la IA
 *  · si la IA falla o no hay cuota, el paso del manual sigue saliendo
 *  · el prompt PROHÍBE explícitamente inventar sintaxis
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTutorPrompt } from '../src/prompts.js';
import { siguientePaso } from '../src/tutor.js';
import { queProcedimiento } from '../src/arbol.js';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const procedimientos = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'procedimientos.generated.json'), 'utf8'));

let fallos = 0, pasados = 0;
function comprobar(nombre, real, esperado) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (ok) { pasados++; console.log(`  [OK]   ${nombre}`); }
  else { fallos++; console.error(`  [FALLO] ${nombre}\n          esperado: ${JSON.stringify(esperado)}\n          real:     ${JSON.stringify(real)}`); }
}
function contiene(nombre, texto, frag) {
  const ok = String(texto).toLowerCase().includes(frag.toLowerCase());
  if (ok) { pasados++; console.log(`  [OK]   ${nombre}`); }
  else { fallos++; console.error(`  [FALLO] ${nombre}\n          no encontré "${frag}"`); }
}
function noContiene(nombre, texto, frag) {
  const ok = !String(texto).toLowerCase().includes(frag.toLowerCase());
  if (ok) { pasados++; console.log(`  [OK]   ${nombre}`); }
  else { fallos++; console.error(`  [FALLO] ${nombre}\n          NO debía aparecer "${frag}"`); }
}

// ── 0 · El bundle del Worker lleva todos los manuales ───────────
console.log('\n--- EL BUNDLE ESTÁ COMPLETO ---');
const enDisco = readFileSync(join(RAIZ, 'public', 'procedimientos', '_sistemas.json'), 'utf8');
comprobar('lleva los 21 procedimientos', Object.keys(procedimientos).filter((k) => !k.startsWith('_')).length, 21);
comprobar('lleva _sistemas para el conmutador', !!procedimientos._sistemas, true);
comprobar('y el conmutador ":" está dentro', procedimientos._sistemas.conmutadorEntreSistemas.comando, ':');
void enDisco;

// ── 1 · La IA mockeada: devuelva lo que devuelva, el comando NO cambia ──
console.log('\n--- LA IA NO PUEDE TOCAR EL COMANDO ---');

/** Una IA maliciosa que intenta colar sintaxis inventada. */
const iaQueMiente = async () => ({
  explicacion: 'Teclea FQN01PE sin asterisco y luego FPO/CCSVI+/SFCA,/0',
  diagnostico: 'Usa el comando XYZ123 que me acabo de inventar'
});

const split = procedimientos['generar-split'];
const avance = siguientePaso(split, {});
const textoIa = await iaQueMiente();

// Así se ensambla en el handler: el comando viene de `avance`, jamás del texto.
const respuesta = { ...avance, explicacion: textoIa.explicacion, diagnostico: textoIa.diagnostico };

comprobar('el comando sigue siendo el del manual', respuesta.paso.comando, 'SP 1');
comprobar('byte a byte igual al JSON', respuesta.paso.comando, split.pasos[0].comando);
contiene('la mentira de la IA queda solo en el texto', respuesta.explicacion, 'FQN01PE');
comprobar('pero NO contamina el comando', respuesta.paso.comando.includes('FQN'), false);

// ── 2 · Un hueco no llega a la IA ───────────────────────────────
console.log('\n--- UN HUECO SE CORTA ANTES DE LA IA ---');
const conHueco = {
  titulo: 'De prueba',
  pasos: [
    { n: 1, sistema: 'amadeus', proceso: 'Normal', comando: 'RT', confianza: 'verbatim' },
    { n: 2, sistema: 'resiber', proceso: 'Sin documentar', comando: null, confianza: 'hueco', nota: 'No está en el material. Pregunta al instructor.' }
  ]
};
const enHueco = siguientePaso(conHueco, { pasoActual: 1, comandoEscrito: 'RT' });
comprobar('el paso es hueco', enHueco.paso.confianza, 'hueco');
comprobar('sin comando', enHueco.paso.comando, null);
// El handler devuelve la nota del manual y NO llama a generateTutorText
comprobar('la explicación es la nota del manual', enHueco.paso.nota, 'No está en el material. Pregunta al instructor.');

// ── 3 · El prompt prohíbe inventar ──────────────────────────────
console.log('\n--- EL PROMPT ATA CORTO AL MODELO ---');
const prompt = buildTutorPrompt({
  procedimiento: split,
  paso: avance.paso,
  veredicto: null,
  avisos: [],
  nivel: 'principiante'
});
contiene('prohíbe escribir comandos nuevos', prompt, 'NUNCA escribas un comando');
contiene('obliga a admitir lo que no sabe', prompt, 'no está en el material');
contiene('le pasa el comando ya decidido', prompt, 'SP 1');
contiene('y el sistema en el que hay que estar', prompt, 'AMADEUS');
// Antes esto exigía la cadena "TST" en TODO prompt de principiante, porque la
// regla venía con una lista fija de términos metida a mano. Ahora el
// vocabulario se inyecta desde _glosario.json y SOLO cuando el término sale
// de verdad en el paso — este paso (SP 1) no habla de ningún TST. Lo que hay
// que exigir es que se le prohíba definir por su cuenta; que la definición
// buena llegue cuando toca lo prueba test-pantalla.js.
contiene('modo principiante manda usar el vocabulario verificado', prompt, 'VOCABULARIO VERIFICADO');
contiene('y prohíbe inventarse definiciones', prompt, 'Inventar una definición');
noContiene('no le pide que genere sintaxis', prompt, 'genera el comando');

const promptExperto = buildTutorPrompt({ procedimiento: split, paso: avance.paso, nivel: 'experto' });
contiene('modo experto va al grano', promptExperto, 've al grano');

// ── 4 · Con veredicto de error, pide diagnóstico ────────────────
console.log('\n--- DIAGNÓSTICO DE ERROR ---');
const fallo = siguientePaso(split, { pasoActual: 1, comandoEscrito: 'XE 1' });
const promptFallo = buildTutorPrompt({ procedimiento: split, paso: fallo.paso, veredicto: fallo.veredicto });
contiene('le cuenta que se equivocó', promptFallo, 'Se equivocó');
contiene('y la pista de la trampa entre sistemas', promptFallo, 'RTA');

// ── 5 · El árbol decide sin gastar IA ───────────────────────────
console.log('\n--- EL ÁRBOL NO GASTA CUOTA ---');
const sinDatos = queProcedimiento({ intencion: 'cambio' });
comprobar('devuelve pregunta, no procedimiento', sinDatos.procedimientoId, null);
comprobar('y trae la pregunta lista', sinDatos.siguientePregunta.id, 'volado');
// El handler responde aquí mismo: no llama a checkAndConsumeQuota ni a Gemini.

// ── 6 · Los ids del árbol existen en el bundle del Worker ───────
console.log('\n--- LOS DESTINOS EXISTEN EN EL BUNDLE ---');
const { DESTINOS } = await import('../src/arbol.js');
for (const id of Object.keys(DESTINOS)) {
  comprobar(`${id} está empaquetado`, !!procedimientos[id], true);
}

console.log(`\n${'='.repeat(50)}`);
console.log(`Resultados: ${pasados} pasados, ${fallos} fallidos.`);
console.log('='.repeat(50));
if (fallos) process.exit(1);
