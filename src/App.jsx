import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TerminalSquare, BookOpen, Brain, Layout, Volume2, VolumeX } from 'lucide-react';
import { DslParser } from './engine/DslParser';
import { PnrStateMachine } from './engine/PnrStateMachine';
import { ResponseGenerator } from './engine/ResponseGenerator';
import { EvaluationEngine } from './engine/EvaluationEngine';
import { Terminal } from './components/Terminal';
import { ScenarioSelector } from './components/ScenarioSelector';
import { QuizPanel } from './components/QuizPanel';
import { LoginScreen } from './components/LoginScreen';
import { auth } from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { getUserData, updateStreak } from './lib/db';
import { useAudio } from './hooks/useAudio';
import { useLocalStorage } from './hooks/useLocalStorage';

export function App() {
  const [profileConfig, setProfileConfig] = useState(null);
  const [flightsCatalog, setFlightsCatalog] = useState([]);
  const [locationsCatalog, setLocationsCatalog] = useState([]);
  const [equipmentCatalog, setEquipmentCatalog] = useState({});
  const [scenarios, setScenarios] = useState([]);
  const [activeScenarioId, setActiveScenarioId] = useState('scenario-1');
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('sim'); // 'sim' | 'quiz'
  const [examMode, setExamMode] = useState('practice'); // 'practice' | 'exam' | 'delivered'
  const [examStartTs, setExamStartTs] = useState(null);
  const [examResult, setExamResult] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [streak, setStreak] = useState(0);

  const terminalRef = useRef(null);
  const { isMuted, toggleMute, playSound } = useAudio();
  const [confettiShown, setConfettiShown] = useLocalStorage('amadeus_confetti_shown', {});

  // Instancias de los motores del simulador
  const pnrFsm = useMemo(() => new PnrStateMachine(), []);
  const responseGen = useMemo(() => new ResponseGenerator(profileConfig, equipmentCatalog), [profileConfig, equipmentCatalog]);
  const evalEngine = useMemo(() => new EvaluationEngine(), []);

  const dslParser = useMemo(() => {
    return new DslParser(profileConfig);
  }, [profileConfig]);

  // Escuchar estado de autenticación
  useEffect(() => {
    if (localStorage.getItem('PLAYWRIGHT_TEST') === '1') {
      setIsAuthenticated(true);
      setAuthLoading(false);
      return;
    }
    let isMounted = true;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userData = await getUserData(user.uid);
          const currentStreak = userData?.streakCount || 0;
          const lastDate = userData?.lastStreakDate || null;
          const newStreak = await updateStreak(user.uid, currentStreak, lastDate);
          if (isMounted) setStreak(newStreak);
        } catch (e) {
          console.error("Error al actualizar la racha:", e);
        }
        if (isMounted) {
          setIsAuthenticated(true);
          setAuthLoading(false);
        }
      } else {
        if (isMounted) {
          setIsAuthenticated(false);
          setStreak(0);
          setAuthLoading(false);
        }
      }
    });
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Cargar datos JSON de especificación DSL
  useEffect(() => {
    async function loadProfile() {
      try {
        const [cmdRes, flightRes, scenRes, locRes, equipRes] = await Promise.all([
          fetch('/profiles/amadeus/commands_meta.json'),
          fetch('/profiles/amadeus/flights.json'),
          fetch('/profiles/amadeus/scenarios.json'),
          fetch('/profiles/amadeus/locations.json'),
          fetch('/profiles/amadeus/equipment.json')
        ]);

        const cmdData = await cmdRes.json();
        const flightData = await flightRes.json();
        const scenData = await scenRes.json();
        const locData = await locRes.json();
        const equipData = await equipRes.json();

        setProfileConfig(cmdData);
        setFlightsCatalog(flightData.flights || []);
        setScenarios(scenData.scenarios || []);
        setLocationsCatalog(locData.locations || []);
        setEquipmentCatalog(equipData.equipment || {});
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
    playSound('key'); // Sonido de tipeo (simulando Enter)
    
    const parseResult = dslParser.parse(rawCommand);

    if (!parseResult.success) {
      const output = responseGen.formatResponse(parseResult, pnrFsm.getState());
      setHistory((prev) => [...prev, { command: rawCommand, output, isError: true }]);
      playSound('error');
      return;
    }

    const processResult = pnrFsm.process(parseResult, flightsCatalog, locationsCatalog);
    const pnrState = pnrFsm.getState();
    const output = responseGen.formatResponse(processResult, pnrState);
    
    if (!processResult.success) {
      playSound('error');
    }

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

  // Efecto para lanzar Confeti y Sonido de Éxito cuando se completa
  useEffect(() => {
    if (evaluationResult?.completed && examMode === 'practice' && activeScenarioId) {
      if (!confettiShown[activeScenarioId]) {
        // Reproducir campana de éxito
        playSound('success');
        
        // Carga diferida de canvas-confetti y verificación de prefers-reduced-motion
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!prefersReducedMotion) {
          import('canvas-confetti').then(({ default: confetti }) => {
            confetti({
              particleCount: 150,
              spread: 70,
              origin: { y: 0.6 },
              disableForReducedMotion: true
            });
          }).catch(err => console.warn("Error cargando confetti:", err));
        }

        // Marcar como visto usando localStorage seguro
        setConfettiShown(prev => ({ ...prev, [activeScenarioId]: true }));
      }
    }
  }, [evaluationResult?.completed, examMode, activeScenarioId, confettiShown, playSound, setConfettiShown]);

  // Estado de cada chip (paso sugerido): 'done' | 'current' | 'pending'.
  // Matching best-effort compact (SS 3 J 3 === SS3J3); es guía visual, NO
  // evaluación. Al completar el objetivo, todo se marca (el estudiante pudo
  // usar datos válidos distintos y el chip textual no casaría).
  const chipStatus = useMemo(() => {
    if (!activeScenario) return [];
    const norm = (c) => (c || '').toUpperCase().replace(/\s+/g, '');
    const done = new Set(history.filter((h) => !h.isError).map((h) => norm(h.command)));
    const allDone = !!evaluationResult?.completed;
    let currentAssigned = false;
    return activeScenario.suggestedFlow.map((step) => {
      if (allDone || done.has(norm(step))) return 'done';
      if (!currentAssigned) { currentAssigned = true; return 'current'; }
      return 'pending';
    });
  }, [activeScenario, history, evaluationResult]);

  const handleChipTap = (cmd) => {
    if (terminalRef.current) terminalRef.current.setInput(cmd);
  };

  if (authLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#ffffff' }}>Cargando sistema...</div>;
  }

  if (!isAuthenticated) {
    return <LoginScreen onLogin={() => setIsAuthenticated(true)} />;
  }

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="brand-section">
          <TerminalSquare className="brand-icon" />
          <h1 className="brand-title">Cryptic Trainer</h1>
          <span className="brand-tag">GDS AMADEUS PWA</span>
          {streak > 0 && (
            <span style={{
              marginLeft: '8px',
              padding: '2px 8px',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: '600',
              fontFamily: 'var(--font-sans)',
              backgroundColor: streak > 2 ? 'rgba(255, 152, 0, 0.15)' : 'rgba(100, 116, 139, 0.15)',
              color: streak > 2 ? '#ff9800' : '#94a3b8',
              border: `1px solid ${streak > 2 ? 'rgba(255, 152, 0, 0.3)' : 'rgba(100, 116, 139, 0.3)'}`,
              display: 'inline-flex',
              alignItems: 'center',
              whiteSpace: 'nowrap'
            }}>
              🔥 {streak} {streak === 1 ? 'Día' : 'Días'}
            </span>
          )}
          
          <button 
            onClick={toggleMute} 
            className="ghost-btn" 
            style={{ marginLeft: '1rem', color: isMuted ? '#94a3b8' : '#0284c7' }}
            title={isMuted ? "Activar Sonido" : "Silenciar"}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>

          <button onClick={handleLogout} className="ghost-btn" style={{ marginLeft: '1rem' }}>
            Salir
          </button>
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
            ref={terminalRef}
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
            chipStatus={chipStatus}
            onChipTap={handleChipTap}
          />
        </main>
        </>
      )}
    </div>
  );
}
