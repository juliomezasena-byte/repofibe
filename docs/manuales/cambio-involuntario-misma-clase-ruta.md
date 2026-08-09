# Cambio involuntario — MISMA clase y ruta (revalidación directa)

> **Generado automáticamente** desde
> `public/procedimientos/cambio-involuntario-misma-clase-ruta.json`. No lo edites a mano: corrige
> el JSON y vuelve a correr `node scripts/generar-manual.mjs`.

**Aerolínea:** Iberia (075) · **Categoría:** reemision · **Fuente:** IberiaNet Lite — #3639 "2. MISMA CLASE Y RUTA" (hermano de #3638)

Cambio de vuelo cuando se conserva la MISMA CLASE y la MISMA RUTA. Se revalida el billete con TTP/ETRV, sin reemisión ni cobro.

> **Aplica solo a:** SOLO cuando la ruta Y la clase se mantienen. Si cambia alguna de las dos, aplica el procedimiento hermano (#3638, cambio-involuntario-diferente-clase-ruta).

> ℹ️ Rescatado el 08AGO26 de cambio-involuntario-clase-ruta.json, donde había sobrescrito por error el contenido de #3638. Ahora cada manual tiene su archivo.

## Antes de empezar

- 🔴 REQUISITO EXCLUSIVO: este procedimiento SOLO se puede realizar siempre y cuando sea la MISMA RUTA y la MISMA CLASE.
- 🔴 ELEMENTO FHE: obligatorio asociar el billete al pasajero antes de cambiar vuelos. Para infante se usa FHE INF 075-.../P1 asociando al adulto P1.
- 🟠 REVALIDACIÓN TTP/ETRV: actualiza el mismo billete con los nuevos vuelos sin necesidad de cotizar penalidad ni generar TST de reemisión.

## Pasos

| # | Sistema | Proceso | Transacción | Explicación | Confianza |
|---|---|---|---|---|---|
| 0 | Natiba | Filtro de seguridad | — | APELLIDO + PNR.<br><br>**Bloqueante:** no continúes sin esto. | `✔ verbatim` |
| 1 | Amadeus | Colocar el TKT en FHE (adulto / child) | `FHE 075-1422342526/P1`<br><sub>FHE {numeroBillete}/P{pasajero}</sub> | FHE asocia el billete al pasajero. | `✔ verbatim` |
| 1.1 | Amadeus | Colocar el TKT del INFANTE en FHE | `FHE INF 075-1422342526/P1`<br><sub>FHE INF {numeroBillete}/P{pasajeroAdulto}</sub> | P1 = número del adulto que va con el infante. | `✔ verbatim` |
| 2 *(opc.)* | Amadeus | Eliminar el TKT en la línea FA (solo si aplica) | `XE 14`<br><sub>XE {lineaFA}</sub> | 14 = línea del elemento FA del adulto. | `✔ verbatim` |
| 3 | Amadeus | Buscar fechas de vuelo | `AN 11MAR MADBOG`<br>`AN 11MAR MADBOG * 23OCT`<br>`SN 11MAR MADBOG` | AN para disponibilidad, SN para todas las clases ofertadas. PRO TIP: MY = día anterior, MN = día siguiente. | `✔ verbatim` |
| 4 | Amadeus | Seleccionar plazas EN LA MISMA CLASE ORIGINAL | `SS 2 A 1`<br>`SS 2 A 1 * S 11`<br>`SS 2 A S 1` | 2 = plazas · A = clase elegida, que DEBE coincidir con la clase original · 1 = línea de vuelo.<br><br>**Bloqueante:** no continúes sin esto. | `✔ verbatim` |
| 5 | Amadeus | Eliminar los segmentos viejos que el cliente ya no va a usar | `XE 14`<br><sub>XE {lineaSegmentosViejos}</sub> | 14 = línea de los segmentos anteriores. | `✔ verbatim` |
| 6 | Amadeus | Revalidar el billete | `TTP/ETRV/L15/S2-4/E1-2/RT`<br><sub>TTP/ETRV/L{lineaBillete}/S{segmentosNuevos}/E{cuponesTkt}/RT</sub> | Actualiza el mismo billete con los nuevos vuelos. L15 = línea del billete · S2-4 = nuevos segmentos · E1-2 = cupones. | `✔ verbatim` |
| 7 | Amadeus | Abrir el billete y validar que los vuelos sean los correctos | `TWD/TKT 075-1422342526`<br>`TWD/L16` | Valida el billete actualizado. | `✔ verbatim` |
| 8 | Amadeus | Enviar itinerario y billetes electrónicos | `IBP-EMLA/LPSP`<br>`IEPJ-EMLA/LPSP`<br>`ITR-EMLA` | IBP = itinerario · IEPJ = itinerario y servicios · ITR = billetes electrónicos. | `✔ verbatim` |
| 8.1 | Resiber | Enviar documentos desde RESIBER | `ITP:/RESERVA/EMAIL`<br>`DTR TN 075-1234567890,EML/EMAIL`<br>`DEMR DN 075-1234567890,EML/EMAIL` | Itinerario · billetes electrónicos · EMD. | `✔ verbatim` |

