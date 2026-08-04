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
    <div className="roleplay-panel">
      <h3>Llamada de práctica</h3>

      {error && <p className="roleplay-error">{error}</p>}

      {!callActive && !feedback && (
        <>
          <select value={scenarioId} onChange={(e) => setScenarioId(e.target.value)}>
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
          <button onClick={startCall}><Phone size={16} /> Iniciar llamada</button>
        </>
      )}

      {callActive && (
        <>
          <div className="roleplay-transcript">
            {history.map((turn, i) => (
              <p key={i} className={`roleplay-turn roleplay-${turn.role}`}>
                <strong>{turn.role === 'agent' ? 'Tú' : 'Pasajero'}:</strong> {turn.text}
              </p>
            ))}
          </div>

          <form onSubmit={handleTextSubmit} style={{ display: 'flex', gap: '8px' }}>
            <input
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Escribe tu respuesta al pasajero"
              disabled={history.length >= MAX_TURNS}
              style={{ flex: 1 }}
            />
            {supported && (
              <button type="button" onClick={handleMicClick} disabled={listening || history.length >= MAX_TURNS}>
                <Mic size={16} /> {listening ? 'Escuchando...' : 'Hablar'}
              </button>
            )}
            <button type="submit" disabled={history.length >= MAX_TURNS}>Enviar</button>
          </form>

          <button onClick={endCall}><PhoneOff size={16} /> Finalizar llamada</button>
        </>
      )}

      {feedback && (
        <div className="roleplay-feedback">
          <h4>Resultado de la llamada</h4>
          <p>Resolución técnica: {evaluationResult?.score ?? 0}%</p>
          <p>Atención al cliente: {feedback.score}%</p>
          <p><strong>Fortalezas:</strong></p>
          <ul>{feedback.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
          <p><strong>A mejorar:</strong></p>
          <ul>{feedback.improvements.map((s, i) => <li key={i}>{s}</li>)}</ul>
          <button onClick={startCall}>Practicar de nuevo</button>
        </div>
      )}
    </div>
  );
}
