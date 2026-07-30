import React, { useState, useMemo, useCallback } from 'react';
import { Brain, Zap, RotateCcw, CheckCircle2, XCircle, Trophy, Flame } from 'lucide-react';
import { QuizEngine } from '../engine/QuizEngine';

const STORE_KEY = 'cryptic-quiz-stats-v1';

function loadStats() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveStats(stats) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(stats));
  } catch {
    /* almacenamiento lleno o bloqueado: el quiz sigue funcionando */
  }
}

function hoy() {
  return new Date().toISOString().slice(0, 10);
}

export const QuizPanel = ({ profileConfig, locationsCatalog, flightsCatalog, count = 10 }) => {
  const engine = useMemo(
    () =>
      new QuizEngine({
        commands: profileConfig?.commands || [],
        locations: locationsCatalog || [],
        flights: flightsCatalog || []
      }),
    [profileConfig, locationsCatalog, flightsCatalog]
  );

  const [mode, setMode] = useState('menu'); // menu | quiz | done | cards
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [picked, setPicked] = useState(null); // índice elegido (null = sin responder)
  const [score, setScore] = useState(0);
  const [failedThisRun, setFailedThisRun] = useState([]);
  const [reviewPhase, setReviewPhase] = useState(false);
  const [card, setCard] = useState(null);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [stats, setStats] = useState(loadStats);

  const panelRef = React.useRef(null);
  const resetScroll = () => {
    window.scrollTo(0, 0);
    if (panelRef.current) panelRef.current.scrollTo(0, 0);
  };

  const startQuiz = useCallback(() => {
    // Repaso inteligente: las falladas de sesiones anteriores entran primero
    const failedStored = (stats.failed || []).slice(0, 3);
    const fresh = engine.generateQuiz(count, Date.now() % 2147483647);
    const merged = [...failedStored, ...fresh]
      .filter((q, i, arr) => arr.findIndex((x) => x.prompt === q.prompt) === i)
      .slice(0, count)
      .map((q, i) => ({ ...q, id: i + 1 }));
    setQuestions(merged);
    setCurrent(0);
    setPicked(null);
    setScore(0);
    setFailedThisRun([]);
    setReviewPhase(false);
    setMode('quiz');
    resetScroll();
  }, [engine, stats, count]);

  const nextCard = useCallback(() => {
    const tipos = ['cmd-func', 'iata-city', 'city-iata', 'func-cmd'];
    const tipo = tipos[Math.floor(Math.random() * tipos.length)];
    const rnd = () => Math.random();
    const q = engine.generateQuestion(tipo, rnd);
    setCard(q);
    setCardFlipped(false);
    resetScroll();
  }, [engine]);

  const answer = (idx) => {
    if (picked !== null) return;
    setPicked(idx);
    const q = questions[current];
    const ok = idx === q.correctIndex;
    if (ok && !reviewPhase) {
      setScore((s) => s + 1);
      const newFailed = (stats.failed || []).filter(x => x.prompt !== q.prompt);
      const updated = { ...stats, failed: newFailed };
      saveStats(updated);
      setStats(updated);
    }
    if (!ok) setFailedThisRun((f) => [...f, q]);
  };

  const next = () => {
    const isLast = current >= questions.length - 1;
    if (!isLast) {
      setCurrent((c) => c + 1);
      setPicked(null);
      resetScroll();
      return;
    }

    // Repaso inmediato: lo fallado vuelve hasta responderse bien
    if (failedThisRun.length > 0) {
      const newFailed = [...(stats.failed || []), ...failedThisRun]
        .filter((q, idx, arr) => arr.findIndex(x => x.prompt === q.prompt) === idx);
      const updated = { ...stats, failed: newFailed };
      saveStats(updated);
      setStats(updated);
      
      setQuestions(failedThisRun.map((q, i) => ({ ...q, id: i + 1 })));
      setFailedThisRun([]);
      setCurrent(0);
      setPicked(null);
      setReviewPhase(true);
      resetScroll();
      return;
    }

    // Fin: actualizar racha, mejor puntaje y cola de falladas
    const prev = loadStats();
    const dia = hoy();
    const streak =
      prev.lastDay === dia
        ? prev.streak || 1
        : prev.lastDay === new Date(Date.now() - 86400000).toISOString().slice(0, 10)
          ? (prev.streak || 0) + 1
          : 1;
    const updated = {
      ...prev,
      lastDay: dia,
      streak,
      best: Math.max(prev.best || 0, score),
      played: (prev.played || 0) + 1
    };
    saveStats(updated);
    setStats(updated);
    setMode('done');
    resetScroll();
  };

  const q = questions[current];

  return (
    <div ref={panelRef} className="quiz-panel">
      {mode === 'menu' && (
        <div className="quiz-menu">
          <div className="quiz-title">
            <Brain size={22} />
            <span>MODO TEORÍA — ¿QUÉ CÓDIGO ES PARA QUÉ?</span>
          </div>
          <p className="quiz-sub">
            Preguntas generadas del manual: comandos, códigos IATA, escalera de clases, sintaxis y flujo. Lo que falles vuelve a salir hasta que lo respondas bien.
          </p>

          <div className="quiz-stats-row">
            <div className="quiz-stat">
              <Flame size={16} /> Racha: {stats.streak || 0} días
            </div>
            <div className="quiz-stat">
              <Trophy size={16} /> Mejor: {stats.best || 0}/{count}
            </div>
            <div className="quiz-stat">Jugados: {stats.played || 0}</div>
          </div>

          <button className="quiz-big-btn" onClick={startQuiz}>
            <Zap size={18} /> QUIZ RÁPIDO ({count} PREGUNTAS)
          </button>
          
          <button className="quiz-big-btn secondary" onClick={() => { nextCard(); setMode('cards'); }}>
            <RotateCcw size={18} /> FLASHCARDS (MEMORIA)
          </button>
        </div>
      )}

      {mode === 'quiz' && q && (
        <div className="quiz-question">
          <div className="quiz-progress">
            {reviewPhase ? 'REPASO DE FALLADAS' : `PREGUNTA ${current + 1}/${questions.length}`}
            <span className="quiz-score">PUNTAJE: {score}</span>
          </div>

          <div className="quiz-prompt">{q.prompt}</div>

          <div className="quiz-options">
            {q.options.map((opt, idx) => {
              let cls = 'quiz-option';
              if (picked !== null) {
                if (idx === q.correctIndex) cls += ' correct';
                else if (idx === picked) cls += ' wrong';
                else cls += ' dim';
              }
              return (
                <button key={idx} className={cls} onClick={() => answer(idx)}>
                  <span className="quiz-letter">{'ABCD'[idx]}</span>
                  <span>{opt}</span>
                </button>
              );
            })}
          </div>

          {picked !== null && (
            <div className={`quiz-feedback ${picked === q.correctIndex ? 'ok' : 'bad'}`}>
              {picked === q.correctIndex ? (
                <><CheckCircle2 size={16} /> ¡Correcto!</>
              ) : (
                <><XCircle size={16} /> Incorrecto.</>
              )}
              <div className="quiz-explain">{q.explain}</div>
              <button className="quiz-big-btn" onClick={next}>
                {current >= questions.length - 1 && failedThisRun.length === 0 && picked === q.correctIndex
                  ? 'VER RESULTADO'
                  : 'SIGUIENTE'}
              </button>
            </div>
          )}
        </div>
      )}

      {mode === 'done' && (
        <div className="quiz-menu">
          <div className="quiz-title">
            <Trophy size={22} />
            <span>RESULTADO: {score}/{questions.length}</span>
          </div>
          <p className="quiz-sub">
            {score >= questions.length * 0.8
              ? '¡Excelente! Dominas la teoría.'
              : score >= questions.length * 0.5
                ? 'Bien — repite el quiz: lo fallado volverá a salir.'
                : 'Sigue practicando: las falladas se repetirán hasta que las memorices.'}
          </p>
          <div className="quiz-stats-row">
            <div className="quiz-stat"><Flame size={16} /> Racha: {stats.streak || 0} días</div>
            <div className="quiz-stat"><Trophy size={16} /> Mejor: {stats.best || 0}/{count}</div>
          </div>
          <button className="quiz-big-btn" onClick={startQuiz}>
            <Zap size={18} /> OTRA VEZ
          </button>
          <button className="quiz-big-btn secondary" onClick={() => setMode('menu')}>
            VOLVER AL MENÚ
          </button>
        </div>
      )}

      {mode === 'cards' && card && (
        <div className="quiz-question">
          <div className="quiz-progress">FLASHCARD — TOCA LA TARJETA PARA VOLTEAR</div>
          <button
            className="quiz-flashcard"
            onClick={() => setCardFlipped((f) => !f)}
          >
            {cardFlipped ? (
              <span className="quiz-card-back">{card.explain}</span>
            ) : (
              <span className="quiz-card-front">{card.prompt}</span>
            )}
          </button>
          <div className="quiz-options" style={{ marginTop: '10px' }}>
            <button className="quiz-big-btn" onClick={nextCard}>
              SIGUIENTE TARJETA
            </button>
            <button className="quiz-big-btn secondary" onClick={() => setMode('menu')}>
              VOLVER AL MENÚ
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
