import React, { useState, useEffect } from 'react';
import { Target, CheckCircle2, Circle, RefreshCw, GraduationCap, Dumbbell, Send, Clock, Eye, ChevronDown, ChevronRight, BookOpen } from 'lucide-react';
import { LearningPath } from './LearningPath';
import { getPrimaryAction } from '../lib/exerciseSession';
import { getPreflightDefinition } from '../lib/interactiveExercises';

// Sección desplegable (idea de Juan Pablo: menús desplegables para no abrumar).
const Collapse = ({ title, icon, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="collapse-section">
      <button className="collapse-head" onClick={() => setOpen((v) => !v)}>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {icon}
        <span>{title}</span>
      </button>
      {open && <div className="collapse-body">{children}</div>}
    </div>
  );
};

function fmt(ms) {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

// Matriz de andamiaje (P2): qué texto escribe el chip según la dificultad.
// Principiante = comando completo; Intermedio = solo el código (el alumno
// completa los datos de memoria); Avanzado = sin chips (return null).
function chipText(command, difficulty) {
  if (difficulty === 'Avanzado') return null;
  if (difficulty === 'Intermedio') {
    const code = (command.match(/^[A-Z]+/) || [command])[0];
    return code;
  }
  return command; // Principiante
}

function redactTask(text) {
  return text
    .replace(/\b(?:AN|SN)\s+[^,;]+/gi, 'consultar disponibilidad')
    .replace(/\bSS\s*\d+\s*[A-Z]\s*\d+/gi, 'vender la plaza indicada')
    .replace(/\bNM\S+/gi, 'ingresar el nombre del pasajero')
    .replace(/\bAP\S+/gi, 'agregar el contacto')
    .replace(/\bTK\s*OK\b/gi, 'definir el plazo de emisión')
    .replace(/\bFX[A-Z0-9/,-]+/gi, 'cotizar la tarifa aplicable')
    .replace(/\bER\b/gi, 'guardar la reserva');
}

// Checklist reutilizable (práctica en vivo y resultado de examen).
const Checklist = ({ feedback }) => (
  <div className="checklist-group" style={{ marginTop: '8px' }}>
    {feedback.map((item, idx) => {
      const isOk = item.startsWith('[OK]');
      return (
        <div key={idx} className="checklist-item">
          {isOk ? <CheckCircle2 size={16} className="check-ok" /> : <Circle size={16} className="check-pending" />}
          <span className={isOk ? 'check-ok' : 'check-pending'}>
            {item.replace('[OK]', '').replace('[PENDIENTE]', '')}
          </span>
        </div>
      );
    })}
  </div>
);

export const ScenarioSelector = ({
  scenarios,
  curriculum,
  learningProgress = {},
  dailyPlan,
  dailyScenarioId,
  activeScenarioId,
  onSelectScenario,
  freeMode = false,
  evaluationResult,
  onResetScenario,
  examMode = 'practice',
  examStartTs = null,
  examResult = null,
  onToggleExam,
  onDeliver,
  chipStatus = [],
  onChipTap,
  exerciseSession = null,
  preflightAnswer = null,
  onSubmitPreflight,
  pendingInterpretation = null,
  interpretationResult = null,
  onSubmitInterpretation,
  onContinueAfterInterpretation
}) => {
  const activeScenario = scenarios.find((s) => s.id === activeScenarioId) || scenarios[0];
  const [showData, setShowData] = useState(false);
  const [showInterpretationEvidence, setShowInterpretationEvidence] = useState(false);
  const primaryAction = getPrimaryAction(exerciseSession);
  const stepLabels = {
    brief: 'Lee el caso y confirma el objetivo.',
    ready: primaryAction.intent === 'execute' ? 'Prepara la entrada indicada y ejecútala en la terminal.' : 'Resuelve la acción indicada en la superficie del procedimiento.',
    interpreting: 'Lee la salida y explica qué significa.',
    recovery: 'Usa la pista, corrige y vuelve a intentarlo.',
    complete: 'Caso completado. Practica una variante para transferirlo.'
  };

  // Fichas de datos (verificación descubrible): parsea el enunciado por
  // líneas "ETIQUETA: valor". Genérico — sin migrar el JSON, con fallback
  // al párrafo (que sigue siendo lo primero que se lee).
  const dataFields = (activeScenario?.description || '')
    .split('\n')
    .map((l) => l.match(/^([A-ZÁÉÍÓÚÑ ()]+):\s*(.+)$/))
    .filter(Boolean)
    .map((m) => ({ label: m[1].trim(), value: m[2].trim() }));

  // Cronómetro: tick cada segundo solo mientras el examen está activo.
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (examMode !== 'exam') return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [examMode]);

  useEffect(() => {
    setShowInterpretationEvidence(false);
  }, [exerciseSession?.lastCommand]);

  const elapsed = examMode === 'exam' && examStartTs ? now - examStartTs : 0;
  const preflight = activeScenario ? getPreflightDefinition(activeScenario) : null;
  const guidedLocked = !freeMode && exerciseSession?.kind === 'scenario' && exerciseSession?.mode === 'guided' && examMode !== 'exam' && !preflightAnswer?.correct;

  return (
    <div className="sidebar-panel">
      <div className="panel-title">
        <Target size={20} className="text-crt-green" />
        <span>Práctica de casos</span>
      </div>

      <section className="now-card" aria-labelledby="now-card-title">
        <div className="now-card-kicker">CASO ABIERTO · {exerciseSession?.station === 'amadeus' ? 'TERMINAL' : 'MANUAL'}</div>
        <h2 id="now-card-title">{exerciseSession?.title || activeScenario?.title || 'Elige un caso para empezar'}</h2>
        <div className="now-card-step">
          <span>AHORA</span>
          <strong>{stepLabels[exerciseSession?.currentStep] || 'Elige un ejercicio para cargar el primer paso.'}</strong>
        </div>
        {exerciseSession?.currentStep === 'interpreting' && exerciseSession.lastCommand && (
          <code className="now-card-command">{exerciseSession.lastCommand}</code>
        )}
      </section>

      {!freeMode && exerciseSession?.kind === 'scenario' && ['brief', 'ready'].includes(exerciseSession.currentStep) && !pendingInterpretation && preflight && (
        <section className={`decision-card ${preflightAnswer?.correct ? 'decision-correct' : ''}`} aria-labelledby="decision-title">
          <span className="decision-kicker">PIENSA ANTES DE ESCRIBIR</span>
          <h3 id="decision-title">{preflight.question}</h3>
          <div className="decision-options">
            {preflight.options.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`decision-option ${preflightAnswer && preflightAnswer.optionId === option.id ? (option.correct ? 'selected-correct' : 'selected-wrong') : ''}`}
                onClick={() => onSubmitPreflight?.(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
          {preflightAnswer && (
            <p className={`decision-feedback ${preflightAnswer.correct ? 'ok' : 'wrong'}`}>
              {preflightAnswer.correct
                ? 'Correcto. Ahora lleva esa decisión a la terminal.'
                : 'Todavía no. Vuelve al objetivo y revisa el primer paso del caso.'}
            </p>
          )}
        </section>
      )}

      {pendingInterpretation && (
        <section className={`interpretation-card ${interpretationResult?.correct ? 'interpretation-correct' : ''}`} aria-labelledby="interpretation-title">
          <div className="interpretation-kicker">LEE LA SALIDA · PASO DE RAZONAMIENTO</div>
          <h3 id="interpretation-title">{pendingInterpretation.question}</h3>
          {exerciseSession?.lastCommand && <code className="interpretation-command">{exerciseSession.lastCommand}</code>}
          {exerciseSession?.lastOutput && (
            <div className="interpretation-evidence">
              <button
                type="button"
                className="interpretation-evidence-toggle"
                onClick={() => setShowInterpretationEvidence((current) => !current)}
              >
                {showInterpretationEvidence ? 'Ocultar evidencia' : 'Ver la evidencia usada para responder'}
              </button>
              {showInterpretationEvidence && <pre className="interpretation-output">{exerciseSession.lastOutput}</pre>}
            </div>
          )}
          <div className="interpretation-options">
            {pendingInterpretation.options.map((option) => (
              <button
                key={option.id}
                type="button"
                className="interpretation-option"
                disabled={interpretationResult?.correct}
                onClick={() => onSubmitInterpretation && onSubmitInterpretation(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
          {interpretationResult && (
            <div className={`interpretation-feedback ${interpretationResult.correct ? 'ok' : 'wrong'}`} role="status">
              <strong>{interpretationResult.correct ? 'Interpretación correcta' : 'Aún no'}</strong>
              <span>{interpretationResult.feedback}</span>
              {interpretationResult.correct && (
                <button type="button" className="interpretation-continue" onClick={onContinueAfterInterpretation}>
                  Continuar con el caso
                </button>
              )}
            </div>
          )}
        </section>
      )}

      {curriculum?.nodes?.length > 0 && (
        <LearningPath
          scenarios={scenarios}
          curriculum={curriculum}
          progress={learningProgress}
          dailyPlan={dailyPlan}
          activeScenarioId={activeScenarioId}
          dailyScenarioId={dailyScenarioId}
          onSelectScenario={onSelectScenario}
        />
      )}

      <select
        className="scenario-select"
        value={activeScenarioId}
        onChange={(e) => onSelectScenario(e.target.value)}
      >
        {scenarios.map((s) => (
          <option key={s.id} value={s.id}>
            {s.title} ({s.difficulty})
          </option>
        ))}
      </select>

      {/* Toggle PRÁCTICA | EXAMEN */}
      <div className="seg-control" role="tablist" aria-label="Modo de estudio">
        <button
          role="tab"
          aria-selected={examMode === 'practice' || examMode === 'delivered'}
          className={`seg-btn ${examMode !== 'exam' ? 'seg-active' : ''}`}
          onClick={() => onToggleExam('practice')}
        >
          <Dumbbell size={14} /> Práctica
        </button>
        <button
          role="tab"
          aria-selected={examMode === 'exam'}
          className={`seg-btn ${examMode === 'exam' ? 'seg-active' : ''}`}
          onClick={() => onToggleExam('exam')}
        >
          <GraduationCap size={14} /> Examen
        </button>
      </div>

      {/* ── MODO PRÁCTICA ── */}
      {examMode === 'practice' && activeScenario && (
        <>
          {/* Barra de progreso SIEMPRE arriba (idea de Juan: "la barrita
              arribita"; si avanza, vas bien). No sube si hay un error. */}
          {evaluationResult && (
            <div className="progress-top">
              <div className="progress-header">
                <span>Tu progreso</span>
                <span style={{ color: evaluationResult.completed ? 'var(--crt-green)' : 'var(--crt-cyan)' }}>
                  {evaluationResult.score}% {evaluationResult.completed && '✓'}
                </span>
              </div>
              <div className="progress-bar-bg">
                <div className="progress-bar-fill" style={{ width: `${evaluationResult.score}%` }}></div>
              </div>
            </div>
          )}

          <Collapse title="Enunciado del ejercicio" icon={<BookOpen size={14} />} defaultOpen>
            {/* Las fichas van PRIMERO. El enunciado es un bloque con etiquetas
                (PASAJEROS / RUTA / FECHA / TAREA) y leerlo como párrafo corrido
                obligaba a buscar con el dedo qué te pedían. Antes esto estaba
                escondido tras un botón "Ver datos extraídos" y lo primero que
                se veía era el texto en bruto. La TAREA se destaca porque es lo
                único que hay que hacer. */}
            {dataFields.length > 0 ? (
              <>
                <div className="data-fields">
                  {dataFields.filter((f) => f.label !== 'TAREA').map((f, i) => (
                    <div key={i} className="data-field">
                      <span className="data-label">{f.label}</span>
                      <span className="data-value">{f.value}</span>
                    </div>
                  ))}
                </div>
                {dataFields.filter((f) => f.label === 'TAREA').map((f, i) => (
                  <div key={i} className="scn-tarea">
                    <span className="scn-tarea-etiqueta">Lo que tienes que hacer</span>
                    <p className="scn-tarea-texto">{guidedLocked ? redactTask(f.value) : f.value}</p>
                  </div>
                ))}
                <button className="link-btn" style={{ marginTop: '8px' }} onClick={() => setShowData((v) => !v)}>
                  <Eye size={12} /> {showData ? 'Ocultar enunciado original' : 'Ver enunciado original'}
                </button>
                {showData && (
                  <div className="scn-enunciado-crudo">{activeScenario.description}</div>
                )}
              </>
            ) : (
              <div className="scn-enunciado-crudo">{activeScenario.description}</div>
            )}
          </Collapse>

          {freeMode ? (
            <section className="free-mode-note" aria-label="Modo terminal libre">
              <strong>TERMINAL LIBRE</strong>
              <span>Escribe comandos para practicar. No hay una misión impuesta ni una secuencia obligatoria.</span>
            </section>
          ) : guidedLocked ? (
            <section className="flow-locked" aria-label="Pasos protegidos">
              <strong>Los comandos aparecen después de tu decisión.</strong>
              <span>Primero identifica qué procedimiento inicia el caso. Si necesitas ayuda, pide una pista.</span>
            </section>
          ) : <Collapse
              title={activeScenario.difficulty === 'Avanzado' ? 'Flujo (nivel avanzado)' : 'Ver comandos del flujo'}
              icon={<Target size={14} />}
              defaultOpen={false}
            >
            {activeScenario.difficulty === 'Avanzado' ? (
              <div style={{ fontSize: '0.72rem', color: '#64748b', lineHeight: '1.5' }}>
                Nivel avanzado: sin ayudas de comando. Escríbelos de memoria a
                partir del enunciado.
              </div>
            ) : (
              <div className="chip-list">
                {activeScenario.suggestedFlow.map((cmd, i) => {
                  const text = chipText(cmd, activeScenario.difficulty);
                  const status = chipStatus[i] || 'pending';
                  return (
                    <button
                      key={i}
                      className={`work-chip ${status}`}
                      onClick={() => onChipTap && onChipTap(cmd)}
                      title="Escribir en la terminal (no lo ejecuta)"
                    >
                      <span className="chip-num">{String(i + 1).padStart(2, '0')}</span>
                      <span className="chip-cmd">{text}</span>
                      {status === 'done' && <CheckCircle2 size={13} className="chip-check" />}
                    </button>
                  );
                })}
              </div>
            )}
            <button onClick={onResetScenario} className="link-btn" style={{ marginTop: '8px' }}>
              <RefreshCw size={12} /> Reiniciar PNR
            </button>
            </Collapse>}

          {evaluationResult && (
            <Collapse title="Checklist detallado" icon={<CheckCircle2 size={14} />} defaultOpen={false}>
              <Checklist feedback={evaluationResult.feedback} />
            </Collapse>
          )}

          <Collapse title="Referencias Amadeus" icon={<BookOpen size={14} />} defaultOpen={false}>
            <div className="ref-links">
              <a href="https://servicehub.amadeus.com/c/portal/view-solution/FAQ12345/es" target="_blank" rel="noreferrer">Amadeus Service Hub (ayuda oficial)</a>
              <a href="https://amadeus.com/es/portfolio/viajes/soluciones-para-agencias-de-viajes" target="_blank" rel="noreferrer">Amadeus para agencias de viajes</a>
              <a href="https://es.wikipedia.org/wiki/C%C3%B3digo_de_aeropuerto_IATA" target="_blank" rel="noreferrer">Códigos IATA de aeropuertos</a>
              <span className="ref-note">Escribe <b>HE {'{'}comando{'}'}</b> en la terminal para ver su sintaxis (ej: HE SN).</span>
            </div>
          </Collapse>
        </>
      )}

      {/* ── MODO EXAMEN: solo enunciado + cronómetro + ENTREGAR ── */}
      {examMode === 'exam' && (
        <div className="exam-box">
          <div className="exam-timer">
            <Clock size={16} /> {fmt(elapsed)}
          </div>
          <div className="exam-hint">Sin ayudas. Escribe los comandos de memoria y pulsa ENTREGAR.</div>
          <button className="quiz-big-btn" onClick={onDeliver}>
            <Send size={16} /> ENTREGAR
          </button>
        </div>
      )}

      {/* ── RESULTADO DEL EXAMEN ── */}
      {examMode === 'delivered' && examResult && (
        <div className="progress-card">
          <div className="progress-header">
            <span>Resultado del Examen</span>
            <span style={{ color: examResult.completed ? 'var(--crt-green)' : 'var(--crt-amber)' }}>
              {examResult.score}%
            </span>
          </div>
          <div className="exam-timer" style={{ justifyContent: 'flex-start' }}>
            <Clock size={16} /> Tiempo: {fmt(examResult.elapsedMs)}
          </div>
          <Checklist feedback={examResult.feedback} />
          <button className="quiz-big-btn secondary" onClick={() => onToggleExam('exam')}>
            <GraduationCap size={16} /> Reintentar examen
          </button>
        </div>
      )}
    </div>
  );
};
