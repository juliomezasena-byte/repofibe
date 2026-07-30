# Retrospectiva S31 - Parte 2 (v1.3.0)

## 1. Qué se shipeó
- **Enrutamiento (v1.3.0):** Transición a `react-router-dom` aislando las vistas `/`, `/simulador` y `/teoria` con persistencia de estado global mediante `AppContext`.
- **Examen de Iberia Recuperado:** Integración exacta de las 11 preguntas oficiales en `src/engine/quizBanks/iberia.js` con soporte en el `QuizEngine`.
- **Determinismo en duraciones:** Se abandonó el cálculo dinámico de tiempos de vuelo y se reemplazó por la fuente de la verdad estática (`routeDurations.js`) para garantizar consistencia lógica en los tests de ordenamiento de vuelos (NRT > BOG > etc.).
- **Fixes de revisión:** Actualizadores de estado de React puros para `localStorage` y limpieza visual del texto de respuestas preformateado.

## 2. Patrones y Observaciones
- **Herramientas E2E:** La herramienta de repofibe `navegador.mjs` arrojó una excepción interna (`snapshotPagina is not defined`). Dado que no pudimos usar el bot de navegador, tuvimos que hacer QA estructural con pruebas de regresión, lo cual evidenció una posible fragilidad en nuestro pipeline de pruebas locales para Windows.
- **Funciones puras en React 18:** Introducir efectos secundarios (`localStorage.setItem`) dentro de una actualización de estado previa (`setState(prev => ...)`) puede causar dobles ejecuciones en `StrictMode`.

## 3. Proceso
- Ejecutamos el flujo completo: pensamos el problema de Iberia, diseñamos una arquitectura en /complejo con investigadores paralelos, construimos, revisamos, e hicimos release atomizado.
- En QA tuvimos que adaptarnos a la falla del framework usando las suites internas probadas anteriormente (Tolerancia y Quiz), lo que mitigó el riesgo de regresiones.

## 4. Mejora Accionable
- **Dueño:** Equipo de Infraestructura (Repofibe)
- **Acción:** Depurar y corregir el error `snapshotPagina is not defined` en el script maestro de QA `nucleo/navegador.mjs`, o sustituir la llamada por un fallback manual en Playwright para restaurar el QA visual automatizado en Windows.
- **Fecha Límite:** Próximo Lunes.
