import React from 'react';
import { IberiaExamPanel } from '../components/IberiaExamPanel';
import { useAppContext } from '../context/AppContext';

export function IberiaExam() {
  const { profileConfig, locationsCatalog, flightsCatalog } = useAppContext();
  return (
    <main className="main-layout quiz-layout">
      <IberiaExamPanel
        profileConfig={profileConfig}
        locationsCatalog={locationsCatalog}
        flightsCatalog={flightsCatalog}
      />
    </main>
  );
}
