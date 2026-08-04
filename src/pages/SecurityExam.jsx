import React from 'react';
import { SecurityExamPanel } from '../components/SecurityExamPanel';
import { useAppContext } from '../context/AppContext';

export function SecurityExam() {
  const { profileConfig, locationsCatalog, flightsCatalog } = useAppContext();
  return (
    <main className="main-layout quiz-layout">
      <SecurityExamPanel
        profileConfig={profileConfig}
        locationsCatalog={locationsCatalog}
        flightsCatalog={flightsCatalog}
      />
    </main>
  );
}
