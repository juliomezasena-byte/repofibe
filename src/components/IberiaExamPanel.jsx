import React, { useState, useMemo, useCallback } from 'react';
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

  const startExam = useCallback(() => {
    // Para el examen generamos el pool exacto de 11 preguntas barajadas
    const fresh = engine.generateIberiaExam(Date.now() % 2147483647);
    setQuestions(fresh);
    setCurrent(0);
    setPicked(null);
    setScore(0);
    setMode('exam');
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
      return;
    }
    setMode('done');
  };

  const q = questions[current];

  return (
    <div className="quiz-panel iberia-exam-panel" style={{ border: '2px solid #d7192d', borderRadius: '8px', overflow: 'hidden' }}>
      {/* Cabecera formal */}
      <div style={{ backgroundColor: '#d7192d', color: 'white', padding: '15px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <ShieldCheck size={24} />
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>CERTIFICACIÓN: EXAMEN OFICIAL IBERIA</h2>
      </div>

      <div style={{ padding: '20px' }}>
        {mode === 'menu' && (
          <div className="quiz-menu" style={{ textAlign: 'center', paddingTop: '20px' }}>
            <p style={{ fontSize: '16px', lineHeight: '1.6', marginBottom: '30px', color: '#555' }}>
              Este es el simulacro oficial de certificación. Consta de <strong>11 preguntas exactas</strong> sobre enrutamiento, asignación de asientos, políticas de equipaje e infantes y gestión de reservas según los manuales oficiales.
            </p>
            <div style={{ backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '6px', marginBottom: '30px', textAlign: 'left', borderLeft: '4px solid #d7192d' }}>
              <strong>Reglas del examen:</strong>
              <ul style={{ margin: '10px 0 0 0', paddingLeft: '20px', color: '#444' }}>
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
            <div className="quiz-progress" style={{ color: '#d7192d', fontWeight: 'bold', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '15px' }}>
              PREGUNTA {current + 1} DE {questions.length}
            </div>

            <div className="quiz-prompt" style={{ fontSize: '18px', marginBottom: '20px', color: '#222' }}>
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
                    <span className="quiz-letter" style={{ backgroundColor: picked === null ? '#f0f0f0' : '' }}>{'ABCD'[idx]}</span>
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
                <div className="quiz-explain" style={{ color: '#444' }}>{q.explain}</div>
                <button className="quiz-big-btn" onClick={next} style={{ marginTop: '15px', backgroundColor: '#333', borderColor: '#222', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
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
            
            <p style={{ fontSize: '18px', color: '#555', marginBottom: '30px' }}>
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
