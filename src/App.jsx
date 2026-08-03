import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TerminalSquare, BookOpen, Brain, Layout, Volume2, VolumeX } from 'lucide-react';
import { DslParser } from './engine/DslParser';
import { PnrStateMachine } from './engine/PnrStateMachine';
import { ResponseGenerator } from './engine/ResponseGenerator';
import { EvaluationEngine } from './engine/EvaluationEngine';
import { AppProvider } from './context/AppContext';
import { Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Menu } from './pages/Menu';
import { Simulator } from './pages/Simulator';
import { Theory } from './pages/Theory';
import { IberiaExam } from './pages/IberiaExam';
import { LoginScreen } from './components/LoginScreen';
import { auth } from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { getUserData, updateStreak } from './lib/db';
import { useAudio } from './hooks/useAudio';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useLearningProgress } from './hooks/useLearningProgress';
import { getDailyPlan, recordScenarioCompletion } from './lib/learningPath';

export function App() {
  const [profileConfig, setProfileConfig] = useState(null);
  const [flightsCatalog, setFlightsCatalog] = useState([]);
  const [locationsCatalog, setLocationsCatalog] = useState([]);
  const [equipmentCatalog, setEquipmentCatalog] = useState({});
  const [scenarios, setScenarios] = useState([]);
  const [curriculum, setCurriculum] = useState({ version: 1, phases: [], nodes: [] });
  const [activeScenarioId, setActiveScenarioId] = useState('scenario-1');
  const [history, setHistory] = useState([]);
  const [examMode, setExamMode] = useState('practice'); // 'practice' | 'exam' | 'delivered'
  const location = useLocation();
  const navigate = useNavigate();
  const [examStartTs, setExamStartTs] = useState(null);
  const [examResult, setExamResult] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [streak, setStreak] = useState(0);

  const terminalRef = useRef(null);
  const { isMuted, toggleMute, playSound } = useAudio();
  const [confettiShown, setConfettiShown] = useLocalStorage('amadeus_confetti_shown', {});
  const progressUserKey = auth.currentUser?.uid || (import.meta.env.VITE_E2E_MOCK_AUTH === '1' ? 'e2e' : 'anonymous');
  const [learningProgress, updateLearningProgress] = useLearningProgress(progressUserKey);
  const completionRecordedRef = useRef(null);

  // Instancias de los motores del simulador
  const pnrFsm = useMemo(() => new PnrStateMachine(), []);
  const responseGen = useMemo(() => new ResponseGenerator(profileConfig, equipmentCatalog), [profileConfig, equipmentCatalog]);
  const evalEngine = useMemo(() => new EvaluationEngine(), []);

  const dslParser = useMemo(() => {
    return new DslParser(profileConfig);
  }, [profileConfig]);

  // Escuchar estado de autenticación
  useEffect(() => {
    // Mock de auth SOLO para E2E: resuelto en tiempo de build por Vite
    // (import.meta.env.VITE_*), no en runtime — a diferencia de un flag de
    // localStorage, un usuario no puede activarlo desde DevTools en
    // producción porque el build de producción nunca define esta variable.
    if (import.meta.env.VITE_E2E_MOCK_AUTH === '1') {
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
        const [cmdRes, flightRes, scenRes, locRes, equipRes, curriculumRes] = await Promise.all([
          fetch('/profiles/amadeus/commands_meta.json'),
          fetch('/profiles/amadeus/flights.json'),
          fetch('/profiles/amadeus/scenarios.json'),
          fetch('/profiles/amadeus/locations.json'),
          fetch('/profiles/amadeus/equipment.json'),
          fetch('/profiles/amadeus/curriculum.json')
        ]);

        const cmdData = await cmdRes.json();
        const flightData = await flightRes.json();
        const scenData = await scenRes.json();
        const locData = await locRes.json();
        const equipData = await equipRes.json();
        const curriculumData = await curriculumRes.json();

        setProfileConfig(cmdData);
        setFlightsCatalog(flightData.flights || []);
        setScenarios(scenData.scenarios || []);
        setLocationsCatalog(locData.locations || []);
        setEquipmentCatalog(equipData.equipment || {});
        setCurriculum(curriculumData);
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

  // Auto-logout por inactividad (15 minutos)
  useEffect(() => {
    if (!isAuthenticated) return;

    let timeoutId;
    const logout = () => {
      console.log("Inactividad detectada: cerrando sesión");
      signOut(auth);
    };

    const resetTimer = () => {
      clearTimeout(timeoutId);
      // 15 minutos en milisegundos
      timeoutId = setTimeout(logout, 15 * 60 * 1000);
    };

    // Inicializar timer
    resetTimer();

    // Eventos que reinician el contador
    const events = ['mousedown', 'keydown', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetTimer));

    return () => {
      clearTimeout(timeoutId);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [isAuthenticated]);

  const activeScenario = useMemo(() => {
    return scenarios.find((s) => s.id === activeScenarioId) || scenarios[0];
  }, [scenarios, activeScenarioId]);

  const dailyPlan = useMemo(
    () => getDailyPlan(scenarios, curriculum, learningProgress),
    [scenarios, curriculum, learningProgress]
  );
  const dailyScenarioId = dailyPlan.primaryScenarioId;

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

    const getHintFromEval = () => {
      if (!activeScenario) return null;
      const evalNow = evalEngine.evaluate(activeScenario, pnrFsm.getState());
      const pending = evalNow.feedback.find(f => f.startsWith('[PENDIENTE]'));
      return pending ? pending.replace('[PENDIENTE] ', '') : null;
    };

    if (!parseResult.success) {
      const output = responseGen.formatResponse(parseResult, pnrFsm.getState());
      setHistory((prev) => [...prev, { command: rawCommand, output, isError: true, hint: getHintFromEval() }]);
      playSound('error');
      return;
    }

    const processResult = pnrFsm.process(parseResult, flightsCatalog, locationsCatalog, activeScenario);
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
        isError: !processResult.success,
        hint: !processResult.success ? getHintFromEval() : null
      }
    ]);
  };

  // Resultado de la evaluación del progreso del escenario
  const evaluationResult = useMemo(() => {
    if (!activeScenario) return null;
    return evalEngine.evaluate(activeScenario, pnrFsm.getState());
  }, [activeScenario, history, evalEngine, pnrFsm]);

  useEffect(() => {
    if (!evaluationResult?.completed || examMode !== 'practice' || !activeScenarioId) {
      completionRecordedRef.current = null;
      return;
    }
    if (completionRecordedRef.current === activeScenarioId) return;
    completionRecordedRef.current = activeScenarioId;
    updateLearningProgress((current) => recordScenarioCompletion(
      current,
      activeScenarioId,
      evaluationResult.score,
      curriculum
    ));
  }, [evaluationResult?.completed, evaluationResult?.score, examMode, activeScenarioId, curriculum, updateLearningProgress]);

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
            <NavLink
              to="/simulador"
              className={({ isActive }) => `seg-btn ${isActive ? 'seg-active' : ''}`}
            >
              <Layout size={14} /> Simulador
            </NavLink>
            <NavLink
              to="/teoria"
              className={({ isActive }) => `seg-btn ${isActive ? 'seg-active' : ''}`}
            >
              <Brain size={14} /> Teoría
            </NavLink>
          </div>
          <button
            onClick={() => { navigate('/simulador'); handleExecuteCommand('HE'); }}
            className="ghost-btn"
          >
            <BookOpen size={14} /> Manual (HE)
          </button>
        </div>
      </header>

      <AppProvider value={{
        profileConfig, flightsCatalog, locationsCatalog, equipmentCatalog,
        scenarios, curriculum, learningProgress, dailyPlan, dailyScenarioId,
        activeScenarioId, history, examMode, examStartTs, examResult,
        terminalRef, activeScenario, evaluationResult, chipStatus,
        handleSelectScenario, handleResetScenario, handleToggleExam,
        handleDeliver, handleExecuteCommand
      }}>
        <Routes>
          <Route path="/" element={<Menu />} />
          <Route path="/simulador" element={<Simulator />} />
          <Route path="/teoria" element={<Theory />} />
          <Route path="/examen-iberia" element={<IberiaExam />} />
          <Route path="*" element={<Menu />} />
        </Routes>
      </AppProvider>
    </div>
  );
}
