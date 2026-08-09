import React from 'react';
import { Terminal } from '../components/Terminal';
import { TutorPanel } from '../components/TutorPanel';
import { useAppContext } from '../context/AppContext';

export function Tutor() {
  const { handleExecuteCommand, history, terminalRef } = useAppContext();

  return (
    <main className="main-layout">
      <Terminal
        ref={terminalRef}
        onExecuteCommand={handleExecuteCommand}
        history={history}
      />
      <TutorPanel />
    </main>
  );
}
