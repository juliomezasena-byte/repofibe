/**
 * El tutor corriendo EN EL NAVEGADOR, con TRES modos de inteligencia según lo
 * que reciba en el payload:
 *
 *   · geminiEndpoint (p. ej. '/api/gemini')  → PUENTE DEL SERVIDOR. El navegador
 *     no lleva llave: manda el prompt a tu propio dominio, y el servidor usa
 *     Vertex de pago (cuenta de servicio) por detrás. Sin llave que pegar, sin
 *     el límite de 20/día del nivel gratis, y sin que Foundever lo bloquee
 *     (mismo dominio que la página). ESTE es el modo por defecto en producción.
 *
 *   · geminiKey  → Gemini directo desde el navegador (nivel gratis). Respaldo.
 *
 *   · ninguno    → 100% determinista, sin red. Última red de seguridad.
 *
 * EN TODOS los modos el comando sale del manual (siguientePaso), nunca del
 * modelo. La IA solo entiende la frase del novato (clasificador de conjunto
 * cerrado) y redacta la explicación. Si la IA falla, cada capa cae sola a
 * determinista: el tutor nunca se queda mudo.
 */
import { responderCoachPublico } from './publico.js';
import { leerPantalla } from './pantalla.js';
import { entenderIntencion } from './clasificador.js';
import { detectarIntencion } from './coach.js';
import { generateIntentClassification, generateIntentClassificationServidor, preguntarServidor, aprenderServidor } from './gemini.js';
import { redactarTextoSensible } from './redactar.js';
import mapaIntenciones from '../scripts/mapa-intenciones.json' with { type: 'json' };

const ETIQUETAS = Object.keys(mapaIntenciones);
const MODELO_POR_DEFECTO = 'gemini-flash-latest';

/** ¿El agente le está ENSEÑANDO algo (dato o corrección) para que lo recuerde? */
function esAprendizaje(texto) {
  const t = ' ' + String(texto || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') + ' ';
  return /\b(aprende que|aprende:|recuerda que|recuerda:|toma nota|apunta que|anota que|correccion:|corrige que|en realidad es|el dato correcto es|para que sepas)\b/.test(t);
}

/**
 * ¿Es una PREGUNTA de conocimiento/examen (→ cerebro RAG) y no un caso a guiar?
 * Los casos ("cliente quiere cambiar la fecha", "reserva BOG MAD") no traen
 * signos ni palabras de pregunta → se van al flujo de procedimiento.
 */
function esPreguntaLibre(texto) {
  if (/[?¿]/.test(texto)) return true;
  const t = ' ' + String(texto || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') + ' ';
  return /\b(que es|que significa|para que sirve|cual|cuales|cuando|cuanto|cuanta|cuantos|diferencia|significa|desde que|desde donde|en que caso|se puede|cuando aplica)\b/.test(t);
}

/**
 * @param {object} payload  del widget. Campos de IA:
 *   · geminiEndpoint {string=}  puente del servidor ('/api/gemini'). Preferido.
 *   · geminiKey      {string=}  llave directa (respaldo del nivel gratis).
 *   · geminiModel    {string=}  modelo para el modo llave directa.
 */
export async function responderLocal(payload = {}) {
  const endpoint = (payload && payload.geminiEndpoint) || null;
  const geminiKey = (payload && payload.geminiKey) || null;

  // `caso:{}` blindado: responderCoachPublico revienta si caso llega null junto
  // a un procedimientoId. En el navegador siempre mandamos un objeto.
  const caso = { ...(payload && payload.caso) };

  // ── Sin IA (ni puente ni llave): determinista, gratis, sin red ───────────
  if (!endpoint && !geminiKey) {
    return responderCoachPublico({ ...payload, conIA: false, caso }, {});
  }

  // ── Con IA: el env decide el transporte (puente del servidor o llave) ─────
  const modelo = (payload && payload.geminiModel) || MODELO_POR_DEFECTO;
  const env = endpoint
    ? { GEMINI_ENDPOINT: endpoint, GEMINI_TIMEOUT_MS: 25000 }
    : { GEMINI_API_KEY: geminiKey, GEMINI_MODEL: modelo, GEMINI_TIMEOUT_MS: 20000 };

  // Clasificador: por el puente (servidor/Vertex) o directo (llave).
  const generar = endpoint
    ? (prompt, etiquetas) => conTimeout(generateIntentClassificationServidor(endpoint, prompt, etiquetas), 15000)
    : (prompt, etiquetas) => conTimeout(generateIntentClassification(geminiKey, modelo, prompt, etiquetas), 12000);

  // 1 · ENTENDER al novato antes de que el árbol decida. Solo cuando aporta:
  //     hay texto libre, aún no hay procedimiento ni intención, y no se pegó una
  //     pantalla (esa se lee sola, sin gastar IA).
  const consulta = payload && (payload.consulta || payload.texto || payload.mensaje);
  const hayPantalla = !!(caso.pantallas && caso.pantallas.length) || !!caso.pantalla;

  // Estado del turno que el router puede modificar.
  let procedimientoId = payload && payload.procedimientoId;
  let pasoActual = payload && payload.pasoActual;
  let reiniciar = false;

  // ── VÍA 0 · APRENDER (Fase 3) ─────────────────────────────────────────────
  // Si el agente te ENSEÑA un dato/corrección, lo guardas en su memoria (tras
  // su clave) y entrará al buscador. Es lo primero: gana a todo lo demás.
  if (endpoint && consulta && esAprendizaje(consulta)) {
    try {
      const r = await conTimeout(aprenderServidor(endpoint, consulta, payload && payload.claveHash), 15000);
      if (r && r.explicacion) return { explicacion: r.explicacion, esRespuestaLibre: true, decision: null };
    } catch (e) { /* si falla el guardado, sigue al flujo normal */ }
  }

  // ── VÍA 1 · PREGUNTA (RAG) ────────────────────────────────────────────────
  // Una pregunta de conocimiento se responde citando el manual — INCLUSO en
  // medio de un procedimiento (respuesta lateral que no descarrila el caso: no
  // toca el estado, así el alumno sigue donde iba).
  if (endpoint && consulta && !hayPantalla && !payload.comandoEscrito && esPreguntaLibre(consulta)) {
    try {
      const rag = await conTimeout(preguntarServidor(endpoint, redactarTextoSensible(consulta)), 25000);
      if (rag && rag.explicacion) {
        const cita = Array.isArray(rag.fuentes) && rag.fuentes.length
          ? `\n\n📚 *Fuente: ${rag.fuentes.join(' · ')}*` : '';
        return { explicacion: rag.explicacion + cita, esRespuestaLibre: true, decision: null };
      }
    } catch (e) { /* si el RAG falla, cae al flujo de procedimiento */ }
  }

  // ── VÍA 2 · CAMBIO DE TEMA ────────────────────────────────────────────────
  // Si hay un procedimiento activo y llega OTRA gestión distinta, se SUELTA el
  // procedimiento viejo y se reencamina (arregla el "se queda pegado").
  // OJO (auditoría): NO clasificar en cada turno — un alumno respondiendo ("no
  // ha volado", "13 marzo", "business") NO es un cambio de tema. Solo se
  // comprueba si hay una SEÑAL de cambio o una frase sustancial, y se exige
  // ALTA confianza. Así no se resetea por error ni se gasta IA de más.
  if (endpoint && procedimientoId && consulta && !hayPantalla && !payload.comandoEscrito && !payload.soloResponder) {
    const norm = String(consulta).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const senalCambio = /\b(mejor|ahora|en vez|en realidad|olvida|olvidemos|cambiemos|otra cosa|otra gestion|otro caso|nuevo caso|empecemos|empezar de nuevo|dejemos eso|no,? mejor)\b/.test(norm);
    const palabras = norm.trim().split(/\s+/).filter(Boolean).length;
    if (senalCambio || palabras >= 4) {
      try {
        const r = await entenderIntencion(redactarTextoSensible(consulta), { etiquetas: ETIQUETAS, mapa: mapaIntenciones, generar, deterministaFn: detectarIntencion });
        const distinta = r.intencion && r.intencion !== caso.intencion;
        const confiable = r.via === 'ia' && (r.confianza === 'alta' || senalCambio);
        if (distinta && confiable) {
          reiniciar = true;
          procedimientoId = null; pasoActual = null;
          caso.intencion = r.intencion;
          caso.respuestas = {}; caso.datos = {}; caso.pasajeros = null; caso.pantallas = [];
        }
      } catch (e) { /* ante duda, no reinicia: sigue el procedimiento */ }
    }
  }

  // ── VÍA 3 · CASO NUEVO (encaminar desde cero) ─────────────────────────────
  let noAdivinar = false;
  if (consulta && !procedimientoId && !caso.intencion && !hayPantalla) {
    const texto = redactarTextoSensible(consulta); // fuera PII antes de viajar
    let r = await entenderIntencion(texto, { etiquetas: ETIQUETAS, mapa: mapaIntenciones, generar, deterministaFn: detectarIntencion });
    if (!r.intencion && !r.ambiguo) {
      r = await entenderIntencion(texto, { etiquetas: ETIQUETAS, mapa: mapaIntenciones, generar, deterministaFn: detectarIntencion });
    }
    if (r.intencion) caso.intencion = r.intencion;
    else noAdivinar = true; // IA sin certeza → que pregunte, no que misrutee.
  }

  // ── VÍA 4 · CONTINUAR el procedimiento (lo que no cae en las anteriores) ──
  // MISMO cerebro del worker; el comando sale del manual. `reiniciar` avisa al
  // cliente para que limpie el estado del caso viejo.
  const respuesta = await responderCoachPublico({ ...payload, procedimientoId, pasoActual, conIA: true, caso, noAdivinar }, env);
  if (reiniciar && respuesta && typeof respuesta === 'object') respuesta.reiniciar = true;
  return respuesta;
}

/** Corta una promesa lenta para que un timeout no cuelgue el turno entero. */
function conTimeout(promesa, ms) {
  let t;
  return Promise.race([
    promesa.finally(() => clearTimeout(t)),
    new Promise((_, reject) => { t = setTimeout(() => reject(new Error('ia_timeout')), ms); })
  ]);
}

export { leerPantalla };
