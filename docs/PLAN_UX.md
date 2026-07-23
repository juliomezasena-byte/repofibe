# Plan UX v2 — endurecido por crítica hostil multi-agente (23JUL26)

> v1 fue sometida a 3 críticos independientes (pedagogía, ingeniería, diseño/
> fidelidad). Sobrevivió el diagnóstico; murieron o mutaron varias soluciones.
> Cambios mayores vs v1: nace el MODO EXAMEN, muere VT323, muere el banner
> dentro del terminal, y aparecen la Ley de Pantalla Limpia, la Matriz de
> Andamiaje y el contrato técnico de los chips.

## Principios innegociables (salidos de la crítica)

**P1 — Ley de Pantalla Limpia.** Nada que no sea salida Amadeus entra JAMÁS al
scroll del terminal. Victoria, tips, bienvenida de marca: todo vive en el
*chrome* del emulador (header, bisel, bajo la prompt). El historial debe poder
capturarse y pasar la validación del profesor línea por línea.

**P2 — Matriz de Andamiaje (desvanecimiento de ayudas).** El objetivo de la
clase es MEMORIZAR y tipear rápido; las ayudas deben desaparecer con el nivel:
| Dificultad | Chips | Fichas de misión | Tips de error |
|---|---|---|---|
| Principiante | comando completo (tocar lo escribe en el input, NUNCA lo ejecuta) | visibles | sí (3 primeras veces) |
| Intermedio | esqueleto con huecos (`NM1______/______ MR`) o solo el código | toggle "ver datos" | no |
| Avanzado / Examen | ninguno | solo el párrafo del manual | no |

**P3 — Presupuesto de atención.** Máximo UN elemento con glow/animación por
estado. Reposo → cursor. Victoria → header ámbar. Nunca dos a la vez.

**P4 — El motor no se toca.** A1/A2/A4 no modifican `targetState`,
`EvaluationEngine` ni `scenarios.json` (salvo el campo opcional `structured`).
Los chips son guía visual best-effort; la evaluación sigue siendo el estado.

**P5 — Protocolo de repo compartido.** Antes de tocar `App.jsx`/`index.css`:
árbol limpio verificado; congelar `src/engine/**` y `public/profiles/**` para
la rama UX (usar `/repofibe-guardian` freeze); 1 ítem = 1 commit con
`npm run test:regression` verde; mínimo 3 specs de Playwright nuevos.

---

## P0 — Bugs de fidelidad HOY en producción (antes que cualquier mejora)

### P0.1 🔴 La grilla de 80 columnas se destroza en móvil
`word-break: break-word` + `pre-wrap` parten las tablas de SN/AN. Sin columnas
intactas no hay emulador que validar — es más grave que todo lo que v1 proponía.
**Fix:** `.terminal-screen { white-space: pre; overflow-x: auto }` (scroll
horizontal preserva el layout) y ELIMINAR `word-break: break-word` (código
muerto engañoso bajo `pre`).
**Decisión asumida:** en 390px toda línea >~46 caracteres (incluidos errores
largos) exigirá scroll lateral — es el costo correcto de la fidelidad 80-col.
**Aceptación:** captura móvil 390px de `SN 12 APR MEX SDQ`: las 3 opciones con
su escalera alineadas, sin cortes; scroll lateral disponible.

### P0.2 🔴 Tabs rotas en móvil (lo primero que ve todo usuario)
"Simulador" sangra contra el borde físico; "Manual (HE)" amputado.
**Fix:** segmented control de DOS segmentos (Simulador | Teoría), radio ≤8px,
centrado; "Manual" NO es pestaña (ejecuta HE): botón ghost aparte. Evita el bug
semántico de un "tab" que nunca queda activo y re-ejecuta HE en cada tap.
**Aceptación:** captura 390px sin ningún control tocando el borde ni cortado.

### P0.3 🟠 La prompt es el elemento más importante y el peor tratado
Placeholder `#334155` sobre `#090e15` ≈ contraste 2:1, casi invisible.
**Fix:** subir contraste del placeholder (~`#5b6b7e`) + cursor de bloque verde
parpadeante SOLO con input vacío. **Mecanismo:** los `<input>` no soportan
`::before/::after` — el pseudo-elemento va en `.terminal-prompt-bar` con
`:has(.cmd-input:placeholder-shown)` (o un `<span>` hermano). Caret nativo
verde al escribir. (El bloque falso siguiendo al caret en medio del texto es
inviable — descartado por ingeniería.)
**Aceptación:** placeholder legible en captura; bloque parpadea vacío,
desaparece al escribir.

## P1 — 🔴 A0: MODO EXAMEN (nuevo — la feature que faltaba)

Es *quitar* UI, no construirla, y es la única condición que simula la
evaluación real: sin chips, sin `suggestedFlow` visible, sin checklist en vivo,
sin tips; cronómetro visible. **El keypad de verbos también se oculta** (es una
chuleta de reconocimiento); se conservan símbolos + ESP + ⌫ + ENVIAR, que son
el método de entrada móvil, no ayudas. Toggle por misión: `PRACTICA | EXAMEN`.
**Cierre del examen:** botón **ENTREGAR** siempre visible — obligatorio porque
los escenarios 4, 9, 11, 13 y 16 no terminan en `ER` y sin él no habría forma
de entregar. Calificación y desglose SOLO al entregar.
**Aceptación:** en modo examen el panel muestra únicamente el enunciado y el
timer; la fila `keypad-verbs` no está en el DOM; el porcentaje no se actualiza
en vivo; ENTREGAR muestra score, tiempo y checklist completo. Spec Playwright
incluido.

## P2 — Misión visible y victoria (sin contaminar el CRT)

### P2.1 🟠 A3: barra de misión en móvil
Sticky sobre el terminal: `NIVEL 1 · 0% ▸ VER MISION`. Tocarla abre el panel
como acordeón. En móvil los futuros chips viven AQUÍ o sobre el keypad — nunca
en un panel bajo el doblez (evita el ping-pong de scroll detectado).
**Aceptación:** en 390px, progreso visible sin scrollear; tocar despliega.

### P2.2 🟠 A4: victoria en el chrome, no en el scroll
El terminal responde lo que Amadeus respondería, y punto. La celebración
respeta el presupuesto de atención (P3 — un solo elemento animado):
**desktop** → `terminal-header` pasa a ámbar `SESSION: ACTIVE · MISION 100% ✔`
con glow 2s; **móvil** → SOLO pulsa la barra A3 (el header cambia de color sin
glow). Nunca los dos a la vez.
**Contrato técnico (obligatorio):** edge-trigger `false→true` con `useRef`
keyed por `scenarioId`, reseteado en `handleSelectScenario` y
`handleResetScenario`. Nada de entradas sintéticas en `history`.
**Aceptación:** completar misión → header ámbar una sola vez; Reiniciar PNR y
recompletar → vuelve a celebrar; el scroll del terminal queda 100% Amadeus.

## P3 — Guía de comandos (la parte con más sangre encima)

### P3.1 🟠 A1: "orden de trabajo", no chips Duolingo
- **Estética:** líneas numeradas `01–08` en Fira Code, fondo plano `#141f2e`,
  radio ≤4px, paso pendiente con borde izquierdo cian 2px (sin glow), hechos
  con ✔ verde y opacidad 0.6.
- **Andamiaje:** según Matriz P2 (completo / esqueleto / nada).
- **Contrato técnico (obligatorio, de ingeniería):**
  - Los chips se renderizan DENTRO de `Terminal` (encima del keypad) o escriben
    vía ref imperativa (`terminalRef.current.setInput(cmd)`). PROHIBIDO
    levantar `inputVal` a `App` (re-render de todo por keystroke); si se
    levanta, `React.memo` obligatorio en `ScenarioSelector` y `SmartKeypad`.
  - Tocar chip = escribir en input + foco. NUNCA ejecuta.
  - **Matching best-effort:** ✔ si existe entrada en `history` sin `isError`
    cuyo comando, normalizado compact, comparte verbo + payload con el paso
    (`SS 3 J 3` ≡ `SS3J3`). "Actual" = primer pendiente. Fuera de orden: cada
    comando marca su propio chip. PNR precargado: los pasos ya satisfechos por
    el estado inicial no se pre-marcan (los chips reflejan LO TIPEADO, no el
    estado). Es guía, no evaluación — se documenta en el código.
  - **Fechas RM:** los chips interpolan la fecha del día en `*DDMMMYY*`
    (y se corrigen los JSON con fechas fósiles en un commit aparte).
**Aceptación:** spec Playwright: tocar chip 3 deja `SS1Y1` en el input, history
sin cambios; ejecutar `SS 3 J 3` marca ✔ el chip `SS3J3`; al llegar a
`completed === true`, los chips restantes se atenúan (evita el cuadro
"100% con chips pendientes" cuando el estudiante usó datos distintos válidos).

### P3.2 🟠 A2: misión estructurada con fallback, sin regex frágil
Campo **`structured` opcional** en cada escenario (`{pax, ruta, fecha, cabina,
pasos[]}`). Si no existe → se muestra el párrafo crudo tal cual (fallback
obligatorio: hay escenarios sin datos reales de pasajero/ruta — el 9 carece de
ambos y 4/11/13 tienen campos parciales — y NO deben mostrar fichas vacías;
el 16 sí tiene ruta real y sí amerita `structured`). El párrafo del manual SIEMPRE visible primero (pedagogía:
extraer datos es parte del oficio); las fichas son verificación descubrible
(toggle "ver datos extraídos"), no reemplazo.
**Protocolo:** migración del JSON serializada con la sesión paralela; la suite
gana validación de esquema de `scenarios.json`.
**Aceptación:** escenario con `structured` muestra fichas al toggle; sin él,
párrafo intacto; suite valida esquema.

## P4 — Pulido (recortado por la crítica)

- **A5 → hint de chrome:** el tip de error se renderiza en la capa UI bajo la
  prompt-bar (patrón shell), jamás en `ResponseGenerator` ni en el scroll.
  localStorage `tipErrorCount`, N=3, ligado al modo Práctica.
- **A6 → taxonomía del manual, por breakpoint.** El keypad real tiene 28
  teclas; **`OS` NO está y se AGREGA explícitamente** (los niveles 7 y 18 lo
  usan en sus flujos — hoy hay que tipearlo a mano). Quedan 29 en 9 grupos:
  `IATA/MONEDA (DAN DAC FQC)` · `VUELOS (SN AN MN MY MO)` · `VENTA (SS NM)` ·
  `CONTACTOS (AP APE)` · `SERVICIOS (SR OS)` · `TARIFAS (FXX FXP FQN DF MD MU)`
  · `NOTAS (RM)` · `CIERRE (TK TKXL RF ER TTP)` · `PNR/AYUDA (RT XE HE)`.
  (HE fuera de CIERRE: es consulta, no cierre — mismo rigor que se exigió con
  AP/SR.) En desktop el keypad se colapsa a leyenda de referencia (en el call
  center se tipea); en móvil sigue siendo el método de entrada.
- **B1 recortado:** cursor de bloque (P0.3) sí; viñeta sutil sí; scanlines SOLO
  desktop, estáticas, `repeating-linear-gradient` en wrapper que envuelve solo
  `.terminal-screen`, `pointer-events:none`, y toggle. En móvil: cero.
- **B2 recortado:** fade de fósforo solo `opacity/text-shadow` (nunca layout,
  para no romper el auto-scroll), por clase en el mount de cada bloque (no
  `:last-child`, que cancela en ráfaga), `prefers-reduced-motion` lo apaga.
- **B4 MUERTO:** cero fuentes nuevas. Regla tipográfica: Fira Code uppercase +
  letter-spacing 0.05em para todo rótulo; Inter solo prosa. (VT323 = cliché
  CRT, un peso, ilegible <18px, faux-bold, y rompería la PWA offline.)
- **Bienvenida → jump screen:** `A4Z9 - AMADEUS TRAINING SYSTEM` estilo real;
  la instrucción en español va como hint bajo la prompt (mecanismo de A5).
- Menores: "Racha: 0 días" (sin paréntesis), título del quiz centrado.

## P5 — Fase pedagógica 2 (backlog priorizado, pedido por la crítica)

1. **Métricas de lo que la clase evalúa:** cronómetro por misión, errores por
   intento, historial de intentos (localStorage).
2. **Variación de datos:** mismos `targetState` con nombres/fechas/rutas
   aleatorios — el motor outcome-based ya lo soporta; mata la memorización del
   dato ("PEREZ/JUAN") en favor de la del formato.
3. **Desktop-first para práctica seria:** en ≥869px, chips y keypad ocultos por
   defecto (el examen y el call center son con teclado físico).

## Orden de ejecución y gates

| Fase | Ítems | Gate |
|---|---|---|
| 1 | P0.1, P0.2, P0.3 | captura antes/después + suite verde |
| 1.5 | **Bootstrap Playwright de test** (hoy solo existe la librería, no el runner): `@playwright/test` + `playwright.config` con `webServer` vite + script `npm run test:e2e` + 1 smoke spec | `test:e2e` corre en verde |
| 2 | P1 (Modo Examen) | spec Playwright examen |
| 3 | P2.1, P2.2 | spec banner edge-triggered |
| 4 | P3.1, P3.2 | specs chip→input y fallback misión |
| 5 | P4 | captura antes/después |
| 6 | P5 | diseño propio (nuevo plan corto) |

Cada ítem = 1 commit con suite verde. Congelar `src/engine/**` y
`public/profiles/**` durante fases 1-5 (solo P3.2 los toca, coordinado).

## Mapa v1 → v2 (para no perder la trazabilidad)
- B3 de v1 (segmented control) **no murió: se promovió a P0.2**.
- A0/Modo Examen no existía en v1: nació de la crítica pedagógica.
- Este plan pasó 3 rondas: 3 críticos paralelos → v2 → verificador hostil →
  v3 (estos parches). Veredicto del verificador tras los parches: LISTO PARA
  IMPLEMENTAR.

## Descartes documentados (para no re-litigar)
- Banner de victoria dentro del scroll del terminal (viola P1; el profesor
  valida contra el real; el estudiante esperaría una confirmación inexistente).
- VT323 / Share Tech Mono (cliché, ilegible, guerra de monos, rompe offline).
- Tips impresos por `ResponseGenerator` (invisible para la suite, viola P1).
- Chips que auto-ejecutan o que escriben el comando completo en niveles altos
  (máquina de 100% falsos).
- Scanlines en móvil y cursor de bloque que sigue al caret (costo>valor).
- "Manual (HE)" como tercer segmento del tab control (bug semántico).
