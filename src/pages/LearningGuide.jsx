import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookOpenCheck, CalendarCheck, CheckCircle2, Clock3, Lightbulb, RotateCcw, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { getNodeMap, getProgressSummary, hasCompleted, isDue } from '../lib/learningPath';
import { getLessonContent } from '../lib/lessonContent';

function publicTitle(scenario) {
  return scenario?.title?.replace(/^Nivel\s+\d+:\s*/, '') || 'Lección Amadeus';
}

export function LearningGuide() {
  const navigate = useNavigate();
  const {
    scenarios = [], curriculum, learningProgress = {}, dailyPlan,
    handleSelectScenario
  } = useAppContext();
  const [selectedId, setSelectedId] = useState(null);
  const [tutorMode, setTutorModeState] = useState(() => {
    try {
      return localStorage.getItem('cryptic-tutor-mode-v1') || 'ciegas';
    } catch {
      return 'ciegas';
    }
  });

  const setTutorMode = (mode) => {
    setTutorModeState(mode);
    try {
      localStorage.setItem('cryptic-tutor-mode-v1', mode);
    } catch {}
  };

  const scenarioMap = useMemo(() => new Map(scenarios.map((scenario) => [scenario.id, scenario])), [scenarios]);
  const nodeMap = useMemo(() => getNodeMap(curriculum), [curriculum]);
  const summary = getProgressSummary(scenarios, learningProgress);
  const primaryId = dailyPlan?.primaryScenarioId || scenarios[0]?.id;
  const activeId = selectedId || primaryId;
  const activeScenario = scenarioMap.get(activeId);
  const activeNode = nodeMap.get(activeId);
  const lesson = getLessonContent(activeScenario);
  const reviewScenario = scenarioMap.get(dailyPlan?.review);
  const newMissionScenario = scenarioMap.get(dailyPlan?.newMission);

  useEffect(() => {
    if (!selectedId && primaryId) setSelectedId(primaryId);
  }, [primaryId, selectedId]);

  const startLesson = () => {
    if (!activeId) return;
    handleSelectScenario(activeId);
    navigate('/simulador');
  };

  if (!curriculum?.nodes?.length || !scenarios.length) {
    return <main className="learning-guide loading-guide"><p>Cargando tu guía de aprendizaje…</p></main>;
  }

  return (
    <main className="learning-guide" aria-labelledby="guide-title">
      <section className="guide-hero">
        <div className="guide-kicker"><BookOpenCheck size={15} /> GUÍA DE APRENDIZAJE</div>
        <div className="guide-heading-row">
          <div>
            <h1 id="guide-title">Aprende Amadeus practicando</h1>
            <p>Una lección corta al día. El simulador te acompaña; tú decides cuándo avanzar.</p>
          </div>
          <div className="guide-progress-badge"><strong>{summary.completed}/{summary.total}</strong><small>lecciones</small></div>
        </div>
        <div className="guide-progress-track" aria-label={`Progreso: ${summary.percent}%`}>
          <span style={{ width: `${summary.percent}%` }} />
        </div>
      </section>

      <section className="guide-layout">
        <article className="lesson-card" aria-labelledby="lesson-title">
          <div className="lesson-card-topline">
            <span className={reviewScenario && activeId === reviewScenario.id ? 'lesson-kind review' : 'lesson-kind'}>
              {reviewScenario && activeId === reviewScenario.id ? <RotateCcw size={14} /> : <CalendarCheck size={14} />}
              {reviewScenario && activeId === reviewScenario.id ? 'Repaso de hoy' : 'Misión de hoy'}
            </span>
            {activeNode && <span className="lesson-time"><Clock3 size={14} /> {activeNode.estimatedMinutes} min</span>}
          </div>
          <h2 id="lesson-title">{lesson.title}</h2>
          <p className="lesson-objective"><strong>Objetivo</strong>{lesson.objective}</p>
          <p className="lesson-why"><strong>¿Por qué importa?</strong>{lesson.why}</p>

          <div className="lesson-steps">
            <h3>Tu recorrido</h3>
            <ol>{lesson.steps.map((step) => <li key={step}>{step}</li>)}</ol>
          </div>

          <div className="lesson-hint"><Lightbulb size={16} /><span><strong>Ayuda</strong>{lesson.hint}</span></div>

          {/* Selector de Modo de Aprendizaje (A Ciegas vs Guiado) */}
          <div className="guide-mode-selector" style={{ margin: '15px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>Modo de Estudio:</span>
            <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <button
                type="button"
                className={`guide-mode-btn ${tutorMode === 'ciegas' ? 'active' : ''}`}
                onClick={() => setTutorMode('ciegas')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  background: tutorMode === 'ciegas' ? '#0284c7' : 'transparent',
                  color: tutorMode === 'ciegas' ? '#ffffff' : '#64748b',
                  transition: 'all 0.15s ease'
                }}
              >
                🧠 A Ciegas (Recordar)
              </button>
              <button
                type="button"
                className={`guide-mode-btn ${tutorMode === 'guiado' ? 'active' : ''}`}
                onClick={() => setTutorMode('guiado')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  background: tutorMode === 'guiado' ? '#0284c7' : 'transparent',
                  color: tutorMode === 'guiado' ? '#ffffff' : '#64748b',
                  transition: 'all 0.15s ease'
                }}
              >
                📖 Guiado (Asistido)
              </button>
            </div>
          </div>

          <button className="guide-primary-action" type="button" onClick={startLesson}>
            Comenzar lección <ArrowRight size={17} />
          </button>
          <button className="guide-secondary-action" type="button" onClick={() => navigate('/simulador')}>
            Abrir simulador libre
          </button>
        </article>

        <aside className="guide-side-panel" aria-label="Progreso de la guía">
          <div className="guide-side-heading"><Target size={16} /><strong>Tu ruta</strong></div>
          <p>{summary.percent === 0 ? 'Empieza con la primera lección y construye tu base paso a paso.' : `Llevas ${summary.percent}% de la ruta completada.`}</p>
          {reviewScenario && newMissionScenario && reviewScenario.id !== newMissionScenario.id && (
            <button className="guide-review-card" type="button" onClick={() => setSelectedId(newMissionScenario.id)}>
              <CalendarCheck size={15} /><span><strong>Siguiente lección nueva</strong><small>{publicTitle(newMissionScenario)}</small></span>
            </button>
          )}
          <div className="guide-legend"><span><CheckCircle2 size={14} /> Completada</span><span><RotateCcw size={14} /> Repaso</span></div>
        </aside>
      </section>

      <section className="lesson-catalog" aria-labelledby="catalog-title">
        <div className="catalog-heading"><div><div className="guide-kicker"><Target size={14} /> RECORRIDO COMPLETO</div><h2 id="catalog-title">Tus lecciones</h2></div><span>{curriculum.nodes.length} lecciones</span></div>
        <p className="catalog-note">Puedes avanzar con la recomendación o abrir cualquier lección cuando quieras.</p>
        <div className="lesson-phases">
          {(curriculum.phases || []).map((phase, phaseIndex) => {
            const nodes = curriculum.nodes.filter((node) => node.phaseId === phase.id).sort((a, b) => a.order - b.order);
            return (
              <details key={phase.id} className="lesson-phase" open={phaseIndex === 0}>
                <summary><span><strong>Fase {phaseIndex + 1}</strong> · {phase.label}</span><small>{nodes.length} lecciones</small></summary>
                <div className="lesson-list">
                  {nodes.map((node) => {
                    const scenario = scenarioMap.get(node.scenarioId);
                    const entry = learningProgress[node.scenarioId];
                    const selected = node.scenarioId === activeId;
                    const state = isDue(entry) ? 'repaso' : hasCompleted(entry) ? 'completada' : node.scenarioId === primaryId ? 'hoy' : 'disponible';
                    return (
                      <button key={node.scenarioId} type="button" className={`lesson-list-item ${selected ? 'selected' : ''}`} onClick={() => setSelectedId(node.scenarioId)}>
                        <span className={`lesson-state ${state}`}>{state === 'completada' ? <CheckCircle2 size={14} /> : state === 'repaso' ? <RotateCcw size={14} /> : <span>{node.order}</span>}</span>
                        <span className="lesson-list-copy"><strong>{getLessonContent(scenario).title}</strong><small>{state === 'hoy' ? 'Misión de hoy' : state[0].toUpperCase() + state.slice(1)} · {node.estimatedMinutes} min</small></span>
                      </button>
                    );
                  })}
                </div>
              </details>
            );
          })}
        </div>
      </section>
    </main>
  );
}
