# Cambio involuntario — DIFERENTE clase y/o ruta

> **Generado automáticamente** desde
> `public/procedimientos/cambio-involuntario-diferente-clase-ruta.json`. No lo edites a mano: corrige
> el JSON y vuelve a correr `node scripts/generar-manual.mjs`.

**Aerolínea:** Iberia (075) · **Categoría:** reemision · **Fuente:** IberiaNet Lite — #3638 "1. DIFERENTE CLASE Y/O RUTA" (hermano de #3639)

Reemisión por cambio involuntario cuando cambia la clase y/o la ruta. Usa FXI (con /SC según la ventana de 48 h) y emite solo el cambio.

> **Aplica solo a:** Solo se puede realizar siempre y cuando cambie la ruta y/o la clase. Si se conservan ambas, aplica el hermano #3639 (cambio-involuntario-misma-clase-ruta).

> ℹ️ RESTAURADO el 08AGO26: este manual había sido sobrescrito por error por el #3639 dentro de cambio-involuntario-clase-ruta.json. El usuario lo volvió a enviar y ahora cada uno tiene su archivo.

## Antes de empezar

- 🔴 En caso de cambio de ruta, se permite un MÁXIMO DE 250 MILLAS entre la ciudad original y la nueva.
- 🔴 ANTES DE INICIAR: realiza el filtro de seguridad — APELLIDO + PNR.
- 🟠 La elección entre FXI y FXI/SC depende de si el nuevo vuelo asignado está a MENOS o MÁS de 48 horas de la llamada. Equivocarse cambia el cálculo del cambio.

## Pasos

| # | Sistema | Proceso | Transacción | Explicación | Confianza |
|---|---|---|---|---|---|
| 0 | Natiba | Filtro de seguridad | — | APELLIDO + PNR.<br><br>**Bloqueante:** no continúes sin esto. | `✔ verbatim` |
| 0.1 | Amadeus | Calcular las millas entre ciudad original y nueva | `FQM MAD BCN`<br><sub>FQM {origen} {destino}</sub> | MAD = origen · BCN = destino. Valida el máximo de 250 millas permitido en cambio de ruta. | `✔ verbatim` |
| 1 | Amadeus | Colocar el TKT del ADT/CHD en FHE | `FHE 075-1422342526/P1`<br><sub>FHE {numeroBillete}/P{pasajero}</sub> | 075-142… = ticket del ADT o CHD · P1 = número del pax. | `✔ verbatim` |
| 1.1 | Amadeus | Colocar el TKT del INF en FHE | `FHE INF 075-1422342526/P1`<br><sub>FHE INF {numeroBillete}/P{pasajero}</sub> | P1 = número del ADT que va con el infante. | `✔ verbatim` |
| 2 *(opc.)* | Amadeus | Eliminar el TKT en FA (solo si aplica) | `XE 14`<br><sub>XE {lineaFA}</sub> | 14 = línea del elemento FA del adulto. | `✔ verbatim` |
| 3 | Amadeus | Buscar fechas de vuelo | `AN 11MAR MADBOG`<br>`AN 11MAR MADBOG * 23OCT`<br>`SN 11MAR MADBOG` | PRO TIP: MY = día anterior · MN = día siguiente. | `✔ verbatim` |
| 4 | Amadeus | Seleccionar plazas | `SS 2 A 1`<br>`SS 2 A 1 * S 11`<br>`SS 2 A S 1` | Ida y vuelta con *. Clases diferentes por vuelo: SS 2 A S 1. | `✔ verbatim` |
| 5 | Amadeus | Eliminar TODAS las FP | `XE 22`<br><sub>XE {lineaFP}</sub> | 22 = línea del elemento FP. | `✔ verbatim` |
| 6 | Amadeus | Eliminar TST | `TTE/ALL`<br>`TTE/T1` | TTE/ALL = todos los TST · TTE/T{n} = uno específico. | `✔ verbatim` |
| 7 *(opc.)* | Amadeus | Eliminar el TKT en FO (solo si aplica) | `XE 14`<br><sub>XE {lineaFO}</sub> | 14 = línea del elemento FO. | `✔ verbatim` |
| 8 | Amadeus | Cargar el cambio involuntario — nº de billete, vuelo a MENOS de 48 h | `FXI/TKT 075-142456789/S2,4/P1`<br><sub>FXI/TKT {numeroBillete}/S{segmentos}/P{pasajero}</sub> | Cuando el nuevo vuelo asignado está a MENOS de 48 horas de la llamada. Los segmentos son los que el cliente va a volar. | `✔ verbatim` |
| 8.1 | Amadeus | Cargar el cambio involuntario — nº de billete, vuelo a MÁS de 48 h | `FXI/SC/TKT 075-142456789/S2,4/P1`<br><sub>FXI/SC/TKT {numeroBillete}/S{segmentos}/P{pasajero}</sub> | El /SC se añade cuando el nuevo vuelo asignado está a MÁS de 48 horas de la llamada. | `✔ verbatim` |
| 8.2 | Amadeus | Cargar el cambio involuntario — línea de billete, MENOS de 48 h | `FXI/T 16/S2,4/P1`<br><sub>FXI/T {lineaBillete}/S{segmentos}/P{pasajero}</sub> | Variante usando la línea del billete en vez del número completo. | `✔ verbatim` |
| 8.3 | Amadeus | Cargar el cambio involuntario — línea de billete, MÁS de 48 h | `FXI/SC/T16/S2,4/P1`<br><sub>FXI/SC/T{lineaBillete}/S{segmentos}/P{pasajero}</sub> | Variante con /SC usando la línea del billete.<br><br>⚠️ ⚠️ El manual escribe 'FXI/T 16' (con espacio) en la variante de menos de 48 h y 'FXI/SC/T16' (sin espacio) en esta. Se preserva tal cual; confirmar si el espacio es significativo. | `✔ verbatim` |
| 9 | Amadeus | Reconfirmar el itinerario al cliente | — | Paso de comunicación, sin transacción. | `✔ verbatim` |
| 10 | Amadeus | Eliminar las plazas que el cliente NO va a usar | `XE 14`<br><sub>XE {lineaSegmentos}</sub> | 14 = línea de los segmentos. | `✔ verbatim` |
| 11 | Amadeus | Emitir SOLO el cambio | `TTP1/ET/RT/T2/F`<br><sub>TTP1/{opciones}/T{numeroTST}/F</sub> | T2 = número del TST.<br><br>⚠️ El manual muestra 'TTP1/ET/RT/T2/F' en la columna TRANSACCIÓN y 'TTP1/T2/ET/RT/F' en la EXPLICACIÓN. Se preserva la columna TRANSACCIÓN. | `✔ verbatim` |
| 12 | Amadeus | Enviar itinerario y documentos | `IBP-EMLA/LPSP`<br>`IEPJ-EMLA/LPSP`<br>`ITR-EMLA` | IBP = itinerario · IEPJ = itinerario y servicios · ITR = billetes electrónicos. | `✔ verbatim` |
| 12.1 | Resiber | Enviar documentos desde RESIBER | `ITP:/RESERVA/EMAIL`<br>`DTR TN 075-1234567890,EML/EMAIL`<br>`DEMR DN 075-1234567890,EML/EMAIL` | Itinerario · billetes electrónicos · EMD. | `✔ verbatim` |

## EN CASO DE QUE AL EMITIR DÉ UN ERROR

| # | Sistema | Proceso | Transacción |
|---|---|---|---|
| 1 | Amadeus | Eliminar el FP (solo si aplica, si no deja emitir) | `XE 14` |
| 2 | Amadeus | Incluir de nuevo la forma de pago | `FPO/CCVI+/SFCA,/0` |
| 3 | Amadeus | Volver al paso 11 (emitir) | `TTP1/ET/RT/T2/F` |

> El manual oficial escribe 'FPO/CCVI+/SFCA,/0'. El 'FPO/CCSVI+' con S extra del bot EverGPT queda descartado — es la quinta confirmación independiente.

## Lo que falta en el material

Estos puntos **no están en la fuente**. No los inventes: pregúntale
al instructor.

- No se especifica de dónde se obtiene la confirmación de si el nuevo vuelo está a más o menos de 48 horas.
- Ambigüedad de espacio en FXI/T 16 vs FXI/SC/T16.
- Orden de los parámetros de TTP1 distinto entre las columnas TRANSACCIÓN y EXPLICACIÓN del propio manual.

