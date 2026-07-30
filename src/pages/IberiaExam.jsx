import React from 'react';
import { QuizPanel } from '../components/QuizPanel';
import { useAppContext } from '../context/AppContext';

export function IberiaExam() {
  const { profileConfig, locationsCatalog, flightsCatalog } = useAppContext();
  return (
    <main className="main-layout quiz-layout">
      <QuizPanel
        profileConfig={profileConfig}
        locationsCatalog={locationsCatalog}
        flightsCatalog={flightsCatalog}
        quizType="iberia"
        count={11}
      />
    </main>
  );
}
