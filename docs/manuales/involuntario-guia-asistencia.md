# Cambios involuntarios — guía de asistencia por ventana (>48h y <48h)

> **Generado automáticamente** desde
> `public/procedimientos/involuntario-guia-asistencia.json`. No lo edites a mano: corrige
> el JSON y vuelve a correr `node scripts/generar-manual.mjs`.

**Aerolínea:** Iberia (075) · **Categoría:** reemision · **Fuente:** manual/Cambios involutarios/ (6 capturas) — "Guía de asistencia Cambios de Vuelos involuntarios" + diagrama de cabinas AGOSTO 2024. Corresponde a los hijos #3636 (VENTANA OPERATIVA <48HRS) y #3637 (VENTANA COMERCIAL) de #3129.

Qué hacer y qué decir según la ventana temporal: VENTANA COMERCIAL (>48 h) se resuelve por web/call center; VENTANA OPERATIVA (<48 h) exige verificar la incidencia fuera de la reserva y puede escalarse a supervisor.

> ℹ️ Complementa la matriz de derechos de _involuntario-matriz-derechos.json (#3129): aquella dice QUÉ puede pedir el pasajero, esta dice CÓMO atenderle y con qué palabras.

## Antes de empezar

- 🔴 NO RE-UBICAR EN CABINAS DIFERENTES. La re-acomodación mantiene al pasajero en su misma cabina (Business / Turista Premium / Turista Económica).
- 🔴 En VENTANA OPERATIVA (<48 h) puede que el cambio NO se vea reflejado en la reserva (sin TK ni UN). Hay que verificarlo fuera: Web (Estado de Vuelos), GD (MADIB0500 y MADIB0296) o con el supervisor.
- 🟠 Si no es posible realizar el cambio por alguna razón, escálalo a un Supervisor, que valorará la mejor alternativa para resolverlo.

## Pasos

| # | Sistema | Proceso | Transacción | Explicación | Confianza |
|---|---|---|---|---|---|
| 0 | Natiba | Filtro de seguridad | — | APELLIDO + PNR.<br><br>**Bloqueante:** no continúes sin esto. | `✔ verbatim` |
| 1 | Amadeus | ⚖️ Determinar la VENTANA — ¿faltan más o menos de 48 h para el vuelo? | — | Más de 48 h → VENTANA COMERCIAL (pasos 2-4). Menos de 48 h → VENTANA OPERATIVA (pasos 5-8). El procedimiento cambia por completo.<br><br>**Bloqueante:** no continúes sin esto. | `✔ verbatim` |
| 2 | Amadeus | [>48h COMERCIAL] Confirmar que el vuelo sufrió una afectación | `RHA` | Confirma que el vuelo ha sufrido: TK, UN+TK, CANCELACIÓN, DOWNGRADING o PÉRDIDA DE CONEXIÓN. | `✔ verbatim` |
| 3 | IberiaNet / iberia.com | [>48h COMERCIAL] Guiar al cliente para que acepte el cambio por la web | — | Ayúdale con su localizador a encontrar fácilmente en la web si su reserva está afectada por un cambio/cancelación. La aceptación del cambio se hace por WEB o CALL CENTER. | `✔ verbatim` |
| 4 | Amadeus | [>48h COMERCIAL] Si el cliente no puede o no desea hacerlo por la web | — | Ofrécele las alternativas disponibles que más le convengan, según la matriz de derechos (#3129). | `✔ verbatim` |
| 5 | Amadeus | [<48h OPERATIVA] Verificar si el vuelo está afectado | `RHA` | Puede que NO veas reflejado en la reserva el cambio (TK, UN, etc). | `✔ verbatim` |
| 6 | IberiaNet / iberia.com | [<48h OPERATIVA] Si la reserva no lo refleja, verificar fuera | — | Verifica la incidencia en la Web (Estado de Vuelos), en el GD (MADIB0500 y MADIB0296) o consulta con el supervisor para confirmar el cambio.<br><br>**Bloqueante:** no continúes sin esto. | `✔ verbatim` |
| 7 | Amadeus | [<48h OPERATIVA] Verificar condiciones y ofrecer alternativas | — | Verificamos que cumple las condiciones para el cambio (consultar la Guía para asistir clientes para Cambios Involuntarios) y ofrecemos las alternativas disponibles en cuanto a los vuelos. | `✔ verbatim` |
| 8 | Salesforce | [<48h OPERATIVA] Escalar si no es posible el cambio | — | Si no es posible realizar el cambio por alguna razón, escálalo a un Supervisor, que valorará la mejor alternativa para resolverlo. | `✔ verbatim` |

## Lo que falta en el material

Estos puntos **no están en la fuente**. No los inventes: pregúntale
al instructor.

- A qué da derecho un DOWNGRADING: aparece como tipo de afectación pero no está en la matriz de #3129.
- Qué son exactamente MADIB0500 y MADIB0296 (¿colas? ¿oficinas? ¿pantallas del GD?) y cómo se consultan.
- La 'Guía para asistir clientes para Cambios Involuntarios' que el propio material referencia y que no tenemos.
- Qué hacer si el vuelo está a menos de 48 h Y la incidencia no aparece en ninguna de las tres vías de verificación.

## Capturas originales

- [`manual/Cambios involutarios/WhatsApp Image 2026-08-08 at 12.54.01.jpeg`](../../manual/Cambios involutarios/WhatsApp Image 2026-08-08 at 12.54.01.jpeg)
- [`manual/Cambios involutarios/WhatsApp Image 2026-08-08 at 12.54.17.jpeg`](../../manual/Cambios involutarios/WhatsApp Image 2026-08-08 at 12.54.17.jpeg)
- [`manual/Cambios involutarios/WhatsApp Image 2026-08-08 at 12.54.32.jpeg`](../../manual/Cambios involutarios/WhatsApp Image 2026-08-08 at 12.54.32.jpeg)
- [`manual/Cambios involutarios/WhatsApp Image 2026-08-08 at 12.54.50.jpeg`](../../manual/Cambios involutarios/WhatsApp Image 2026-08-08 at 12.54.50.jpeg)
- [`manual/Cambios involutarios/WhatsApp Image 2026-08-08 at 12.55.19.jpeg`](../../manual/Cambios involutarios/WhatsApp Image 2026-08-08 at 12.55.19.jpeg)
- [`manual/Cambios involutarios/WhatsApp Image 2026-08-08 at 12.55.37.jpeg`](../../manual/Cambios involutarios/WhatsApp Image 2026-08-08 at 12.55.37.jpeg)

