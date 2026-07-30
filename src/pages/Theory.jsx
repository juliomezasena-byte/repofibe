import React from 'react';
import { QuizPanel } from '../components/QuizPanel';
import { useAppContext } from '../context/AppContext';

export function Theory() {
  const { profileConfig, locationsCatalog, flightsCatalog } = useAppContext();
  return (
    <main className="main-layout quiz-layout">
      <QuizPanel
        profileConfig={profileConfig}
        locationsCatalog={locationsCatalog}
        flightsCatalog={flightsCatalog}
      />
    </main>
  );
}
