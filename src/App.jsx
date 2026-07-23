import React, { useState, useEffect, useMemo } from 'react';
import { TerminalSquare, BookOpen, GraduationCap, Layout, HelpCircle } from 'lucide-react';
import { DslParser } from './engine/DslParser';
import { PnrStateMachine } from './engine/PnrStateMachine';
import { ResponseGenerator } from './engine/ResponseGenerator';
import { EvaluationEngine } from './engine/EvaluationEngine';
import { Terminal } from './components/Terminal';
import { ScenarioSelector } from './components/ScenarioSelector';
import { VisualHelper } from './components/VisualHelper';
import { GdsDictionary } from './components/GdsDictionary';

export function App() {
  const [profileConfig, setProfileConfig] = useState(null);
  const [flightsCatalog, setFlightsCatalog] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [activeScenarioId, setActiveScenarioId] = useState('scenario-1');
  const [history, setHistory] = useState([]);
  
  // Estado UX de Estudiante
  const [activeTab, setActiveTab] = useState('simulator'); // 'simulator' | 'mission' | 'dictionary'
  const [learningMode, setLearningMode] = useState(true); // true = Modo Estudiante Guiado
  const [currentInput, setCurrentInput] = useState('');

  // Instancias de los motores del simulador
  const pnrFsm = useMemo(() => new PnrStateMachine(), []);
  const responseGen = useMemo(() => new ResponseGenerator(), []);
  const evalEngine = useMemo(() => new EvaluationEngine(), []);

  const dslParser = useMemo(() => {
    return new DslParser(profileConfig);
  }, [profileConfig]);

  // Cargar datos JSON de especificación DSL
  useEffect(() => {
    async function loadProfile() {
      try {
        const [cmdRes, flightRes, scenRes] = await Promise.all([
          fetch('/profiles/amadeus/commands_meta.json'),
          fetch('/profiles/amadeus/flights.json'),
          fetch('/profiles/amadeus/scenarios.json')
        ]);

        const cmdData = await cmdRes.json();
        const flightData = await flightRes.json();
        const scenData = await scenRes.json();

        setProfileConfig(cmdData);
        setFlightsCatalog(flightData.flights || []);
        setScenarios(scenData.scenarios || []);
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

    const processResult = pnrFsm.process(parseResult, flightsCatalog);
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
      {/* Navegación Superior */}
      <header className="top-navbar">
        <div className="brand-badge">
          <div className="brand-icon-wrapper">
            <TerminalSquare size={22} className="text-primary-cyan" />
          </div>
          <div>
            <div className="brand-text-title">Cryptic Trainer</div>
            <div className="brand-subtitle">Simulador GDS Amadeus PWA</div>
          </div>
        </div>

        {/* Pestañas de Navegación */}
        <div className="nav-tabs">
          <button
            className={`nav-tab-btn ${activeTab === 'simulator' ? 'active' : ''}`}
            onClick={() => setActiveTab('simulator')}
          >
            <Layout size={16} /> Terminal & Simulador
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'mission' ? 'active' : ''}`}
            onClick={() => setActiveTab('mission')}
          >
            <GraduationCap size={16} /> Misión Actual
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'dictionary' ? 'active' : ''}`}
            onClick={() => setActiveTab('dictionary')}
          >
            <HelpCircle size={16} /> Diccionario GDS
          </button>
        </div>

        {/* Botón Modo Estudiante / Guiado */}
        <button
          className="mode-toggle-btn"
          onClick={() => setLearningMode(!learningMode)}
          title="Alterna el Asistente Guiado de Sintaxis para estudiantes"
        >
          <GraduationCap size={16} />
          <span>{learningMode ? 'Modo Estudiante (Guiado)' : 'Modo Examen (Terminal Pura)'}</span>
        </button>
      </header>

      {/* Grid Principal */}
      <main className="main-grid">
        {activeTab === 'dictionary' ? (
          <GdsDictionary />
        ) : (
          <>
            <div className="simulator-area">
              {/* Asistente Guiado de Sintaxis en Modo Estudiante */}
              {learningMode && (
                <VisualHelper currentInput={currentInput} dslParser={dslParser} />
              )}

              <Terminal
                onExecuteCommand={handleExecuteCommand}
                history={history}
                onInputChange={setCurrentInput}
                inputVal={currentInput}
                setInputVal={setCurrentInput}
              />
            </div>

            <div className="sidebar-wrapper">
              <ScenarioSelector
                scenarios={scenarios}
                activeScenarioId={activeScenarioId}
                onSelectScenario={handleSelectScenario}
                evaluationResult={evaluationResult}
                onResetScenario={handleResetScenario}
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
