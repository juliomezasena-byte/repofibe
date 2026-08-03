import React, { useState, useMemo, useCallback, useRef } from 'react';
import { ShieldCheck, CheckCircle2, XCircle, ArrowRight, Award } from 'lucide-react';
import { QuizEngine } from '../engine/QuizEngine';

export const IberiaExamPanel = ({ profileConfig, locationsCatalog, flightsCatalog }) => {
  const engine = useMemo(
    () =>
      new QuizEngine({
        commands: profileConfig?.commands || [],
        locations: locationsCatalog || [],
        flights: flightsCatalog || []
      }),
    [profileConfig, locationsCatalog, flightsCatalog]
  );

  const [mode, setMode] = useState('menu'); // menu | exam | done
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);
  
  const panelRef = useRef(null);
  const resetScroll = () => {
    window.scrollTo(0, 0);
    if (panelRef.current) panelRef.current.scrollTo(0, 0);
  };

  const startExam = useCallback(() => {
    const fresh = engine.generateIberiaExam(Date.now() % 2147483647);
    setQuestions(fresh);
    setCurrent(0);
    setPicked(null);
    setScore(0);
    setMode('exam');
    resetScroll();
  }, [engine]);

  const answer = (idx) => {
    if (picked !== null) return;
    setPicked(idx);
    const q = questions[current];
    const ok = idx === q.correctIndex;
    if (ok) {
      setScore((s) => s + 1);
    }
  };

  const next = () => {
    const isLast = current >= questions.length - 1;
    if (!isLast) {
      setCurrent((c) => c + 1);
      setPicked(null);
      resetScroll();
      return;
    }
    setMode('done');
    resetScroll();
  };

  const q = questions[current];

  return (
    <div ref={panelRef} className="quiz-panel iberia-exam-panel" style={{ border: '2px solid #d7192d', borderRadius: '8px' }}>
      {/* Cabecera formal */}
      <div style={{ backgroundColor: '#d7192d', color: 'white', padding: '15px 20px', display: 'flex', alignItems: 'center', gap: '10px', margin: '-20px -20px 20px -20px', borderTopLeftRadius: '6px', borderTopRightRadius: '6px' }}>
        <ShieldCheck size={24} />
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>CERTIFICACIÓN: EXAMEN OFICIAL IBERIA</h2>
      </div>

      <div>
        {mode === 'menu' && (
          <div className="quiz-menu" style={{ textAlign: 'center', paddingTop: '20px' }}>
            <p className="quiz-sub" style={{ fontSize: '16px', marginBottom: '30px' }}>
              Simulacro de certificación basado en un examen recuperado. Consta de <strong>11 preguntas exactas</strong> sobre enrutamiento, asignación de asientos, políticas de equipaje e infantes y gestión de reservas.
            </p>
            <div style={{ backgroundColor: '#3a2a10', padding: '12px 15px', borderRadius: '6px', marginBottom: '20px', textAlign: 'left', borderLeft: '4px solid #e0a020', fontSize: '14px' }}>
              Algunas respuestas aún están <strong>pendientes de verificación</strong> contra la fuente oficial de Iberia — se marcan durante el examen. No las trates como definitivas hasta confirmarlas con tu instructor.
            </div>
            <div style={{ backgroundColor: '#222', padding: '15px', borderRadius: '6px', marginBottom: '30px', textAlign: 'left', borderLeft: '4px solid #d7192d' }}>
              <strong>Reglas del examen:</strong>
              <ul style={{ margin: '10px 0 0 0', paddingLeft: '20px' }}>
                <li>Selecciona la opción más adecuada para cada caso.</li>
                <li>No hay límite de tiempo.</li>
                <li>Recibirás tu nota final al terminar el ciclo (se requiere 80% para aprobar).</li>
              </ul>
            </div>
            <button className="quiz-big-btn" onClick={startExam} style={{ backgroundColor: '#d7192d', borderColor: '#b31223', color: '#fff' }}>
              INICIAR CERTIFICACIÓN
            </button>
          </div>
        )}

        {mode === 'exam' && q && (
          <div className="quiz-question">
            <div className="quiz-progress" style={{ color: '#d7192d', fontWeight: 'bold', borderBottom: '1px solid #333', paddingBottom: '10px', marginBottom: '15px' }}>
              PREGUNTA {current + 1} DE {questions.length}
            </div>

            {q.verified === false && (
              <div style={{ backgroundColor: '#3a2a10', color: '#e0a020', padding: '6px 12px', borderRadius: '4px', fontSize: '13px', fontWeight: 'bold', marginBottom: '10px', display: 'inline-block' }}>
                ⚠ PENDIENTE DE VERIFICACIÓN OFICIAL
              </div>
            )}

            <div className="quiz-prompt">
              {q.prompt}
            </div>

            <div className="quiz-options">
              {q.options.map((opt, idx) => {
                let cls = 'quiz-option';
                if (picked !== null) {
                  if (idx === q.correctIndex) cls += ' correct';
                  else if (idx === picked) cls += ' wrong';
                  else cls += ' dim';
                }
                return (
                  <button key={idx} className={cls} onClick={() => answer(idx)} style={{ borderRadius: '6px', textAlign: 'left' }}>
                    <span className="quiz-letter" style={{ backgroundColor: picked === null ? 'rgba(255,255,255,0.1)' : '' }}>{'ABCD'[idx]}</span>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>

            {picked !== null && (
              <div className={`quiz-feedback ${picked === q.correctIndex ? 'ok' : 'bad'}`} style={{ marginTop: '20px', borderRadius: '6px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {picked === q.correctIndex ? <><CheckCircle2 size={18} /> RESPUESTA CORRECTA</> : <><XCircle size={18} /> RESPUESTA INCORRECTA</>}
                </div>
                <div className="quiz-explain">{q.explain}</div>
                <button className="quiz-big-btn" onClick={next} style={{ marginTop: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                  {current >= questions.length - 1 ? 'FINALIZAR EXAMEN' : 'SIGUIENTE PREGUNTA'} <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}

        {mode === 'done' && (
          <div className="quiz-menu" style={{ textAlign: 'center' }}>
            <Award size={48} color={score >= questions.length * 0.8 ? '#4caf50' : '#d7192d'} style={{ margin: '0 auto 15px' }} />
            <h3 style={{ margin: '0 0 10px', fontSize: '24px' }}>RESULTADO DEL EXAMEN</h3>
            <div style={{ fontSize: '36px', fontWeight: 'bold', margin: '20px 0', color: score >= questions.length * 0.8 ? '#4caf50' : '#d7192d' }}>
              {score} / {questions.length}
            </div>
            
            <p className="quiz-sub" style={{ fontSize: '18px', marginBottom: '30px' }}>
              {score >= questions.length * 0.8
                ? '¡Aprobado! Tienes el nivel necesario de certificación Iberia.'
                : 'No aprobado. Revisa el manual y vuelve a intentarlo.'}
            </p>
            
            <button className="quiz-big-btn" onClick={startExam} style={{ backgroundColor: '#d7192d', borderColor: '#b31223', color: '#fff' }}>
              REPETIR EXAMEN
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
