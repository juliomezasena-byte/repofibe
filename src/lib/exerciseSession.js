/**
 * Contrato pequeño y agnóstico de la sesión de práctica.
 *
 * La terminal, el tutor y el catálogo deben leer esta identidad común. Este
 * módulo no ejecuta comandos ni conoce React: solo modela el estado pedagógico
 * que antes estaba repartido entre activeScenario y TutorPanel.
 */

const BASE = {
  manualVersion: 'local',
  mode: 'guided',
  currentStep: 'brief',
  phase: 0,
  history: [],
  attempts: 0,
  hintsUsed: 0,
  connectivity: 'unknown',
  evaluation: null,
  lastCommand: null,
  lastOutput: null,
  feedback: null
};

function createBase({ kind, exerciseId, title, description, station, procedureId = null, seedState = null, targetState = null }) {
  return {
    ...BASE,
    sessionId: `${kind}:${exerciseId}`,
    kind,
    exerciseId,
    procedureId,
    title,
    description,
    station,
    seedState,
    targetState,
    history: []
  };
}

export function createScenarioSession(scenario, options = {}) {
  if (!scenario?.id) throw new Error('No se puede crear una sesión sin scenario.id');
  return {
    ...createBase({
      kind: 'scenario',
      exerciseId: scenario.id,
      title: scenario.title,
      description: scenario.description,
      station: options.station || 'amadeus',
      procedureId: scenario.procedimientoId || null,
      seedState: scenario.initialState || null,
      targetState: scenario.targetState || null
    }),
    suggestedFlow: Array.isArray(scenario.suggestedFlow) ? scenario.suggestedFlow : [],
    mode: options.mode || 'guided'
  };
}

export function createProcedureSession(procedure, options = {}) {
  if (!procedure?.id) throw new Error('No se puede crear una sesión sin procedure.id');
  return {
    ...createBase({
      kind: 'procedure',
      exerciseId: procedure.id,
      title: procedure.titulo || procedure.title || 'Procedimiento',
      description: procedure.descripcion || procedure.description || '',
      station: options.station || 'manual',
      procedureId: procedure.procedimientoId || procedure.id,
      seedState: procedure.seedPnr || null,
      targetState: procedure.targetState || null
    }),
    mode: options.mode || 'guided',
    procedure
  };
}

export function sameSessionIdentity(left, right) {
  if (!left || !right) return false;
  return left.kind === right.kind &&
    left.exerciseId === right.exerciseId &&
    left.procedureId === right.procedureId &&
    left.station === right.station;
}

export function transitionSession(session, event = {}) {
  if (!session) return null;
  const next = { ...session, history: [...(session.history || [])] };

  switch (event.type) {
    case 'brief_viewed':
      next.currentStep = 'ready';
      break;
    case 'command_drafted':
      next.currentStep = 'ready';
      next.lastCommand = event.command || '';
      break;
    case 'command_executed':
      next.currentStep = 'interpreting';
      next.lastCommand = event.command || null;
      next.lastOutput = event.output || '';
      next.attempts += 1;
      next.history.push({ type: event.type, command: event.command || '', output: event.output || '', at: event.at || Date.now() });
      break;
    case 'interpretation_submitted':
      next.currentStep = event.correct ? 'ready' : 'recovery';
      next.feedback = event.feedback || null;
      break;
    case 'hint_requested':
      next.currentStep = 'recovery';
      next.hintsUsed += 1;
      break;
    case 'retry':
      next.currentStep = 'ready';
      next.feedback = null;
      break;
    case 'completed':
      next.currentStep = 'complete';
      next.evaluation = event.evaluation || next.evaluation;
      break;
    case 'connectivity':
      next.connectivity = event.value || 'unknown';
      break;
    default:
      return next;
  }

  return next;
}

export function getPrimaryAction(session) {
  if (!session) return { label: 'Elegir ejercicio', intent: 'choose' };
  switch (session.currentStep) {
    case 'brief':
      return { label: session.kind === 'procedure' ? 'Leer el caso' : 'Ver el caso', intent: 'brief' };
    case 'ready':
      return { label: session.station === 'amadeus' ? 'Ejecutar en terminal' : 'Analizar el caso', intent: 'execute' };
    case 'interpreting':
      return { label: 'Analizar la salida', intent: 'interpret' };
    case 'recovery':
      return { label: 'Ver pista y reintentar', intent: 'recover' };
    case 'complete':
      return { label: 'Practicar una variante', intent: 'transfer' };
    default:
      return { label: 'Continuar', intent: 'continue' };
  }
}

