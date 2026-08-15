// El modelo solo puede explicar. Si menciona una transacción, debe ser la
// que ya decidió tutor.js, o una variante de laboratorio segura.
const PREFIJOS = '(?:AN|SN|SS|NM|FX[A-Z]*|TK[A-Z]*|AP[A-Z]*|SR|ERK?|IR|ET|FZ|FP|TTP|TTM|TMI|TMC|TQM|TQC|TTO|TTE|TWD|RT|DTR|DEMR|XE|OS|RM|IBP|IEP[J]?|ITR|ITP)';
const COMANDO_EN_LINEA = new RegExp(`(?:^|\\n)\\s*((?:${PREFIJOS})\\b[^\\n\`]*|\\$\\$(?:CONFIG|PAY)\\b[^\\n\`]*)`, 'gim');
const COMANDO_EN_CODIGO = /\`([^`\n]+)\`/g;
const PAGO_REAL = /(?:MS-TT\s*,?\s*VI\d{8,}|FP\s+[^\n`]*\bVI\d{8,}|\$\$PAY\s*:\s*MS-TT|\b(?:PAN|CVV|CVC)\s*[:=])/i;
const OPERACION_SENSIBLE = /(?:^|\n|[`])\s*(?:TTP|FP|TMI|TTO|TK(?:OK|XL|TL)?|ETK?|\$\$(?:PAY|CONFIG))\b/i;
const DATO_SENSIBLE = /(?:\b\d{3}-\d{10}\b|\b(?:\d[ -]?){13,19}\b|SR\s+DOCS|\b(?:PNR|LOCALIZADOR)\s*[:#-]?\s*[A-Z0-9]{5,8}\b)/i;

function limpiarComando(valor = '') {
  return String(valor)
    .replace(/^\s*[-•]\s*/, '')
    .replace(/^\*+|\*+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.。]+$/, '');
}

function extraerComandos(texto = '') {
  const encontrados = [];
  for (const match of String(texto).matchAll(COMANDO_EN_LINEA)) encontrados.push(limpiarComando(match[1]));
  for (const match of String(texto).matchAll(COMANDO_EN_CODIGO)) {
    const valor = limpiarComando(match[1]);
    if (new RegExp(`^(?:${PREFIJOS})\\b|^\\$\\$(?:CONFIG|PAY)\\b`, 'i').test(valor)) encontrados.push(valor);
  }
  return [...new Set(encontrados.filter(Boolean))];
}

function normalizar(valor = '') {
  return limpiarComando(valor).toUpperCase();
}

/**
 * Gemini solo puede redactar. Esta frontera impide que una explicación del
 * modelo se convierta accidentalmente en una transacción ejecutable.
 */
export function validarRespuestaGemini(resultado, paso = null) {
  if (!resultado || typeof resultado !== 'object') return { ok: false, motivo: 'respuesta_no_objeto' };
  if (typeof resultado.explicacion !== 'string' || typeof resultado.diagnostico !== 'string') {
    return { ok: false, motivo: 'esquema_invalido' };
  }
  if (resultado.explicacion.length > 5000 || resultado.diagnostico.length > 1000) {
    return { ok: false, motivo: 'respuesta_demasiado_larga' };
  }

  const texto = `${resultado.explicacion}\n${resultado.diagnostico}`;
  const encontrados = extraerComandos(texto).map(normalizar);
  const autorizados = [paso?.comando, ...(paso?.variantes || [])]
    .filter(Boolean)
    .map(normalizar);
  if (PAGO_REAL.test(texto)) return { ok: false, motivo: 'datos_pago_real_detectados' };
  if (DATO_SENSIBLE.test(texto)) return { ok: false, motivo: 'dato_sensible_detectado' };
  // En laboratorio sí se pueden explicar FP CASH, $$CONFIG, $$PAY o TTM,
  // pero únicamente si son exactamente el comando que ya autorizó el paso.
  // Cualquier operación sensible distinta sigue siendo rechazada.
  if (OPERACION_SENSIBLE.test(texto) && encontrados.some((comando) => !autorizados.includes(comando))) {
    return { ok: false, motivo: 'operacion_sensible_no_autorizada' };
  }
  const noAutorizados = encontrados.filter((comando) => !autorizados.includes(comando));
  if (noAutorizados.length) return { ok: false, motivo: 'comando_no_autorizado' };

  return { ok: true, texto: resultado.explicacion, diagnostico: resultado.diagnostico };
}

export { extraerComandos, limpiarComando };
