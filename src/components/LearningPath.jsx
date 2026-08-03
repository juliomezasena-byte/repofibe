import React, { useMemo } from 'react';
import { CalendarCheck, CheckCircle2, Circle, Clock3, RotateCcw, Target } from 'lucide-react';
import { getNodeMap, getProgressSummary, hasCompleted, isDue } from '../lib/learningPath';

function statusFor(node, progress, dailyScenarioId, activeScenarioId) {
  const entry = progress[node.scenarioId];
  if (activeScenarioId === node.scenarioId) return 'current';
  if (isDue(entry)) return 'review';
  if (entry?.consolidated) return 'consolidated';
  if (hasCompleted(entry)) return 'completed';
  if (node.scenarioId === dailyScenarioId) return 'today';
  return 'available';
}

const STATUS_LABELS = {
  current: 'Actual',
  today: 'Hoy',
  review: 'Repaso',
  consolidated: 'Consolidado',
  completed: 'Completado',
  available: 'Disponible'
};

export function LearningPath({ scenarios, curriculum, progress, activeScenarioId, dailyPlan, dailyScenarioId, onSelectScenario }) {
  const scenarioMap = useMemo(() => new Map(scenarios.map((scenario) => [scenario.id, scenario])), [scenarios]);
  const nodeMap = useMemo(() => getNodeMap(curriculum), [curriculum]);
  const summary = getProgressSummary(scenarios, progress);
  const phases = curriculum?.phases || [];
  const primaryScenarioId = dailyPlan?.primaryScenarioId || dailyScenarioId;
  const reviewScenario = scenarioMap.get(dailyPlan?.review);
  const newMissionScenario = scenarioMap.get(dailyPlan?.newMission);

  return (
    <section className="learning-path" aria-labelledby="learning-path-title">
      <div className="learning-path-heading">
        <div>
          <div className="learning-path-kicker"><Target size={13} /> RUTA GUIADA</div>
          <h2 id="learning-path-title">Tu siguiente paso</h2>
        </div>
        <span className="learning-path-count">{summary.completed}/{summary.total}</span>
      </div>

      <button
        className="daily-mission"
        onClick={() => primaryScenarioId && onSelectScenario(primaryScenarioId)}
        type="button"
      >
        {reviewScenario ? <RotateCcw size={18} /> : <CalendarCheck size={18} />}
        <span>
          <strong>{reviewScenario ? 'Repaso de hoy' : 'Misión de hoy'}</strong>
          <small>{scenarioMap.get(primaryScenarioId)?.title || 'Elige un escenario para comenzar'}</small>
        </span>
        <Clock3 size={14} />
        <em>{nodeMap.get(primaryScenarioId)?.estimatedMinutes || 10} min</em>
      </button>

      {reviewScenario && newMissionScenario && reviewScenario.id !== newMissionScenario.id && (
        <button
          className="new-mission"
          onClick={() => onSelectScenario(newMissionScenario.id)}
          type="button"
        >
          <CalendarCheck size={15} />
          <span><strong>Nuevo ejercicio</strong><small>{newMissionScenario.title}</small></span>
          <em>{nodeMap.get(newMissionScenario.id)?.estimatedMinutes || 10} min</em>
        </button>
      )}

      <div className="learning-path-progress" aria-label={`Progreso de la ruta: ${summary.percent}%`}>
        <div><span>Ruta completa</span><strong>{summary.percent}%</strong></div>
        <div className="progress-bar-bg"><div className="progress-bar-fill" style={{ width: `${summary.percent}%` }} /></div>
      </div>

      <p className="learning-path-note">La ruta recomienda; puedes abrir cualquier nivel cuando quieras.</p>

      <div className="learning-phases">
        {phases.map((phase, phaseIndex) => {
          const nodes = (curriculum.nodes || [])
            .filter((node) => node.phaseId === phase.id)
            .sort((a, b) => a.order - b.order);
          if (!nodes.length) return null;
          return (
            <details key={phase.id} className="learning-phase" open={phase.id === 'fundamentos'}>
              <summary><span>Nivel {phaseIndex + 1} · {phase.label}</span><small>{nodes.length} nodos</small></summary>
              <div className="learning-node-list">
                {nodes.map((node) => {
                  const scenario = scenarioMap.get(node.scenarioId);
                  if (!scenario) return null;
                  const status = statusFor(node, progress, dailyScenarioId, activeScenarioId);
                  return (
                    <button
                      key={node.scenarioId}
                      type="button"
                      className={`learning-node ${status}`}
                      onClick={() => onSelectScenario(node.scenarioId)}
                      aria-current={status === 'current' ? 'step' : undefined}
                    >
                      <span className="learning-node-icon">
                        {status === 'completed' || status === 'consolidated' ? <CheckCircle2 size={15} /> : status === 'review' ? <RotateCcw size={14} /> : <Circle size={15} />}
                      </span>
                      <span className="learning-node-copy">
                        <strong>{scenario.title.split(':').slice(1).join(':').trim() || scenario.title}</strong>
                        <small>{STATUS_LABELS[status]} · {scenario.difficulty} · {node.estimatedMinutes} min</small>
                      </span>
                    </button>
                  );
                })}
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
}
