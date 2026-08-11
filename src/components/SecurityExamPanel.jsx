import React, { useState, useMemo, useCallback, useRef } from 'react';
import { CheckCircle2, XCircle, ArrowRight, Award, Lock } from 'lucide-react';
import { QuizEngine } from '../engine/QuizEngine';

export const SecurityExamPanel = ({ profileConfig, locationsCatalog, flightsCatalog }) => {
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
    const fresh = engine.generateSecurityExam(Date.now() % 2147483647);
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
    try {
      localStorage.setItem('cryptic-security-exam-v1', JSON.stringify({ score, total: questions.length, date: Date.now() }));
    } catch (e) {}
    resetScroll();
  };

  const q = questions[current];

  return (
    <div ref={panelRef} className="quiz-panel security-exam-panel" style={{ border: '2px solid #0284c7', borderRadius: '8px' }}>
      {/* Cabecera formal */}
      <div style={{ backgroundColor: '#0284c7', color: 'white', padding: '15px 20px', display: 'flex', alignItems: 'center', gap: '10px', margin: '-20px -20px 20px -20px', borderTopLeftRadius: '6px', borderTopRightRadius: '6px' }}>
        <Lock size={24} />
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>EXAMEN FILTRO DE SEGURIDAD Y PROTOCOLO</h2>
      </div>

      <div>
        {mode === 'menu' && (
          <div className="quiz-menu" style={{ textAlign: 'center', paddingTop: '20px' }}>
            <p className="quiz-sub" style={{ fontSize: '16px', marginBottom: '30px' }}>
              Evaluación práctica exclusiva sobre el <strong>Filtro de Seguridad Obligatorio</strong>, autenticación de titulares, protocolo de esperas, trato formal y reglas del producto Iberia.
            </p>

            <div style={{ backgroundColor: '#1e293b', padding: '15px', borderRadius: '6px', marginBottom: '30px', textAlign: 'left', borderLeft: '4px solid #0284c7' }}>
              <strong>Módulos evaluados:</strong>
              <ul style={{ margin: '10px 0 0 0', paddingLeft: '20px' }}>
                <li><strong>Filtro de Seguridad:</strong> Nombre completo, PNR y dato de recontacto.</li>
                <li><strong>Frases obligatorias:</strong> "Gracias por su permanencia en la línea".</li>
                <li><strong>Explicación de esperas:</strong> Justificar la pausa al cliente.</li>
                <li><strong>Trato y lenguaje:</strong> Uso de "Usted", prohibición del tuteo y parafraseo.</li>
                <li><strong>Reglas de producto:</strong> Cabinas en corto radio vs largo radio.</li>
              </ul>
            </div>

            <button className="quiz-big-btn" onClick={startExam} style={{ backgroundColor: '#0284c7', borderColor: '#0369a1', color: '#fff' }}>
              INICIAR EXAMEN DE FILTRO DE SEGURIDAD
            </button>
          </div>
        )}

        {mode === 'exam' && q && (
          <div className="quiz-question">
            <div className="quiz-progress" style={{ color: '#0284c7', fontWeight: 'bold', borderBottom: '1px solid #333', paddingBottom: '10px', marginBottom: '15px' }}>
              PREGUNTA {current + 1} DE {questions.length}
            </div>

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
            <Award size={48} color={score >= questions.length * 0.8 ? '#4caf50' : '#0284c7'} style={{ margin: '0 auto 15px' }} />
            <h3 style={{ margin: '0 0 10px', fontSize: '24px' }}>RESULTADO FILTRO DE SEGURIDAD</h3>
            <div style={{ fontSize: '36px', fontWeight: 'bold', margin: '20px 0', color: score >= questions.length * 0.8 ? '#4caf50' : '#e11d48' }}>
              {score} / {questions.length}
            </div>
            
            <p className="quiz-sub" style={{ fontSize: '18px', marginBottom: '30px' }}>
              {score >= questions.length * 0.8
                ? '¡Certificación Aprobada! Dominas el Filtro de Seguridad y Protocolo de Atención.'
                : 'No alcanzaste el puntaje requerido (80%). Repasa el filtro de seguridad y vuelve a intentarlo.'}
            </p>
            
            <button className="quiz-big-btn" onClick={startExam} style={{ backgroundColor: '#0284c7', borderColor: '#0369a1', color: '#fff' }}>
              REPETIR EXAMEN
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
