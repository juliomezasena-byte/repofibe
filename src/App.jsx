import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { TerminalSquare, BookOpen, Brain, Layout, Volume2, VolumeX, ShieldCheck, Home, Bot, PlayCircle } from 'lucide-react';
import { DslParser } from './engine/DslParser';
import { PnrStateMachine } from './engine/PnrStateMachine';
import { ResponseGenerator } from './engine/ResponseGenerator';
import { EvaluationEngine } from './engine/EvaluationEngine';
import { AppProvider } from './context/AppContext';
import { Routes, Route, NavLink, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Menu } from './pages/Menu';
import { Simulator } from './pages/Simulator';
import { Roleplay } from './pages/Roleplay';
import { Theory } from './pages/Theory';
import { IberiaExam } from './pages/IberiaExam';
import { SecurityExam } from './pages/SecurityExam';
import { LearningGuide } from './pages/LearningGuide';
import { ManualCatalog, PracticeHub, ProcedureRoute, ScenarioRoute, TutorRoute, RouteNotFound } from './pages/PracticeRoutes';
import { LoginScreen } from './components/LoginScreen';
import { auth } from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { getUserData, updateStreak } from './lib/db';
import { useAudio } from './hooks/useAudio';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useLearningProgress } from './hooks/useLearningProgress';
import { getDailyPlan, recordScenarioCompletion } from './lib/learningPath';
import { createProcedureSession, createScenarioSession, transitionSession, readSafeSessionSnapshot, writeSafeSessionSnapshot } from './lib/exerciseSession';
import { getExerciseById } from './lib/procedureExercises';
import { checkInterpretation, getDefinitionForProcedure, getInteractiveDefinition, getPreflightDefinition } from './lib/interactiveExercises';

export function App() {
  const [profileConfig, setProfileConfig] = useState(null);
  const [flightsCatalog, setFlightsCatalog] = useState([]);
  const [locationsCatalog, setLocationsCatalog] = useState([]);
  const [equipmentCatalog, setEquipmentCatalog] = useState({});
  const [scenarios, setScenarios] = useState([]);
  const [curriculum, setCurriculum] = useState({ version: 1, phases: [], nodes: [] });
  const [activeScenarioId, setActiveScenarioId] = useState('scenario-1');
  const [exerciseSession, setExerciseSession] = useState(null);
  const [sessionHydrated, setSessionHydrated] = useState(false);
  const [sessionRecovered, setSessionRecovered] = useState(false);
  const [safeSnapshot] = useState(() => readSafeSessionSnapshot());
  const [preflightAnswer, setPreflightAnswer] = useState(null);
  const [pendingInterpretation, setPendingInterpretation] = useState(null);
  const [interpretationResult, setInterpretationResult] = useState(null);
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
    if (import.meta.env.MODE === 'test' || import.meta.env.VITE_E2E_MOCK_AUTH === '1') {
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

  useEffect(() => {
    if (sessionHydrated || !scenarios.length) return;
    const routeScenarioId = location.pathname.match(/^\/ejercicios\/([^/]+)/)?.[1] || null;
    const routeProcedureId = location.pathname.match(/^\/manuales\/([^/]+)/)?.[1] || null;
    const routeScenario = routeScenarioId ? scenarios.find((scenario) => scenario.id === routeScenarioId) : null;
    const routeProcedure = routeProcedureId ? getExerciseById(routeProcedureId) : null;

    if (routeScenario) {
      setActiveScenarioId(routeScenario.id);
      setExerciseSession(createScenarioSession(routeScenario));
      setSessionHydrated(true);
      return;
    }
    if (routeProcedure) {
      setExerciseSession(createProcedureSession(routeProcedure, { station: routeProcedure.station || 'manual' }));
      setSessionHydrated(true);
      return;
    }
    const restoredScenario = safeSnapshot?.kind === 'scenario'
      ? scenarios.find((scenario) => scenario.id === (safeSnapshot.scenarioId || safeSnapshot.exerciseId))
      : null;
    const restoredProcedure = safeSnapshot?.kind === 'procedure'
      ? getExerciseById(safeSnapshot.procedureId || safeSnapshot.exerciseId)
      : null;

    if (restoredScenario) {
      setActiveScenarioId(restoredScenario.id);
      setExerciseSession(createScenarioSession(restoredScenario, { mode: safeSnapshot.mode }));
      setSessionRecovered(true);
    } else if (restoredProcedure) {
      setExerciseSession(createProcedureSession(restoredProcedure, {
        station: safeSnapshot.station,
        mode: safeSnapshot.mode
      }));
      setSessionRecovered(true);
    } else if (activeScenario) {
      setExerciseSession(createScenarioSession(activeScenario));
    }
    setSessionHydrated(true);
  }, [activeScenario, location.pathname, scenarios, safeSnapshot, sessionHydrated]);

  useEffect(() => {
    if (exerciseSession) writeSafeSessionSnapshot(exerciseSession);
  }, [exerciseSession]);

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
    const nextScenario = scenarios.find((s) => s.id === scenarioId);
    setActiveScenarioId(scenarioId);
    setExerciseSession(nextScenario ? createScenarioSession(nextScenario) : null);
    setPreflightAnswer(null);
    setPendingInterpretation(null);
    setInterpretationResult(null);
    cargarEstadoInicial(nextScenario);
    setExamMode('practice');
    setExamStartTs(null);
    setExamResult(null);
  };

  const handleResetScenario = () => {
    cargarEstadoInicial(activeScenario);
    if (activeScenario) setExerciseSession(createScenarioSession(activeScenario));
    setPreflightAnswer(null);
    setPendingInterpretation(null);
    setInterpretationResult(null);
  };

  const handleSetPracticeMode = useCallback((mode) => {
    if (!['guided', 'free', 'exam'].includes(mode)) return;
    setExerciseSession((current) => current
      ? { ...current, mode, status: mode === 'free' ? 'ready' : current.status }
      : current);
    if (mode !== 'exam') {
      setExamMode('practice');
      setExamStartTs(null);
      setExamResult(null);
    }
  }, []);

  const handleUpdatePracticeSession = useCallback((patch) => {
    if (!patch || typeof patch !== 'object') return;
    setExerciseSession((current) => current ? { ...current, ...patch } : current);
  }, []);

  const handleStartProcedureExercise = (procedure) => {
    const linkedScenario = scenarios.find((scenario) =>
      scenario.procedimientoId === procedure?.procedimientoId ||
      scenario.procedimientoId === procedure?.id
    );

    // Cuando el manual ya tiene un escenario evaluable, ambos accesos deben
    // aterrizar en la misma sesión y semilla del simulador.
    if (linkedScenario) {
      handleSelectScenario(linkedScenario.id);
      return createScenarioSession(linkedScenario);
    }

    // Los manuales no terminales (factura, MEDA, escalamiento, etc.) viven en
    // una estación manual. No se cambia silenciosamente el PNR del terminal.
    const session = createProcedureSession(procedure, { station: procedure?.station || 'manual' });
    setExerciseSession(session);
    setPreflightAnswer({ optionId: 'procedure', correct: true });
    setPendingInterpretation(getDefinitionForProcedure(procedure));
    setInterpretationResult(null);
    setExamMode('practice');
    setExamStartTs(null);
    setExamResult(null);
    return session;
  };

  // PRÁCTICA <-> EXAMEN. Activar examen reinicia el PNR y arranca el cronómetro.
  const handleToggleExam = (mode) => {
    if (mode === 'exam') {
      cargarEstadoInicial(activeScenario);
      setExamStartTs(Date.now());
      setExamResult(null);
      setExamMode('exam');
      setExerciseSession((current) => current ? { ...current, mode: 'exam', currentStep: 'ready' } : current);
    } else {
      setExamMode('practice');
      setExamStartTs(null);
      setExamResult(null);
      setExerciseSession((current) => current ? { ...current, mode: 'practice' } : current);
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
    if (
      exerciseSession?.kind === 'scenario' &&
      exerciseSession?.mode === 'guided' &&
      examMode !== 'exam' &&
      !preflightAnswer?.correct
    ) {
      const output = 'ANTES DE ESCRIBIR, RESUELVE LA DECISION DEL CASO EN EL PANEL DE MISION.';
      setHistory((prev) => [...prev, { command: rawCommand, output, isError: true, hint: 'Responde primero la pregunta Piensa antes de escribir.' }]);
      playSound('error');
      return;
    }
    if (
      pendingInterpretation &&
      !interpretationResult?.correct &&
      exerciseSession?.mode === 'guided' &&
      examMode !== 'exam'
    ) {
      const output = 'ANTES DE CONTINUAR, INTERPRETA LA ÚLTIMA RESPUESTA DEL SISTEMA EN EL PANEL DE MISIÓN.';
      setHistory((prev) => [...prev, { command: rawCommand, output, isError: true, hint: 'Responde la pregunta de interpretación.' }]);
      return;
    }
    if (exerciseSession?.kind === 'procedure' && exerciseSession.station !== 'amadeus') {
      const output = 'ESTE CASO SE RESUELVE EN EL MANUAL / SISTEMA INDICADO. LA TERMINAL NO ES LA SUPERFICIE DE ESTE PASO.';
      setHistory((prev) => [...prev, { command: rawCommand, output, isError: true, hint: 'Vuelve al paso Ahora del procedimiento.' }]);
      return;
    }
    playSound('key'); // Sonido de tipeo (simulando Enter)
    
    const parseResult = dslParser.parse(rawCommand);

    const getHintFromEval = () => {
      if (!activeScenario) return null;
      const evalNow = evalEngine.evaluate(activeScenario, pnrFsm.getState());
      const pendings = evalNow.feedback.filter(f => f.startsWith('[PENDIENTE]'));
      if (!pendings.length) return null;

      const upper = (rawCommand || '').toUpperCase().trim();
      // Si el usuario intentaba vender plazas (SS) o buscar disponibilidad, buscar la pista de segmentos primero
      if (upper.startsWith('SS') || upper.startsWith('AN') || upper.startsWith('SN')) {
        const segHint = pendings.find(f => f.toLowerCase().includes('segmento') || f.toLowerCase().includes('vuelo') || f.toLowerCase().includes('ss'));
        if (segHint) return segHint.replace('[PENDIENTE] ', '');
      }
      return pendings[0].replace('[PENDIENTE] ', '');
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
      setPendingInterpretation(null);
      setInterpretationResult(null);
    } else if (examMode !== 'exam') {
      setPendingInterpretation(getInteractiveDefinition(rawCommand, { success: true }));
      setInterpretationResult(null);
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
    setExerciseSession((current) => current
      ? transitionSession(current, { type: 'command_executed', command: rawCommand, output })
      : current);

    // Notificar la ejecución a los componentes suscritos (ej: TutorPanel)
    try {
      window.dispatchEvent(new CustomEvent('cryptic-command-executed', {
        detail: { command: rawCommand, output, isError: !processResult.success }
      }));
    } catch {}
  };

  const handleSubmitPreflight = (optionId) => {
    const definition = getPreflightDefinition(activeScenario);
    const option = definition?.options.find((item) => item.id === optionId);
    // El primer ejercicio de la ruta siempre empieza por disponibilidad. El
    // fallback evita dejar la compuerta cerrada si el catálogo aún está
    // terminando de hidratarse en el mismo render que pintó la tarjeta.
    const correct = option ? !!option.correct : optionId === 'availability';
    setPreflightAnswer({ optionId, correct });
    if (correct) {
      setExerciseSession((current) => current
        ? transitionSession(current, { type: 'brief_viewed' })
        : current);
    }
  };

  const handleSubmitInterpretation = (optionId) => {
    const result = checkInterpretation(pendingInterpretation, optionId);
    setInterpretationResult(result);
    setExerciseSession((current) => current
      ? transitionSession(current, {
        type: 'interpretation_submitted',
        correct: result.correct,
        feedback: result.feedback
      })
      : current);
  };

  const handleContinueAfterInterpretation = () => {
    if (!interpretationResult?.correct) return;
    setPendingInterpretation(null);
    setInterpretationResult(null);
  };

  // Resultado de la evaluación del progreso del escenario
  const evaluationResult = useMemo(() => {
    if (!activeScenario) return null;
    return evalEngine.evaluate(activeScenario, pnrFsm.getState());
  }, [activeScenario, history, evalEngine, pnrFsm]);

  useEffect(() => {
    if (!evaluationResult || !exerciseSession || exerciseSession.kind !== 'scenario') return;
    setExerciseSession((current) => {
      if (!current || current.exerciseId !== activeScenario?.id) return current;
      if (evaluationResult.completed && current.currentStep !== 'complete') {
        return transitionSession(current, { type: 'completed', evaluation: evaluationResult });
      }
      if (current.evaluation === evaluationResult) return current;
      return { ...current, evaluation: evaluationResult };
    });
  }, [evaluationResult, exerciseSession, activeScenario]);

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
          <Link to="/" className="brand-title-link" title="Volver al Menú Principal">
            <TerminalSquare className="brand-icon" />
            <span className="brand-title">Cryptic Trainer</span>
          </Link>
          <span className="brand-tag">PWA SISTEMAS IBERIA</span>
          {streak > 0 && (
            <span className="brand-streak">
              🔥 {streak} {streak === 1 ? 'Día' : 'Días'}
            </span>
          )}
        </div>

        <div className="header-controls">
          <div className="seg-control" role="tablist" aria-label="Modo de la aplicación">
            <NavLink
              to="/"
              end
              className={({ isActive }) => `seg-btn ${isActive ? 'seg-active' : ''}`}
            >
              <Home size={14} /> Inicio
            </NavLink>
            <NavLink
              to="/practicar"
              className={({ isActive }) => `seg-btn ${isActive ? 'seg-active' : ''}`}
            >
              <PlayCircle size={14} /> Practicar
            </NavLink>
            {/* El tutor es el camino recomendado, pero solo se llegaba a él
                desde el hero del menú: si te ibas, desaparecía. */}
            <NavLink
              to="/tutor"
              className={({ isActive }) => `seg-btn ${isActive ? 'seg-active' : ''}`}
            >
              <Bot size={14} /> Tutor
            </NavLink>
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
            <NavLink
              to="/examen-seguridad"
              className={({ isActive }) => `seg-btn ${isActive ? 'seg-active' : ''}`}
            >
              {/* Mismo rótulo que la tarjeta del menú ("Examen Filtro de
                  Seguridad"), para que se lean como el mismo destino. */}
              <ShieldCheck size={14} /> Filtro de Seguridad
            </NavLink>
          </div>

          <button
            onClick={() => { navigate('/simulador'); handleExecuteCommand('HE'); }}
            className="ghost-btn"
            title="Abre el simulador y ejecuta el comando 'HE' (Ayuda Amadeus)"
          >
            <BookOpen size={14} /> Ayuda (HE)
          </button>

          <button 
            onClick={toggleMute} 
            className="ghost-btn" 
            style={{ color: isMuted ? '#94a3b8' : '#0284c7' }}
            title={isMuted ? "Activar Sonido" : "Silenciar"}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>

          <button onClick={handleLogout} className="ghost-btn">
            Salir
          </button>
        </div>
      </header>

      <AppProvider value={{
        // pnrFsm lo necesita el TutorPanel para cargar el PNR semilla de cada
        // ejercicio: sin un PNR de partida, "cambia este vuelo" no tiene nada
        // que cambiar. Faltaba aquí, así que `seedPnr` no se aplicaba nunca.
        pnrFsm,
        profileConfig, flightsCatalog, locationsCatalog, equipmentCatalog,
        scenarios, curriculum, learningProgress, dailyPlan, dailyScenarioId,
        activeScenarioId, history, examMode, examStartTs, examResult,
        terminalRef, activeScenario, evaluationResult, chipStatus,
        exerciseSession,
        sessionRecovered,
        preflightAnswer,
        pendingInterpretation, interpretationResult,
        handleSelectScenario, handleResetScenario, handleSetPracticeMode, handleUpdatePracticeSession, handleToggleExam,
        handleStartProcedureExercise, handleDeliver, handleExecuteCommand,
        handleSubmitPreflight, handleSubmitInterpretation, handleContinueAfterInterpretation
      }}>
        <Routes>
          <Route path="/" element={<Menu />} />
          <Route path="/practicar" element={<PracticeHub />} />
          <Route path="/ejercicios" element={<LearningGuide />} />
          <Route path="/ejercicios/:scenarioId" element={<ScenarioRoute />} />
          <Route path="/manuales" element={<ManualCatalog />} />
          <Route path="/manuales/:procedureId" element={<ProcedureRoute />} />
          <Route path="/simulador" element={<Simulator />} />
          <Route path="/simulador/libre" element={<Simulator freeMode />} />
          <Route path="/roleplay" element={<Roleplay />} />
          <Route path="/tutor" element={<Navigate to="/tutor/guiado" replace />} />
          <Route path="/tutor/libre" element={<TutorRoute mode="free" />} />
          <Route path="/tutor/guiado" element={<TutorRoute mode="guided" />} />
          <Route path="/guia" element={<Navigate to="/ejercicios" replace />} />
          <Route path="/teoria" element={<Theory />} />
          <Route path="/examen-iberia" element={<Navigate to="/examen/iberia" replace />} />
          <Route path="/examen/iberia" element={<IberiaExam />} />
          <Route path="/examen-seguridad" element={<Navigate to="/examen/seguridad" replace />} />
          <Route path="/examen/seguridad" element={<SecurityExam />} />
          <Route path="*" element={<RouteNotFound type="ruta" backTo="/practicar" />} />
        </Routes>
      </AppProvider>
    </div>
  );
}
