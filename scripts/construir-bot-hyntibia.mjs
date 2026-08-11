#!/usr/bin/env node
/**
 * Empaqueta el cerebro del tutor para que funcione DENTRO DEL NAVEGADOR, en
 * la landing pública de HyntibIA.
 *
 * POR QUÉ EN EL NAVEGADOR: el billete se lee en la máquina del agente y no
 * sale de ahí. Ni servidor, ni latencia, ni datos de pasajeros viajando. Y
 * funciona aunque la red del trabajo bloquee APIs externas.
 *
 * QUÉ ENTRA Y QUÉ NO — esto es deliberado:
 *
 *   SÍ · los lectores de pantalla (leen lo que TÚ pegas)
 *   SÍ · derivar (familia de tarifa, reembolsable, ventana 48 h)
 *   SÍ · el árbol de decisión (QUÉ procedimiento aplica y por qué)
 *   SÍ · dos tablas de referencia: cabinas y beneficios por familia
 *
 *   NO · los 21 manuales con sus 298 comandos paso a paso
 *
 * La razón: la landing es PÚBLICA y una clave en el navegador es una cortina,
 * no una cerradura — cualquiera puede leer el código fuente. Los manuales son
 * material interno de Iberia y no pueden quedar ahí. El bot público te dice
 * QUÉ aplica; los pasos concretos siguen viviendo detrás del login.
 *
 * Si algún día se decide moverlo al Campus (con puerta de verdad), basta con
 * cambiar TABLAS_PUBLICAS por el bundle completo.
 */

import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROCEDIMIENTOS = join(RAIZ, 'public', 'procedimientos');

// La landing que de verdad se publica en hyntibia.com.co es
// hyntibia-dashboard/static/landing.html — SvelteKit copia `static/` a
// `build/` y Firebase publica `build/`. (hyntibia-v1/index.html es otra
// versión distinta que NO es la que está en producción: lo comprobé
// comparando el <title> de la web viva con el del archivo.)
const DESTINO = join(
  RAIZ, '..', 'hyntibia llsm', 'HYNTIBIA', 'hyntibia-dashboard', 'static', 'assets', 'hyntibia-bot.js'
);

/**
 * Quita la trazabilidad interna de una tabla antes de publicarla.
 *
 * El CONTENIDO (qué familia es reembolsable, qué clase va en qué cabina) hace
 * falta para deducir y no es secreto de nadie: sale del billete del pasajero.
 * Lo que no sale es de QUÉ documento interno vino, ni las notas de trabajo ni
 * las preguntas abiertas para el instructor.
 */
const CAMPOS_INTERNOS = new Set([
  'fuente', 'documento', 'nota', 'notas', 'porQueExiste',
  'preguntasAbiertas', 'disciplina', 'confianza', 'comoSeDeduce'
]);

function limpiar(valor) {
  if (Array.isArray(valor)) return valor.map(limpiar);
  if (valor && typeof valor === 'object') {
    const salida = {};
    for (const [k, v] of Object.entries(valor)) {
      if (CAMPOS_INTERNOS.has(k)) continue;
      salida[k] = limpiar(v);
    }
    return salida;
  }
  // Referencias tipo "#3590" señalan la biblioteca interna: fuera.
  if (typeof valor === 'string') return valor.replace(/#\d{4}\b/g, 'manual interno');
  return valor;
}

const cargar = (archivo) =>
  limpiar(JSON.parse(readFileSync(join(PROCEDIMIENTOS, archivo), 'utf8')));

// Solo las tablas que `derivar` necesita para deducir. Nada de pasos.
const TABLAS_PUBLICAS = {
  '_gama-tarifas-cabinas': cargar('_gama-tarifas-cabinas.json'),
  '_tipos-de-tarifas-beneficios': cargar('_tipos-de-tarifas-beneficios.json')
};

/**
 * Intercepta el import de `procedimientos.generated.json` y lo sustituye por
 * las tablas reducidas. Es lo que impide que los manuales entren al paquete.
 */
const sinManuales = {
  name: 'sin-manuales',
  setup(construccion) {
    construccion.onResolve({ filter: /procedimientos\.generated\.json$/ }, () => ({
      path: 'tablas-publicas',
      namespace: 'hyntibia'
    }));
    construccion.onLoad({ filter: /.*/, namespace: 'hyntibia' }, () => ({
      contents: `export default ${JSON.stringify(TABLAS_PUBLICAS)};`,
      loader: 'js'
    }));
  }
};

// El ÁRBOL DE DECISIÓN se queda fuera a propósito.
//
// Lo intenté incluir y el guardián de abajo lo rechazó, con razón: sus avisos
// llevan dentro comandos del manual ("se REVALIDA con TTP/ETRV", "FXF si el
// billete está en OPEN, FXE si no") y los identificadores de los 21
// procedimientos con su número de documento (#3121, #3113…). Eso es material
// interno de Iberia y no puede vivir en una página pública.
//
// Lo que SÍ va es todo lo que se deduce del billete que el propio agente
// pega: su familia de tarifa, si es reembolsable, si algo está volado, la
// ventana de 48 h. Nada de eso es un secreto de nadie — sale del billete del
// pasajero cruzado con la tabla pública de familias tarifarias.
const ENTRADA = `
import { leerPantalla } from '${join(RAIZ, 'worker', 'src', 'pantalla.js').replace(/\\/g, '/')}';
import { familiaDeFareBasis, cabinaDeClase, derechosDeFamilia, analizarBillete }
  from '${join(RAIZ, 'worker', 'src', 'lectores', 'derivar.js').replace(/\\/g, '/')}';

export {
  leerPantalla,
  familiaDeFareBasis, cabinaDeClase, derechosDeFamilia, analizarBillete
};
`;

const resultado = await build({
  stdin: { contents: ENTRADA, resolveDir: RAIZ, sourcefile: 'entrada-bot.js', loader: 'js' },
  bundle: true,
  format: 'iife',
  globalName: 'HyntibIA',
  target: ['es2020'],
  minify: true,
  plugins: [sinManuales],
  outfile: DESTINO,
  write: false,
  legalComments: 'none'
});

// `derivar` cita su regla como "#3590 — la última letra manda". La regla es
// útil; el número de documento no aporta nada fuera de casa. Se sustituye en
// el texto ya compilado: `#NNNN` solo aparece dentro de cadenas.
const texto = Buffer.from(resultado.outputFiles[0].contents)
  .toString('utf8')
  .replace(/#\d{4}\b/g, 'manual interno');

mkdirSync(dirname(DESTINO), { recursive: true });
writeFileSync(DESTINO, texto, 'utf8');
const salida = { contents: Buffer.from(texto, 'utf8') };

// Guardián: si algún manual se cuela, el build falla. No es paranoia — el
// import está a dos saltos de distancia y se colaría en silencio.
const FILTRACIONES = [
  ['pasos de un manual', /"pasos":/],
  ['un identificador de procedimiento', /cambio-manual-sin-segmento|reembolso-ibex|umnr-menor|generar-split/],
  ['un número de documento interno', /#3111|#3113|#3121|#3129|#3590|#3638|#3639|#3060|#3693/],
  ['comandos de reemisión del manual', /TTP\/ETRV|FXF\b|FXE\b|FXQ\b|FXO\b|FQPSCL/]
];
const coladas = FILTRACIONES.filter(([, re]) => re.test(texto)).map(([q]) => q);
if (coladas.length) {
  console.error(`✗ El paquete público contiene material que no debe salir: ${coladas.join(', ')}`);
  process.exit(1);
}

console.log(`✓ hyntibia-bot.js · ${(salida.contents.length / 1024).toFixed(0)} KB`);
console.log(`  lectores + deducciones + 2 tablas · SIN manuales ni árbol de decisión`);
console.log(`  → ${DESTINO}`);
