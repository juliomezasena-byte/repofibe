import React, { useState, useEffect } from 'react';
import { Target, CheckCircle2, Circle, RefreshCw, GraduationCap, Dumbbell, Send, Clock } from 'lucide-react';

function fmt(ms) {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
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
  onDeliver
}) => {
  const activeScenario = scenarios.find((s) => s.id === activeScenarioId) || scenarios[0];

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

      {activeScenario && (
        <div style={{ fontSize: '0.88rem', color: '#cbd5e1', lineHeight: '1.4' }}>
          {activeScenario.description}
        </div>
      )}

      {/* ── MODO PRÁCTICA: comandos sugeridos + progreso en vivo ── */}
      {examMode === 'practice' && activeScenario && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>COMANDOS SUGERIDOS:</span>
            <button onClick={onResetScenario} className="link-btn">
              <RefreshCw size={12} /> Reiniciar PNR
            </button>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--crt-cyan)' }}>
            {activeScenario.suggestedFlow.join(' -> ')}
          </div>

          {evaluationResult && (
            <div className="progress-card">
              <div className="progress-header">
                <span>Progreso del Objetivo</span>
                <span style={{ color: evaluationResult.completed ? 'var(--crt-green)' : 'var(--crt-cyan)' }}>
                  {evaluationResult.score}% {evaluationResult.completed && '(¡COMPLETADO!)'}
                </span>
              </div>
              <div className="progress-bar-bg">
                <div className="progress-bar-fill" style={{ width: `${evaluationResult.score}%` }}></div>
              </div>
              <Checklist feedback={evaluationResult.feedback} />
            </div>
          )}
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
