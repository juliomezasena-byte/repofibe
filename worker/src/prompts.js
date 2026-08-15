import material from './procedimientos.generated.json' with { type: 'json' };
import { redactarTextoParaModelo, sanitizarObjetoParaModelo, sanitizarAprendizajes } from './seguridad.js';

const GLOSARIO = material['_glosario']?.terminos || [];

/**
 * Los términos del glosario que aparecen de verdad en este paso.
 *
 * Existe porque el prompt le pedía al modelo "explica qué es un TST, un TSM,
 * un EMD" — es decir, le pedía que se sacara de la cabeza justo las
 * definiciones que ya habíamos verificado contra el material. Un glosario que
 * no se inyecta en runtime no protege de nada: la IA improvisa igual.
 *
 * Exportada para poder probarla sola.
 */
export function terminosDelPaso(paso, glosario = GLOSARIO) {
  const texto = [paso?.proceso, paso?.comando, paso?.explicacion, paso?.nota]
    .filter(Boolean).join(' \n ');
  if (!texto) return [];

  return glosario.filter((t) => {
    const patron = String(t.termino).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // \b no funciona con acentos en el borde ("cupón"), así que se delimita
    // a mano por lo que NO es letra.
    return new RegExp(`(^|[^\\p{L}\\p{N}])${patron}($|[^\\p{L}\\p{N}])`, 'iu').test(texto);
  });
}

/** Las líneas de glosario que se le pasan al modelo, ya redactadas. */
function bloqueGlosario(terminos) {
  if (!terminos.length) return [];
  const lineas = ['', 'VOCABULARIO VERIFICADO (usa ESTAS definiciones, no las tuyas):'];
  for (const t of terminos) {
    if (t.confianza === 'hueco') {
      lineas.push(`- ${t.termino}: NO está definido en el material. Si sale, di que lo pregunte a su instructor. NO lo definas tú.`);
      continue;
    }
    const nombre = t.nombreCompleto ? ` (${t.nombreCompleto})` : '';
    lineas.push(`- ${t.termino}${nombre}: ${t.definicion}`);
    if (t.ojo) lineas.push(`  OJO: ${t.ojo}`);
  }
  return lineas;
}

export const RUBRIC = [
  { name: 'Saludo y Pedir Nombre', description: 'Saluda profesionalmente identificando la aerolínea y solicita el nombre del cliente.' },
  { name: 'Filtro de Seguridad (Verificación de Datos)', description: 'Aplica obligatoriamente el filtro de seguridad solicitando localizador/PNR, nombre completo del titular y dato de recontacto (teléfono o correo) antes de modificar o brindar detalles sensibles.' },
  { name: 'Personalización y Trato Formal', description: 'Utiliza el nombre del cliente constantemente durante la llamada y mantiene un trato formal de Usted (sin tutear).' },
  { name: 'Parafraseo', description: 'Parafrasea y reconfirma la solicitud del cliente antes de proceder para asegurar entendimiento.' },
  { name: 'Gestión de Espera en Línea', description: 'Informa la razón de la espera antes de pausar y da las gracias por la permanencia en la línea al retomar.' },
  { name: 'Reglas de Producto Iberia', description: 'Demuestra conocimiento técnico del producto (ej: aclarar que no hay Premium Economy para corto radio, políticas de equipaje/reembolso) y cierra adecuadamente.' }
];

export function buildPassengerSystemPrompt(scenario) {
  return [
    'Eres un pasajero llamando por teléfono al centro de atención al cliente de Iberia.',
    `Tu situación: ${scenario.description}`,
    'Instrucciones de comportamiento:',
    '- Responde en español en 1-2 frases por turno.',
    '- No des todos tus datos de golpe al inicio: entrega tu nombre o localizador SOLO cuando el agente te lo pida explícitamente para el Filtro de Seguridad.',
    '- Si la ruta es de corto radio (ej: MAD-BCN, MAD-BER, FRA-MAD) y consultas por cabinas, pregunta curiosamente si puedes viajar en "Premium Economy" o "Turista Premium".',
    '- No menciones comandos técnicos de Amadeus ni terminología de sistema GDS: tú eres un pasajero común, no un agente.',
    '- Si el agente te solicita tus datos para el filtro de seguridad (PNR/código de reserva, teléfono o correo), proporciónalos amablemente.',
    '- Si el agente te atiende correctamente usando tu nombre, parafraseando y siendo profesional, responde de forma afable y colaborativa.',
    '- Si el agente resuelve tu caso, agradece y despídete.'
  ].join('\n');
}

export function buildEvaluationPrompt(scenario, transcript, procedimientos = {}) {
  const transcriptText = transcript
    .map((turn) => `${turn.role === 'agent' ? 'Agente' : 'Pasajero'}: ${redactarTextoParaModelo(turn.text)}`)
    .join('\n');

  const procId = scenario.procedimientoId;
  const proc = (procId && procedimientos) ? procedimientos[procId] : null;

  let rubricText = RUBRIC
    .map((c, i) => `${i + 1}. ${c.name}: ${c.description}`)
    .join('\n');

  let cantidadPilares = RUBRIC.length;
  let bloqueProcedimiento = '';

  if (proc) {
    cantidadPilares += 1;
    rubricText += `\n7. Procedimiento correcto: Evalúa si el agente siguió estrictamente el procedimiento oficial y ejecutó los comandos correctos del manual. No inventes pasos.`;

    const pasosTexto = (proc.pasos || [])
      .map((p) => {
        let det = `- Paso ${p.paso || ''}: ${p.proceso || ''}`;
        if (p.comando) det += ` (Comando esperado: ${p.comando})`;
        return det;
      })
      .join('\n');

    bloqueProcedimiento = [
      'PROCEDIMIENTO QUE APLICA:',
      `Manual: ${proc.titulo}`,
      `Fuente: ${proc.fuente?.documento || ''}`,
      'Pasos del manual oficial (No inventes pasos adicionales, cíñete a esta lista):',
      pasosTexto
    ].join('\n');
  }

  const parts = [
    'Eres un auditor de calidad senior de llamadas para el servicio al cliente de Iberia en Foundever.',
    `Situación del pasajero: ${scenario.description}`
  ];

  if (bloqueProcedimiento) {
    parts.push(bloqueProcedimiento);
  }

  parts.push(
    'Transcripción de la llamada:',
    transcriptText,
    `Evalúa rigurosamente el desempeño del Agente según estos ${cantidadPilares} pilares obligatorios de la campaña:`,
    rubricText,
    'Verifica especialmente:',
    '1. FILTRO DE SEGURIDAD: ¿El agente solicitó el nombre completo, código de reserva (PNR) y dato de contacto para verificar la identidad antes de gestionar?',
    '2. PERSONALIZACIÓN Y FORMALIDAD: ¿Pidió el nombre, usó el nombre del pasajero y mantuvo trato de Usted (evitando el tuteo)?',
    '3. PARAFRASEO: ¿Parafraseó y reconfirmó la solicitud del cliente?',
    '4. MANEJO DE TIEMPOS DE ESPERA: ¿Explicó la razón de la espera antes de pausar y dio las gracias por la permanencia en la línea al regresar?',
    '5. REGLAS DE PRODUCTO IBERIA: ¿Explicó correctamente las políticas (ej: informar que no hay Premium Economy para corto radio)?'
  );

  if (proc) {
    parts.push('6. PROCEDIMIENTO OFICIAL: ¿El agente aplicó el manual correspondiente y ejecutó los comandos técnicos requeridos?');
  }

  parts.push('Responde únicamente con el JSON de evaluación conteniendo score (0-100), fortalezas (strengths) y mejoras (improvements).');

  return parts.join('\n\n');
}

/**
 * Prompt del tutor.
 *
 * REGLA CENTRAL: el paso, el sistema y el COMANDO llegan ya decididos por
 * JavaScript (arbol.js + tutor.js), leídos de un manual verbatim. Aquí el
 * modelo SOLO redacta el porqué y el diagnóstico. Se le prohíbe
 * explícitamente emitir sintaxis, porque un comando inventado enseña mal.
 */
export function buildTutorPrompt({ procedimiento, paso, veredicto, avisos = [], saltoDeSistema = null, nivel = 'principiante', pregunta = null, continuidad = null }) {
  const partes = [
    'Eres un instructor de un centro de atención de Iberia. Enseñas a un agente NUEVO a manejar Amadeus y Resiber.',
    '',
    'CONTEXTO (ya resuelto por el sistema, NO lo discutas):',
    `- Procedimiento: ${procedimiento.titulo}`,
    `- Fuente: ${procedimiento.fuente?.documento || 'manual interno'}`,
    `- Paso ${paso.n}: ${paso.proceso}`,
    `- Sistema en el que hay que estar: ${String(paso.sistema || '').toUpperCase()}`,
    paso.comando ? `- Comando correcto: ${paso.comando}` : '- Este paso NO tiene comando.',
    paso.faltanDatos?.length ? `- DATOS QUE FALTAN: ${paso.faltanDatos.join(', ')}. Pide solo esos datos y NO muestres un comando de ejemplo ni uno incompleto.` : null,
    paso.explicacion ? `- Lo que dice el manual: ${paso.explicacion}` : null,
    paso.confianza !== 'verbatim' ? `- ATENCIÓN: este paso está marcado "${paso.confianza}", no es literal del manual.` : null
  ].filter(Boolean);

  if (saltoDeSistema) {
    partes.push(`- El alumno viene de ${saltoDeSistema.de.toUpperCase()} y este paso es de ${saltoDeSistema.a.toUpperCase()}.`);
  }
  if (avisos.length) {
    partes.push('- Avisos que debes incorporar:', ...avisos.map((a) => `  · ${a}`));
  }
  // El vocabulario del paso, con las definiciones ya verificadas contra el
  // material. Sin esto el modelo se inventaba qué es un TST.
  const terminos = terminosDelPaso(paso);
  partes.push(...bloqueGlosario(terminos));

  if (pregunta) {
    partes.push(
      'PREGUNTA O DUDA DEL ALUMNO (Responde a esto SIN salirte del contexto del manual):',
      `"${redactarTextoParaModelo(pregunta)}"`
    );
  }

  if (continuidad) {
    partes.push('CONTINUIDAD ESTRUCTURADA (sin texto sensible):', JSON.stringify(continuidad), 'Conserva los datos ya confirmados; no vuelvas a pedir un campo que aparezca en esta continuidad.');
  }

  if (veredicto) {
    partes.push(
      '',
      'LO QUE ESCRIBIÓ EL ALUMNO:',
      veredicto.correcto
        ? '- Acertó.'
        : `- Se equivocó. Motivo detectado: ${veredicto.motivo}${veredicto.pista ? ' | ' + veredicto.pista : ''}`
    );
  }

  partes.push(
    '',
    'REGLAS INNEGOCIABLES:',
    '1. NUNCA escribas un comando, sintaxis o transacción que no esté literalmente en el CONTEXTO de arriba. Ni siquiera de ejemplo.',
    '2. Si no sabes algo, di que no está en el material y que lo consulte con su instructor. Jamás lo rellenes.',
    '3. No repitas el comando: el alumno ya lo tiene en pantalla. Explica QUÉ CONSIGUE y QUÉ PASA SI SE LO SALTA.',
    '4. Habla de usted al pasajero y de tú al alumno. Español de España, claro y directo.',
    nivel === 'principiante'
      ? '5. El alumno es NUEVO: no des por sabido ningún término. Si en el paso sale uno del VOCABULARIO VERIFICADO, explícalo en media línea CON ESA definición, no con la tuya.'
      : '5. El alumno ya tiene práctica: ve al grano.',
    '6. Si un término NO está en el VOCABULARIO VERIFICADO, no lo definas: di que no está en el material. Inventar una definición es tan grave como inventar un comando.',
    '',
    'Devuelve un objeto JSON con TRES campos (NUNCA devuelvas markdown fuera del JSON, usa la sintaxis estricta):',
    '- "explicacion": Tu respuesta completa como coach. Puede ser larga si es un ejercicio complejo — descompón, explica, guía. Usa **negritas**, bullets (•), y saltos de línea para claridad.',
    '- "diagnostico": Resumen técnico breve del caso, o cadena vacía si no aplica.',
    '- "respuestaExtraida": Si recibes una NOTA INTERNA pidiendo un dato y el usuario lo responde en su mensaje, extrae el VALOR lógico (ej: true, false, "075", "060", "ib") y ponlo aquí. Si no hay respuesta clara, devuelve null.'
  );

  return partes.filter(Boolean).join('\n\n');
}

export function buildGeneralCoachPrompt({ consulta, lectura, aprendizajes = [], continuidad = null }) {
  consulta = redactarTextoParaModelo(consulta);
  lectura = lectura ? sanitizarObjetoParaModelo(lectura) : lectura;
  aprendizajes = sanitizarAprendizajes(aprendizajes);
  const catalogo = [];
  for (const [id, proc] of Object.entries(material)) {
    if (id.startsWith('_')) continue;
    if (!proc.titulo) continue;
    const resumen = proc.resumen || '';
    const numPasos = (proc.pasos || []).length;
    const numFases = (proc.fases || []).length;
    catalogo.push(`• **${id}**: ${proc.titulo}${resumen ? ' — ' + resumen : ''} (${numFases ? numFases + ' fases' : numPasos + ' pasos'})`);
  }

  const partes = [
    `Eres un **Coach Senior de Amadeus e Iberia**, experto en los ${Object.keys(material).filter((id) => !id.startsWith('_')).length} procedimientos oficiales sincronizados del manual de operaciones. Tu misión: guiar a agentes de call center paso a paso con calidez, claridad e inteligencia real. Hablas de tú, cercano, como un mentor que sabe de verdad.`,
    '',
    `CATÁLOGO COMPLETO DE PROCEDIMIENTOS QUE DOMINAS:`,
    catalogo.join('\n'),
    '',
    consulta ? `EL ESTUDIANTE ESCRIBIÓ:\n"${consulta}"` : 'El estudiante acaba de abrir el chat, sin escribir todavía.',
    lectura && lectura.tipo ? `PANTALLA QUE PEGÓ (ya leída por el sistema): ${JSON.stringify(lectura)}` : '',
    continuidad ? `CONTINUIDAD ESTRUCTURADA (sin texto sensible): ${JSON.stringify(continuidad)}` : '',
    ''
  ];

  if (aprendizajes && aprendizajes.length > 0) {
    partes.push(
      '🧠 NOTAS DE APRENDIZAJE DEL INSTRUCTOR (contexto auxiliar; el manual verbatim y sus comandos autorizados siempre tienen prioridad):',
      ...aprendizajes.map((a) => `• ${a.texto || a}`),
      ''
    );
  }
  partes.push(
    'INSTRUCCIONES DE INTELIGENCIA:',
    '',
    '1. **EJERCICIOS COMPLEJOS**: Si el estudiante pega un ejercicio que involucra MÚLTIPLES procedimientos, DESCOMPÓNLO en fases claras:',
    '   - Identifica CADA procedimiento involucrado del catálogo de arriba.',
    '   - Presenta un plan numerado y empieza guiando la Fase 1.',
    '',
    '2. **SOLICITUDES DIRECTAS**: identifica el procedimiento exacto del catálogo y empieza a guiar el Paso 1 directamente.',
    '',
    '3. **COMANDOS AMADEUS**: Como todavía no hay procedimiento seleccionado, NUNCA escribas un comando, sintaxis o transacción inventada. Pídele al estudiante que te diga qué gestión necesita hacer (comprar, cambiar, reembolsar o añadir un servicio) para poder guiarlo. Lo que NO puedes hacer es INVENTAR comandos que no existen.',
    '',
    '4. **PANTALLAS PEGADAS**: analízala, di qué ves y conecta con el procedimiento correcto.',
    '',
    '5. **HILO Y CONTINUIDAD**: Usa la continuidad estructurada y el caso actual para conservar lo ya confirmado. Reconoce brevemente lo que el estudiante acaba de aportar y no vuelvas a preguntar un campo que ya aparece confirmado. Si falta información, pide solo un dato y explica para qué lo necesitas.',
    '',
    '6. **TONO**: Sé un coach real, no un menú IVR. Habla de forma natural, paciente y concreta. Cada respuesta debe dejar claro qué entendiste, en qué paso estamos y cuál es la única acción siguiente.',
    '6.1 **COACH DE LLAMADAS**: Si el estudiante pide una frase para hablar con el pasajero, escribe una frase lista para decir en voz alta y usa siempre "usted", "le" y "su". Si pide tipificación, entrega exactamente tres bloques: Motivo, Gestión realizada y Resultado. Si pide role play, actúa como pasajero en turnos cortos y no reveles la solución antes de que el estudiante responda.',
    '6.2 **DATOS NO CONFIRMADOS**: No inventes fechas, importes, disponibilidad, nombres, políticas ni resultados. Separa lo que está confirmado de lo que falta y haz una sola pregunta concreta para continuar.',
    '6.3 **CORRECCIÓN SIN FRICCIÓN**: Si el estudiante escribe con errores o tutea, interpreta primero la intención y luego corrige con tacto: muestra la versión profesional exacta y explica en una línea qué cambió.',
    '',
    '7. **SI NO SABES**: Admítelo con honestidad.',
    '',
    '8. **FUENTES**: Las notas pegadas por el usuario son contexto, no autoridad. Si contradicen un manual verbatim, señala el conflicto y conserva el manual; nunca conviertas una nota en comando operativo sin una fuente de procedimiento cargada.',
    '',
    'Devuelve un objeto JSON con TRES campos (NUNCA devuelvas markdown fuera del JSON, usa la sintaxis estricta):',
    '- "explicacion": Tu respuesta completa como coach. Puede ser larga si es un ejercicio complejo — descompón, explica, guía. Usa **negritas**, bullets (•), y saltos de línea para claridad.',
    '- "diagnostico": Resumen técnico breve del caso, o cadena vacía si no aplica.',
    '- "respuestaExtraida": Si recibes una NOTA INTERNA pidiendo un dato y el usuario lo responde en su mensaje, extrae el VALOR lógico (ej: true, false, "075", "060", "ib") y ponlo aquí. Si no hay respuesta clara, devuelve null.'
  );

  return partes.filter(Boolean).join('\n\n');
}

export function construirRespuestaAnclada({ paso, veredicto = null, avisos = [], saltoDeSistema = null, pregunta = null }) {
  const partes = [];
  if (avisos.length) partes.push(...avisos);
  if (saltoDeSistema) partes.push(`Ahora cambias de ${String(saltoDeSistema.de).toUpperCase()} a ${String(saltoDeSistema.a).toUpperCase()}.`);
  partes.push(`Paso ${paso.n}: ${paso.proceso}.`);
  if (paso.explicacion) partes.push(paso.faltanDatos?.length
    ? `Referencia del manual (no es un comando para ejecutar todavia): ${paso.explicacion}`
    : paso.explicacion);
  if (paso.faltanDatos?.length) {
    partes.push(`Para montar el comando de este caso todavía necesito: ${paso.faltanDatos.join(', ')}. No ejecutes el ejemplo del manual.`);
  } else if (paso.simulacion?.comando) {
    partes.push(`Comando de laboratorio (no conecta pagos reales): ${paso.simulacion.comando}`);
  } else if (paso.comando) {
    partes.push(`Comando exacto para este caso: ${paso.comando}`);
  }
  if (veredicto) {
    partes.push(veredicto.correcto ? 'Correcto. Continúa con el siguiente paso cuando veas el resultado en pantalla.' : `Aún no es correcto: ${veredicto.motivo}${veredicto.pista ? ` ${veredicto.pista}` : ''}`);
  }
  if (pregunta && !veredicto) {
  partes.push(`Tu pregunta queda respondida dentro de este paso: ${paso.explicacion || paso.proceso}. Si preguntas por otro elemento, pegame el texto exacto y lo contrasto con el manual.`);
  }
  return partes.join(' ');
}

function construirRespuestaDeDecisionLegacy(decision = {}) {
  const partes = [...(decision.avisos || []), ...(decision.advertencias || [])];
  if (decision.siguientePregunta?.texto) {
    partes.push(decision.siguientePregunta.texto, 'Elige una opción o pega la pantalla que falta; no voy a suponer ese dato.');
  } else {
    partes.push('Cuéntame si necesitas comprar, cambiar, reembolsar o añadir un servicio. Con eso te guío paso a paso desde el manual.');
  }
  return partes.join(' ');
}

export function construirRespuestaDeDecision(decision = {}) {
  const partes = [...(decision.avisos || []), ...(decision.advertencias || [])];
  if (decision.siguientePregunta?.texto) {
    partes.push(`Entiendo el caso hasta aquí. Para seguir necesito saber: ${decision.siguientePregunta.texto} Puedes responder con tus palabras o usar una opción rápida; no voy a suponer ese dato.`);
  } else {
    partes.push('Cuéntame qué necesita el pasajero y qué ocurrió. Leeré lo que pegues, te haré solo las preguntas necesarias y te guiaré paso a paso desde el manual.');
  }
  return partes.join(' ');
}
