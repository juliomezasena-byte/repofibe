/** Redacta datos sensibles antes de cualquier llamada a un proveedor LLM. */
export function redactarTextoSensible(valor = '') {
  return String(valor)
    .replace(/\b(?:\d[ -]?){13,19}\b/g, '[REDACTED_CARD_OR_DOCUMENT]')
    .replace(/\b\d{3}-\d{10}\b/g, '[REDACTED_TICKET]')
    .replace(/\b(?:SR\s+DOCS|DOCS\b)[^\n]*/gi, '[REDACTED_DOCS]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]')
    .replace(/\+?\d[\d ()-]{7,}\d/g, '[REDACTED_PHONE]')
    .replace(/\b(?:PNR|LOCALIZADOR|RESERVA)\s*[:#-]?\s*[A-Z0-9]{5,8}\b/gi, '$1 [REDACTED_PNR]');
}
