/**
 * Entender al novato: de "cómo habla la gente" a "qué gestión es".
 *
 * PROBLEMA QUE RESUELVE: el detector determinista (coach.js) acierta con la
 * palabra exacta ("corregir nombre") pero falla con la frase natural ("el
 * nombre está mal escrito") y a veces MISRUTEA ("cambiarle el nombre" iba a
 * cambio de vuelo). Un novato no habla en comandos.
 *
 * CÓMO LO RESUELVE SIN ALUCINAR: dos etapas.
 *   1. Determinista primero (gratis, instantáneo) — para lo obvio.
 *   2. Si el determinista no está seguro → clasificador de IA de CONJUNTO
 *      CERRADO. La IA solo puede devolver una de las intenciones válidas,
 *      "ninguna" o "ambiguo" (lo fuerza el responseSchema con enum). Nunca
 *      inventa un procedimiento ni un comando. Y aquí, además, se REVALIDA en
 *      JS que la etiqueta esté en el conjunto: si por lo que sea no lo está,
 *      se trata como "no sé, pregunta".
 *
 * Cuando la IA dice "ambiguo" o su confianza es baja, el tutor NO adivina:
 * devuelve una señal para que PREGUNTE. Eso es lo que hace un asistente
 * brillante — aclara en vez de arriesgarse a llevar al novato por el manual
 * equivocado.
 */

/**
 * Construye el prompt de clasificación. Si hay `mapa` (el mapa-intenciones
 * auditado de los manuales), le enseña a la IA el significado, cómo lo dice un
 * novato y las trampas de cada intención. Sin mapa, cae a la lista de ids.
 */
export function construirPromptClasificacion(texto, etiquetas, mapa = null) {
  const lineas = [
    'Eres el clasificador de un tutor de call center de Iberia. Un agente NOVATO describe, en sus palabras, qué necesita hacer con la reserva de un pasajero. Tu ÚNICO trabajo es decir a cuál de estas gestiones se refiere.',
    '',
    'REGLAS:',
    '- Responde SOLO con una etiqueta de la lista. No expliques, no des comandos.',
    '- Si el texto encaja claramente con una, devuélvela con confianza "alta".',
    '- Si podría ser DOS o más (p. ej. "cambiar el nombre" ¿es corregir el nombre o cambiar el vuelo?), devuelve "ambiguo".',
    '- Si no encaja con ninguna, devuelve "ninguna".',
    '- OJO con las trampas: cambiar el NOMBRE del pasajero NO es cambiar el VUELO. Que le devuelvan el dinero es un reembolso aunque mencione un cambio.',
    '',
    'GESTIONES POSIBLES:'
  ];

  for (const etiqueta of etiquetas) {
    const info = mapa && mapa[etiqueta];
    if (info) {
      const trampa = (info.noConfundirCon && info.noConfundirCon.length)
        ? `  (no confundir con: ${info.noConfundirCon.join('; ')})`
        : '';
      lineas.push(`- ${etiqueta}: ${info.significado || ''}${trampa}`);
    } else {
      lineas.push(`- ${etiqueta}`);
    }
  }

  lineas.push('', `TEXTO DEL AGENTE:\n"${texto}"`);
  return lineas.join('\n');
}

/**
 * Clasifica un texto libre en una intención del conjunto cerrado.
 *
 * @param {object} opts
 * @param {string[]} opts.etiquetas   conjunto cerrado de intenciones válidas
 * @param {object}  [opts.mapa]       mapa-intenciones (significados/trampas)
 * @param {Function} opts.generar     async (prompt, etiquetas) => {intencion, confianza}
 *                                     (inyectable: en test se mockea; en prod es Gemini)
 * @returns {Promise<{intencion: string|null, confianza: string, ambiguo: boolean}>}
 */
export async function clasificarIntencion(texto, { etiquetas, mapa = null, generar }) {
  if (!texto || !String(texto).trim() || !etiquetas?.length || typeof generar !== 'function') {
    return { intencion: null, confianza: 'baja', ambiguo: false };
  }

  const prompt = construirPromptClasificacion(texto, etiquetas, mapa);

  let salida;
  try {
    salida = await generar(prompt, etiquetas);
  } catch (e) {
    // Si la IA falla, no se inventa nada: se devuelve "no sé".
    return { intencion: null, confianza: 'baja', ambiguo: false };
  }

  const cruda = (salida?.intencion || '').trim();
  const confianza = (salida?.confianza || 'baja').trim();

  if (cruda === 'ambiguo') return { intencion: null, confianza, ambiguo: true };
  if (cruda === 'ninguna' || cruda === '') return { intencion: null, confianza, ambiguo: false };

  // Doble guardarraíl: aunque el enum ya lo restringe, se revalida en JS.
  // Una etiqueta fuera del conjunto se trata como "no sé": jamás se encamina
  // a un procedimiento que no existe.
  if (!etiquetas.includes(cruda)) {
    return { intencion: null, confianza: 'baja', ambiguo: false };
  }

  // Confianza baja = no arriesgar: mejor preguntar.
  if (confianza === 'baja') return { intencion: null, confianza, ambiguo: true };

  return { intencion: cruda, confianza, ambiguo: false };
}

/**
 * ¿La respuesta determinista es sospechosa por una trampa conocida?
 *
 * El detector determinista dispara con palabras amplias ("cambiar") y a veces
 * acierta la palabra pero se equivoca de gestión. Estas son las confusiones
 * caras que el auditor de manuales confirmó: cambiar el NOMBRE no es cambiar
 * el VUELO; que le devuelvan el dinero es un reembolso; pedir silla PERO con
 * una condición médica es MEDA, no PMR. Si hay trampa, NO se confía en el
 * determinista: se deja que la IA lea la frase entera.
 */
export function hayConflicto(texto, intencionDeterminista) {
  const t = ' ' + String(texto || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') + ' ';
  if (intencionDeterminista === 'cambio') {
    if (/\bnombre\b|\bapellido\b/.test(t)) return true;                       // ¿corregir el nombre?
    if (/devolver|devuelvan|reembols|dinero de vuelta/.test(t)) return true;  // ¿reembolso?
  }
  if (intencionDeterminista === 'pmr-silla-de-ruedas') {
    if (/oxigeno|medic|enferm|hospital|camilla|incad|escayola|yeso/.test(t)) return true; // ¿MEDA?
  }
  if (intencionDeterminista === 'servicio' || intencionDeterminista === 'cambio') {
    // "on hold" es dirección opuesta según el verbo; que decida la IA.
    if (/\bon hold\b/.test(t)) return true;
  }
  return false;
}

/**
 * Gestiones GENERALES: tienen debajo una variante más específica, así que un
 * acierto determinista sobre ellas puede ser el bucket equivocado.
 *   · emision → emision-colombia-cop / descuento-panama / descuento-ecuador / on-hold
 *   · split   → maestro-split
 *   · cambio  → (o es corrección de nombre / reembolso)
 *   · pmr     → (o es casos-meda / descuento-ecuador)
 *   · servicio→ (asiento / equipaje / comida / mascota…)
 * Cuando el determinista cae en una de estas, se deja que la IA lea la frase
 * entera y decida la etiqueta fina. Las etiquetas específicas (correccion de
 * nombre, casos-meda, descuento-panama…) no tienen nada debajo: el determinista
 * las resuelve al instante, sin gastar IA.
 */
const GENERALES = new Set(['emision', 'split', 'cambio', 'pmr-silla-de-ruedas', 'servicio', 'reembolso']);

function requiereIA(intencion, texto) {
  return GENERALES.has(intencion) || hayConflicto(texto, intencion);
}

/**
 * El router. OPCIÓN A: la IA entiende el lenguaje natural del novato y decide
 * la etiqueta fina; el determinista resuelve al instante lo específico y hace
 * de respaldo si la IA no está disponible o falla.
 *
 * @param {Function} deterministaFn  (texto) => {intencion} | null  (coach.js)
 * @returns {Promise<{intencion:string|null, via:'determinista'|'ia'|'ninguna', ambiguo:boolean, confianza?:string}>}
 */
export async function entenderIntencion(texto, { etiquetas, mapa = null, generar, deterministaFn }) {
  const det = typeof deterministaFn === 'function' ? deterministaFn(texto) : null;
  const respaldo = () =>
    (det?.intencion && !hayConflicto(texto, det.intencion))
      ? { intencion: det.intencion, via: 'determinista', ambiguo: false }
      : { intencion: null, via: 'ninguna', ambiguo: false };

  // 1 · Determinista clava una etiqueta ESPECÍFICA (sin variante debajo) →
  //     resuelto al instante, sin gastar IA.
  if (det?.intencion && !requiereIA(det.intencion, texto)) {
    return { intencion: det.intencion, via: 'determinista', ambiguo: false };
  }

  // 2 · Todo lo demás (general, con trampa, o que el determinista no supo) →
  //     lo entiende la IA, atada al conjunto cerrado.
  if (typeof generar !== 'function') return respaldo();

  const r = await clasificarIntencion(texto, { etiquetas, mapa, generar });
  if (r.intencion) return { intencion: r.intencion, via: 'ia', ambiguo: false, confianza: r.confianza };
  if (r.ambiguo) {
    // La IA ve ambigüedad: no adivinar. (No caemos al respaldo determinista
    // aquí: si es ambiguo, es mejor preguntar que arriesgar el bucket general.)
    return { intencion: null, via: 'ninguna', ambiguo: true, confianza: r.confianza };
  }
  // La IA dijo "ninguna": último respaldo determinista si lo había.
  return respaldo();
}
