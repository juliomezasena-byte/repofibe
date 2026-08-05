import React, { useState } from 'react';
import { Phone, PhoneOff, Mic } from 'lucide-react';
import { auth } from '../lib/firebase';
import { sendTurn, evaluateSession } from '../lib/roleplayClient';
import { saveRoleplaySession } from '../lib/roleplaySessions';
import { useSpeech } from '../hooks/useSpeech';

const MAX_TURNS = 8;

export function RoleplayPanel({ scenarios, activeScenario, evaluationResult }) {
  const [scenarioId, setScenarioId] = useState(activeScenario?.id ?? scenarios[0]?.id ?? '');
  const [callActive, setCallActive] = useState(false);
  const [history, setHistory] = useState([]);
  const [textInput, setTextInput] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState(null);

  const { supported, listening, startListening, speak } = useSpeech();

  const scenario = scenarios.find((s) => s.id === scenarioId) || scenarios[0];

  async function submitAgentTurn(text) {
    if (!text.trim() || history.length >= MAX_TURNS) return;
    setError(null);
    const newHistory = [...history, { role: 'agent', text }];
    setHistory(newHistory);

    try {
      let idToken = 'mock-token';
      if (import.meta.env.VITE_E2E_MOCK_AUTH !== '1') {
        if (!auth.currentUser) {
          throw new Error('Debes iniciar sesión para usar la llamada.');
        }
        idToken = await auth.currentUser.getIdToken(true);
      }
      const { passengerReply } = await sendTurn(idToken, scenarioId, newHistory);
      const withReply = [...newHistory, { role: 'passenger', text: passengerReply }];
      setHistory(withReply);
      speak(passengerReply);
    } catch (err) {
      if (err.status === 429) {
        setError('Ya usaste tu práctica gratuita de hoy. Vuelve mañana.');
      } else {
        setError(err.message || 'No se pudo contactar al pasajero simulado. Intenta de nuevo.');
      }
    }
  }

  function handleMicClick() {
    startListening((text) => submitAgentTurn(text), () => setError('No se entendió el audio, intenta de nuevo.'));
  }

  function handleTextSubmit(e) {
    e.preventDefault();
    submitAgentTurn(textInput);
    setTextInput('');
  }

  function startCall() {
    setCallActive(true);
    setHistory([]);
    setFeedback(null);
    setError(null);
  }

  async function endCall() {
    setCallActive(false);
    try {
      let idToken = 'mock-token';
      let uid = 'e2e';
      if (import.meta.env.VITE_E2E_MOCK_AUTH !== '1') {
        if (!auth.currentUser) {
          throw new Error('Debes iniciar sesión.');
        }
        idToken = await auth.currentUser.getIdToken(true);
        uid = auth.currentUser.uid;
      }
      const result = await evaluateSession(idToken, scenarioId, history);
      setFeedback(result);
      await saveRoleplaySession(uid, {
        scenarioId,
        technicalScore: evaluationResult?.score ?? 0,
        serviceScore: result.score,
        transcript: history
      });
    } catch {
      setError('No se pudo evaluar la llamada. Tu progreso en el Terminal no se perdió.');
    }
  }

  return (
    <div className="sidebar-panel">
      <div className="panel-title">
        <Phone size={18} style={{ color: 'var(--crt-cyan)' }} />
        <span>Llamada de práctica</span>
      </div>

      {error && <div className="roleplay-error">{error}</div>}

      {!callActive && !feedback && (
        <>
          <select className="scenario-select" value={scenarioId} onChange={(e) => setScenarioId(e.target.value)}>
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
          <button className="quiz-big-btn" onClick={startCall}><Phone size={16} /> Iniciar llamada</button>
        </>
      )}

      {callActive && (
        <>
          <div className="roleplay-transcript">
            {history.map((turn, i) => (
              <div key={i} className={`roleplay-turn roleplay-${turn.role}`}>
                <span className="roleplay-turn-role">{turn.role === 'agent' ? 'Tú' : 'Pasajero'}</span>
                {turn.text}
              </div>
            ))}
          </div>

          <form onSubmit={handleTextSubmit} className="roleplay-input-row">
            <input
              className="roleplay-text-input"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Escribe tu respuesta al pasajero"
              disabled={history.length >= MAX_TURNS}
            />
            {supported && (
              <button type="button" className="ghost-btn" onClick={handleMicClick} disabled={listening || history.length >= MAX_TURNS}>
                <Mic size={16} /> {listening ? 'Escuchando...' : 'Hablar'}
              </button>
            )}
            <button type="submit" className="quiz-big-btn" disabled={history.length >= MAX_TURNS}>Enviar</button>
          </form>

          <button className="quiz-big-btn secondary" onClick={endCall}><PhoneOff size={16} /> Finalizar llamada</button>
        </>
      )}

      {feedback && (
        <div className="roleplay-feedback">
          <div className="panel-title">Resultado de la llamada</div>

          <div className="progress-card">
            <div className="progress-header">
              <span>Resolución técnica</span>
              <span style={{ color: 'var(--crt-cyan)' }}>{evaluationResult?.score ?? 0}%</span>
            </div>
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{ width: `${evaluationResult?.score ?? 0}%` }}></div>
            </div>
          </div>

          <div className="progress-card">
            <div className="progress-header">
              <span>Atención al cliente</span>
              <span style={{ color: 'var(--crt-cyan)' }}>{feedback.score}%</span>
            </div>
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{ width: `${feedback.score}%` }}></div>
            </div>
          </div>

          <div>
            <p className="roleplay-feedback-label">Fortalezas</p>
            <ul>{feedback.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
          </div>
          <div>
            <p className="roleplay-feedback-label">A mejorar</p>
            <ul>{feedback.improvements.map((s, i) => <li key={i}>{s}</li>)}</ul>
          </div>

          <button className="quiz-big-btn" onClick={startCall}>Practicar de nuevo</button>
        </div>
      )}
    </div>
  );
}
