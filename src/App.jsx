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
  const [examMode, setExamMode] = useState('practice'); // 'practice' | 'exam' | 'delivered'
  const [examStartTs, setExamStartTs] = useState(null);
  const [examResult, setExamResult] = useState(null);

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

  // Reinicia el PNR al estado inicial del escenario dado y limpia la pantalla.
  const cargarEstadoInicial = (scen) => {
    pnrFsm.reset();
    if (scen && scen.initialState && scen.initialState.pnr) {
      pnrFsm.setState(scen.initialState.pnr);
    }
    setHistory([]);
  };

  // Manejar cambio de escenario: cancela cualquier examen en curso.
  const handleSelectScenario = (scenarioId) => {
    setActiveScenarioId(scenarioId);
    cargarEstadoInicial(scenarios.find((s) => s.id === scenarioId));
    setExamMode('practice');
    setExamStartTs(null);
    setExamResult(null);
  };

  const handleResetScenario = () => {
    cargarEstadoInicial(activeScenario);
  };

  // PRÁCTICA <-> EXAMEN. Activar examen reinicia el PNR y arranca el cronómetro.
  const handleToggleExam = (mode) => {
    if (mode === 'exam') {
      cargarEstadoInicial(activeScenario);
      setExamStartTs(Date.now());
      setExamResult(null);
      setExamMode('exam');
    } else {
      setExamMode('practice');
      setExamStartTs(null);
      setExamResult(null);
    }
  };

  // ENTREGAR: congela el resultado (score, tiempo, checklist) y cierra el examen.
  const handleDeliver = () => {
    const evalNow = evalEngine.evaluate(activeScenario, pnrFsm.getState());
    const elapsedMs = examStartTs ? Date.now() - examStartTs : 0;
    setExamResult({ ...evalNow, elapsedMs });
    setExamMode('delivered');
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

        <div className="header-controls">
          <div className="seg-control" role="tablist" aria-label="Modo de la aplicación">
            <button
              role="tab"
              aria-selected={activeTab === 'sim'}
              onClick={() => setActiveTab('sim')}
              className={`seg-btn ${activeTab === 'sim' ? 'seg-active' : ''}`}
            >
              <Layout size={14} /> Simulador
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'quiz'}
              onClick={() => setActiveTab('quiz')}
              className={`seg-btn ${activeTab === 'quiz' ? 'seg-active' : ''}`}
            >
              <Brain size={14} /> Teoría
            </button>
          </div>
          <button
            onClick={() => { setActiveTab('sim'); handleExecuteCommand('HE'); }}
            className="ghost-btn"
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
        <>
          {/* Barra de misión (solo móvil): progreso siempre visible sin
              scrollear. Tocarla lleva al panel de la misión. */}
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
            onExecuteCommand={handleExecuteCommand}
            history={history}
            hideVerbs={examMode === 'exam'}
            missionComplete={examMode === 'practice' && !!evaluationResult?.completed}
          />

          <ScenarioSelector
            scenarios={scenarios}
            activeScenarioId={activeScenarioId}
            onSelectScenario={handleSelectScenario}
            evaluationResult={evaluationResult}
            onResetScenario={handleResetScenario}
            examMode={examMode}
            examStartTs={examStartTs}
            examResult={examResult}
            onToggleExam={handleToggleExam}
            onDeliver={handleDeliver}
          />
        </main>
        </>
      )}
    </div>
  );
}
