import React, { useState } from 'react';
import { Terminal } from '../components/Terminal';
import { ScenarioSelector } from '../components/ScenarioSelector';
import { VisualTicketViewer } from '../components/VisualTicketViewer';
import { SeatMapViewer } from '../components/SeatMapViewer';
import { useAppContext } from '../context/AppContext';
import { BookOpen, Ticket, Armchair } from 'lucide-react';

export function Simulator() {
  const [activeSidePanel, setActiveSidePanel] = useState('guide'); // 'guide' | 'ticket' | 'seatmap'

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

  const handleChipTap = (cmd) => {
    if (terminalRef.current) terminalRef.current.setInput(cmd);
  };

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

        <div className="simulator-side-panel-wrapper">
          <div className="side-panel-switcher">
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
          </div>

          {activeSidePanel === 'guide' && (
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
              onChipTap={handleChipTap}
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
