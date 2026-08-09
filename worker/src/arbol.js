/**
 * Árbol de decisión: ¿qué procedimiento aplica a este caso?
 *
 * Es lo que ningún manual enseña. El camino correcto está repartido entre
 * cinco manuales y elegir mal cuesta dinero real: TTP/ETRV revalida sin
 * cobrar, FXI cobra.
 *
 * REGLA DE ORO: esta función NUNCA adivina. O decide con un hecho leído de
 * una pantalla, o devuelve la pregunta que hace falta responder. Cada paso
 * del camino dice CÓMO lo sabe, para que el alumno aprenda a mirar lo mismo.
 *
 * Función pura: sin fs, sin red. Vale igual en el Worker que en un test.
 */

/**
 * Los procedimientos que este árbol puede devolver.
 * El test comprueba que cada id existe de verdad en public/procedimientos/,
 * así que esta tabla no puede quedarse desfasada en silencio.
 */
export const DESTINOS = {
  'emision-latam': 'Emisión LATAM (primera emisión)',
  'cambio-voluntario-automatico': 'Cambio voluntario automático (#3111)',
  'cambio-manual-sin-segmento-volado': 'Cambio manual, sin segmento volado (#3121)',
  'cambio-manual-con-segmento-volado': 'Cambio manual, CON segmento volado (#3113)',
  'cambio-involuntario-misma-clase-ruta': 'Involuntario, misma clase y ruta (#3639)',
  'cambio-involuntario-diferente-clase-ruta': 'Involuntario, diferente clase y/o ruta (#3638)',
  'reembolso-iberia-general': 'Reembolso Iberia 075',
  'reembolso-ibex-no-pcc': 'Reembolso Iberia Express 060 por NO PCC',
  'mascota-en-cabina-petc': 'Mascota en cabina (PETC)',
  'mascota-en-bodega-avih': 'Mascota en bodega (AVIH)',
  'perro-asistencia-svan': 'Perro de asistencia (SVAN)',
  'umnr-menor-no-acompanado': 'Menor no acompañado (UMNR)',
  'equipaje-adicional-xbag': 'Equipaje adicional (XBAG)',
  'generar-split': 'Separar pasajeros (SPLIT)'
};

const SERVICIOS = {
  PETC: 'mascota-en-cabina-petc',
  AVIH: 'mascota-en-bodega-avih',
  SVAN: 'perro-asistencia-svan',
  UMNR: 'umnr-menor-no-acompanado',
  XBAG: 'equipaje-adicional-xbag'
};

/** Constructor del resultado, para no repetirse. */
function nuevo() {
  return { procedimientoId: null, titulo: null, camino: [], siguientePregunta: null, avisos: [], advertencias: [] };
}

function decidir(r, id, porque) {
  r.procedimientoId = id;
  r.titulo = DESTINOS[id] || id;
  if (porque) r.avisos.push(porque);
  return r;
}

function preguntar(r, id, texto, opciones, porQueImporta) {
  r.siguientePregunta = { id, texto, opciones, porQueImporta };
  return r;
}

function paso(r, pregunta, respuesta, comoLoSe) {
  r.camino.push({ pregunta, respuesta, comoLoSe });
}

/**
 * @param {object} caso
 * @param {'cambio'|'reembolso'|'servicio'|'emision'} caso.intencion
 * @param {object} [caso.billete]    salida de analizarBillete()
 * @param {object} [caso.pnr]        salida de leerPnr()
 * @param {object} [caso.historico]  salida de leerHistorico()
 * @param {object} [caso.respuestas] lo que el alumno ya ha contestado
 */
export function queProcedimiento(caso = {}) {
  const { intencion, billete = null, pnr = null, historico = null, respuestas = {} } = caso;
  const r = nuevo();

  if (!intencion) {
    return preguntar(r, 'intencion', '¿Qué necesita el pasajero?',
      [
        { valor: 'emision', texto: 'Comprar un billete nuevo' },
        { valor: 'cambio', texto: 'Cambiar un vuelo' },
        { valor: 'reembolso', texto: 'Que le devuelvan el dinero' },
        { valor: 'servicio', texto: 'Añadir un servicio (mascota, menor, equipaje…)' }
      ],
      'Cada rama tiene manuales distintos. Es la primera bifurcación de todo el trabajo.');
  }

  if (intencion === 'emision') {
    paso(r, '¿Qué necesita?', 'Emitir un billete nuevo', 'Lo has indicado tú');
    return decidir(r, 'emision-latam',
      'Recuerda: en primera emisión SOLO se hacen reservas ON HOLD. El pago lo completa el pasajero en iberia.com.');
  }

  if (intencion === 'servicio') return ramaServicio(r, caso, respuestas);
  if (intencion === 'reembolso') return ramaReembolso(r, billete, respuestas);
  if (intencion === 'cambio') return ramaCambio(r, billete, pnr, historico, respuestas);

  r.avisos.push(`Intención desconocida: "${intencion}".`);
  return r;
}

// ── SERVICIOS ───────────────────────────────────────────────────

function ramaServicio(r, caso, respuestas) {
  const s = respuestas.servicio;
  if (!s) {
    return preguntar(r, 'servicio', '¿Qué servicio hay que añadir?',
      Object.keys(SERVICIOS).map((k) => ({ valor: k, texto: k })),
      'Cada servicio tiene su propio procedimiento y su propio código EMD.');
  }
  const id = SERVICIOS[s.toUpperCase()];
  if (!id) { r.avisos.push(`No tengo procedimiento para el servicio "${s}".`); return r; }

  paso(r, '¿Qué servicio?', s.toUpperCase(), 'Lo has indicado tú');

  // Antes de nada: ¿la ruta lo permite? Es el error que más cuesta.
  if (['PETC', 'AVIH'].includes(s.toUpperCase())) {
    r.advertencias.push(
      'ANTES de solicitarlo, comprueba la matriz de restricciones por trayecto. ' +
      'El AVIH está PROHIBIDO en 20 de los 23 trayectos de la tabla, y la restricción NO es simétrica: ' +
      'la misma ruta puede permitirlo en un sentido y no en el otro.'
    );
  }
  if (s.toUpperCase() === 'AVIH') {
    r.avisos.push('Solo vuelos operados por Grupo Iberia (IB, Air Nostrum, Iberia Express). NO Vueling ni LEVEL.');
  }
  return decidir(r, id);
}

// ── REEMBOLSO ───────────────────────────────────────────────────

function ramaReembolso(r, billete, respuestas) {
  const placa = billete?.placa || respuestas.placa;
  if (!placa) {
    return preguntar(r, 'placa', '¿El billete es 075 (Iberia) o 060 (Iberia Express)?',
      [{ valor: '075', texto: '075 — Iberia' }, { valor: '060', texto: '060 — Iberia Express' }],
      'Cambia el procedimiento entero: en 075 se crea caso en Salesforce, en 060 NO.');
  }
  paso(r, '¿Qué placa?', placa, billete?.placa ? 'Leído del número de billete' : 'Me lo has dicho tú');

  // Comprobaciones que ya se pueden hacer sin abrir el manual
  if (billete) {
    if (billete.reembolsable === false) {
      r.advertencias.push(
        `La tarifa es ${billete.familia} y su reembolso figura como NO PERMITIDO. ` +
        'Solo las familias FLEX (FLEX, PEFLEX, BUSFLEX) son reembolsables. ' +
        'Confírmalo con las condiciones de tarifa antes de crear el caso.'
      );
    }
    if (billete.algunSegmentoVolado) {
      r.advertencias.push('Hay cupones ya volados: el reembolso, si procede, sería PARCIAL.');
    }
    const fueraDeVigencia = (billete.avisos || []).some((a) => a.includes('18 MESES'));
    if (fueraDeVigencia) r.advertencias.push('El billete supera los 18 MESES desde el DOI: fuera de vigencia.');
  }

  if (placa === '060') {
    r.advertencias.push(
      'ATENCIÓN: el procedimiento de reembolso IBEX que tenemos está al 10% verbatim — ' +
      'casi todo viene de un resumen de bot, no del manual original. No lo uses como solucionario.'
    );
    return decidir(r, 'reembolso-ibex-no-pcc');
  }
  return decidir(r, 'reembolso-iberia-general',
    'Primero comprueba responsabilidad con PV: si el billete es de agencia, la agencia hace el reembolso, no Iberia.');
}

// ── CAMBIO — la rama que ningún manual dibuja entera ─────────────

function ramaCambio(r, billete, pnr, historico, respuestas) {
  // 1 · ¿Ha volado algún segmento?
  let volado = respuestas.volado;
  let comoSeSabe = 'Me lo has dicho tú';
  if (billete && typeof billete.algunSegmentoVolado === 'boolean') {
    volado = billete.algunSegmentoVolado;
    comoSeSabe = volado
      ? 'Leído del billete: hay un cupón en estado usado (USED/BOARDED)'
      : 'Leído del billete: TODOS los cupones dicen OPEN FOR USE';
  }
  if (typeof volado !== 'boolean') {
    return preguntar(r, 'volado', '¿El pasajero ya ha volado algún tramo?',
      [{ valor: true, texto: 'Sí, ya voló alguno' }, { valor: false, texto: 'No, ninguno' }],
      'Si voló algo, el TST hay que montarlo a mano en cryptic. Si no, el sistema lo genera solo.');
  }
  paso(r, '¿Ha volado algún segmento?', volado ? 'Sí' : 'No', comoSeSabe);

  if (volado) {
    return decidir(r, 'cambio-manual-con-segmento-volado',
      'Con segmento volado se cotiza con FQD/FQP DESDE EL BILLETE, y el TST se monta a mano (TTC/S → TQTC → TTI).');
  }

  // 2 · ¿Voluntario o involuntario?
  let involuntario = respuestas.involuntario;
  comoSeSabe = 'Me lo has dicho tú';

  if (historico && (historico.cancelaciones?.length || historico.cambiosDeHora?.length)) {
    involuntario = true;
    const partes = [];
    if (historico.cancelaciones?.length) partes.push(`${historico.cancelaciones.length} vuelo(s) cancelado(s) (UN)`);
    if (historico.cambiosDeHora?.length) partes.push(`${historico.cambiosDeHora.length} cambio(s) de hora`);
    comoSeSabe = `Leído del histórico (RHA): ${partes.join(' y ')}`;
    for (const c of historico.cambiosDeHora || []) {
      r.avisos.push(
        `${c.aerolinea}${c.vuelo} ${c.origen}-${c.destino}: ${c.sentido} ${c.desfaseHoras} h. ` +
        'El umbral para que el pasajero pueda ELEGIR es 1 h en corto/medio radio y 3 h en largo radio.'
      );
    }
    if (historico.opcionesOfrecidas?.length) {
      r.avisos.push(`El sistema ya agendó ${historico.opcionesOfrecidas.length} opción(es) (líneas AS con TK). Búscalas antes de montar otra a mano.`);
    }
  } else if (typeof involuntario !== 'boolean' && pnr) {
    // El PNR sugiere pero no confirma: hay que ir al histórico
    const sospechosos = (pnr.segmentos || []).filter((s) => ['TK', 'UN'].includes(s.estado));
    if (sospechosos.length) {
      r.advertencias.push(
        `El PNR tiene ${sospechosos.length} segmento(s) en ${[...new Set(sospechosos.map((s) => s.estado))].join('/')} ` +
        `(línea ${sospechosos.map((s) => s.linea).join(', ')}). Eso APUNTA a un cambio involuntario, ` +
        'pero hay que confirmarlo con RHA antes de cobrarle nada al pasajero.'
      );
      return preguntar(r, 'historico', 'Lanza RHA y pega aquí el histórico',
        null,
        'Si es involuntario, el pasajero puede no tener que pagar. Cobrarle sería un error en su contra.');
    }
  }

  if (typeof involuntario !== 'boolean') {
    return preguntar(r, 'involuntario', '¿El cambio lo pide el pasajero o lo provocó la aerolínea?',
      [
        { valor: false, texto: 'Lo pide el pasajero (voluntario)' },
        { valor: true, texto: 'Lo provocó Iberia: cancelación, cambio de hora, downgrading… (involuntario)' }
      ],
      'Es la bifurcación más cara del árbol: en un involuntario el pasajero puede no pagar nada.');
  }
  paso(r, '¿Voluntario o involuntario?', involuntario ? 'Involuntario' : 'Voluntario', comoSeSabe);

  return involuntario ? ramaInvoluntaria(r, billete, respuestas) : ramaVoluntaria(r, respuestas);
}

function ramaInvoluntaria(r, billete, respuestas) {
  const cambiaClaseORuta = respuestas.cambiaClaseORuta;
  if (typeof cambiaClaseORuta !== 'boolean') {
    return preguntar(r, 'cambiaClaseORuta', 'El vuelo nuevo, ¿mantiene la MISMA clase y la MISMA ruta?',
      [
        { valor: false, texto: 'Sí, misma clase y misma ruta' },
        { valor: true, texto: 'No, cambia la clase y/o la ruta' }
      ],
      'Aquí se decide si se REVALIDA (no cobra) o se REEMITE (cobra). Es la diferencia más cara del árbol.');
  }
  paso(r, '¿Cambia clase o ruta?', cambiaClaseORuta ? 'Sí' : 'No', 'Me lo has dicho tú');

  if (!cambiaClaseORuta) {
    return decidir(r, 'cambio-involuntario-misma-clase-ruta',
      'Se REVALIDA con TTP/ETRV: se actualiza el mismo billete sin cotizar penalidad ni generar TST. NO se cobra nada.');
  }

  r.advertencias.push('En cambio de ruta el desvío máximo es de 250 MILLAS. Compruébalo con FQM {origen} {destino} antes de seguir.');
  if (billete?.ventana) {
    const mas48 = billete.ventana === 'COMERCIAL';
    r.avisos.push(
      `El vuelo está a ${billete.diasHastaElProximoVuelo} día(s) → ventana ${billete.ventana}. ` +
      (mas48
        ? 'Como está a MÁS de 48 h, la cotización lleva /SC: FXI/SC/TKT…'
        : 'Como está a MENOS de 48 h, la cotización va SIN /SC: FXI/TKT…')
    );
  } else {
    r.advertencias.push('Comprueba si el vuelo nuevo está a más o menos de 48 h: decide si la cotización lleva /SC o no.');
  }
  return decidir(r, 'cambio-involuntario-diferente-clase-ruta');
}

function ramaVoluntaria(r, respuestas) {
  const cotizo = respuestas.cotizo;
  if (typeof cotizo !== 'boolean') {
    r.avisos.push('Empieza SIEMPRE por el automático (#3111): FXF si el billete está en OPEN, FXE si FXF no deja.');
    return preguntar(r, 'cotizo', 'Al lanzar FXF o FXE, ¿el sistema devolvió una cotización?',
      [
        { valor: true, texto: 'Sí, devolvió cotización' },
        { valor: false, texto: 'No devolvió nada' }
      ],
      'Es la bifurcación que marca el propio manual #3111 en su paso 5. Si no cotiza, hay que calcularlo todo a mano.');
  }
  paso(r, '¿El sistema cotizó?', cotizo ? 'Sí' : 'No', 'Me lo has dicho tú');

  if (cotizo) {
    return decidir(r, 'cambio-voluntario-automatico',
      'Recuerda la pareja: lo cotizado con FXF se guarda con FXQ, y lo cotizado con FXE se guarda con FXO.');
  }
  return decidir(r, 'cambio-manual-sin-segmento-volado',
    'Camino manual: penalidad a histórico (FXX …/R,DOI,UP), diferencia de tarifa, y la penalidad va en un TSM aparte del TST.');
}

export default queProcedimiento;
