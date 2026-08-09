# Cambio de vuelo MANUAL — sin segmento volado

> **Generado automáticamente** desde
> `public/procedimientos/cambio-manual-sin-segmento-volado.json`. No lo edites a mano: corrige
> el JSON y vuelve a correr `node scripts/generar-manual.mjs`.

**Aerolínea:** Iberia (075) · **Categoría:** reemision · **Fuente:** IberiaNet Lite — #3121 "1. SIN SEGMENTO VOLADO" (rama CAMBIOS DE VUELO)

Reemisión manual completa cuando el pasajero no ha volado ningún tramo: se calcula la penalidad a mano, la diferencia de tarifa, se crea el TSM/EMD de la penalidad y se emite todo junto.

> ℹ️ Es el camino MANUAL: el que se sigue cuando el automático (#3111) no devuelve cotización. Aquí no hay FXF/FXE: se calcula todo a mano con FXX + DF.

## Antes de empezar

- 🔴 ANTES DE TODO: verifica el valor del gasto de gestión en IberiaNet → MANUALES EXPRESS → GASTOS DE GESTIÓN.
- 🟠 PRO TIP: guarda SIEMPRE la tarifa con la MISMA transacción con la que cotizaste, para evitar errores. Aquí se cotiza con FXX y se guarda con FXP.

## Pasos

| # | Sistema | Proceso | Transacción | Explicación | Confianza |
|---|---|---|---|---|---|
| 0 | IberiaNet / iberia.com | Verificar el valor del gasto de gestión | — | IberiaNet → MANUALES EXPRESS → GASTOS DE GESTIÓN.<br><br>**Bloqueante:** no continúes sin esto. | `✔ verbatim` |
| 1 | Amadeus | Abrir el TKT y copiar el FAREBASIS, el DOI y el valor total | `TWD/TKT 075-1422342526`<br>`TWD/L16`<br><sub>TWD/TKT {numeroBillete}</sub> | TWD/L{n} usa la línea del billete en vez del número. Del billete se necesitan tres datos: fare basis, DOI (fecha de emisión original) y valor total. | `✔ verbatim` |
| 2 | IberiaNet / iberia.com | [PENALIDAD] Buscar el valor de la penalidad desde iberia.com | — | WWW.IBERIA.COM → TUS VUELOS → GESTIONA TU RESERVA → TUS VUELOS. | `✔ verbatim` |
| 2.1 | Amadeus | [PENALIDAD] Cotizar a histórico | `FXX/S2,3/R,02FEB26,UP/FF-BASIC`<br><sub>FXX/S{segmentosOriginales}/R,{DOI},UP/FF-{TARIFA}</sub> | 2,3 = segmentos ORIGINALES · 02FEB26 = fecha de emisión (DOI) · BASIC = fare basis del ticket. | `✔ verbatim` |
| 3 | Amadeus | [PENALIDAD] Verificar penalidad — ADULTO | `FQN02*PE`<br><sub>FQN{lineaOfertada}*PE</sub> | 02 = número de tarifa ofertada.<br><br>⚠️ CORREGIDO 08AGO26 por el usuario (agente Iberia en activo): el FQN SIEMPRE lleva asterisco. El manual escribe "FQN02PE" sin el, pero es una ERRATA DE TRANSCRIPCION del propio manual — el sistema exige FQN{linea}*PE. Se preserva la grafia del manual en "comandoSegunManual" para no perder la trazabilidad. | `✔ verbatim` |
| 3.1 | Amadeus | [PENALIDAD] Verificar penalidad — CHILD e INFANTE | `FQN02CD`<br><sub>FQN{lineaOfertada}CD</sub> | Con esta transacción vemos el DESCUENTO que aplica a cada tipo de pasajero.<br><br>⚠️ PENDIENTE: el usuario confirmo que el PE siempre lleva asterisco; falta confirmar si la variante CD (child/infante) tambien lo lleva (FQN02*CD). | `✔ verbatim` |
| 3.2 | Amadeus | [PENALIDAD] Aplicar el descuento con la calculadora | `DF 150 P 75`<br><sub>DF {penalidadADT} P {porcentajeDescuento}</sub> | 150 = valor de la penalidad del ADT · 75 = valor del descuento (porcentaje). | `✔ verbatim` |
| 4 | Amadeus | [PENALIDAD] Documentar valores a cobrar | `RM02MAR26 PAX AVDO COSTE PENTY 3279MXN X ADT + 680MXN SF / WP` | PENTY = penalidad · SF = gasto de gestión. | `✔ verbatim` |
| 5 | Amadeus | [DIFERENCIA] Cotizar los vuelos que el cliente va a volar | `FXX/S2,3/FF-BASIC`<br><sub>FXX/S{segmentosNuevos}/FF-{TARIFA}</sub> | Familias: Turista FF-BASIC/OPTIMA/COMFORT/FLEX · T.Premium FF-PEOPTIMA/PECOMFORT/PEFLEX · Business FF-BUSOPTIMA/BUSCOMFORT/BUSFLEX. | `✔ verbatim` |
| 5.1 | Amadeus | [DIFERENCIA] Error *NO FARES/RBD/CARRIER/PASSENGER TYPE | `FXR/S2,3/FF-BASIC` | La tarifa no está disponible para las clases seleccionadas. Cambia las clases y recotiza reemplazando FXX por FXR. | `✔ verbatim` |
| 6 | Amadeus | [DIFERENCIA] Calcular la diferencia de tarifa | `DF 1890 - 1750`<br><sub>DF {valorCotizacionNueva} - {valorTktOriginal}</sub> | Diferencia de tarifa = valor de cotización nueva − valor del TKT original. | `✔ verbatim` |
| 7 | Amadeus | [DIFERENCIA] Documentar valores a cobrar | `RM02MAR26 PAX AVDO COSTE PENTY 3279MXN X ADT + 604 MXN SF + 2853MXN DF/ WP`<br>`RM02MAR26 PAX AVDO COSTE TOTAL CMB 6736MXN/ WP` | DF = diferencia de tarifa · CMB = coste total del cambio. Guardar cambios hasta el momento con ER. | `✔ verbatim` |
| 8 | Amadeus | Eliminar TST | `TTE/ALL`<br>`TTE/T1` | TTE/ALL = todos · TTE/T{n} = uno específico. | `✔ verbatim` |
| 9 | Amadeus | Eliminar todas las FP | `XE 22`<br><sub>XE {lineaFP}</sub> | 22 = línea del elemento FP. | `✔ verbatim` |
| 10 | Amadeus | Guardar los vuelos que el cliente va a volar | `FXP/S2,3/FF-BASIC`<br><sub>FXP/S{segmentos}/FF-{TARIFA}</sub> | PRO TIP: guarda SIEMPRE la tarifa con la misma transacción con la que cotizaste, para evitar errores. | `✔ verbatim` |
| 11 | Amadeus | Colocar el TST en REEMISIÓN | `TTI/EXCH/T2`<br><sub>TTI/EXCH/T{numeroTST}</sub> | 2 = número del TST. | `✔ verbatim` |
| 12 | Amadeus | Agregar el valor de la diferencia al TST | `TTK/T2/T140`<br><sub>TTK/T{numeroTST}/T{diferenciaTarifa}</sub> | 2 = número del TST · 140 = diferencia de tarifa. | `✔ verbatim` |
| 13 | Amadeus | Crear el FO para ADT y CHD | `FOL14/P1`<br><sub>FOL{lineaTicket}/P{pasajero}</sub> | 14 = línea del ticket · P1 = número de pasajero. | `✔ verbatim` |
| 13.1 | Amadeus | Crear el FO para INFANTE | `FOINF*L15/P1`<br><sub>FOINF*L{lineaTicket}/P{pasajero}</sub> | Guardar cambios hasta el momento con ER. | `✔ verbatim` |
| 14 | Amadeus | Solicitar el TSM (donde vivirá la penalidad) | `IU IB NN1 PENF BOG/P1`<br><sub>IU IB NN1 PENF {origenDelCambio}/P{pasajero}</sub> | BOG = origen del cambio · P1 = número de pasajero. PENF identifica la penalidad. | `✔ verbatim` |
| 15 | Amadeus | Crear el EMD para ADT | `TMC/L5`<br><sub>TMC/L{lineaElementoSVC}</sub> | L5 = línea del elemento SVC. | `✔ verbatim` |
| 15.1 | Amadeus | Crear el EMD para INFANTE | `TMC/L6/INF`<br><sub>TMC/L{lineaElementoSVC}/INF</sub> | Igual que el anterior pero marcando INF. | `✔ verbatim` |
| 16 | Amadeus | Verificar que se haya creado la máscara TSM | `TQM`<br>`TQM/M1` | TQM si hay un solo tipo de pasajero · TQM/M{n} si hay varios. | `✔ verbatim` |
| 17 | Amadeus | Ingresar el valor de la penalidad y el cupón value | `TMI/M1/F3279/CV-3279`<br><sub>TMI/M{tsm}/F{penalidad}/CV-{penalidad}</sub> | M1 = número del TSM. El valor va DOS veces: como importe (F) y como cupón value (CV). Guardar cambios con ER. | `✔ verbatim` |
| 18 | Amadeus | Incluir el gasto de gestión | `TTO/ST01/CSF/F604`<br>`TTO/ST01/CSF/F604/T2`<br><sub>TTO/ST01/CSF/F{gastoGestion}</sub> | T2 = número del TST cuando hay varios. | `✔ verbatim` |
| 18.1 *(opc.)* | Amadeus | PRO TIP — comprobar que el gasto quedó agregado | `TQO` | Consulta si el importe está agregado. | `✔ verbatim` |
| 18.2 *(opc.)* | Amadeus | Eliminar el gasto de gestión si quedó mal | `TTO/ST01/T2`<br><sub>TTO/ST01/T{numeroTST}</sub> | Lo elimina para volver a cargarlo. | `✔ verbatim` |
| 19 | Amadeus | Incluir datos del titular de la tarjeta (nuevo Cyber) | `RMCSY/JUAN:PELAEZ`<br><sub>RMCSY/{NOMBRE}:{APELLIDO}</sub> | Guardamos con ER. | `✔ verbatim` |
| 20 | IberiaNet / iberia.com | Tomar los datos de tarjeta | — | PCI Pal: EUROPA → FORMAS DE PAGO → PCI PAL. Travel Pay: EUROPA → FORMAS DE PAGO → TRAVEL PAY. | `✔ verbatim` |
| 21 | Amadeus | Forma de pago del TST (diferencia de tarifa y gasto de gestión) | `FP O/CCVI+/MS-TT,VI1234567890123456-1023-V1234ABCD`<br><sub>FP O/CCVI+/{token}</sub> | El token se copia de PCI o Travel Pay. | `✔ verbatim` |
| 22 | Amadeus | Forma de pago del TSM (penalidad) | `TMI/M1/FP-MS-TT,VI1234567890123456-1023-V1234ABCD`<br><sub>TMI/M{tsm}/FP-{token}</sub> | La penalidad se cobra en el TSM, aparte del TST. | `✔ verbatim` |
| 23 | Amadeus | Cargar el perfil de PCI en Amadeus | `$$CONFIG:CCTYPE/2` | Configura el perfil de tarjeta antes de cobrar. | `✔ verbatim` |
| 24 | Amadeus | Realizar el cargo a la tarjeta del cliente | `$$PAY` | Ejecuta el cobro. | `✔ verbatim` |
| 25 | Amadeus | Borrar el Cyber para poder emitir | `XE17`<br><sub>XE{linea}</sub> | 17 = línea donde esté el Cyber. | `✔ verbatim` |
| 26 | Amadeus | Reconfirmar el itinerario al cliente | — | Paso de comunicación, sin transacción. | `✔ verbatim` |
| 27 | Amadeus | Eliminar las plazas que el cliente NO va a usar | `XE 14`<br><sub>XE {lineaSegmentos}</sub> | 14 = línea de los segmentos. | `✔ verbatim` |
| 28 | Amadeus | Emitir penalidad y billete AL TIEMPO | `TTP1/TTM/T2/M1/ET/RT`<br><sub>TTP1/TTM/T{tst}/M{tsm}/ET/RT</sub> | T2 = número del TST · M1 = número del TSM. | `✔ verbatim` |
| 28.1 | Amadeus | Emitir SOLO la penalidad | `TTM1/M1/RT`<br><sub>TTM1/M{tsm}/RT</sub> | M1 = número del TSM. | `✔ verbatim` |
| 28.2 | Amadeus | Emitir SOLO el billete | `TTP1/ET/RT/T2`<br><sub>TTP1/ET/RT/T{tst}</sub> | T2 = número del TST. | `✔ verbatim` |
| 29 | Amadeus | Enviar itinerario y documentos | `IBP-EMLA/LPSP`<br>`IEPJ-EMLA/LPSP`<br>`ITR-EMLA` | IBP = itinerario · IEPJ = itinerario y servicios · ITR = billetes electrónicos. | `✔ verbatim` |
| 29.1 | Resiber | Enviar documentos desde RESIBER | `ITP:/RESERVA/EMAIL`<br>`DTR TN 075-1234567890,EML/EMAIL`<br>`DEMR DN 075-1234567890,EML/EMAIL` | Itinerario · billetes electrónicos · EMD. | `✔ verbatim` |

## Lo que falta en el material

Estos puntos **no están en la fuente**. No los inventes: pregúntale
al instructor.

- Discrepancia de grafía del FQN entre este manual (FQN02PE) y el #3058 (FQN 02 * PE).
- El manual no explica qué es 'CV' (cupón value) ni por qué el importe se repite en F y en CV.
- No queda claro qué es el elemento SVC cuya línea pide TMC/L5.
- Falta el procedimiento hermano CON segmento volado.

