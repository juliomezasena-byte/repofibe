const CLAVE_SENSIBLE = /^(?:nombre|apellido|name|passenger|pasajero|pax|pnr|localizador|ticket|billete|numeroBillete|documento|pasaporte|passport|email|correo|telefono|phone|fechaNacimiento|dob|medical|diagnostico|diagnosis|fop|formaPago|token|authorization|autorizacion)$/i;
const TEXTO_MEDICO_AMPLIO = /(?:MEDA|diagn|hospitaliz|cirug|tratamiento|oxig|escolta m|INCAD)/i;
const TEXTO_MEDICO = /\b(?:MEDA|diagn[oó]stic|hospitaliz|cirug[ií]a|tratamiento|ox[ií]geno|escolta m[eé]dica|condici[oó]n m[eé]dica|INCAD)\b/i;

export function redactarTextoParaModelo(valor = '') {
  const texto = String(valor || '');
  if (!texto) return '';
  if (TEXTO_MEDICO.test(texto) || TEXTO_MEDICO_AMPLIO.test(texto)) {
    return '[CONTEXTO MEDA REDACTADO: existe una gestión médica; los datos clínicos no se envían al modelo]';
  }
  return texto
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[EMAIL_REDACTADO]')
    .replace(/\b(?:\+?\d[\d ()-]{7,}\d)\b/g, '[TELEFONO_REDACTADO]')
    .replace(/\b(?:075[- ]?)?\d{10,13}\b/g, '[TKT_REDACTADO]')
    .replace(/\b(?:PNR|LOCALIZADOR|RESERVA)\s*[:#-]?\s*[A-Z0-9]{5,8}\b/gi, '[PNR_REDACTADO]')
    .replace(/\b(?:PASAPORTE|PASSPORT|DOCUMENTO|DNI|RUC)\s*[:#-]?\s*[A-Z0-9-]{4,20}\b/gi, '[DOCUMENTO_REDACTADO]')
    .replace(/(?:MS-TT\s*,?\s*VI\d{8,}|\$\$PAY\s*:\s*MS-TT[^\s]*)/gi, '[TOKEN_PCI_REDACTADO]')
    .replace(/\b(?:PAN|CVV|CVC|TARJETA)\s*[:#-]?\s*[A-Z0-9 -]{4,24}\b/gi, '[PAGO_REDACTADO]');
}

export function sanitizarObjetoParaModelo(valor) {
  if (Array.isArray(valor)) return valor.map(sanitizarObjetoParaModelo);
  if (!valor || typeof valor !== 'object') return typeof valor === 'string' ? redactarTextoParaModelo(valor) : valor;

  const salida = {};
  for (const [clave, dato] of Object.entries(valor)) {
    if (CLAVE_SENSIBLE.test(clave)) {
      salida[clave] = '[DATO_SENSIBLE_REDACTADO]';
    } else if (typeof dato === 'string') {
      salida[clave] = redactarTextoParaModelo(dato);
    } else {
      salida[clave] = sanitizarObjetoParaModelo(dato);
    }
  }
  return salida;
}

export function sanitizarAprendizajes(aprendizajes = []) {
  return (Array.isArray(aprendizajes) ? aprendizajes : []).map((a) => ({
    fecha: a?.fecha || null,
    texto: redactarTextoParaModelo(a?.texto || a)
  }));
}
