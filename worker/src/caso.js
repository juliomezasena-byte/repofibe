/**
 * Contrato de caso para el laboratorio.
 *
 * El Worker no guarda aquí nombres, documentos, teléfonos ni el texto crudo
 * pegado por el agente. Solo devuelve al navegador el estado mínimo para que
 * la conversación pueda continuar sin volver al menú inicial.
 */

const CAMPOS_SEGUROS = new Set([
  'origen', 'destino', 'fecha', 'fechaRegreso', 'clase', 'lineaVuelo',
  'plazas', 'ADT', 'CHD', 'INF', 'total',
  'paisMercado', 'mercado', 'moneda', 'descuentoPais', 'descuentoTipo', 'cobroCOP'
]);

function datosSeguros(caso = {}) {
  const datos = {};
  for (const [clave, valor] of Object.entries(caso.datos || {})) {
    if (CAMPOS_SEGUROS.has(clave) && valor !== undefined && valor !== null && valor !== '') {
      datos[clave] = valor;
    }
  }
  const pasajeros = caso.pasajeros;
  if (pasajeros && typeof pasajeros === 'object') {
    for (const clave of ['ADT', 'CHD', 'INF', 'plazas', 'total']) {
      if (Number.isFinite(Number(pasajeros[clave]))) datos[clave] = Number(pasajeros[clave]);
    }
  }
  return datos;
}

function evidenciaSegura(caso = {}, lectura = null) {
  const pantallas = Array.isArray(caso.pantallas) ? caso.pantallas : [];
  return {
    pantallasPegadas: pantallas.length + (caso.pantalla ? 1 : 0),
    tiposDetectados: [...new Set([
      ...pantallas.map((texto) => typeof texto === 'string' && texto.includes('AN ') ? 'disponibilidad' : null),
      lectura?.tipo || null,
      lectura?.errorPantalla ? 'error-sistema' : null
    ].filter(Boolean))],
    hayErrorSistema: Boolean(lectura?.errorPantalla),
    hayTextoCrudo: Boolean(caso.pantalla || pantallas.length)
  };
}

function etapaDe(resultado = {}) {
  if (resultado.error) return 'blocked';
  if (resultado.terminado) return 'completed';
  if (resultado.paso) return 'in_progress';
  if (resultado.decision?.siguientePregunta) return 'intake';
  return 'triage';
}

function requiereConfirmacion(comando) {
  return Boolean(comando && /\b(?:TK|ET|ER|FXP|FXU|TTP|ISSUE|EMIT|ON\s*HOLD)\b/i.test(comando));
}

function preguntaPorDatosFaltantes(resultado = {}) {
  const faltan = resultado.paso?.faltanDatos || [];
  if (!faltan.length) return null;
  const etiquetas = {
    origen: 'aeropuerto de origen',
    destino: 'aeropuerto de destino',
    fecha: 'fecha del vuelo',
    fecha1: 'fecha de ida',
    fecha2: 'fecha de regreso',
    plazas: 'número de plazas'
  };
  return {
    id: 'datosFaltantes',
    texto: `Para montar el comando del paso ${resultado.paso.n} necesito: ${faltan.map((dato) => etiquetas[dato] || dato).join(', ')}.`,
    campos: faltan
  };
}

export function crearCaseState({ body = {}, resultado = {}, environment = 'lab' } = {}) {
  const casoOriginal = body.caso || {};
  const caso = {
    ...casoOriginal,
    datos: { ...(casoOriginal.datos || {}), ...(resultado.datosCaso || {}) },
    pasajeros: casoOriginal.pasajeros || resultado.pasajerosCaso || null
  };
  const decision = resultado.decision || {};
  const procedureId = resultado.procedimientoId || decision.procedimientoId || body.procedimientoId || null;
  const comando = resultado.paso?.comando || null;
  const pregunta = resultado.pregunta || decision.siguientePregunta || resultado.siguientePregunta || preguntaPorDatosFaltantes(resultado);
  const currentStep = resultado.pasoActual ?? body.pasoActual ?? null;

  return {
    conversationId: caso.conversationId || body.conversationId || null,
    environment,
    objective: decision.intencionActiva || caso.intencion || null,
    procedure: procedureId ? {
      id: procedureId,
      title: resultado.titulo || decision.titulo || null,
      source: 'manuales sincronizados',
      version: 'generated'
    } : null,
    stage: etapaDe(resultado),
    data: datosSeguros(caso),
    answers: { ...(caso.respuestas || {}), ...(decision.respuestasActivas || {}) },
    currentStep,
    nextCommand: comando,
    question: pregunta,
    evidence: evidenciaSegura(caso, resultado.lectura),
    notices: [...new Set([...(decision.avisos || []), ...(resultado.avisos || [])])],
    confirmationRequired: requiereConfirmacion(comando),
    updatedAt: new Date().toISOString()
  };
}

export function enriquecerRespuestaLab(body, resultado) {
  const caso = crearCaseState({ body, resultado, environment: 'lab' });
  return {
    ...resultado,
    environment: 'lab',
    caso,
    procedure: caso.procedure,
    question: caso.question,
    mode: caso.stage === 'blocked' ? 'blocked' : caso.procedure ? 'manual-first' : 'intake'
  };
}
