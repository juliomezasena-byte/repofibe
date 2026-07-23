import React from 'react';
import { Target, CheckCircle2, Circle, RefreshCw } from 'lucide-react';

export const ScenarioSelector = ({
  scenarios,
  activeScenarioId,
  onSelectScenario,
  evaluationResult,
  onResetScenario
}) => {
  const activeScenario = scenarios.find((s) => s.id === activeScenarioId) || scenarios[0];

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

      {activeScenario && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '0.88rem', color: '#cbd5e1', lineHeight: '1.4' }}>
            {activeScenario.description}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>COMANDOS SUGERIDOS:</span>
            <button
              onClick={onResetScenario}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--crt-cyan)',
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <RefreshCw size={12} /> Reiniciar PNR
            </button>
          </div>

          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--crt-cyan)' }}>
            {activeScenario.suggestedFlow.join(' -> ')}
          </div>
        </div>
      )}

      {evaluationResult && (
        <div className="progress-card">
          <div className="progress-header">
            <span>Progreso del Objetivo</span>
            <span style={{ color: evaluationResult.completed ? 'var(--crt-green)' : 'var(--crt-cyan)' }}>
              {evaluationResult.score}% {evaluationResult.completed && '(¡COMPLETADO!)'}
            </span>
          </div>

          <div className="progress-bar-bg">
            <div
              className="progress-bar-fill"
              style={{ width: `${evaluationResult.score}%` }}
            ></div>
          </div>

          <div className="checklist-group" style={{ marginTop: '8px' }}>
            {evaluationResult.feedback.map((item, idx) => {
              const isOk = item.startsWith('[OK]');
              return (
                <div key={idx} className="checklist-item">
                  {isOk ? (
                    <CheckCircle2 size={16} className="check-ok" />
                  ) : (
                    <Circle size={16} className="check-pending" />
                  )}
                  <span className={isOk ? 'check-ok' : 'check-pending'}>
                    {item.replace('[OK]', '').replace('[PENDIENTE]', '')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
