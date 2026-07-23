import React, { useState, useEffect, useMemo } from 'react';
import { TerminalSquare, BookOpen, Brain, Layout } from 'lucide-react';
import { DslParser } from './engine/DslParser';
import { PnrStateMachine } from './engine/PnrStateMachine';
import { ResponseGenerator } from './engine/ResponseGenerator';
import { EvaluationEngine } from './engine/EvaluationEngine';
import { Terminal } from './components/Terminal';
import { ScenarioSelector } from './components/ScenarioSelector';
import { QuizPanel } from './components/QuizPanel';

export function App() {
  const [profileConfig, setProfileConfig] = useState(null);
  const [flightsCatalog, setFlightsCatalog] = useState([]);
  const [locationsCatalog, setLocationsCatalog] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [activeScenarioId, setActiveScenarioId] = useState('scenario-1');
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('sim'); // 'sim' | 'quiz'

  // Instancias de los motores del simulador
  const pnrFsm = useMemo(() => new PnrStateMachine(), []);
  const responseGen = useMemo(() => new ResponseGenerator(profileConfig), [profileConfig]);
  const evalEngine = useMemo(() => new EvaluationEngine(), []);

  const dslParser = useMemo(() => {
    return new DslParser(profileConfig);
  }, [profileConfig]);

  // Cargar datos JSON de especificación DSL
  useEffect(() => {
    async function loadProfile() {
      try {
        const [cmdRes, flightRes, scenRes, locRes] = await Promise.all([
          fetch('/profiles/amadeus/commands_meta.json'),
          fetch('/profiles/amadeus/flights.json'),
          fetch('/profiles/amadeus/scenarios.json'),
          fetch('/profiles/amadeus/locations.json')
        ]);

        const cmdData = await cmdRes.json();
        const flightData = await flightRes.json();
        const scenData = await scenRes.json();
        const locData = await locRes.json();

        setProfileConfig(cmdData);
        setFlightsCatalog(flightData.flights || []);
        setScenarios(scenData.scenarios || []);
        setLocationsCatalog(locData.locations || []);
      } catch (err) {
        console.error('Error cargando perfil Amadeus DSL:', err);
      }
    }
    loadProfile();
  }, []);

  // Registrar Service Worker para PWA Offline
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.log('Service Worker registro omitido en dev:', err);
      });
    }
  }, []);

  const activeScenario = useMemo(() => {
    return scenarios.find((s) => s.id === activeScenarioId) || scenarios[0];
  }, [scenarios, activeScenarioId]);

  // Manejar cambio de escenario
  const handleSelectScenario = (scenarioId) => {
    setActiveScenarioId(scenarioId);
    pnrFsm.reset();
    const newScen = scenarios.find((s) => s.id === scenarioId);
    if (newScen && newScen.initialState && newScen.initialState.pnr) {
      pnrFsm.setState(newScen.initialState.pnr);
    }
    setHistory([]);
  };

  const handleResetScenario = () => {
    pnrFsm.reset();
    if (activeScenario && activeScenario.initialState && activeScenario.initialState.pnr) {
      pnrFsm.setState(activeScenario.initialState.pnr);
    }
    setHistory([]);
  };

  // Ejecución de comandos ingresados en la Terminal
  const handleExecuteCommand = (rawCommand) => {
    const parseResult = dslParser.parse(rawCommand);

    if (!parseResult.success) {
      const output = responseGen.formatResponse(parseResult, pnrFsm.getState());
      setHistory((prev) => [...prev, { command: rawCommand, output, isError: true }]);
      return;
    }

    const processResult = pnrFsm.process(parseResult, flightsCatalog, locationsCatalog);
    const pnrState = pnrFsm.getState();
    const output = responseGen.formatResponse(processResult, pnrState);

    setHistory((prev) => [
      ...prev,
      {
        command: rawCommand,
        output,
        isError: !processResult.success
      }
    ]);
  };

  // Resultado de la evaluación del progreso del escenario
  const evaluationResult = useMemo(() => {
    if (!activeScenario) return null;
    return evalEngine.evaluate(activeScenario, pnrFsm.getState());
  }, [activeScenario, history, evalEngine, pnrFsm]);

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="brand-section">
          <TerminalSquare className="brand-icon" />
          <h1 className="brand-title">Cryptic Trainer</h1>
          <span className="brand-tag">GDS AMADEUS PWA</span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('sim')}
            className={`keypad-btn ${activeTab === 'sim' ? 'tab-active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Layout size={14} /> Simulador
          </button>
          <button
            onClick={() => setActiveTab('quiz')}
            className={`keypad-btn ${activeTab === 'quiz' ? 'tab-active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Brain size={14} /> Teoría
          </button>
          <button
            onClick={() => { setActiveTab('sim'); handleExecuteCommand('HE'); }}
            className="keypad-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <BookOpen size={14} /> Manual (HE)
          </button>
        </div>
      </header>

      {activeTab === 'quiz' ? (
        <main className="main-layout quiz-layout">
          <QuizPanel
            profileConfig={profileConfig}
            locationsCatalog={locationsCatalog}
            flightsCatalog={flightsCatalog}
          />
        </main>
      ) : (
        <main className="main-layout">
          <Terminal onExecuteCommand={handleExecuteCommand} history={history} />

          <ScenarioSelector
            scenarios={scenarios}
            activeScenarioId={activeScenarioId}
            onSelectScenario={handleSelectScenario}
            evaluationResult={evaluationResult}
            onResetScenario={handleResetScenario}
          />
        </main>
      )}
    </div>
  );
}
