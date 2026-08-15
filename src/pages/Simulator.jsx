import React, { useEffect, useState } from 'react';
import { Terminal } from '../components/Terminal';
import { ScenarioSelector } from '../components/ScenarioSelector';
import { VisualTicketViewer } from '../components/VisualTicketViewer';
import { SeatMapViewer } from '../components/SeatMapViewer';
import { TutorPanel } from '../components/TutorPanel';
import { ProcedureStation } from '../components/ProcedureStation';
import { useAppContext } from '../context/AppContext';
import { BookOpen, Ticket, Armchair, Bot, X } from 'lucide-react';
import { getPreflightDefinition } from '../lib/interactiveExercises';

function MobileMissionContext({ activeScenario, exerciseSession, preflightAnswer, onSubmitPreflight, examMode }) {
  if (!activeScenario || exerciseSession?.kind !== 'scenario') return null;
  const preflight = getPreflightDefinition(activeScenario);
  const locked = exerciseSession.mode === 'guided' && examMode !== 'exam' && !preflightAnswer?.correct;
  return (
    <section className="mobile-mission-context" aria-label="Misión móvil">
      <span className="mobile-mission-kicker">CASO · {activeScenario.difficulty || 'PRÁCTICA'}</span>
      <h2>{activeScenario.title}</h2>
      <p>{locked ? 'Identifica el primer procedimiento antes de escribir en la terminal.' : 'Decisión confirmada. Ejecuta un comando y lee la respuesta.'}</p>
      {locked && preflight && (
        <div className="mobile-mission-decision">
          <strong>{preflight.question}</strong>
          <div className="decision-options">
            {preflight.options.map((option) => (
              <button key={option.id} type="button" className="decision-option" onClick={() => onSubmitPreflight?.(option.id)}>
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export function Simulator({ freeMode = false, mode = 'guided' }) {
  const [activeSidePanel, setActiveSidePanel] = useState('guide'); // 'guide' | 'ticket' | 'seatmap'
  const [assistantOpen, setAssistantOpen] = useState(false);
  const routeMode = freeMode ? 'free' : mode;

  const {
    activeScenario,
    examMode,
    evaluationResult,
    handleExecuteCommand,
    history,
    scenarios,
    curriculum,
    learningProgress,
    dailyPlan,
    dailyScenarioId,
    activeScenarioId,
    handleSelectScenario,
    handleResetScenario,
    examStartTs,
    examResult,
    handleToggleExam,
    handleDeliver,
    chipStatus,
    terminalRef,
    exerciseSession,
    sessionRecovered,
    handleSetPracticeMode,
    preflightAnswer,
    pendingInterpretation,
    interpretationResult,
    handleSubmitPreflight,
    handleSubmitInterpretation,
    handleContinueAfterInterpretation
  } = useAppContext();

  useEffect(() => {
    handleSetPracticeMode?.(routeMode);
  }, [handleSetPracticeMode, routeMode]);
  const isManualStation = exerciseSession?.kind === 'procedure' && exerciseSession.station !== 'amadeus';
  const guidedGateActive = !freeMode && !isManualStation && examMode !== 'exam' && (!exerciseSession || exerciseSession.mode === 'guided') && (!preflightAnswer?.correct || !!pendingInterpretation);

  const handleChipTap = (cmd) => {
    if (terminalRef.current) terminalRef.current.setInput(cmd);
  };

  useEffect(() => {
    if (!assistantOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setAssistantOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [assistantOpen]);

  useEffect(() => {
    if (isManualStation) setActiveSidePanel('guide');
  }, [isManualStation]);

  return (
    <>
      <button
        type="button"
        className="assistant-fab"
        aria-label={assistantOpen ? 'Cerrar asistente' : 'Abrir asistente'}
        aria-expanded={assistantOpen}
        onClick={() => setAssistantOpen((open) => !open)}
      >
        {assistantOpen ? <X size={19} /> : <Bot size={19} />}
        <span>{assistantOpen ? 'Cerrar asistente' : 'Abrir asistente'}</span>
      </button>

      {assistantOpen && (
        <div className="assistant-float-layer">
          <button
            type="button"
            className="assistant-float-backdrop"
            aria-label="Cerrar asistente"
            onClick={() => setAssistantOpen(false)}
          />
          <section className="assistant-float" role="dialog" aria-modal="true" aria-labelledby="assistant-float-title">
            <header className="assistant-float-header">
              <div>
                <span className="assistant-float-kicker">AYUDA EN CONTEXTO</span>
                <h2 id="assistant-float-title"><Bot size={18} /> Asistente de Amadeus</h2>
                <p>Pregunta por el paso actual sin abandonar la terminal.</p>
              </div>
              <button type="button" className="assistant-float-close" aria-label="Cerrar asistente" onClick={() => setAssistantOpen(false)}>
                <X size={18} />
              </button>
            </header>
            <TutorPanel />
          </section>
        </div>
      )}

      <button
        className="mission-bar-mobile"
        onClick={() => document.querySelector('.sidebar-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
      >
        <span className="mission-bar-level">
          {activeScenario ? activeScenario.title.split(':')[0] : 'MISIÓN'}
          {examMode === 'exam' && ' · EXAMEN'}
        </span>
        <span className={`mission-bar-pct ${evaluationResult?.completed && examMode === 'practice' ? 'done' : ''}`}>
          {examMode === 'exam' ? '⏱' : `${evaluationResult?.score ?? 0}%`} ▸ VER MISIÓN
        </span>
      </button>

      {sessionRecovered && (
        <div className="session-recovered-banner" role="status">
          Ejercicio recuperado. Los datos transitorios se reiniciaron; vuelve a ejecutar el último paso.
        </div>
      )}
      <main className={`main-layout ${isManualStation ? 'manual-layout' : ''}`} data-practice-mode={routeMode}>
        {!isManualStation && (
          <MobileMissionContext
            activeScenario={activeScenario}
            exerciseSession={exerciseSession}
            preflightAnswer={preflightAnswer}
            onSubmitPreflight={handleSubmitPreflight}
            examMode={examMode}
          />
        )}
        {isManualStation ? (
          <section className="inactive-terminal" aria-label="Terminal no requerida para este procedimiento">
            <div className="inactive-terminal-lights"><span /><span /><span /></div>
            <div className="inactive-terminal-copy">
              <strong>ESTACIÓN MANUAL ACTIVA</strong>
              <p>Este ejercicio no necesita ejecutar comandos Amadeus.</p>
              <span>Trabaja con los requisitos y la evidencia del panel de misión.</span>
            </div>
          </section>
        ) : (
          <Terminal
            ref={terminalRef}
            onExecuteCommand={handleExecuteCommand}
            history={history}
            hideVerbs={examMode === 'exam'}
            missionComplete={examMode === 'practice' && !!evaluationResult?.completed}
            canExecuteCommand={!guidedGateActive}
            blockedMessage={pendingInterpretation
              ? 'INTERPRETA LA ULTIMA RESPUESTA EN EL PANEL DE MISION.'
              : 'RESPONDE LA DECISION DEL CASO EN EL PANEL DE MISION.'}
          />
        )}

        <div className="simulator-side-panel-wrapper">
          {exerciseSession?.kind === 'procedure' && exerciseSession.station !== 'amadeus' && (
            <div className="station-notice" role="status">
              <strong>Superficie activa: manual / sistema externo</strong>
              <span>Este caso no se ejecuta en la terminal Amadeus. Usa el paso Ahora y pega la evidencia cuando el procedimiento la solicite.</span>
            </div>
          )}
          {!isManualStation && <div className="side-panel-switcher">
            <button
              type="button"
              className={`switcher-btn ${activeSidePanel === 'guide' ? 'active' : ''}`}
              onClick={() => setActiveSidePanel('guide')}
            >
              <BookOpen size={14} /> Guía Ejercicio
            </button>
            <button
              type="button"
              className={`switcher-btn ${activeSidePanel === 'ticket' ? 'active' : ''}`}
              onClick={() => setActiveSidePanel('ticket')}
            >
              <Ticket size={14} /> E-Ticket 075
            </button>
            <button
              type="button"
              className={`switcher-btn ${activeSidePanel === 'seatmap' ? 'active' : ''}`}
              onClick={() => setActiveSidePanel('seatmap')}
            >
              <Armchair size={14} /> Cabina A350
            </button>
          </div>}

          {activeSidePanel === 'guide' && (
            exerciseSession?.kind === 'procedure' && exerciseSession.station !== 'amadeus'
              ? <ProcedureStation
                exerciseSession={exerciseSession}
                pendingInterpretation={pendingInterpretation}
                interpretationResult={interpretationResult}
                onSubmitInterpretation={handleSubmitInterpretation}
                onContinueAfterInterpretation={handleContinueAfterInterpretation}
              />
              : <ScenarioSelector
                scenarios={scenarios}
                curriculum={curriculum}
                learningProgress={learningProgress}
                dailyPlan={dailyPlan}
                dailyScenarioId={dailyScenarioId}
                activeScenarioId={activeScenarioId}
                onSelectScenario={handleSelectScenario}
                freeMode={freeMode}
                evaluationResult={evaluationResult}
                onResetScenario={handleResetScenario}
                examMode={examMode}
                examStartTs={examStartTs}
                examResult={examResult}
                onToggleExam={handleToggleExam}
                onDeliver={handleDeliver}
                chipStatus={chipStatus}
                onChipTap={handleChipTap}
                exerciseSession={exerciseSession}
                preflightAnswer={preflightAnswer}
                onSubmitPreflight={handleSubmitPreflight}
                pendingInterpretation={pendingInterpretation}
                interpretationResult={interpretationResult}
                onSubmitInterpretation={handleSubmitInterpretation}
                onContinueAfterInterpretation={handleContinueAfterInterpretation}
              />
          )}

          {activeSidePanel === 'ticket' && (
            <VisualTicketViewer
              activeScenario={activeScenario}
              history={history}
              evaluationResult={evaluationResult}
            />
          )}

          {activeSidePanel === 'seatmap' && (
            <SeatMapViewer
              activeScenario={activeScenario}
              history={history}
              onChipTap={handleChipTap}
            />
          )}
        </div>
      </main>
    </>
  );
}
