import React, { useMemo, useState } from 'react';
import { ArrowRight, CalendarCheck, Lightbulb, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TutorPanel } from '../components/TutorPanel';
import { useAppContext } from '../context/AppContext';
import { getLessonContent } from '../lib/lessonContent';
import { getProgressSummary } from '../lib/learningPath';

export function Tutor({ mode = 'guided' }) {
  const navigate = useNavigate();
  const isFreeMode = mode === 'free';
  const {
    scenarios = [],
    curriculum,
    learningProgress = {},
    dailyPlan,
    handleSelectScenario,
    exerciseSession
  } = useAppContext();
  const [estadoTutor, setEstadoTutor] = useState(null);
  const paso = estadoTutor?.paso || (exerciseSession?.manualStep ? {
    n: exerciseSession.manualStep,
    proceso: exerciseSession.manualTitle,
    sistema: exerciseSession.manualSystem,
    confianza: exerciseSession.manualConfidence
  } : null);
  const scenarioMap = useMemo(
    () => new Map(scenarios.map((scenario) => [scenario.id, scenario])),
    [scenarios]
  );
  const missionId = isFreeMode ? null : (dailyPlan?.primaryScenarioId || scenarios[0]?.id);
  const mission = scenarioMap.get(missionId);
  const lesson = getLessonContent(mission);
  const progress = getProgressSummary(scenarios, learningProgress);

  const startMission = () => {
    if (!missionId || !handleSelectScenario) return;
    handleSelectScenario(missionId);
    navigate('/simulador');
  };

  return (
    <main className="tutor-workspace">
      <aside className="procedure-space" aria-label="Paso del manual">
        <div className="procedure-space-kicker">{isFreeMode ? 'TUTOR LIBRE' : 'TUTOR GUIADO'}</div>
        <h2>{estadoTutor?.titulo || (mission ? 'Mision lista para practicar' : isFreeMode ? 'Escribe tu caso para empezar' : 'Sin procedimiento seleccionado')}</h2>
        <p className="procedure-space-hint">
          {paso ? 'El tutor conserva el paso del manual mientras operas.' : isFreeMode ? 'Pregunta, pega el billete o elige un manual. No hay una mision impuesta.' : 'Aqui ves que debes resolver antes de escribir en la terminal.'}
        </p>
        {paso ? (
          <div className="procedure-space-step">
            <span>PASO {paso.n}</span>
            <strong>{paso.proceso}</strong>
            <small>{paso.sistema?.toUpperCase()} · {paso.confianza === 'hueco' ? 'SIN DOCUMENTAR' : 'FUENTE CONTROLADA'}</small>
          </div>
        ) : mission ? (
          <article className="tutor-mission-card" aria-labelledby="tutor-mission-title">
            <div className="tutor-mission-kicker"><CalendarCheck size={14} /> MISION DE HOY</div>
            <h3 id="tutor-mission-title">{lesson.title}</h3>
            <p className="tutor-mission-objective"><Target size={15} /><span><strong>Objetivo</strong>{lesson.objective}</span></p>
            <div className="tutor-mission-route">
              <strong>Tu recorrido</strong>
              <ol>{lesson.steps.slice(0, 3).map((step) => <li key={step}>{step}</li>)}</ol>
            </div>
            <div className="tutor-mission-hint"><Lightbulb size={15} /><span><strong>Pista</strong>{lesson.hint}</span></div>
            <div className="tutor-mission-footer">
              <span>{progress.completed}/{progress.total} lecciones completadas</span>
              <button type="button" className="tutor-mission-start" onClick={startMission}>
                Ir al simulador <ArrowRight size={15} />
              </button>
            </div>
          </article>
        ) : (
          <div className="procedure-space-empty">Escribe un caso o abre un ejercicio para que el tutor cargue el primer paso.</div>
        )}
      </aside>
      <section className="tutor-coach-space" aria-label={`Tutor ${isFreeMode ? 'libre' : 'guiado'} paso a paso`} data-tutor-mode={mode}>
        <div className="tutor-space-label">
          <span>ESPACIO DEL TUTOR</span>
          <strong>Aquí entiendes el caso; la ejecución vive en el Simulador.</strong>
        </div>
        <TutorPanel routeMode={mode} onStateChange={setEstadoTutor} />
      </section>
    </main>
  );
}
