# Plan de fidelidad TSC para Pratika: plazas, pantallas y rebooking

**Estado:** DEVUELTO PARA AMPLIAR tras dos oleadas de auditoría. La opción visual A quedó confirmada por el usuario: aplicación clara + terminal oscuro. No se debe construir la capa visual definitiva hasta cerrar la sesión compartida y el modelo pedagógico.

**Objetivo:** hacer que Pratika replique de forma determinista la operación observada en el terminal Amadeus/TSC: disponibilidad legible en formato de pantalla, plazas por clase, conexiones, errores reales, selección de ida/vuelta y continuidad hacia reserva, tarifa, emisión y rebooking. El tutor, el simulador y el widget deben razonar sobre el mismo estado operativo.

## 1. Qué debe quedar resuelto

Cuando el estudiante ejecute una disponibilidad como:

```text
AN11MARMADBOG*23OCT
```

Pratika no debe devolver una lista genérica de vuelos. Debe conservar y mostrar:

- número de línea y compañía;
- vuelo, fecha, origen, destino, hora de salida y llegada;
- cada clase de reserva y su disponibilidad (`J9`, `M4`, `Y9`, `C0`, etc.);
- estados especiales: cerrada, no disponible, lista de espera abierta/cerrada;
- conexiones y segmentos continuados, por ejemplo `LIM`, `BCN`, `MAD4S` y sus tiempos;
- equipo, duración y diferencia de día cuando aparezca;
- separación inequívoca entre ida y regreso;
- el comando exacto que corresponde a la pantalla, por ejemplo `SS 2 M 1` para una línea y clase disponibles;
- una respuesta de error cuando la clase no está disponible, sin sustituirla silenciosamente;
- una transición de operación, no una explicación aislada: después de vender la ida, debe pedir o procesar el regreso, y después continuar al paso correcto del procedimiento.

El mismo caso debe producir la misma interpretación si se opera desde el terminal de Pratika, desde el tutor web o desde el widget.

## 2. Evidencia observada y hallazgos

Las capturas del terminal real muestran varios comportamientos que hoy no están modelados completamente:

1. La pantalla es de ancho fijo y depende de la posición de las columnas. El orden visual importa: línea, vuelo, clases, ruta, horas, equipo y duración.
2. Una línea puede continuar en la siguiente fila porque contiene más de un segmento. La continuación no es un vuelo nuevo.
3. La disponibilidad no es solo un número. `0` puede indicar cerrada/no disponible; otros valores expresan plazas, y también aparecen estados de waitlist.
4. La selección debe validar número de línea y clase contra esa pantalla. No basta con aceptar cualquier `SS`.
5. En ida y vuelta se observan dos pantallas o dos grupos de líneas. El regreso puede no tener disponibilidad y devolver un error de sistema; el tutor debe conservar el contexto y proponer una nueva búsqueda.
6. Los comandos compactos y espaciados son equivalentes en el terminal real, pero la pantalla resultante debe ser única y normalizada.
7. La operación real cambia de pantalla después de cada comando. El tutor debe leer el resultado nuevo, no repetir el paso inicial del manual.
8. El simulador actual genera vuelos dinámicos con valores aleatorios en `PnrStateMachine.js`. Eso sirve para una demo, pero impide reproducir una captura y hace que una clase disponible pueda cambiar entre dos intentos.
9. `worker/src/lectores/leer-disponibilidad.js` reconoce principalmente filas simples. Aún debe interpretar continuaciones, conexiones, estrellas, estados de espera y más de una pata.
10. La representación del TKT todavía necesita un fixture real pegado por el usuario para validar escalas, cupones y formato sin inventar columnas.

## 3. Decisión de arquitectura

Se compararon tres alternativas:

| Alternativa | Resultado |
|---|---|
| Clonar solo el aspecto visual | Se parece a Amadeus, pero no sabe validar plazas ni avanzar el caso. Se descarta. |
| Generar pantallas sintéticas aleatorias | Parece real, pero no es reproducible ni auditable. Se limita a demos no doradas. |
| Modelo canónico + replay de evidencia + modo sintético determinista | Conserva la pantalla, valida comandos y permite ejercicios repetibles. **Recomendada.** |

La fuente de verdad será un módulo puro compartido, ubicado en `shared/gds/`, importable por el frontend y por el Worker. Los manuales describen el procedimiento; las pantallas y los fixtures describen la evidencia operacional. El modelo no debe pedirle a Gemini que invente disponibilidad, clases, precios, errores o comandos.

## 4. Modelo canónico propuesto

### `ScreenSnapshot`

```js
{
  system: 'AMADEUS',
  screenType: 'availability',
  rawText: '...',
  normalizedCommand: 'AN 11MAR MADBOG * 23OCT',
  header: { origin: 'MAD', destination: 'BOG', outboundDate: '11MAR', returnDate: '23OCT' },
  pages: [{ number: 1, total: 1, rows: [] }],
  warnings: [],
  prompt: '>',
  source: 'fixture' // fixture | synthetic | live-paste
}
```

### `AvailabilityRow`

```js
{
  line: 1,
  marketingCarrier: 'IB',
  flightNumber: '155',
  date: '11MAR',
  legs: [{
    from: 'MAD', to: 'BOG', departure: '0010', arrival: '0440',
    equipment: '350', dayOffset: 0, operatingCarrier: 'IB'
  }],
  classes: [
    { rbd: 'J', value: 9, status: 'open' },
    { rbd: 'M', value: 4, status: 'open' },
    { rbd: 'C', value: 0, status: 'closed' }
  ],
  waitlist: { status: 'closed' },
  elapsed: '10:30',
  rawLines: ['...']
}
```

`value` y `status` deben ser distintos. Así se diferencia una plaza `0`, una clase cerrada, `A` o `C` según la convención de la captura y una lista de espera. La interfaz puede mostrar la cadena Amadeus exacta, pero el motor trabajará con datos estructurados.

### `CaseState`

```js
{
  caseId,
  currentSystem: 'AMADEUS',
  procedureId,
  procedureStep,
  market: { country, office, currency },
  passengers: [],
  itinerary: { outbound: [], inbound: [] },
  selectedSegments: [],
  currentScreenId,
  screens: [],
  pnr: null,
  ticket: null,
  fare: null,
  answers: {},
  evidence: [],
  mode: 'practice' // practice | replay
}
```

### `TerminalResult`

```js
{
  ok: true,
  command,
  normalizedCommand,
  screenSnapshot,
  statePatch,
  error: null,
  nextExpectedActions: [],
  tutorContext: {}
}
```

## 5. Flujo único para terminal, tutor y widget

```text
comando o captura pegada
          |
          v
normalizador (conserva raw y normaliza espacios/fechas)
          |
          v
parser de comando o pantalla
          |
          v
motor determinista de estado + validación contra snapshot
          |
          +--> ScreenSnapshot fijo de 80 columnas
          +--> CaseState actualizado
          +--> procedimiento y paso actual
          |
          +--> Terminal Pratika
          +--> Tutor/Coach
          +--> Widget web
```

El tutor puede explicar en lenguaje natural, pero las afirmaciones operativas deben salir de `ScreenSnapshot`, `CaseState` y el manual aplicable. Si la pantalla no se pudo leer, debe decirlo y conservar el texto original; no debe completar clases o escalas por intuición.

## 6. Estados y transición de rebooking

La máquina debe modelar explícitamente:

```text
idle
  -> availability_shown
  -> awaiting_outbound_selection
  -> outbound_selected
  -> awaiting_inbound_selection
  -> itinerary_sold
  -> pricing
  -> passenger_data
  -> ticketing
  -> completed

availability_shown --clase/línea inválida--> command_error
command_error --corrección válida--> availability_shown
awaiting_inbound_selection --sin disponibilidad--> retry_search
retry_search --nueva fecha/ruta--> availability_shown
completed --rebooking solicitado--> rebooking_context
rebooking_context -> new_availability -> new_segment_selected
new_segment_selected -> fare_revalidation -> stored_or_ticketed
```

El rebooking debe conservar el PNR/TKT de práctica, el segmento original, la nueva disponibilidad, la diferencia de tarifa y la condición aplicada. Nunca debe borrar el segmento anterior sin registrar qué se cambió. Si el manual no documenta una parte del cambio, el procedimiento debe marcarla como `hueco` y pedir confirmación al instructor.

## 7. Fases de implementación

### Fase 0 — Evidencia y fixtures dorados

- Guardar capturas/textos reales de disponibilidad de ida, vuelta, conexiones, clase disponible, clase cerrada y no disponibilidad.
- Crear fixtures con la pantalla cruda intacta y una versión sanitizada.
- Al pegar el TKT, conservar su distribución, escalas, cupones y campos; ocultar automáticamente nombre, PNR, teléfono, correo, número de ticket y datos de pago.
- Etiquetar cada fixture como `live-paste`, `fixture` o `synthetic`.
- No usar un screenshot como fuente única si existe texto copiable del terminal; el screenshot queda como evidencia visual.

**Salida:** catálogo de pantallas reales reproducibles y una lista de campos que aún requieren confirmación.

### Fase 1 — Contratos compartidos

- Crear `shared/gds/` con `ScreenSnapshot`, `AvailabilityRow`, `CaseState`, normalizador y códigos de error.
- Definir serialización estable para que el Worker y Pratika produzcan el mismo caso.
- Añadir validación de esquema y versionado de fixtures.
- Separar datos de negocio de formato visual.

**Salida:** un mismo JSON de caso puede ser leído por terminal, tutor y widget.

### Fase 2 — Parser fiel de disponibilidad

- Reescribir el lector para agrupar filas continuadas bajo el mismo número de línea.
- Parsear patas de conexión, operador, marketing carrier, equipo, horarios, día adicional, duración y ruta.
- Parsear todas las clases sin perder las no disponibles.
- Convertir estados de waitlist y mensajes `NOT AVAILABLE` en estados explícitos.
- Preservar `rawLines` para auditoría y explicación.
- Reconocer `AN`, `SN`, ida y vuelta con `*`, `MY`, `MN` y páginas.

**Salida:** una captura real genera un `ScreenSnapshot` completo sin inventar ninguna plaza.

### Fase 3 — Renderizador TSC de 80 columnas

- Crear un formateador de ancho fijo con encabezado, separación, filas continuadas, prompt y paginación.
- Alinear las clases como Amadeus; no usar tarjetas de vuelo en la pantalla terminal.
- Mostrar una marca visual clara para `open`, `closed`, `waitlist-open` y `waitlist-closed`, conservando el texto del sistema.
- Añadir `MD`, `MU`, `HE`, `FQC`, `FQN`, `TQT`, `RT` y errores como pantallas con el mismo contrato.
- Dejar el diseño de la aplicación fuera del motor: el CRT solo representa el snapshot.

**Salida:** replay visual estable de una pantalla, con comparación por texto normalizado y screenshot.

### Fase 4 — Selección y venta de segmentos

- Validar `SS cantidad clase línea` contra la pantalla actual.
- Rechazar clase no disponible, línea inexistente, cantidad superior a plazas y selección en pantalla equivocada.
- Resolver ida y vuelta por grupos, sin confundir línea 1 de ida con línea 1 de regreso.
- Emitir mensajes de sistema deterministas para errores y conservar la pantalla previa.
- Al vender una conexión, guardar todos sus segmentos, no solo el primero.

**Salida:** el comando recomendado por el tutor siempre es ejecutable en el estado actual, y el comando incorrecto devuelve una corrección basada en evidencia.

### Fase 5 — Rebooking y revalidación

- Añadir un ejercicio de cambio de vuelo con PNR/TKT de práctica.
- Modelar consulta de disponibilidad nueva, selección, eliminación o sustitución del segmento según el manual, diferencia de tarifa y revalidación/reemisión.
- Registrar una línea de auditoría: original, nuevo, comando, resultado, importe y condición.
- Evitar acciones de emisión/pago real; los pasos PCI/Travel Pay siguen siendo huecos hasta tener texto documentado.

**Salida:** Pratika puede guiar una operación de rebooking de principio a fin, y si falta una regla se detiene con una pregunta precisa.

### Fase 6 — TKT y panel de ejercicio

- Incorporar el TKT real que el usuario pegará.
- Ampliar `leer-billete.js` para escalas, cupones, segmentos, fechas, estado, tarifa, impuestos, FOP y total.
- Mostrar el TKT como una pantalla de terminal o como documento, sin mezclarlo con disponibilidad.
- Crear un ejercicio que permita pegar TKT, consultar, seleccionar y comparar contra la solución esperada.

**Salida:** el TKT se reproduce con la misma información operacional y el tutor sabe referirse a cada cupón/segmento.

### Fase 7 — Ejercicios y auditoría cruzada

- Generar ejercicios desde procedimiento + fixtures, en lugar de duplicar comandos a mano.
- Crear paquetes: disponibilidad simple, ida/vuelta, conexión, clase agotada, waitlist, no disponibilidad, tarifa, COP/BOG001, TKT y rebooking.
- Probar que terminal y widget reciben el mismo `CaseState` y producen la misma recomendación.
- Ejecutar auditoría unitaria, integración, E2E visual desktop/móvil y fallback sin Gemini.

**Salida:** paquete de entrenamiento repetible y auditable, listo para agregar nuevos manuales sin crear otro cerebro.

## 8. Matriz de pruebas mínima

| Nivel | Prueba | Criterio |
|---|---|---|
| Unidad | `AN` simple | Se conservan línea, clases, ruta y horarios. |
| Unidad | Continuación | Dos líneas físicas se agrupan en una fila con varias patas. |
| Unidad | Clases | `9`, `0`, `A`, `C` y waitlist conservan valor y estado. |
| Unidad | Ida/vuelta | Se separan grupos y se validan líneas del regreso. |
| Unidad | Conexión | Se conservan todos los segmentos y duración total. |
| Unidad | Formato | La salida respeta 80 columnas, saltos y prompt. |
| Unidad | Determinismo | El mismo seed/fixture produce la misma pantalla; no hay `Math.random()` en golden tests. |
| Unidad | TKT real | Se parsean escalas y cupones con el fixture que entregue el usuario. |
| Integración | `AN -> SS` | La recomendación y la venta usan la misma clase/línea. |
| Integración | Error de regreso | Se muestra error, se conserva contexto y se permite nueva fecha. |
| Integración | Rebooking | Se conserva original, nuevo segmento y diferencia/condición. |
| Integración | Widget/terminal | Mismo input y mismo `CaseState` producen mismo paso. |
| Integración | Gemini caído | Funciona el flujo determinista de manual y fixtures. |
| E2E | Flujo real de práctica | Disponibilidad → ida → regreso → venta → tarifa → PNR. |
| E2E | Fixture pegado | Captura/TKT queda visible y auditable sin PII. |
| E2E | Responsive | Sin overflow ni pérdida de columnas en escritorio y móvil. |

## 9. Fallos que deben quedar prohibidos

- Inventar una clase o plaza que no esté en la pantalla.
- Recomendar `SS` para una clase con estado cerrado o no disponible.
- Convertir una continuación en otro vuelo.
- Reiniciar el procedimiento al recibir el dato de la ciudad, fecha, línea o clase.
- Dar por exitosa una venta si el terminal devuelve error.
- Borrar el segmento anterior durante rebooking sin dejar historial.
- Mostrar valores de pago, PCI o datos personales del TKT en logs públicos.
- Usar Gemini para corregir una pantalla que el parser no entendió; debe conservar el raw y solicitar una captura/texto más claro.
- Variar plazas o vuelos de un intento a otro dentro de un ejercicio dorado.

## 10. Criterio de terminado

El trabajo se considera listo cuando:

1. una pantalla real pegada se puede reproducir en Pratika con sus clases, plazas, conexiones y estados;
2. `SS` solo acepta datos disponibles en la pantalla vigente;
3. el tutor explica el paso y entrega el comando exacto sin volver al menú inicial;
4. ida, vuelta, error de disponibilidad y rebooking tienen transiciones verificables;
5. terminal, tutor y widget comparten el mismo caso y resultado;
6. el TKT real se puede incorporar como fixture sin inventar escalas o cupones;
7. el modo sintético es determinista y está diferenciado del replay real;
8. la suite y el E2E visual pasan, incluyendo el fallback sin Gemini.

## 11. Dependencia inmediata

Para cerrar la Fase 0, el usuario debe pegar el TKT tal como aparece en Amadeus, preferiblemente como texto copiable del terminal. Si solo existe captura, se usará la imagen como evidencia y se marcarán como pendientes los campos ilegibles. Los datos sensibles se redactarán por defecto; se conservarán vuelo, escala, fechas, clases, cupones y estructura operativa.

La primera ejecución debe empezar por Fases 0–2 y por el fixture de disponibilidad mostrado en las capturas. Después se incorpora el TKT y se implementa Fase 6; así el simulador ya mejora plazas y rebooking sin esperar a tener todos los manuales.

## 12. Revisión visual de la pantalla mostrada

La captura actual tiene una buena separación conceptual —terminal negro a la izquierda y tutor a la derecha—, pero la aplicación completa está demasiado oscura y compite con la terminal. También hay tres tratamientos distintos para paneles, botones y tarjetas, por lo que el ojo no identifica con suficiente rapidez qué es sistema, qué es procedimiento y qué es ayuda.

### Recomendación de fondo

**Recomiendo un tema híbrido claro, no una página completamente blanca:**

- fondo de aplicación: gris cálido muy claro, no blanco puro (`#F5F7FA` aproximado);
- cabecera y navegación: blanco con borde gris suave;
- panel del tutor: blanco, texto oscuro, estados con colores sobrios;
- terminal: negro/azul muy oscuro, conservando el contraste verde/cian y el ancho fijo de 80 columnas;
- paneles de referencia: blanco o gris muy claro, con un único color de acento índigo/azul;
- estados de Amadeus: verde, ámbar y rojo solo para disponibilidad, advertencias y errores;
- modo oscuro opcional más adelante, pero no como filtro invertido de la interfaz actual.

La razón es funcional: el terminal debe sentirse como Amadeus, mientras que el tutor debe leerse como una herramienta de aprendizaje. Si todo queda negro, el panel del tutor parece otra consola y el estudiante tarda más en distinguir “lo que debo teclear” de “la explicación”. Si todo queda blanco, se pierde la referencia visual del terminal real y las pantallas de disponibilidad dejan de tener peso.

### Auditoría de diseño del plan

| Dimensión | Estado observado | Cómo sería un 10 en este producto | Cambio planificado |
|---|---:|---|---|
| Jerarquía | 6/10 | El ojo entra por la pantalla actual, identifica el siguiente comando y después consulta la explicación. | Separar visualmente terminal, estado de sesión, siguiente acción y teoría. |
| Flujo | 6/10 | Tras escribir `AN` o `SS`, el resultado y la siguiente acción aparecen sin buscar en el panel. | Mostrar un bloque persistente “Siguiente acción” anclado al snapshot actual. |
| Estados | 5/10 | Vacío, cargando, error, éxito y parcial tienen apariencia y texto propios. | Diseñar estados para terminal, tutor y disponibilidad; incluir no disponibilidad y waitlist. |
| Consistencia | 5/10 | Un solo sistema de color, radios y botones para toda la aplicación; el CRT es la única excepción deliberada. | Crear `DESIGN.md` mínimo y tokens claros para app, tutor, terminal y estados GDS. |
| Texto de interfaz | 6/10 | El alumno entiende qué debe hacer sin frases genéricas como “¿qué necesita el pasajero?”. | Cambiar el copy por contexto: “La ida está seleccionada. Elige una clase disponible del regreso.” |
| Accesibilidad | 6/10 | Foco visible, teclado completo, contraste AA, texto de error legible y terminal usable sin color. | Validar contraste, `aria-live` para nuevas pantallas, navegación por teclado y no depender solo del verde/rojo. |

### Correcciones visuales concretas

1. Crear un `DESIGN.md` de una página con paleta, tipografías, espaciado, radios, estados y reglas de contraste.
2. Eliminar colores huérfanos y fondos claros aislados dentro del tema oscuro actual; el panel tutor debe seguir el tema híbrido completo.
3. Reservar tipografía monoespaciada para terminal, comandos, códigos de clase y PNR/TKT; usar sans para explicación y navegación.
4. Convertir la disponibilidad en una pantalla de alta densidad controlada: columnas alineadas, scroll horizontal intencional y leyenda compacta de estados.
5. Reemplazar botones verdes repetidos por una acción primaria única y acciones secundarias neutras; el color verde debe significar “disponible/validado”, no decorar cada botón.
6. Mantener el terminal con su marco TSC, pero quitar efectos CRT que dificulten leer clases y plazas; las scanlines deben ser opcionales y respetar `prefers-reduced-motion`.
7. En móvil, apilar primero terminal y siguiente acción; el tutor y la teoría quedan debajo, no al lado comprimidos.
8. Añadir un indicador de procedencia: `REPLAY REAL`, `EJERCICIO DETERMINISTA` o `DATOS SINTÉTICOS`. El alumno debe saber qué está viendo.

### Anti-patrones detectados

- **Dark mode como filtro global:** hace que manual, tutor y terminal parezcan el mismo objeto. Corrección: tema híbrido.
- **Colores de estado usados como decoración:** varios botones verdes debilitan el significado de “disponible”. Corrección: color semántico, no ornamental.
- **Densidad sin guía:** una terminal de 80 columnas es correcta, pero necesita foco visual en línea/clase y siguiente comando. Corrección: resaltado discreto de la selección y panel de acción.
- **Texto genérico de menú:** obliga al estudiante a volver a clasificar el caso. Corrección: el estado del caso debe reemplazar la pregunta inicial después del primer dato útil.

### Decisión pendiente del usuario

La decisión del usuario es **A: fondo híbrido claro + terminal oscuro**. Se implementará cuando la capa de sesión compartida esté lista, para que el rediseño visual no oculte un problema de sincronización.

## 13. Arquitectura de tres espacios y aprendizaje

La interfaz no debe mostrar terminal y tutor como dos versiones del mismo menú. La composición obligatoria será:

```text
┌──────────────────────────────────────┬──────────────────────────────┐
│ TERMINAL OPERATIVO TSC               │ PASO ACTUAL                   │
│ Pantalla 80 columnas                 │ 3 de 12 · Cotizar vuelos      │
│ Entrada de comandos                  ├──────────────────────────────┤
│ Resultado y prompt                   │ TUTOR CONTEXTUAL              │
│                                      │ Qué significa la pantalla     │
│                                      │ Por qué este comando           │
│                                      │ Pista / revelar / corregir    │
│                                      ├──────────────────────────────┤
│                                      │ EVIDENCIA Y LEYENDA            │
│                                      │ plazas, estados, procedencia   │
└──────────────────────────────────────┴──────────────────────────────┘
```

En escritorio el procedimiento permanece visible en la columna derecha, con el paso actual fijado arriba. En móvil el orden será: `Terminal → Siguiente acción → Tutor → Procedimiento → Evidencia`; la disponibilidad conserva ancho monoespaciado con desplazamiento horizontal controlado.

### Regla anti-IVR

```text
si intención + ruta ya están detectadas:
  no mostrar “¿Qué necesita el pasajero?”
  mostrar procedimiento activo
  pedir solo el dato que falta
si ruta + fecha + pasajeros están completos:
  emitir AN exacto del manual
  avanzar al estado de disponibilidad
si existe una pantalla vigente:
  no repetir AN ni reiniciar el procedimiento
  pedir línea/clase contra las plazas visibles
```

### Modelo pedagógico mínimo

Cada ejercicio debe declarar, además del comando:

```js
{
  objetivo: 'interpretar clases disponibles y estados de lista de espera',
  evidenciaNecesaria: ['linea', 'clase', 'cupos', 'estado'],
  intentoLibre: true,
  pistas: ['¿Qué línea tiene M abierta?', '¿Cuántas plazas necesitas?'],
  explicacionPosterior: '...',
  errorDiagnosticado: '...',
  transferencia: 'misma operación con regreso sin disponibilidad',
  dominio: { aciertosConsecutivos: 2, sinSustitucionSilenciosa: true }
}
```

El tutor debe avanzar en esta secuencia: `objetivo → pantalla → intento del alumno → pista progresiva → comando → resultado → explicación → variación`. El botón “Revelar” no puede ser el camino principal. La evaluación debe puntuar interpretación de plazas, selección de línea, recuperación de errores y explicación, no solo el PNR final.

## 14. Contrato único de sesión

El terminal, el procedimiento, el tutor y el widget consumirán el mismo evento versionado:

```js
{
  type: 'TerminalResult',
  caseId: '...',
  revision: 12,
  command: 'SS 2 Y 1',
  normalizedCommand: 'SS 2 Y 1',
  screenSnapshot: { id: 'screen-12', source: 'fixture', rawText: '...' },
  caseStatePatch: { selectedSegments: [] },
  procedure: { id: 'on-hold-72h', step: 2 },
  nextAction: { label: 'Cotizar los vuelos', commandTemplate: 'FXX/FF-{tarifa}' },
  provenance: 'EJERCICIO_DETERMINISTA'
}
```

Un solo dueño aplica el `caseStatePatch`; los tres espacios solo lo representan. El evento debe ser serializable y tener `caseId` + `revision` para evitar que una respuesta tardía del Worker devuelva el tutor al paso anterior.

## 15. Resultado de las dos oleadas de auditoría

### Oleada 1 — producto, diseño y GDS

Hallazgos confirmados:

- P0: terminal, procedimiento y tutor no estaban definidos como tres espacios persistentes.
- P0: el sistema enseñaba comandos, pero no declaraba objetivo, intento, pista, transferencia ni dominio.
- P0: tutor y simulador no compartían todavía un contrato versionado `TerminalResult`.
- P1: disponibilidad perdía `0`, continuaciones y estados waitlist; `SS` debía ser transaccional.
- P1: rebooking necesitaba historial estructurado del segmento original y el nuevo.
- P1: el layout móvil debía proteger la legibilidad de las 80 columnas.

### Oleada 2 — adversarial de integridad y manuales

Se debe verificar, antes de construir:

- que cada ID nuevo se sincronice en `procedimientos.generated.json` sin colisiones;
- que cada intención (`on-hold`, emisión ON HOLD, factura, MEDA, pagos, ceniza, DOCS, comunicación cortada) llegue al procedimiento correcto;
- que las discrepancias de fuente permanezcan marcadas: Guatemala USD/GTQ y las dos sintaxis de pago ON HOLD;
- que los pasos PCI/Travel Pay sean bloqueantes y nunca acepten tarjeta real o token real;
- que #3062 Generalidades se ejecute como prechecklist y no se convierta en menú inicial repetido;
- que #3101 PMR, #3102 comidas y #3124 MEDA no se mezclen: servicio confirmado, comida y valoración médica son ramas distintas;
- que `DOCS` conserve diferencias ADT/CHD frente a INF (`M/F` vs `MI/FI`);
- que las pruebas de manuales detecten comandos no documentados, texto inventado y condiciones contradictorias.

El plan queda ampliado con estos gates. Hasta que pasen, el veredicto es **DEVUELTO PARA AMPLIAR**, no “listo para producción”.

### Verificación adversarial contra el código actual

La segunda oleada confirmó estos bloqueos y los convierte en gates obligatorios de construcción:

1. `/tutor` y `/simulador` todavía montan experiencias distintas; no muestran terminal, pasos y tutor simultáneamente.
2. El código comunica `{ command, output, isError }`, no el `TerminalResult` versionado del plan.
3. El fallback y algunos controles todavía pueden mostrar “¿Qué necesita el pasajero?” después de que ya existe intención y ruta.
4. `procedureExercises.js` aún no contiene objetivo, evidencia, pistas progresivas, transferencia y dominio.
5. `PnrStateMachine.js` usa `Math.random()` en el flujo sintético y existe una regresión antigua que espera resultados distintos para la misma consulta; debe sustituirse por seed/fixture en ejercicios.
6. `SS` todavía sustituye línea o clase inválida y puede vender parcialmente un ida/vuelta inválido; debe hacerse validación atómica.
7. La fecha de regreso completa, continuaciones y conexiones todavía no se modelan con fidelidad.
8. La opción A está documentada, pero `src/index.css` sigue en tema oscuro y atenúa el tutor al enfocar el terminal; el rediseño debe corregirlo después del contrato único.

Por tanto, la secuencia de construcción queda bloqueada así: **contrato de sesión → determinismo y validación SS → parser/conexiones → modelo pedagógico → layout de tres espacios → tema A → auditoría E2E**. No se debe empezar por CSS para ocultar esos fallos.
