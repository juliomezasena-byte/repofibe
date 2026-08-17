const CAMPOS_FUENTE = ['documento', 'tipo', 'recibido', 'ubicacion', 'verificadoPor', 'confianza'];

function slug(valor = '') {
  return String(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64);
}

export function prepararReferenciasRag(referencias) {
  if (!Array.isArray(referencias)) throw new TypeError('referencia-examen.json debe contener un arreglo');

  const verificadas = [];
  const pendientes = [];
  const ids = new Set();

  referencias.forEach((referencia, indice) => {
    const titulo = String(referencia?.titulo || '').trim();
    const texto = String(referencia?.texto || '').replace(/\s+/g, ' ').trim();
    if (!titulo || !texto) throw new Error(`Referencia ${indice + 1}: titulo y texto son obligatorios`);

    if (referencia.estado !== 'verificado') {
      pendientes.push({ titulo, motivo: referencia.motivoPendiente || 'Fuente operativa pendiente de verificación' });
      return;
    }

    const fuente = referencia.fuente || {};
    const faltantes = CAMPOS_FUENTE.filter((campo) => !String(fuente[campo] || '').trim());
    if (faltantes.length) throw new Error(`Referencia "${titulo}": faltan ${faltantes.join(', ')}`);

    const id = `ref#${slug(titulo)}`;
    if (ids.has(id)) throw new Error(`Referencia duplicada: ${id}`);
    ids.add(id);

    const etiquetaFuente = `${fuente.documento} · ${fuente.ubicacion}`;
    verificadas.push({
      id,
      proc: '_ref',
      titulo,
      fuente: etiquetaFuente,
      texto: `[${titulo}] ${texto}`,
      trazabilidad: {
        tipo: fuente.tipo,
        recibido: fuente.recibido,
        verificadoPor: fuente.verificadoPor,
        confianza: fuente.confianza
      }
    });
  });

  return { verificadas, pendientes };
}
