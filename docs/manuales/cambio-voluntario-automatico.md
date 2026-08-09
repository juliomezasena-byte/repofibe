# Cambio de vuelo VOLUNTARIO — automático

> **Generado automáticamente** desde
> `public/procedimientos/cambio-voluntario-automatico.json`. No lo edites a mano: corrige
> el JSON y vuelve a correr `node scripts/generar-manual.mjs`.

**Aerolínea:** Iberia (075) · **Categoría:** reemision · **Fuente:** IberiaNet Lite — #3111 "1. VOLUNTARIO" (hijo de #3107 "CAMBIOS DE VUELO")

Reemisión por cambio voluntario cuando el sistema SÍ devuelve cotización automática (FXF/FXE). Si no la devuelve, se pasa al manual de CAMBIO MANUAL.

> ℹ️ Hermano de #3638 (cambio INVOLUNTARIO). Comparten los pasos 1-4 y 19-22; se diferencian en el motor de cotización: aquí FXF/FXE, allí FXI.

## Antes de empezar

- 🔴 ANTES DE INICIAR: realiza el filtro de seguridad — APELLIDO + PNR.
- 🔴 PUNTO DE BIFURCACIÓN (paso 5): si el sistema respondió con una cotización, continúa con este manual. Si NO respondió con cotización, pasa a cambio-manual-sin-segmento-volado.json (#3121).
- 🟠 Si el billete está en CHECK-IN debes solicitar al supervisor retirarlo para poder continuar (antes del paso 8).

## Pasos

| # | Sistema | Proceso | Transacción | Explicación | Confianza |
|---|---|---|---|---|---|
| 0 | Natiba | Filtro de seguridad | — | APELLIDO + PNR.<br><br>**Bloqueante:** no continúes sin esto. | `✔ verbatim` |
| 1 | Amadeus | Colocar el TKT del ADT/CHD en FHE | `FHE 075-1422342526/P1`<br><sub>FHE {numeroBillete}/P{pasajero}</sub> | 075-142… = ticket del ADT o CHD · P1 = número del pax. | `✔ verbatim` |
| 1.1 | Amadeus | Colocar el TKT del INF en FHE | `FHE INF 075-1422342526/P1`<br><sub>FHE INF {numeroBillete}/P{pasajero}</sub> | P1 = número del ADT que va con el infante. | `✔ verbatim` |
| 2 *(opc.)* | Amadeus | Eliminar el TKT en FA (solo si aplica) | `XE 14`<br><sub>XE {lineaFA}</sub> | 14 = línea del elemento FA del pax. | `✔ verbatim` |
| 3 | Amadeus | Buscar fechas de vuelo | `AN 11MAR MADBOG`<br>`AN 11MAR MADBOG * 23OCT`<br>`SN 11MAR MADBOG` | PRO TIP: MY = día anterior · MN = día siguiente. | `✔ verbatim` |
| 4 | Amadeus | Seleccionar plazas | `SS 2 A 1`<br>`SS 2 A 1 * S 11`<br>`SS 2 A S 1` | Ida y vuelta con *. Clases diferentes por vuelo: SS 2 A S 1. | `✔ verbatim` |
| 5 | Amadeus | Cotizar los vuelos que el cliente va a volar — TKT en OPEN | `FXF/T23 /S2,3/R,UNDCIBAAPP,UP/FF-BASIC`<br><sub>FXF/T{lineasDeLosFHE}/S{segmentos}/R,UNDCIBAAPP,UP/FF-{TARIFA}</sub> | 2,3 = segmentos que el cliente va a volar. UNDCIBAAPP,UP es constante. | `✔ verbatim` |
| 5.1 | Amadeus | Cotizar — TKT en CK (check-in) | `FXF/TKT 075-1423456789/S2,3/R,UNDCIBAAPP,UP/P#/CK1`<br><sub>FXF/TKT {numeroBillete}/S{segmentos}/R,UNDCIBAAPP,UP/P{pax}/CK{cupon}</sub> | CK1 = número del cupón en check-in. | `✔ verbatim` |
| 5.2 | Amadeus | Si NO deja con las anteriores — un solo pasajero | `FXE/TKT 075-1423456789/S2,3/R,UNDCIBAAPP,UP/P#/FF-BASIC`<br><sub>FXE/TKT {numeroBillete}/S{segmentos}/R,UNDCIBAAPP,UP/P{pax}/FF-{TARIFA}</sub> | Alternativa cuando FXF falla. | `✔ verbatim` |
| 5.3 | Amadeus | Si NO deja con las anteriores — varios pasajeros | `FXE/T23,24 /S2,3/R,UNDCIBAAPP,UP/FF-BASIC`<br><sub>FXE/T{lineasDeLosFHE}/S{segmentos}/R,UNDCIBAAPP,UP/FF-{TARIFA}</sub> | Familias: Turista FF-BASIC/OPTIMA/COMFORT/FLEX · T.Premium FF-PEOPTIMA/PECOMFORT/PEFLEX · Business FF-BUSOPTIMA/BUSCOMFORT/BUSFLEX. | `✔ verbatim` |
| 5.4 | Amadeus | ⚖️ BIFURCACIÓN — ¿respondió con cotización? | — | SÍ respondió → continúa con este manual. NO respondió → continúa con el MANUAL DE CAMBIO MANUAL: #3121 SIN SEGMENTO VOLADO (cambio-manual-sin-segmento-volado.json), ya capturado.<br><br>**Bloqueante:** no continúes sin esto. | `✔ verbatim` |
| 6 | Amadeus | Documentar valores a cobrar | `RM24MAR26 PAX AVDO COSTE CHG 120250MXN X ADT INCYE SF, DF Y PENTY / WP` | SF = gasto de gestión · DF = diferencia de tarifa · PENTY = penalidad. | `✔ verbatim` |
| 7 | Amadeus | Eliminar TST | `TTE/ALL`<br>`TTE/T1` | TTE/ALL = todos · TTE/T{n} = uno específico. RECUERDA: si el billete está en CHECK-IN debes solicitar al supervisor retirarlo para poder continuar. | `✔ verbatim` |
| 8 | Amadeus | Guardar tarifa — si cotizaste con FXF (un pasajero) | `FXQ/TKT 075-1423456789/S2,3/R,UNDCIBAAPP,UP/P#/FF-BASIC`<br><sub>FXQ/TKT {numeroBillete}/S{segmentos}/R,UNDCIBAAPP,UP/P{pax}</sub> | FXF se guarda con FXQ. | `✔ verbatim` |
| 8.1 | Amadeus | Guardar tarifa — si cotizaste con FXF (varios pasajeros) | `FXQ/T23,24 /S2,3/R,UNDCIBAAPP,UP/FF-BASIC`<br><sub>FXQ/T{lineasDeLosFHE}/S{segmentos}/R,UNDCIBAAPP,UP</sub> | Por pasajero o varios a la vez. | `✔ verbatim` |
| 8.2 | Amadeus | Guardar tarifa — si cotizaste con FXE (un pasajero) | `FXO/TKT 075-1423456789/S2,3/R,UNDCIBAAPP,UP/P#/FF-BASIC`<br><sub>FXO/TKT {numeroBillete}/S{segmentos}/R,UNDCIBAAPP,UP/P{pax}/FF-{TARIFA}</sub> | FXE se guarda con FXO. Regla mnemotécnica: FXF→FXQ, FXE→FXO. | `✔ verbatim` |
| 8.3 | Amadeus | Guardar tarifa — si cotizaste con FXE (varios pasajeros) | `FXO/T23,24 /S2,3/R,UNDCIBAAPP,UP/FF-BASIC`<br><sub>FXO/T{lineasDeLosFHE}/S{segmentos}/R,UNDCIBAAPP,UP</sub> | Guardar cambios hasta el momento con ER. | `✔ verbatim` |
| 9 | Amadeus | Verificar los TST | `TQT`<br>`TQT/T3` | 3 = número del TST.<br><br>⚠️ ⚠️ ERRATA EN EL MANUAL: la columna TRANSACCIÓN dice TQT/T3 pero la columna EXPLICACIÓN escribe "TTQ/T TST" — con las letras cambiadas. El comando correcto es TQT (así aparece también en #3058 paso 12). Se preserva la errata como aviso. | `✔ verbatim` |
| 9.1 | Amadeus | Verificar los TSM | `TQM`<br>`TQM/M1` | 1 = número del TSM. | `✔ verbatim` |
| 10 | Amadeus | Eliminar todas las FP | `XE 22`<br><sub>XE {lineaFP}</sub> | 22 = línea del elemento FP. | `✔ verbatim` |
| 11 | Amadeus | Incluir el gasto de gestión | `TTO/ST01/CSF/F3500`<br>`TTO/ST01/CSF/F3500/T2` | T2 = número del TST cuando hay varios. PRO TIP: consulta con TQO si el importe quedó agregado. Si quedó mal: TTO/ST01/T{numeroTST} lo elimina y se vuelve a cargar. | `✔ verbatim` |
| 11.1 *(opc.)* | Amadeus | PRO TIP — comprobar que el gasto de gestión quedó agregado | `TQO` | Consulta si el importe está agregado. | `✔ verbatim` |
| 11.2 *(opc.)* | Amadeus | Eliminar el gasto de gestión si quedó mal (y volverlo a cargar) | `TTO/ST01/T2`<br><sub>TTO/ST01/T{numeroTST}</sub> | Lo elimina para poder recargarlo con TTO/ST01/CSF/F... | `✔ verbatim` |
| 12 | Amadeus | Incluir datos del titular de la tarjeta (nuevo Cyber) | `RMCSY/JUAN:PELAEZ`<br><sub>RMCSY/{NOMBRE}:{APELLIDO}</sub> | Guardamos con ER. | `✔ verbatim` |
| 13 | IberiaNet / iberia.com | Tomar los datos de tarjeta | — | PCI Pal: EUROPA → FORMAS DE PAGO → PCI PAL. Travel Pay: EUROPA → FORMAS DE PAGO → TRAVEL PAY. | `✔ verbatim` |
| 14 | Amadeus | Forma de pago del TST (diferencia de tarifa y gasto de gestión) | `FP O/CCVI+/MS-TT,VI1234567890123456-1023-V1234ABCD`<br><sub>FP O/CCVI+/{token}</sub> | El token se copia de PCI o Travel Pay.<br><br>⚠️ CUARTA aparición de CCVI+ en fuentes oficiales. El 'CCSVI+' del bot EverGPT queda definitivamente descartado. | `✔ verbatim` |
| 15 | Amadeus | Forma de pago del TSM (penalidad) | `TMI/M1/FP-MS-TT,VI1234567890123456-1023-V1234ABCD`<br><sub>TMI/M{tsm}/FP-{token}</sub> | La penalidad se cobra en el TSM, aparte del TST. | `✔ verbatim` |
| 16 | Amadeus | Cargar el perfil de PCI en Amadeus | `$$CONFIG:CCTYPE/2` | Configura el perfil de tarjeta antes de cobrar. | `✔ verbatim` |
| 17 | Amadeus | Realizar el cargo a la tarjeta del cliente | `$$PAY` | Ejecuta el cobro. | `✔ verbatim` |
| 18 | Amadeus | Borrar el Cyber para poder emitir | `XE17`<br><sub>XE{linea}</sub> | 17 = línea donde esté el Cyber. | `✔ verbatim` |
| 19 | Amadeus | Reconfirmar el itinerario al cliente | — | Paso de comunicación, sin transacción. | `✔ verbatim` |
| 20 | Amadeus | Eliminar las plazas que el cliente NO va a usar | `XE 14`<br><sub>XE {lineaSegmentos}</sub> | 14 = línea de los segmentos. | `✔ verbatim` |
| 21 | Amadeus | Emitir penalidad y billete AL TIEMPO | `TTP1/TTM/T2/M1/ET/RT`<br><sub>TTP1/TTM/T{tst}/M{tsm}/ET/RT</sub> | T2 = número del TST · M1 = número del TSM. | `✔ verbatim` |
| 21.1 | Amadeus | Emitir SOLO la penalidad | `TTM1/M1/RT`<br><sub>TTM1/M{tsm}/RT</sub> | M1 = número del TSM. | `✔ verbatim` |
| 21.2 | Amadeus | Emitir SOLO el billete | `TTP1/ET/RT/T2`<br><sub>TTP1/ET/RT/T{tst}</sub> | T2 = número del TST.<br><br>⚠️ El manual escribe 'TTP1/ET/RT/T2' en la columna TRANSACCIÓN y 'TTP1/T2/ET/RT' en la EXPLICACIÓN — mismo baile de orden que en #3638. Se preserva la columna TRANSACCIÓN. | `✔ verbatim` |
| 22 | Amadeus | Enviar itinerario y documentos | `IBP-EMLA/LPSP`<br>`IEPJ-EMLA/LPSP`<br>`ITR-EMLA` | IBP = itinerario · IEPJ = itinerario y servicios · ITR = billetes electrónicos. | `✔ verbatim` |
| 22.1 | Resiber | Enviar documentos desde RESIBER | `ITP:/RESERVA/EMAIL`<br>`DTR TN 075-1234567890,EML/EMAIL`<br>`DEMR DN 075-1234567890,EML/EMAIL` | Itinerario · billetes electrónicos · EMD. | `✔ verbatim` |

## Lo que falta en el material

Estos puntos **no están en la fuente**. No los inventes: pregúntale
al instructor.

- Qué significa exactamente la constante 'UNDCIBAAPP,UP'.
- Cómo se sabe si el billete está en OPEN o en CK antes de elegir el motor.
- El manual de CAMBIO MANUAL (#3112, 3 hijos) al que deriva la bifurcación del paso 5.

