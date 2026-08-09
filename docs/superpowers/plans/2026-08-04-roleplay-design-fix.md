# RoleplayPanel Design Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Darle a `RoleplayPanel.jsx` (`/roleplay`) el mismo lenguaje visual que el resto de la app y eliminar el desborde real de layout que hoy corta el `<select>` de escenarios y la fila de input/mic/enviar fuera de su columna de 340px.

**Architecture:** `RoleplayPanel` vive en el mismo grid track de 340px que `ScenarioSelector` (`.main-layout { grid-template-columns: 1fr 340px }`, ver `src/pages/Roleplay.jsx` y `src/pages/Simulator.jsx`). `ScenarioSelector` ya resuelve ese mismo layout sin desbordarse usando las clases `.sidebar-panel` / `.scenario-select` / `.quiz-big-btn` / `.progress-card` definidas en `src/index.css`. En vez de inventar un sistema de diseño paralelo, `RoleplayPanel` va a **reutilizar esas clases textualmente** (ya probadas en producción, capturadas en el screenshot de auditoría de `/simulador` sin overflow) y sólo añade CSS nuevo para lo que no tiene equivalente: burbujas de chat del transcript, la fila input+mic+enviar, y el banner de error.

**Tech Stack:** React 19, CSS plano (`src/index.css`, sin CSS-in-JS ni Tailwind), Playwright para el e2e existente (`e2e/roleplay.spec.js`), `navegador.mjs` de repofibe para verificación visual manual.

---

## Hallazgos que este plan corrige (de la auditoría de diseño previa)

1. **0 CSS propio.** `RoleplayPanel.jsx` usa `className="roleplay-panel"`, `"roleplay-transcript"`, `"roleplay-turn roleplay-agent/passenger"`, `"roleplay-error"`, `"roleplay-feedback"` — ninguna de esas clases existe en ningún `.css` del repo (confirmado con grep). El navegador renderiza todo con estilos default (`<select>`, `<button>`, `<h3>`, `<p>`, `<ul>` sin clase).
2. **Desborde real de la grid track de 340px.** Confirmado con captura real (`.fabrica/design-review-roleplay-inicio.png`): el `<select>` sin clase corta su opción más larga a la mitad ("...MEX SDQ (Guía de Clas") y la fila `input + Hablar + Enviar` se sale del viewport. `ScenarioSelector` renderiza el mismo tipo de `<select>` con las mismas opciones largas (mismo dataset `public/profiles/amadeus/scenarios.json`) SIN desbordarse porque usa `.scenario-select { width: 100%; ... }` dentro de `.sidebar-panel { display:flex; flex-direction:column; ... }` — confirmado con captura real de `/simulador` (`.fabrica/design-review-simulador-referencia.png`), que trunca con ellipsis correctamente.
3. **Inconsistencia visual.** `ScenarioSelector` vive en el mismo slot del layout con cards oscuras (`#0e1724`/`#141f2e`), acentos cian/verde CRT, badges, barra de progreso. `RoleplayPanel` no comparte nada de eso.
4. **Sin espacio reservado para el transcript vacío** — layout salta cuando entra el primer mensaje porque `.roleplay-transcript` no tiene min-height ni fondo.

---

## Task 1: Estilos CSS del panel de llamada

**Files:**
- Modify: `src/index.css:1133-1136`

- [ ] **Step 1: Insertar el bloque CSS nuevo**

Buscar este bloque exacto (fin de la sección "Modo Teoría / Quiz"):

```css
.quiz-card-back {
  color: var(--crt-cyan);
}
```

y reemplazarlo por:

```css
.quiz-card-back {
  color: var(--crt-cyan);
}

/* ── Llamada de práctica (roleplay) — reutiliza sidebar-panel/scenario-select/quiz-big-btn ── */
.roleplay-transcript {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 60px;
  max-height: 320px;
  overflow-y: auto;
  background: var(--bg-terminal);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 12px;
}

.roleplay-transcript:empty::before {
  content: 'La conversación aparecerá aquí.';
  color: var(--text-muted);
  font-size: 0.82rem;
  font-style: italic;
}

.roleplay-turn {
  max-width: 85%;
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 0.85rem;
  line-height: 1.4;
}

.roleplay-turn-role {
  display: block;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-bottom: 2px;
}

.roleplay-agent {
  align-self: flex-end;
  background: rgba(0, 229, 255, 0.1);
  border: 1px solid rgba(0, 229, 255, 0.3);
  color: var(--text-light);
}

.roleplay-agent .roleplay-turn-role {
  color: var(--crt-cyan);
}

.roleplay-passenger {
  align-self: flex-start;
  background: #141f2e;
  border: 1px solid var(--border-color);
  color: var(--text-light);
}

.roleplay-passenger .roleplay-turn-role {
  color: var(--crt-green);
}

.roleplay-input-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.roleplay-text-input {
  flex: 1 1 160px;
  min-width: 0;
  background: #141f2e;
  color: var(--text-light);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 8px 12px;
  font-family: var(--font-sans);
  font-size: 0.88rem;
  outline: none;
}

.roleplay-text-input:focus {
  border-color: var(--crt-cyan);
}

.roleplay-error {
  font-family: var(--font-mono);
  font-size: 0.82rem;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 51, 102, 0.4);
  background: rgba(255, 51, 102, 0.06);
  color: var(--crt-red);
}

.roleplay-feedback {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.roleplay-feedback-label {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text-light);
  margin-bottom: 4px;
}

.roleplay-feedback ul {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.82rem;
  color: var(--text-light);
}

.roleplay-feedback li {
  padding-left: 14px;
  position: relative;
}

.roleplay-feedback li::before {
  content: '—';
  position: absolute;
  left: 0;
  color: var(--text-muted);
}
```

- [ ] **Step 2: Verificar que el build sigue pasando**

Run: `npm run build`
Expected: `✓ built in ...` sin errores (CSS puro, no puede romper JS, pero confirma que no hay un error de sintaxis CSS que Vite rechace).

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat(roleplay): agrega estilos CSS del panel de llamada (reutiliza sidebar-panel/quiz-big-btn)"
```

---

## Task 2: Reestructurar `RoleplayPanel.jsx` y adaptar el e2e al nuevo markup

**Files:**
- Modify: `src/components/RoleplayPanel.jsx` (archivo completo)
- Modify: `e2e/roleplay.spec.js:35`

- [ ] **Step 1: Reemplazar el contenido completo de `src/components/RoleplayPanel.jsx`**

La lógica (estado, `submitAgentTurn`, `handleMicClick`, `handleTextSubmit`, `startCall`, `endCall`) no cambia — sólo el JSX de retorno gana clases reutilizadas y las nuevas. Contenido completo del archivo:

```jsx
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
```

**Por qué cambia el markup del feedback:** el texto original era un único `<p>Atención al cliente: {feedback.score}%</p>`. El nuevo usa `.progress-card`/`.progress-header` (dos `<span>` separados: etiqueta a la izquierda, porcentaje a la derecha) para reutilizar la barra de progreso visual que ya existe en `ScenarioSelector` — esto rompe la búsqueda de texto exacto `'Atención al cliente: 88%'` del e2e (ver Step 2).

- [ ] **Step 2: Actualizar la aserción del e2e para el nuevo markup**

En `e2e/roleplay.spec.js`, reemplazar:

```js
  await expect(page.getByText('Atención al cliente: 88%')).toBeVisible();
  await expect(page.getByText('Saludo correcto')).toBeVisible();
```

por:

```js
  await expect(page.getByText('Atención al cliente')).toBeVisible();
  await expect(page.getByText('88%')).toBeVisible();
  await expect(page.getByText('Saludo correcto')).toBeVisible();
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: `✓ built in ...` sin errores.

- [ ] **Step 4: Correr el e2e de roleplay**

Run: `npx playwright test e2e/roleplay.spec.js`
Expected: `1 passed`

- [ ] **Step 5: Correr la suite de regresión (no debería tocar nada de esto, pero confirma que no se rompió el resto)**

Run: `npm run test:regression`
Expected: `Resumen QA: 24/24 escenarios superados.`

- [ ] **Step 6: Commit**

```bash
git add src/components/RoleplayPanel.jsx e2e/roleplay.spec.js
git commit -m "fix(roleplay): reutiliza sidebar-panel/scenario-select/quiz-big-btn en RoleplayPanel

Elimina el desborde de la grid track de 340px (el <select> sin clase
forzaba su ancho mínimo de contenido) y unifica el lenguaje visual con
ScenarioSelector, que vive en el mismo slot del layout. Ajusta el e2e
al nuevo markup del score (dos <span> en vez de un <p> con texto plano)."
```

---

## Task 3: Verificación visual con `navegador.mjs`

**Files:** ninguno (solo evidencia, sin cambios de código)

- [ ] **Step 1: Levantar el build con auth mockeada**

Run: `node scripts/e2e-server.js` (deja corriendo `vite preview` en `:4173`; correr en background)

- [ ] **Step 2: Capturar el estado inicial y el estado activo**

```bash
node ~/.repofibe/app/nucleo/navegador.mjs ejecutar '[
  {"accion":"navegar","url":"http://localhost:4173/roleplay"},
  {"accion":"esperar","ms":600},
  {"accion":"snapshot"},
  {"accion":"screenshot","archivo":".fabrica/design-review-roleplay-despues.png"},
  {"accion":"click","ref":"<ref del botón Iniciar llamada del snapshot>"},
  {"accion":"esperar","ms":400},
  {"accion":"screenshot","archivo":".fabrica/design-review-roleplay-activa-despues.png"}
]'
```

- [ ] **Step 3: Comparar contra el "antes"**

Abrir `.fabrica/design-review-roleplay-inicio.png` / `.fabrica/design-review-roleplay-activa.png` (antes) junto a los `-despues.png` nuevos y confirmar:
- El `<select>` ya no corta texto a la mitad (debe truncar con ellipsis o mostrarse completo dentro de los 340px).
- La fila input+Hablar+Enviar no se sale del viewport.
- El panel tiene fondo/borde consistente con `ScenarioSelector` (cards oscuras, acentos cian/verde).

- [ ] **Step 4: Apagar el preview server**

```bash
netstat -ano | grep "4173" | grep LISTENING   # anotar el PID
taskkill //PID <pid> //F
```

---

## Self-Review

**Cobertura del hallazgo de auditoría:**
- Hallazgo 1 (0 CSS propio) → Task 1 + Task 2 Step 1.
- Hallazgo 2 (desborde de grid) → Task 2 Step 1 (reutiliza `.scenario-select`/`.sidebar-panel` ya probadas sin overflow) + verificado en Task 3.
- Hallazgo 3 (inconsistencia visual) → Task 2 Step 1 (reutiliza `.sidebar-panel`, `.panel-title`, `.scenario-select`, `.quiz-big-btn`, `.progress-card`).
- Hallazgo 4 (transcript sin espacio reservado) → Task 1, `.roleplay-transcript` con `min-height` y estado vacío (`:empty::before`).

**Sin placeholders:** todos los bloques de código de este plan son el contenido final real, no hay "TODO" ni "similar a la Task N".

**Consistencia de nombres:** `roleplay-agent`/`roleplay-passenger` (Task 1 CSS) coinciden exactamente con el template literal `` `roleplay-turn roleplay-${turn.role}` `` (Task 2 JSX), donde `turn.role` sólo puede ser `'agent'` o `'passenger'` (confirmado en `submitAgentTurn`, líneas `{ role: 'agent', text }` / `{ role: 'passenger', text: passengerReply }`).
