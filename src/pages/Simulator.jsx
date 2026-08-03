import React from 'react';
import { Terminal } from '../components/Terminal';
import { ScenarioSelector } from '../components/ScenarioSelector';
import { useAppContext } from '../context/AppContext';

export function Simulator() {
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
    terminalRef
  } = useAppContext();

  return (
    <>
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

      <main className="main-layout">
        <Terminal
          ref={terminalRef}
          onExecuteCommand={handleExecuteCommand}
          history={history}
          hideVerbs={examMode === 'exam'}
          missionComplete={examMode === 'practice' && !!evaluationResult?.completed}
        />

        <ScenarioSelector
          scenarios={scenarios}
          curriculum={curriculum}
          learningProgress={learningProgress}
          dailyPlan={dailyPlan}
          dailyScenarioId={dailyScenarioId}
          activeScenarioId={activeScenarioId}
          onSelectScenario={handleSelectScenario}
          evaluationResult={evaluationResult}
          onResetScenario={handleResetScenario}
          examMode={examMode}
          examStartTs={examStartTs}
          examResult={examResult}
          onToggleExam={handleToggleExam}
          onDeliver={handleDeliver}
          chipStatus={chipStatus}
          onChipTap={(cmd) => {
             if (terminalRef.current) terminalRef.current.setInput(cmd);
          }}
        />
      </main>
    </>
  );
}
