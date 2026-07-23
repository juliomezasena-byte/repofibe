# Plan — Modo Teoría / Quiz (idea de Juan Pablo)

> Objetivo: practicar la TEORÍA (qué comando es para qué, qué IATA es qué
> ciudad, cómo se lee la escalera de clases) además de la práctica en
> terminal. Refuerza memoria con repetición de lo fallado.

## Principio de diseño

**Cero contenido manual.** Las preguntas se GENERAN desde los datos que ya
existen en el perfil — así el quiz crece solo cuando agregamos comandos o
ciudades, y nunca se desincroniza del simulador:

| Fuente | Preguntas que genera |
|--------|----------------------|
| `commands_meta.json` (33 comandos: nombre, descripción, sintaxis, ejemplos) | comando→función, función→comando, sintaxis correcta |
| `locations.json` (80 IATA) | IATA→ciudad, ciudad→IATA |
| `flights.json` + escalera RBD | ¿clase abierta o cerrada? ¿qué significa C? ¿cuántos puestos en M5? |
| Manual (flujo) | ¿qué comando sigue? (SN→SS→FXX→DF→RM) |

## Tipos de pregunta (selección múltiple A-D)

1. **Comando → función**: "¿Para qué sirve `DAC`?" (distractores: descripciones de otros comandos de la misma categoría)
2. **Función → comando**: "Necesitas convertir los gastos de gestión a la moneda del cliente. ¿Qué comando usas?" → `FQC`
3. **IATA → ciudad**: "¿Qué ciudad es `SDQ`?" → Santo Domingo (distractores: otras ciudades del catálogo)
4. **Ciudad → IATA**: "¿Cuál es el IATA de Washington?" → `WAS`
5. **Sintaxis**: "Vender 3 puestos en clase J del vuelo 3. ¿Cuál es correcto?" → `SS3J3` (distractores: permutaciones `SS3J3`/`SSJ33`/`SS33J`)
6. **Escalera RBD**: "En `J4 C2 QC Y9`, ¿la clase Q está...?" → Cerrada
7. **Flujo del manual**: "Después de facturar con FXX, ¿con qué comando sumas el total?" → `DF`

## Modos

- **Quiz rápido**: 10 preguntas aleatorias, puntaje al final, en la misma estética CRT.
- **Flashcards (memoria)**: tarjeta comando↔función / IATA↔ciudad, tocar para voltear.
- **Repaso inteligente**: lo que fallas vuelve a aparecer más seguido (cola de repaso en localStorage); racha de días y stats por categoría.

## Arquitectura (misma filosofía del proyecto)

- `src/engine/QuizEngine.js` — generador puro: recibe los catálogos, produce preguntas con semilla (testeable). Garantías: 4 opciones únicas, respuesta presente, distractores plausibles (misma categoría).
- `src/components/QuizPanel.jsx` — pestaña "Teoría" junto al simulador. **Una sola vista responsive** (botones 44px táctiles, mismo CRT verde).
- `localStorage` — puntajes, falladas pendientes, racha. Sin backend.
- Tests en la suite: determinismo del generador, respuesta correcta incluida, sin opciones duplicadas, todas las categorías generan.

## Fases

| Fase | Entrega | Tamaño |
|------|---------|--------|
| Q1 | QuizEngine + tipos 1-4 (comando↔función, IATA↔ciudad) + tests | núcleo |
| Q2 | Pestaña Teoría con quiz rápido de 10 (móvil cómodo) | UI |
| Q3 | Tipos 5-7 (sintaxis, escalera RBD, flujo del manual) | contenido |
| Q4 | Flashcards + repaso de falladas + racha/stats | memoria |
| Q5 | Suite verde + deploy + compartir al grupo | cierre |

## Pendiente de decidir (usuario)
- ¿Orden de ejecución? Están en cola: (a) correcciones de la auditoría de
  escenarios (Nivel 4 roto, etc.) y (b) este quiz. Recomendación: primero
  las correcciones (son bugs que los compañeros ya pueden pisar), luego el
  quiz — pero el quiz es independiente y puede ir antes si el grupo lo
  necesita para estudiar teoría ya.
