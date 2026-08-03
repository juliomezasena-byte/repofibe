# Roleplay de llamada telefónica con IA — Práctica del saludo corporativo Iberia

## Contexto

El proyecto es una PWA React de entrenamiento Amadeus/Iberia, desplegada como sitio estático en Firebase Hosting (plan Spark, sin backend propio). Ya existen:

- Autenticación con Firebase Auth (`src/components/LoginScreen.jsx`) y datos de usuario en Firestore (`src/lib/db.js`, colección `users/{uid}`).
- Un simulador de terminal Amadeus (`src/pages/Simulator.jsx`, `src/components/Terminal.jsx`) que ejecuta comandos reales contra `PnrStateMachine.js` y los valida con `EvaluationEngine.js`.
- Un banco de 22-24 escenarios de entrenamiento en `public/profiles/amadeus/scenarios.json`, cada uno con un campo `description` en texto libre que ya narra, en la mayoría de los casos, un motivo de llamada del pasajero (ej. *"El cliente llama desde México... vende 1 puesto en clase Y..."*).
- Sin integración de IA generativa todavía. Sin backend serverless propio.

El usuario quiere practicar el saludo corporativo y la atención de una llamada real de un pasajero, usando IA gratuita (solo tiene cuenta gratuita de Google Gemini, sin presupuesto).

## Objetivo

Simular una llamada telefónica de un pasajero mientras el agente (usuario) resuelve el caso en el Terminal existente — igual que en el trabajo real, donde se atiende y se opera el GDS al mismo tiempo. Evaluar por separado la resolución técnica (ya existe, gratis) y la atención al cliente (nueva, evaluada por IA).

## Arquitectura

```
[Navegador — src/pages/Roleplay.jsx]
  ┌─────────────────────────┬───────────────────────────┐
  │  <Terminal> (reusado     │  <RoleplayPanel> (nuevo)   │
  │  sin modificar)          │  - voz: SpeechRecognition  │
  │  - agente resuelve el    │    + speechSynthesis        │
  │    caso con comandos     │  - fallback a texto si el   │
  │    reales                │    navegador no soporta voz │
  └─────────────────────────┴───────────────────────────┘
         |                              |
         v                              v
 EvaluationEngine.js              roleplayClient.js
 (existente, local,               (fetch + Firebase ID token)
  compara contra                        |
  targetState)                          v
                                 Cloudflare Worker (worker/)
                                 - verifica ID token Firebase
                                 - cuota diaria por usuario (KV)
                                 - guarda la clave de Gemini
                                   como secreto (nunca al cliente)
                                        |
                                        v
                                 Gemini API (gemini-2.0-flash, free tier)
```

**Por qué un Worker aparte:** el sitio es estático; si la clave de Gemini viviera en el navegador, cualquier visitante podría robarla del código fuente y agotar la cuota gratuita. Cloudflare Workers (free tier, 100k peticiones/día, sin tarjeta) la esconde.

**Por qué verificar el ID token de Firebase:** la app ya exige login, así que la cuota diaria se aplica por usuario real (no por IP, fácil de esquivar), reutilizando la identidad que ya existe.

**Por qué dos motores de evaluación separados:** el motor GDS (`EvaluationEngine.js`) ya es determinista, correcto y gratuito — no tiene sentido pedirle a Gemini que juzgue comandos Amadeus. Gemini solo hace lo que un motor de reglas no puede: sostener una conversación natural y juzgar tono/protocolo. Esto además mantiene el consumo de la cuota gratuita de Gemini al mínimo indispensable.

## Componentes nuevos

| Archivo | Responsabilidad |
|---|---|
| `src/pages/Roleplay.jsx` | Página nueva, reutiliza `<Terminal>` tal cual (mismo patrón que `Simulator.jsx`), añade `<RoleplayPanel>` como panel lateral en vez de `<ScenarioSelector>` |
| `src/components/RoleplayPanel.jsx` | Selector de escenario (mismo `scenarios.json`), burbujas de chat de la llamada, botón de micrófono, botón "Finalizar llamada", panel de feedback final |
| `src/lib/roleplayScenarios.js` | Arma el prompt de "pasajero" a partir del campo `description` del escenario activo — no duplica contenido, solo lo envuelve con instrucciones de personaje |
| `src/lib/roleplayClient.js` | Cliente fetch hacia el Worker: `sendTurn(scenarioId, history)` y `evaluateSession(transcript)`, adjunta `getIdToken()` de Firebase Auth |
| `src/hooks/useSpeech.js` | Envuelve `SpeechRecognition` y `speechSynthesis`; si `window.SpeechRecognition` no existe, expone el mismo contrato pero respaldado por un `<input>` de texto |
| `worker/` (carpeta nueva en el repo) | Cloudflare Worker: `wrangler.toml`, `src/index.js` con los endpoints `/roleplay/turn` y `/roleplay/evaluate`, deploy independiente de Firebase Hosting |

## Modelo de datos

**Prompt del pasajero** (por turno, `POST /roleplay/turn`):
- Input: `{ scenarioId, history: [{role, text}] }` + ID token en header `Authorization`.
- El Worker resuelve `description` del escenario (embebido en el propio Worker o recibido del cliente — decisión de implementación: el Worker mantiene su propia copia mínima de `{id, description}` por escenario para no confiar en datos del cliente) y arma el system prompt: *"Eres un pasajero llamando a Iberia. Contexto: {description}. Responde en español, en 1-2 frases, con un tono coherente a la urgencia del caso. No reveles comandos técnicos."*
- Output: `{ passengerReply: string }`.

**Evaluación final** (`POST /roleplay/evaluate`):
- Input: `{ scenarioId, transcript: [{role, text}] }` + ID token.
- Rúbrica fija (0-100 cada uno, promedio simple):
  1. Saludo corporativo correcto
  2. Tono y empatía
  3. Escucha activa (confirma lo que pide el pasajero)
  4. Claridad al explicar la gestión
  5. Cierre y despedida
- Output: `{ score: number, strengths: string[], improvements: string[] }`.

**Persistencia** (Firestore, cliente, mismo patrón que `updateStreak` en `db.js`):
- `users/{uid}/roleplaySessions/{sessionId}`: `{ scenarioId, timestamp, technicalScore (de EvaluationEngine), serviceScore (de Gemini), transcript }`.
- No se construye UI de historial en v1 (YAGNI) — solo se guarda para una iteración futura.

## Flujo end-to-end

1. Usuario autenticado abre "Roleplay" desde el menú (`Menu.jsx`, nueva tarjeta con icono `Phone`).
2. Elige un escenario de la lista existente (`scenarios.json`, sin cambios).
3. "Suena" la llamada entrante (indicador visual simple, sin audio real de timbre en v1).
4. El agente contesta con el saludo corporativo (voz, transcrito por `useSpeech`).
5. `roleplayClient.sendTurn()` envía el turno al Worker → Gemini responde como el pasajero de ese escenario → se muestra y se narra por voz.
6. Se repite hasta máximo 8 turnos o hasta que el usuario pulse "Finalizar llamada".
7. En paralelo, el agente resuelve el caso en el `<Terminal>` exactamente igual que en el Simulador normal — sin cambios en `PnrStateMachine.js` ni `EvaluationEngine.js`.
8. Al finalizar: se calcula `technicalScore` (ya disponible vía `evaluationResult` del contexto existente) y se pide `evaluateSession()` para el `serviceScore`.
9. Se muestra un panel con ambos puntajes + fortalezas/mejoras, y se guarda la sesión en Firestore.

## Manejo de errores

- Navegador sin `SpeechRecognition` → fallback automático a `<input>` de texto, con aviso visible; `speechSynthesis` se usa si está disponible, si no, solo texto.
- Error de reconocimiento de voz (sin habla, red) → mensaje de reintento, no interrumpe la sesión.
- Cuota diaria agotada (Worker devuelve 429) → mensaje claro "ya usaste tu práctica gratuita de hoy, vuelve mañana", sin exponer detalles de la API.
- Fallo/timeout de Gemini → Worker devuelve error controlado; cliente ofrece reintentar el turno sin perder la transcripción ni el estado del Terminal.
- Token de Firebase expirado a mitad de sesión → refresco silencioso (`getIdToken(true)`) antes de reintentar.
- Worker rechaza peticiones sin token válido → 401.

## Pruebas

- `e2e/roleplay.spec.js` (Playwright, seguimos el patrón de `e2e/*.spec.js` existente): carga la página, fuerza el fallback de texto (Playwright no simula reconocimiento de voz real), mockea `/roleplay/turn` y `/roleplay/evaluate` con `page.route`, verifica que aparecen las burbujas de chat y el panel de feedback final con ambos puntajes.
- Verificación manual real de voz en Chrome de escritorio antes de publicar.
- Verificación manual del Worker con `wrangler dev`: rechazo sin token (401), respuesta de cuota agotada (429), llamada exitosa a Gemini.

## Fuera de alcance (v1)

- UI de historial de sesiones pasadas.
- Timeout automático por silencio del agente.
- Selección de idioma/acento de voz distinto a `es-ES`.
- Conexión de más de un escenario simultáneo o modo "cola de llamadas".
- Cualquier verificación por IA de la corrección técnica del PNR (eso lo sigue haciendo `EvaluationEngine.js`).
