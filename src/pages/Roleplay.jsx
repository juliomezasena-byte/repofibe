import React from 'react';
import { Terminal } from '../components/Terminal';
import { RoleplayPanel } from '../components/RoleplayPanel';
import { useAppContext } from '../context/AppContext';

export function Roleplay() {
  const {
    scenarios,
    activeScenario,
    evaluationResult,
    handleExecuteCommand,
    history,
    terminalRef
  } = useAppContext();

  return (
    <main className="main-layout">
      <Terminal
        ref={terminalRef}
        onExecuteCommand={handleExecuteCommand}
        history={history}
        missionComplete={!!evaluationResult?.completed}
      />
      <RoleplayPanel
        scenarios={scenarios}
        activeScenario={activeScenario}
        evaluationResult={evaluationResult}
      />
    </main>
  );
}
