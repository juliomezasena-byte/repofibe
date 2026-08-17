const CAMPOS = ['motivo', 'gestion', 'resultado'];
const MAX_CAMPO = 800;

const PREGUNTAS = {
  motivo: '¿Cuál fue el motivo del contacto? Sé exacto y no incluyas nombre, PNR, documento, correo ni teléfono.',
  gestion: '¿Qué gestión realizaste? Describe solo acciones realmente ejecutadas; no incluyas datos personales.',
  resultado: '¿Cuál fue el resultado final? Indica qué quedó confirmado, pendiente o rechazado.'
};

function normalizar(valor = '') {
  return String(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function esSolicitudTipificacion(texto = '') {
  const t = normalizar(texto);
  return /\b(tipifica|tipificame|tipificalo|tipificacion|tipifiquemelo|tipificar)\b/.test(t)
    || /\b(?:dame|haz|armame|ayudame con)\s+la\s+tipificacion\b/.test(t);
}

/**
 * Defensa local: la nota operativa no necesita reproducir identificadores.
 * Lo que no puede reconocerse con certeza se conserva; por eso la UI también
 * pide expresamente no pegar nombres ni PNR dentro de estos tres campos.
 */
export function sanitizarCampoTipificacion(valor = '') {
  return String(valor)
    .replace(/\b(?:\d[ -]?){13,19}\b/g, '[DATO PROTEGIDO]')
    .replace(/\b\d{3}-\d{7,10}\b/g, '[DATO PROTEGIDO]')
    .replace(/\b(?:SR\s+DOCS|DOCS\b)[^\n]*/gi, '[DATO PROTEGIDO]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[DATO PROTEGIDO]')
    .replace(/\+?\d[\d ()-]{7,}\d/g, '[DATO PROTEGIDO]')
    .replace(/\b(?:PNR|LOCALIZADOR|RESERVA)\s*[:#-]?\s*[A-Z0-9]{5,8}\b/gi, '$1 [DATO PROTEGIDO]')
    .replace(/\b(?:NOMBRE(?:\s+DEL\s+PASAJERO)?|APELLIDO|PASAJER[OA])\s*[:#-]\s*[^;\n,]+/gi, '$1: [DATO PROTEGIDO]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_CAMPO);
}

function extraerEtiquetado(texto = '') {
  const salida = {};
  const etiquetas = {
    motivo: 'motivo(?:\\s+del\\s+contacto)?',
    gestion: 'gesti[oó]n(?:\\s+realizada)?',
    resultado: 'resultado(?:\\s+final)?'
  };
  const todas = Object.values(etiquetas).join('|');
  for (const [campo, patron] of Object.entries(etiquetas)) {
    const re = new RegExp(`(?:^|[;\\n]\\s*|\\b)${patron}\\s*:\\s*([\\s\\S]*?)(?=[;\\n]\\s*(?:${todas})\\s*:|$)`, 'i');
    const match = String(texto).match(re);
    if (match?.[1]) salida[campo] = sanitizarCampoTipificacion(match[1]);
  }
  return salida;
}

function primerFaltante(campos) {
  return CAMPOS.find((campo) => !campos[campo]) || null;
}

function resumenContexto(contexto = {}) {
  const intencion = sanitizarCampoTipificacion(contexto.intencion || '');
  const procedimiento = sanitizarCampoTipificacion(contexto.procedimientoId || '');
  if (procedimiento) return `Ya tengo ubicado el procedimiento ${procedimiento.replace(/[-_]/g, ' ')}; necesito documentar lo ocurrido sin suponer el resultado.`;
  if (intencion) return `Ya tengo detectada la gestión ${intencion}; necesito el detalle exacto para no inventar.`;
  return '';
}

function crearDocumento(campos) {
  return [
    'TIPIFICACIÓN DEL CASO',
    '',
    'Datos del pasajero',
    'No incluidos en esta nota por protección de datos; consúltelos únicamente en el sistema autorizado.',
    '',
    'Motivo del contacto',
    campos.motivo,
    '',
    'Gestión realizada',
    campos.gestion,
    '',
    'Resultado',
    campos.resultado
  ].join('\n');
}

/**
 * Flujo determinista de tres datos. Nunca llama a un modelo y nunca completa
 * un campo ausente: pregunta hasta tener motivo, gestión y resultado.
 */
export function procesarTurnoTipificacion({ consulta = '', estado = null, contexto = {} } = {}) {
  const inicia = esSolicitudTipificacion(consulta);
  const pendiente = Boolean(estado?.pendiente);
  if (!inicia && !pendiente) return { manejado: false };

  const campos = { ...(estado?.campos || {}) };
  const etiquetados = extraerEtiquetado(consulta);
  Object.assign(campos, etiquetados);

  if (pendiente && Object.keys(etiquetados).length === 0) {
    const faltante = primerFaltante(campos);
    const valor = sanitizarCampoTipificacion(consulta);
    if (faltante && valor) campos[faltante] = valor;
  }

  const faltante = primerFaltante(campos);
  if (faltante) {
    const contextoVisible = resumenContexto(contexto);
    return {
      manejado: true,
      completado: false,
      explicacion: [contextoVisible, PREGUNTAS[faltante]].filter(Boolean).join('\n\n'),
      estado: { pendiente: true, campos }
    };
  }

  return {
    manejado: true,
    completado: true,
    explicacion: crearDocumento(campos),
    estado: { pendiente: false, campos: {} }
  };
}
