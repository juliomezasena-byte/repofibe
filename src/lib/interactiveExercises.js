/**
 * Contrato local de ejercicios interactivos.
 *
 * La terminal sigue siendo la autoridad para ejecutar comandos. Este módulo
 * solo describe qué debe pensar el estudiante antes/después de la ejecución.
 * Si no existe una definición específica, se usa una interpretación segura y
 * genérica; nunca se inventa una regla de negocio.
 */

const DEFINITIONS = {
  availability: {
    id: 'availability',
    question: '¿Qué acabas de obtener con esta entrada?',
    options: [
      { id: 'availability', label: 'Disponibilidad de vuelos para elegir', correct: true },
      { id: 'sale', label: 'Una plaza ya vendida al pasajero', correct: false },
      { id: 'ticket', label: 'Un billete emitido', correct: false }
    ],
    explanation: 'AN/SN consulta opciones. Todavía no vende plazas ni emite un billete.',
    sourceLabel: 'Disponibilidad de vuelos'
  },
  sale: {
    id: 'sale',
    question: '¿Qué efecto tiene SS en este caso?',
    options: [
      { id: 'sale', label: 'Vende las plazas en la línea y clase indicadas', correct: true },
      { id: 'availability', label: 'Solo muestra horarios sin modificar el PNR', correct: false },
      { id: 'cancel', label: 'Cancela una reserva existente', correct: false }
    ],
    explanation: 'SS crea la venta de plazas. La cantidad debe corresponder a los pasajeros con asiento.',
    sourceLabel: 'Venta de plazas'
  },
  passenger: {
    id: 'passenger',
    question: '¿Qué información acabas de documentar?',
    options: [
      { id: 'passenger', label: 'El nombre o dato del pasajero', correct: true },
      { id: 'sale', label: 'La disponibilidad del vuelo', correct: false },
      { id: 'payment', label: 'La forma de pago', correct: false }
    ],
    explanation: 'NM documenta nombres. La asociación de CHD/INF debe respetar el formato del manual.',
    sourceLabel: 'Datos del pasajero'
  },
  contact: {
    id: 'contact',
    question: '¿Qué función cumple este comando?',
    options: [
      { id: 'contact', label: 'Añade un dato de contacto al PNR', correct: true },
      { id: 'payment', label: 'Cobra o emite el billete', correct: false },
      { id: 'cancel', label: 'Elimina el segmento seleccionado', correct: false }
    ],
    explanation: 'AP/APM documenta contacto. Verifica que el formato corresponda al mercado y manual aplicable.',
    sourceLabel: 'Contacto'
  },
  ticketing: {
    id: 'ticketing',
    question: '¿Qué debes comprobar después de esta entrada?',
    options: [
      { id: 'ticketing', label: 'Que el plazo o condición de emisión quedó registrado', correct: true },
      { id: 'availability', label: 'Que apareció una nueva disponibilidad', correct: false },
      { id: 'contact', label: 'Que se borró el teléfono anterior', correct: false }
    ],
    explanation: 'TK documenta la condición de emisión. No sustituye la cotización ni la emisión.',
    sourceLabel: 'Condición de emisión'
  },
  pricing: {
    id: 'pricing',
    question: '¿Qué resultado debes leer ahora?',
    options: [
      { id: 'pricing', label: 'La tarifa calculada y sus condiciones', correct: true },
      { id: 'sale', label: 'El asiento físico asignado', correct: false },
      { id: 'cancel', label: 'La eliminación de todo el PNR', correct: false }
    ],
    explanation: 'FXX/FXP cotiza. Antes de emitir, comprueba tarifa, pasajeros, moneda y restricciones del caso.',
    sourceLabel: 'Cotización'
  },
  save: {
    id: 'save',
    question: '¿Qué confirma ER/ERK en este punto?',
    options: [
      { id: 'save', label: 'Que guardaste los cambios del PNR', correct: true },
      { id: 'ticketing', label: 'Que el billete fue emitido automáticamente', correct: false },
      { id: 'availability', label: 'Que consultaste vuelos disponibles', correct: false }
    ],
    explanation: 'ER guarda la reserva. La emisión, si aplica, es un paso distinto y debe estar documentada.',
    sourceLabel: 'Guardar reserva'
  },
  generic: {
    id: 'generic',
    question: '¿Qué debes verificar en esta respuesta antes de continuar?',
    options: [
      { id: 'evidence', label: 'La evidencia concreta y el estado devuelto por el sistema', correct: true },
      { id: 'guess', label: 'Continuar suponiendo que salió bien', correct: false },
      { id: 'restart', label: 'Reiniciar toda la práctica inmediatamente', correct: false }
    ],
    explanation: 'Lee la respuesta antes de avanzar. Si no está documentada, no inventes un resultado.',
    sourceLabel: 'Lectura de evidencia'
  }
};

function commandFamily(command = '') {
  const code = command.trim().toUpperCase().replace(/\s+/g, '');
  if (/^(AN|SN)/.test(code)) return 'availability';
  if (/^SS/.test(code)) return 'sale';
  if (/^NM/.test(code)) return 'passenger';
  if (/^(AP|APE|SRCTC)/.test(code)) return 'contact';
  if (/^TK/.test(code)) return 'ticketing';
  if (/^(FX|FQ)/.test(code)) return 'pricing';
  if (/^(ER|ET|ERK)/.test(code)) return 'save';
  return 'generic';
}

export function getInteractiveDefinition(command, { success = true } = {}) {
  if (!success) return null;
  const family = commandFamily(command);
  return { ...DEFINITIONS[family], commandFamily: family };
}

export function getPreflightDefinition(scenario) {
  const first = scenario?.suggestedFlow?.[0] || '';
  const family = commandFamily(first);
  const definitions = {
    availability: {
      question: '¿Qué debes resolver primero?',
      options: [
        { id: 'availability', label: 'Buscar disponibilidad para conocer las opciones', correct: true },
        { id: 'sale', label: 'Vender plazas sin consultar vuelos', correct: false },
        { id: 'ticketing', label: 'Emitir el billete', correct: false }
      ]
    },
    sale: {
      question: '¿Qué acción inicia este caso?',
      options: [
        { id: 'sale', label: 'La acción indicada en la primera instrucción del caso', correct: true },
        { id: 'ticketing', label: 'La emisión directa', correct: false },
        { id: 'save', label: 'Guardar sin documentar pasajeros', correct: false }
      ]
    },
    generic: {
      question: 'Antes de escribir, ¿qué debes hacer?',
      options: [
        { id: 'read', label: 'Leer objetivo, datos y primer paso del caso', correct: true },
        { id: 'guess', label: 'Probar cualquier comando parecido', correct: false },
        { id: 'restart', label: 'Reiniciar el sistema', correct: false }
      ]
    }
  };
  return { ...(definitions[family] || definitions.generic), family };
}

export function checkInterpretation(definition, optionId) {
  if (!definition || !optionId) return { correct: false, feedback: 'Selecciona una interpretación para continuar.' };
  const option = definition.options.find((item) => item.id === optionId);
  if (!option) return { correct: false, feedback: 'Esa opción no pertenece a esta pregunta.' };
  return option.correct
    ? { correct: true, feedback: definition.explanation }
    : { correct: false, feedback: 'Revisa la salida y vuelve a leer el objetivo del paso.' };
}

export function getDefinitionForProcedure(procedure) {
  if (!procedure) return null;
  return {
    id: procedure.id,
    question: '¿Qué debes hacer en este procedimiento antes de cerrar el caso?',
    options: [
      { id: 'evidence', label: 'Reunir y verificar todos los datos requeridos por el manual', correct: true },
      { id: 'guess', label: 'Ejecutar un comando parecido aunque no aparezca en el manual', correct: false },
      { id: 'close', label: 'Cerrar el caso sin comprobar los requisitos', correct: false }
    ],
    explanation: 'Los procedimientos no terminales se resuelven con requisitos, evidencia y decisión documentada.',
    sourceLabel: procedure.titulo || procedure.title || 'Procedimiento'
  };
}
