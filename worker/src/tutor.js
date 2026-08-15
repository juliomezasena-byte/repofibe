/**
 * Selector de paso: qué toca ahora y si lo que has escrito está bien.
 *
 * Aquí se construye el comando REAL a partir de la plantilla del manual y
 * los datos del caso. El modelo de lenguaje no interviene: solo redactará
 * después el porqué. Si esta función devuelve un comando, ese comando salió
 * de un JSON verbatim, no de una predicción.
 *
 * Función pura: sin fs, sin red.
 */

/** Un paso `hueco` NUNCA puede devolver comando. Es la regla central. */
function esHueco(paso) {
  return paso?.confianza === 'hueco';
}

function esPasoDePago(paso) {
  const texto = [paso?.proceso, paso?.comando, paso?.plantilla, paso?.explicacion]
    .filter(Boolean).join(' ');
  return /forma de pago|pago del TST|pago del TSM|cargar perfil PCI|realizar el cargo|cobrar con el token|PCI|Travel Pay|\$\$PAY/i.test(texto);
}

function comandoLaboratorio(paso, comando = '') {
  if (paso?.simulacion?.comando) return paso.simulacion.comando;
  const texto = String(comando || '');
  if (/\$\$PAY\s*:/i.test(texto)) return '$$PAY';
  if (/^TMI(?:\/M\d+)?\/FP/i.test(texto)) {
    const tsm = texto.match(/^TMI\/(M\d+)\//i)?.[1];
    return `TMI/${tsm ? `${tsm}/` : ''}FP-CASH,`;
  }
  if (/^FP\b/i.test(texto) && (/(?:MS-TT|VI\d|\{?TOKEN|trama|tramaAutorizadaPCI)/i.test(texto) || esPasoDePago(paso))) {
    return 'FP CASH,';
  }
  return null;
}

function datosSimulacion(paso, comando = '') {
  const seguro = comandoLaboratorio(paso, comando);
  return seguro ? {
    comando: seguro,
    aviso: 'SIMULACIÓN LOCAL: usa una forma de pago ficticia. Nunca pegues tarjeta, CVV ni token real.'
  } : null;
}

/**
 * Rellena la plantilla del manual con los datos del caso.
 *   'FQN{lineaOfertada}*PE'  +  {lineaOfertada:'02'}  →  'FQN02*PE'
 *
 * Si falta algún dato, NO inventa: devuelve el hueco marcado y lo lista en
 * `faltan`, para que el tutor pueda pedirlo.
 */
export function construirComando(plantilla, datos = {}) {
  if (!plantilla) return { comando: null, faltan: [], completo: false };
  const faltan = [];
  const comando = plantilla.replace(/\{(\w+)\}/g, (_, clave) => {
    const v = datos[clave];
    if (v === undefined || v === null || v === '') { faltan.push(clave); return `{${clave}}`; }
    return String(v);
  });
  return { comando, faltan, completo: faltan.length === 0 };
}

/**
 * Construye el FQP de una reemisión a partir de los cupones del billete.
 *
 * Se hace aparte porque su forma no es una plantilla plana: cambia según
 * haya escala, superficie o varios tipos de pasajero (pasos 2.2-2.4).
 *
 * @param {object} opciones
 * @param {Array}  opciones.cupones   [{origen,destino,aerolinea,clase,fecha}]
 * @param {string} opciones.doi
 * @param {string} opciones.familia   BASIC | OPTIMA | COMFORT | FLEX…
 * @param {boolean} opciones.paraPenalidad  true → añade ,UP (cotización a histórico)
 * @param {string} [opciones.tiposPasajero] p.ej. 'CHADIN'
 */
export function construirFqp({ cupones = [], doi, familia, paraPenalidad = true, tiposPasajero = null }) {
  const faltan = [];
  if (!cupones.length) faltan.push('cupones');
  if (!doi) faltan.push('doi');
  if (!familia) faltan.push('familia');
  if (faltan.length) return { comando: null, faltan, completo: false };

  const origen = cupones[0].origen;
  const tramos = cupones.map((c) => `/A${c.aerolinea}/C${c.clase}/D${c.fecha}${c.destino}`);
  // El primer tramo cuelga del origen; los siguientes van tras un guion.
  const cuerpo = origen + tramos[0] + tramos.slice(1).map((t) => '-' + t).join('');
  const resto = `/R,${doi}${paraPenalidad ? ',UP' : ''}/FF-${familia}`;
  const conTipos = tiposPasajero ? `/R${tiposPasajero},${doi}${paraPenalidad ? ',UP' : ''}/FF-${familia}` : resto;

  return { comando: `FQP${cuerpo}${conTipos}`, faltan: [], completo: true };
}

/**
 * Decide qué paso toca y evalúa lo que el alumno escribió.
 *
 * @param {object} procedimiento  el JSON completo del manual
 * @param {object} estado         { pasoActual, comandoEscrito, datos }
 */
export function siguientePaso(procedimiento, estado = {}) {
  const pasos = procedimiento?.pasos || [];
  if (!pasos.length) {
    return { error: 'El procedimiento no tiene pasos.' };
  }

  const { pasoActual = null, comandoEscrito = null, datos = {}, soloResponder = false } = estado;

  // ¿En qué punto estamos?
  const i = pasoActual === null ? -1 : pasos.findIndex((p) => p.n === pasoActual);
  const actual = i >= 0 ? pasos[i] : null;

  const r = {
    veredicto: null,
    paso: null,
    terminado: false,
    saltoDeSistema: null,
    avisos: []
  };

  // 1 · Evaluar lo escrito contra el paso en el que estábamos
  if (actual && comandoEscrito !== null) {
    r.veredicto = validarComando(actual, comandoEscrito);
  }

  // 2 · Elegir el siguiente. Si el anterior estaba mal, se repite.
  //     `soloResponder` es cuando el alumno hizo una PREGUNTA sobre el paso
  //     actual: se queda donde está para contestarla, no avanza.
  // Si el paso actual estaba esperando datos y el alumno los aporta en un
  // turno libre, primero hay que construir ese comando. Avanzar por nÃºmero en
  // ese punto saltarÃ­a, por ejemplo, de AN de solo ida a AN de ida y vuelta.
  const datosCompletanActual = Boolean(actual?.plantilla && construirComando(actual.plantilla, datos).completo);
  const noPuedeSaltarHueco = Boolean(actual && esHueco(actual) && !r.veredicto?.correcto);
  const pasoNoOperativo = Boolean(actual && !actual.comando && !actual.plantilla && !actual.esBloqueante && !esHueco(actual));
  // Un turno sin comando nunca mueve el cursor. Así no se pueden saltar
  // pasos de seguridad, huecos PCI ni validaciones de datos por número.
  const avanzar = !actual || r.veredicto?.correcto;
  const siguiente = avanzar ? pasos[i + 1] : actual;

  if (!siguiente) {
    r.terminado = true;
    r.avisos.push('Procedimiento completado.');
    return r;
  }

  // 3 · Un hueco se declara, no se rellena.
  if (esHueco(siguiente)) {
    r.paso = {
      simulacion: siguiente.simulacion || null,
      n: siguiente.n,
      sistema: siguiente.sistema,
      proceso: siguiente.proceso,
      comando: null,
      confianza: 'hueco',
      nota: siguiente.nota || 'Este paso NO está en el material. Confírmalo con el instructor antes de ejecutarlo.'
    };
    r.avisos.push('Este paso no está documentado. No lo inventes: pregunta.');
    return r;
  }

  // 4 · Construir el comando desde la plantilla, o usar el del manual
  let comando = siguiente.comando;
  let faltan = [];
  if (siguiente.plantilla) {
    const c = construirComando(siguiente.plantilla, datos);
    if (c.completo) comando = c.comando;
    else {
      faltan = c.faltan;
      // El texto de ejemplo del manual sirve como referencia interna, pero
      // nunca debe aparecer como si fuera ejecutable para este caso concreto.
      comando = null;
    }
  }

  const simulacion = datosSimulacion(siguiente, comando || siguiente.comando);
  if (simulacion) {
    comando = simulacion.comando;
    r.avisos.push(simulacion.aviso);
  }

  r.paso = {
    n: siguiente.n,
    sistema: siguiente.sistema,
    proceso: siguiente.proceso,
    comando,
    plantilla: siguiente.plantilla || null,
    explicacion: siguiente.explicacion || null,
    confianza: siguiente.confianza,
    opcional: !!siguiente.opcional,
    esBloqueante: !!siguiente.esBloqueante,
    nota: siguiente.nota || null,
    faltanDatos: faltan,
    simulacion: simulacion || siguiente.simulacion || null
  };

  // 5 · ¿Hay que cambiar de sistema? Es el paso invisible que nadie enseña.
  const anterior = actual?.sistema;
  if (anterior && siguiente.sistema && anterior !== siguiente.sistema) {
    r.saltoDeSistema = { de: anterior, a: siguiente.sistema };
    if ((anterior === 'amadeus' && siguiente.sistema === 'resiber') ||
        (anterior === 'resiber' && siguiente.sistema === 'amadeus')) {
      r.avisos.push(
        `Cambias de ${anterior.toUpperCase()} a ${siguiente.sistema.toUpperCase()}. ` +
        'Comparten pantalla: teclea ":" para alternar. Responde "DESCONECTADO DE AMADEUS" (estás en Resiber) ' +
        'o "CONECTADO AMADEUS" (estás en Amadeus).'
      );
    } else {
      r.avisos.push(`Este paso NO es de terminal: se hace en ${siguiente.sistema.toUpperCase()}.`);
    }
  }

  if (siguiente.esBloqueante) r.avisos.push('Paso BLOQUEANTE: no sigas sin resolverlo.');
  if (faltan.length) r.avisos.push(`Faltan datos para montar el comando: ${faltan.join(', ')}.`);

  return r;
}

/** Compara lo escrito con lo que pide el paso. Tolerante a espacios y caja. */
export function validarComando(paso, escrito) {
  const limpio = String(escrito || '').trim().toUpperCase().replace(/\s+/g, ' ');
  const normaliza = (s) => String(s || '').trim().toUpperCase().replace(/\s+/g, ' ');
  const simulacion = datosSimulacion(paso, paso?.comando);

  if (esHueco(paso)) {
    if (simulacion && limpio === normaliza(simulacion.comando)) return { correcto: true, modo: 'laboratorio' };
    return { correcto: false, motivo: 'Este paso no está en el material: no hay comando correcto que comparar.' };
  }

  // 1 · Validación declarada en el manual
  if (paso.validacion?.tipo === 'regex') {
    try {
      if (new RegExp(paso.validacion.patron, 'i').test(String(escrito || '').trim())) {
        return { correcto: true };
      }
    } catch { /* patrón inválido: se cae a la comparación literal */ }
  }
  if (paso.validacion?.tipo === 'exacto') {
    if (limpio === normaliza(paso.validacion.patron)) return { correcto: true };
  }

  // 2 · Contra el comando del manual y sus variantes
  const aceptados = [paso.comando, ...(paso.variantes || []), simulacion?.comando].filter(Boolean).map(normaliza);
  if (aceptados.includes(limpio)) return { correcto: true };

  // 3 · ¿Es el mismo comando con otros datos? (misma raíz)
  const raiz = (s) => normaliza(s).match(/^[A-ZÑ$]+/)?.[0] || '';
  const raizEsperada = raiz(paso.comando);
  if (raizEsperada && raiz(limpio) === raizEsperada) {
    return {
      correcto: false, parcial: true,
      esperado: paso.comando,
      motivo: `La transacción es la correcta (${raizEsperada}) pero los parámetros no coinciden con el manual.`
    };
  }

  // 4 · La trampa clásica: el comando existe pero en el OTRO sistema
  const otroSistema = paso.sistema === 'amadeus' ? 'resiber' : 'amadeus';
  return {
    correcto: false,
    esperado: paso.comando,
    motivo: `No coincide con lo que pide el manual en este paso.`,
    pista: `Estás en ${String(paso.sistema || '').toUpperCase()}. Si ese comando lo usas en ${otroSistema.toUpperCase()}, ` +
           'ojo: hay comandos que existen en los dos con función distinta (RTA, RT, XE).'
  };
}

export default siguientePaso;
