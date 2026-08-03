# Plan: Guía de aprendizaje diaria

## Objetivo

Convertir los 24 escenarios Amadeus existentes en una experiencia de aprendizaje guiada. El alumno debe saber qué practicar hoy, por qué lo practica, cómo empezar y qué debe hacer después sin conocer conceptos técnicos como nodos o prerrequisitos.

## Alcance firmado

- Crear una entrada pública **Guía de aprendizaje** separada del simulador libre.
- Mostrar una sola misión principal por día y un repaso opcional.
- Presentar cada lección con objetivo, utilidad, pasos, ayuda y duración.
- Abrir el escenario existente en el simulador para realizar la práctica real.
- Guardar progreso local, resultado, fecha de finalización y próxima revisión.
- Mantener las cuatro fases: Fundamentos, Operación, Servicios y Cambios Iberia.
- Mantener disponible el selector libre y no bloquear escenarios.
- Renombrar el lenguaje visible: “lecciones” y “fases”; “nodos” queda interno.

## Fuera de alcance

- Reescribir el motor PNR.
- Crear un LMS o sistema de cursos completo.
- Sincronización Firebase del progreso en esta iteración.
- Variaciones aleatorias de los escenarios.
- Examen nuevo o banco de preguntas nuevo.

## Flujo del alumno

```text
Inicio
  -> Guía de aprendizaje
  -> Misión de hoy
  -> Objetivo + utilidad + pasos + ayuda
  -> Abrir práctica en el simulador
  -> Evaluación existente
  -> Progreso local + próxima revisión
```

## Contrato de una lección

Cada lección se deriva del escenario existente y añade:

- `title`: nombre comprensible para el alumno.
- `objective`: habilidad concreta que aprenderá.
- `why`: para qué sirve en el trabajo real.
- `steps`: entre 3 y 5 pasos de orientación.
- `hint`: ayuda inicial no invasiva.
- `estimatedMinutes`: duración objetivo.
- `scenarioId`: escenario que ejecuta la práctica.

Si una lección no tiene contenido editorial específico, la interfaz usa un texto de respaldo honesto basado en el título y el flujo existente; nunca inventa comandos.

## Reglas de aprendizaje

- En una cuenta nueva, la misión es la primera lección disponible.
- Después de aprobar, la siguiente lección disponible se convierte en misión nueva.
- Las revisiones vencidas aparecen antes que una lección nueva.
- Si hay repaso y lección nueva, se muestran ambas, pero una sola es principal.
- Un intento fallido no marca la lección como completada.
- Una lección se consolida después de completarse en dos fechas distintas.
- Los intervalos de repaso son 1, 3, 7 y 14 días.

## Estados de interfaz

- Inicial: “Empieza con tu primera lección”.
- Cargando: skeleton o mensaje breve mientras llega el currículo.
- Misión: objetivo, duración y botón principal.
- Repaso: indica que una lección vuelve a tocar hoy.
- En progreso: la lección seleccionada queda marcada.
- Completada: muestra resultado y próximo repaso.
- Error: si falta currículo, conserva el simulador libre y explica el problema.

## Criterios de aceptación

1. Desde Inicio existe una entrada visible llamada **Guía de aprendizaje**.
2. `/guia` muestra una misión diaria sin mostrar la palabra “nodo”.
3. La misión muestra objetivo, utilidad, pasos, ayuda y minutos.
4. “Comenzar lección” selecciona el escenario correcto y lleva al simulador.
5. La guía muestra las 24 lecciones agrupadas por las cuatro fases.
6. El alumno puede abrir el simulador libre sin seguir la guía.
7. Un escenario aprobado actualiza el progreso y la próxima revisión.
8. La ruta vacía, la ruta con repaso, el fallo y el progreso persistido tienen pruebas unitarias y E2E.
9. El build y la suite existente siguen verdes.

## Verificación

- `npm run test:learning`
- `npm run test:regression`
- `npm run test:parser`
- `npm run test:e2e`
- `npm run build`

