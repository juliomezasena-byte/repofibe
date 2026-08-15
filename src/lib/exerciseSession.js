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
  status: 'loading',
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
  ,manualStep: null
  ,manualTitle: null
  ,manualSystem: null
  ,manualConfidence: null
};

export const PRACTICE_SESSION_STORAGE_KEY = 'pratika:practice-session:v1';

function toEvidence(procedure) {
  return Array.isArray(procedure?.requiredData) ? procedure.requiredData.map((item, index) => ({
    id: `${procedure.id || 'procedure'}:evidence:${index}`,
    label: typeof item === 'string' ? item : item?.label || 'Evidencia del procedimiento',
    required: true
  })) : [];
}

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
    objective: description || 'Completa el paso actual del ejercicio.',
    allowedAction: null,
    evidence: [],
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
    mode: options.mode || 'guided',
    status: options.mode === 'free' ? 'ready' : 'waiting_decision'
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
    status: 'ready',
    evidence: toEvidence(procedure),
    procedure
  };
}

export function toSafeSessionSnapshot(session) {
  if (!session) return null;
  return {
    sessionId: session.sessionId,
    mode: session.mode || 'guided',
    kind: session.kind,
    exerciseId: session.exerciseId || null,
    scenarioId: session.kind === 'scenario' ? session.exerciseId : null,
    procedureId: session.procedureId || null,
    station: session.station || 'unknown',
    currentStep: session.currentStep || 'brief'
  };
}

export function writeSafeSessionSnapshot(session, storage = globalThis?.sessionStorage) {
  const snapshot = toSafeSessionSnapshot(session);
  if (!snapshot || !storage) return false;
  try {
    storage.setItem(PRACTICE_SESSION_STORAGE_KEY, JSON.stringify(snapshot));
    return true;
  } catch {
    return false;
  }
}

export function readSafeSessionSnapshot(storage = globalThis?.sessionStorage) {
  if (!storage) return null;
  try {
    const parsed = JSON.parse(storage.getItem(PRACTICE_SESSION_STORAGE_KEY) || 'null');
    if (!parsed || typeof parsed !== 'object' || !parsed.exerciseId || !parsed.kind) return null;
    return {
      sessionId: String(parsed.sessionId || ''),
      mode: ['guided', 'free', 'exam'].includes(parsed.mode) ? parsed.mode : 'guided',
      kind: parsed.kind === 'procedure' ? 'procedure' : 'scenario',
      exerciseId: String(parsed.exerciseId),
      scenarioId: parsed.scenarioId ? String(parsed.scenarioId) : null,
      procedureId: parsed.procedureId ? String(parsed.procedureId) : null,
      station: String(parsed.station || 'unknown'),
      currentStep: String(parsed.currentStep || 'brief')
    };
  } catch {
    return null;
  }
}

export function clearSafeSessionSnapshot(storage = globalThis?.sessionStorage) {
  try { storage?.removeItem(PRACTICE_SESSION_STORAGE_KEY); } catch { /* storage privado */ }
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
      next.status = 'ready';
      break;
    case 'command_drafted':
      next.currentStep = 'ready';
      next.status = 'ready';
      next.lastCommand = event.command || '';
      break;
    case 'command_executed':
      next.currentStep = 'interpreting';
      next.status = 'interpreting';
      next.lastCommand = event.command || null;
      next.lastOutput = event.output || '';
      next.attempts += 1;
      next.history.push({ type: event.type, command: event.command || '', output: event.output || '', at: event.at || Date.now() });
      break;
    case 'interpretation_submitted':
      next.currentStep = event.correct ? 'ready' : 'recovery';
      next.status = event.correct ? 'ready' : 'error';
      next.feedback = event.feedback || null;
      break;
    case 'hint_requested':
      next.currentStep = 'recovery';
      next.status = 'error';
      next.hintsUsed += 1;
      break;
    case 'retry':
      next.currentStep = 'ready';
      next.status = 'ready';
      next.feedback = null;
      break;
    case 'completed':
      next.currentStep = 'complete';
      next.status = 'completed';
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
