import React, { useState, useEffect } from 'react';
import { Target, CheckCircle2, Circle, RefreshCw, GraduationCap, Dumbbell, Send, Clock, Eye, ChevronDown, ChevronRight, BookOpen } from 'lucide-react';

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
  activeScenarioId,
  onSelectScenario,
  evaluationResult,
  onResetScenario,
  examMode = 'practice',
  examStartTs = null,
  examResult = null,
  onToggleExam,
  onDeliver,
  chipStatus = [],
  onChipTap
}) => {
  const activeScenario = scenarios.find((s) => s.id === activeScenarioId) || scenarios[0];
  const [showData, setShowData] = useState(false);

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

  const elapsed = examMode === 'exam' && examStartTs ? now - examStartTs : 0;

  return (
    <div className="sidebar-panel">
      <div className="panel-title">
        <Target size={20} className="text-crt-green" />
        <span>Escenarios de Capacitación</span>
      </div>

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
            <div style={{ fontSize: '0.88rem', color: '#cbd5e1', lineHeight: '1.4' }}>
              {activeScenario.description}
            </div>
            {dataFields.length > 0 && (
              <button className="link-btn" style={{ marginTop: '8px' }} onClick={() => setShowData((v) => !v)}>
                <Eye size={12} /> {showData ? 'Ocultar datos' : 'Ver datos extraídos'}
              </button>
            )}
            {showData && (
              <div className="data-fields">
                {dataFields.map((f, i) => (
                  <div key={i} className="data-field">
                    <span className="data-label">{f.label}</span>
                    <span className="data-value">{f.value}</span>
                  </div>
                ))}
              </div>
            )}
          </Collapse>

          <Collapse
            title={activeScenario.difficulty === 'Avanzado' ? 'Flujo (nivel avanzado)' : 'Pasos sugeridos'}
            icon={<Target size={14} />}
            defaultOpen
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
          </Collapse>

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
