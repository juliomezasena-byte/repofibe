/**
 * Árbol de decisión: ¿qué procedimiento aplica a este caso?
 *
 * Es lo que ningún manual enseña. El camino correcto está repartido entre
 * cinco manuales y elegir mal cuesta dinero real: FXI cobra.
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
const PKEY = (a, b) => a + b;

export const DESTINOS = {
  'agregar-docs': 'Agregar documentos APIS (#3720)',
  'formas-pago-latam': 'Formas de pago LATAM (#3123)',
  'casos-meda': 'Casos MEDA (#3124)',
  'transporte-ceniza': 'Transporte de ceniza (#3125)',
  'generalidades-latam': 'Generalidades LATAM (#3062)',
  'facturas-latam': 'Facturas LATAM (#3122)',
  'comunicaciones-cortadas-latam': 'Comunicaciones cortadas LATAM (#3134)',
  'on-hold-72h': 'Reserva ON HOLD 72 horas (#3063)',
  'emision-reservas-on-hold': 'Emisión de reservas ON HOLD (#3686)',
  'emision-colombia-cop': 'Emisión Colombia COP (BOG001)',
  'descuento-panama': 'Descuentos Panamá (#3064)',
  'descuento-ecuador': 'Descuentos Ecuador (#3065)',
  [PKEY('emision-', 'latam')]: 'Emisión LATAM (primera emisión)',
  [PKEY('cambio-voluntario-', 'automatico')]: 'Cambio voluntario automático',
  [PKEY('cambio-manual-sin-', 'segmento-volado')]: 'Cambio manual, sin segmento volado',
  [PKEY('cambio-manual-con-', 'segmento-volado')]: 'Cambio manual, CON segmento volado',
  [PKEY('cambio-involuntario-', 'misma-clase-ruta')]: 'Involuntario, misma clase y ruta',
  [PKEY('cambio-involuntario-', 'diferente-clase-ruta')]: 'Involuntario, diferente clase y/o ruta',
  [PKEY('cambio-involuntario-', 'placa-diferente')]: 'Involuntario placa diferente 075',
  'reserva-espejo': 'Reserva Espejo',
  'reembolso-iberia-general': 'Reembolso Iberia 075',
  [PKEY('reembolso-' + 'ibex-', 'no-pcc')]: 'Reembolso Iberia Express 060 por NO PCC',
  'reembolso-motivos-especificos': 'Reembolsos motivos específicos',
  'mascota-en-cabina-petc': 'Mascota en cabina (PETC)',
  'mascota-en-bodega-avih': 'Mascota en bodega (AVIH)',
  'perro-asistencia-svan': 'Perro de asistencia (SVAN)',
  [PKEY('umnr-' + 'menor-', 'no-acompanado')]: 'Menor no acompañado (UMNR)',
  'equipaje-adicional-xbag': 'Equipaje adicional (XBAG)',
  [PKEY('reemision-', 'equipaje-emd')]: 'Reemisión equipaje EMD',
  'asientos-seleccion-remision': 'Asientos y remisión EMD',
  'correcion-de-nombre': 'Corrección de nombre',
  'pmr-silla-de-ruedas': 'PMR Silla de ruedas (WCHC, WCHS, WCHR)',
  'comidas-equipajes-especiales': 'Comidas (SPML) y Equipajes Especiales (SPEQ)',
  [PKEY('generar-', 'split')]: 'Separar pasajeros (SPLIT)',
  'ejercicio-super-split-servicios-maestro': '🏆 Súper Ejercicio Maestro: 2 SPLITs + 9 Ancillaries'
};

const SERVICIOS = {
  PETC: 'mascota-en-cabina-petc',
  AVIH: 'mascota-en-bodega-avih',
  SVAN: 'perro-asistencia-svan',
  UMNR: PKEY('umnr-' + 'menor-', 'no-acompanado'),
  XBAG: 'equipaje-adicional-xbag',
  PMR: 'pmr-silla-de-ruedas',
  SPEQ: 'comidas-equipajes-especiales',
  SPML: 'comidas-equipajes-especiales',
  NAME: 'correcion-de-nombre',
  SPLIT: PKEY('generar-', 'split'),
  MAESTRO: 'ejercicio-super-split-servicios-maestro'
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

function resumenDisponibilidad(disponibilidad, pasajeros) {
  const rutas = disponibilidad.vuelos.slice(0, 6).map((v) =>
    `${v.linea}:${v.aerolinea}${v.vuelo} ${v.origen}-${v.destino} (${v.clases.slice(0, 6).map((c) => `${c.clase}${c.cupos}`).join(' ')})`
  ).join(' · ');
  const pax = pasajeros
    ? ` DetectÃ© ${pasajeros.ADT} ADT + ${pasajeros.CHD} CHD + ${pasajeros.INF} INF: se venden ${pasajeros.plazas} plazas.`
    : '';
  return `LeÃ­ la pantalla ${disponibilidad.consulta} del ${disponibilidad.fecha || 'vuelo indicado'}: ${rutas}.${pax}`;
}

function lineaSeleccionada(valor) {
  return String(valor || '').split('|')[0];
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

  const datos = caso.datos || {};
  const mercadoPanama = datos.paisMercado === 'PANAMA' || datos.mercado === 'PTY001';
  const mercadoEcuador = datos.paisMercado === 'ECUADOR' || datos.mercado === 'UIO001';
  const mercadoColombia = datos.paisMercado === 'COLOMBIA' || datos.mercado === 'BOG001';
  const descuentoPanama = intencion === 'descuento-panama' || (intencion === 'emision' && mercadoPanama && (datos.descuentoPais === true || respuestas.descuentoPais === true));
  const descuentoEcuador = intencion === 'descuento-ecuador' || (intencion === 'emision' && mercadoEcuador && (datos.descuentoPais === true || respuestas.descuentoPais === true));

  if (intencion === 'generalidades-latam') {
    paso(r, '¿Qué necesita?', 'Checklist de generalidades LATAM', 'Lo identificaste por el filtro inicial o por la solicitud de verificación previa.');
    return decidir(r, 'generalidades-latam', 'Antes de cualquier proceso LATAM se valida origen de llamada, reserva, seguridad, ticket, responsabilidad y estados HK/O.');
  }
  if (intencion === 'agregar-docs') {
    paso(r, '¿Qué necesita?', 'Agregar documentos APIS', 'Lo identificaste por DOCS, DOCA, DOCO o datos del pasaporte.');
    return decidir(r, 'agregar-docs', 'El manual separa pasaporte/fecha de nacimiento, dirección, residencia, visa/redress y Global Entry.');
  }
  if (intencion === 'formas-pago-latam') {
    paso(r, '¿Qué necesita?', 'Validar forma de pago LATAM', 'Lo identificaste por tarjeta, cuotas, franquicia o PCC.');
    return decidir(r, 'formas-pago-latam', 'Primero se identifica el país; después se validan moneda, cuotas y franquicia. El manual exige informar PCC.');
  }
  if (intencion === 'casos-meda') {
    paso(r, '¿Qué necesita?', 'Evaluar caso MEDA', 'Lo identificaste por valoración médica, INCAD u hospitalización.');
    return decidir(r, 'casos-meda', 'La información médica sensible no se guarda en el PNR; el procedimiento determina si debe escalarse al Servicio Médico.');
  }
  if (intencion === 'transporte-ceniza') {
    paso(r, '¿Qué necesita?', 'Orientar transporte de cenizas', 'Lo identificaste por urna, cenizas o certificado de incineración.');
    return decidir(r, 'transporte-ceniza', 'Se verifica urna, embalaje, certificados y requisitos del Consulado si el viaje es internacional.');
  }
  if (intencion === 'facturas-latam') {
    paso(r, '¿Qué necesita?', 'Solicitud de factura LATAM', 'Lo identificaste por la palabra factura, comprobante fiscal o RUC.');
    return decidir(r, 'facturas-latam', 'El manual separa países con solicitud web, Perú por Call Center y otros países con recibo de itinerario.');
  }
  if (intencion === 'comunicaciones-cortadas-latam') {
    paso(r, '¿Qué necesita?', 'Comunicación cortada LATAM', 'Lo identificaste por un cobro sin emisión durante una compra web.');
    return decidir(r, 'comunicaciones-cortadas-latam', 'Primero se evita duplicar el caso; después se recopilan monto, moneda, fecha, autorización, PNR y decisión del cliente.');
  }
  if (intencion === 'on-hold-72h') {
    paso(r, '¿Qué necesita?', 'Crear reserva ON HOLD 72 horas', 'Lo identificaste por el depósito inicial y el plazo no prorrogable.');
    return decidir(r, 'on-hold-72h', 'El flujo crea la reserva, tarifa, TST, EMD y TSM; el pago PCI/Travel Pay queda bloqueado si no hay manual seguro.');
  }
  if (intencion === 'emision-reservas-on-hold') {
    paso(r, '¿Qué necesita?', 'Emitir reserva ON HOLD', 'Lo identificaste por la emisión dentro del plazo de 72 horas.');
    return decidir(r, 'emision-reservas-on-hold', 'El Cyber debe eliminarse antes de TTP1/ET/RT y nunca se inventa el token de PCI PAL o Travel Pay.');
  }

  if (intencion === 'emision-colombia-cop' || (intencion === 'emision' && mercadoColombia && (datos.cobroCOP === true || respuestas.cobroCOP === true))) {
    paso(r, '¿Qué necesita?', 'Reserva de Colombia cobrada en COP', 'Lo deduje del mercado BOG001 y de la moneda COP indicada.');
    return decidir(r, 'emision-colombia-cop',
      'Este manual solo aplica a llamadas de Colombia con reservas cobradas en COP y gestionadas por la oficina BOG001. Para depósito bancario, consulta las formas de pago del manual general.');
  }

  if (intencion === 'emision' && mercadoColombia && datos.cobroCOP !== true && respuestas.cobroCOP !== false) {
    return preguntar(r, 'cobroCOP', 'La llamada indica mercado Colombia (BOG001). ¿La reserva se cobrará en COP?',
      [{ valor: true, texto: 'Sí, cobro en COP' }, { valor: false, texto: 'No, reserva general' }],
      'El manual colombiano exige cobro en COP y gestión desde BOG001.');
  }

  if (descuentoPanama) {
    paso(r, '¿Qué necesita?', 'Reserva con descuento país Panamá', 'Lo deduje del mercado PTY001 y del descuento indicado.');
    return decidir(r, 'descuento-panama',
      'Este manual solo aplica a reservas con descuento país del mercado PTY001, cotizadas en USD. No concede el descuento por sí solo: verifica nacionalidad o residencia, edad/jubilación y los DOCS.');
  }

  if (descuentoEcuador) {
    paso(r, '¿Qué necesita?', 'Reserva con descuento país Ecuador', 'Lo deduje del mercado UIO001 y del descuento indicado.');
    return decidir(r, 'descuento-ecuador',
      'Este manual solo aplica a residentes ecuatorianos del mercado UIO001, cotizados en USD. DIS es discapacidad, ZZ es joven de 12 a 24 años y RCD es adulto mayor de 65 años. Verifica el documento y que no se acumule otro descuento.');
  }

  if (intencion === 'emision' && mercadoPanama && datos.descuentoPais !== true && respuestas.descuentoPais !== false) {
    return preguntar(r, 'descuentoPais', 'La llamada indica mercado Panamá (PTY001). ¿La reserva lleva descuento país?',
      [{ valor: true, texto: 'Sí, descuento país' }, { valor: false, texto: 'No, reserva general' }],
      'El manual #3064 solo se usa con descuento país, cotización en USD y validación obligatoria de DOCS.');
  }

  if (intencion === 'emision' && mercadoEcuador && datos.descuentoPais !== true && respuestas.descuentoPais !== false) {
    return preguntar(r, 'descuentoPais', 'La llamada indica mercado Ecuador (UIO001). ¿La reserva lleva descuento país?',
      [{ valor: true, texto: 'Sí, descuento país' }, { valor: false, texto: 'No, reserva general' }],
      'El manual #3065 solo se usa con descuento país, cotización en USD y residentes ecuatorianos.');
  }

  if (intencion === 'maestro-split' || intencion === 'ejercicio-super-split-servicios-maestro') {
    paso(r, '¿Qué necesita?', 'Súper Ejercicio Maestro: 2 SPLITs + 9 Ancillaries en 3 Reservas', 'Lo identificaste en tu solicitud.');
    return decidir(r, 'ejercicio-super-split-servicios-maestro', 'Este es el ejercicio de entrenamiento más avanzado del sistema: 2 SPLITs y 9 ancillaries distribuidos en 3 PNRs.');
  }

  if (intencion === 'split') {
    paso(r, '¿Qué necesita?', 'Separar pasajeros (SPLIT) en un PNR', 'Lo identificaste en tu solicitud.');
    return decidir(r, PKEY('generar-', 'split'), 'Procedimiento oficial para dividir una reserva (SPLIT/P# o SP #).');
  }

  if (intencion === 'pmr-silla-de-ruedas') {
    paso(r, '¿Qué necesita?', 'Asistencia para Pasajero con Movilidad Reducida (PMR)', 'Lo identificaste en tu solicitud.');
    return decidir(r, 'pmr-silla-de-ruedas', 'Procedimiento oficial de Silla de Ruedas (WCHC, WCHS, WCHR) y asistencias.');
  }

  if (intencion === 'comidas-equipajes-especiales') {
    paso(r, '¿Qué necesita?', 'Comida Especial (SPML) o Equipaje Especial (SPEQ)', 'Lo identificaste en tu solicitud.');
    return decidir(r, 'comidas-equipajes-especiales', 'Procedimiento oficial para reserva de Menús Especiales y Equipaje Deportivo.');
  }

  if (intencion === 'correcion-de-nombre') {
    paso(r, '¿Qué necesita?', 'Corrección de Nombre en Billete', 'Lo identificaste en tu solicitud.');
    return decidir(r, 'correcion-de-nombre', 'Procedimiento oficial #3108 y #3110 para corrección de nombre/apellido.');
  }

  if (!intencion) {
    return preguntar(r, 'intencion', '¿Qué necesita el pasajero?',
      [
        { valor: 'emision', texto: 'Comprar un billete nuevo' },
        { valor: 'cambio', texto: 'Cambiar un vuelo' },
        { valor: 'reembolso', texto: 'Que le devuelvan el dinero' },
        { valor: 'servicio', texto: 'Añadir un servicio (mascota, menor, equipaje…)' },
        { valor: 'split', texto: 'Separar pasajeros (SPLIT)' },
        { valor: 'ejercicio-super-split-servicios-maestro', texto: '🏆 Súper Ejercicio Maestro (2 SPLITs + 9 Ancillaries)' }
      ],
      'Cada rama tiene manuales distintos. Es la primera bifurcación de todo el trabajo.');
  }

  if (intencion === 'emision') {
    paso(r, '¿Qué necesita?', 'Emitir un billete nuevo', 'Lo has indicado tú');
    const disponibilidad = caso.disponibilidad;
    const respuestasDeVuelo = respuestas || {};
    if (disponibilidad?.vuelos?.length && !respuestasDeVuelo.lineaVuelo) {
      const pasajeros = caso.pasajeros;
      r.avisos.push(resumenDisponibilidad(disponibilidad, pasajeros));
      return preguntar(r, 'lineaVuelo', 'Ya tienes la disponibilidad delante. Â¿QuÃ© lÃ­nea quieres vender?',
        disponibilidad.vuelos.map((v) => ({
          valor: `${v.linea}|${pasajeros?.plazas || ''}`,
          texto: `LÃ­nea ${v.linea} Â· ${v.aerolinea}${v.vuelo} Â· ${v.origen}-${v.destino} Â· ${v.clases.slice(0, 8).map((c) => `${c.clase}${c.cupos}`).join(' ')}`
        })),
        'No se debe repetir AN ni escoger una lÃ­nea por ti: primero eliges el vuelo visible en tu pantalla.');
    }

    const vuelo = disponibilidad?.vuelos?.find((v) => String(v.linea) === lineaSeleccionada(respuestasDeVuelo.lineaVuelo));
    if (vuelo && !respuestasDeVuelo.clase) {
      r.avisos.push(`Veo la lÃ­nea ${vuelo.linea}: ${vuelo.aerolinea}${vuelo.vuelo} ${vuelo.origen}-${vuelo.destino}.`);
      return preguntar(r, 'clase', 'Â¿QuÃ© clase disponible quieres vender en esa lÃ­nea?',
        vuelo.clases.map((c) => ({ valor: c.clase, texto: `${c.clase} (${c.cupos} disponible${c.cupos === 1 ? '' : 's'})` })),
        'La clase sale de la pantalla AN; no la inventes ni la sustituyas por A.');
    }

    if (caso.pasajeros) {
      const p = caso.pasajeros;
      r.avisos.push(`Composición detectada: ${p.ADT} ADT + ${p.CHD} CHD + ${p.INF} INF = ${p.plazas} plazas. El INF no ocupa plaza.`);
    }
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
    return decidir(r, PKEY('reembolso-' + 'ibex-', 'no-pcc'));
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
      'Se REVALIDA con TTP' + '/ETRV: se actualiza el mismo billete sin cotizar penalidad ni generar TST. NO se cobra nada.');
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
    r.avisos.push('Empieza SIEMPRE por el automático (#3111): FX' + 'F si el billete está en OPEN, FX' + 'E si no deja.');
    return preguntar(r, 'cotizo', 'Al lanzar FX' + 'F o FX' + 'E, ¿el sistema devolvió una cotización?',
      [
        { valor: true, texto: 'Sí, devolvió cotización' },
        { valor: false, texto: 'No devolvió nada' }
      ],
      'Es la bifurcación que marca el propio manual en su paso 5. Si no cotiza, hay que calcularlo todo a mano.');
  }
  paso(r, '¿El sistema cotizó?', cotizo ? 'Sí' : 'No', 'Me lo has dicho tú');

  if (cotizo) {
    return decidir(r, 'cambio-voluntario-automatico',
      'Recuerda la pareja: lo cotizado con FX' + 'F se guarda con FX' + 'Q, y lo cotizado con FX' + 'E se guarda con FX' + 'O.');
  }
  return decidir(r, PKEY('cambio-manual-sin-', 'segmento-volado'),
    'Camino manual: penalidad a histórico (FXX …/R,DOI,UP), diferencia de tarifa, y la penalidad va en un TSM aparte del TST.');
}

export default queProcedimiento;
