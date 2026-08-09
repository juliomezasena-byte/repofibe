# Cambio de vuelo MANUAL — CON segmento volado

> **Generado automáticamente** desde
> `public/procedimientos/cambio-manual-con-segmento-volado.json`. No lo edites a mano: corrige
> el JSON y vuelve a correr `node scripts/generar-manual.mjs`.

**Aerolínea:** Iberia (075) · **Categoría:** reemision · **Fuente:** IberiaNet Lite — #3113 "2. CON SEGMENTO VOLADO" (hijo de #3112 CAMBIO MANUAL)

Reemisión manual cuando el pasajero YA voló algún tramo. Se cotiza con FQD/FQP (no FXX) y hay que MONTAR el TST a mano en modo cryptic: fare basis, NVB/NVA, equipaje, importes, tasas y fare calculation.

> ℹ️ Hermano de #3121 (SIN segmento volado). CIERRA el árbol de reemisión: era la última rama que faltaba. Diferencia central: sin segmento volado se cotiza con FXX y el TST se genera solo; con segmento volado se cotiza con FQD/FQP y el TST se MONTA a mano.

## Antes de empezar

- 🔴 ANTES DE TODO: verifica el valor del gasto de gestión en IberiaNet → MANUALES EXPRESS → GASTOS DE GESTIÓN.
- 🔴 Las transacciones FQD y FQP se lanzan DESDE EL BILLETE, no desde el PNR.
- 🟠 Si hay diferentes tipos de pasajero, al cotizar con FQP hay que añadir al final /R{TIPO DE DESCUENTO}, por ejemplo /RCHADIN.
- 🟠 Si al colocar el TST en cryptic (TQTC) no abre la lista de opciones, hay que volver a abrir el FQP y reseleccionar con FQQ.

## Pasos

| # | Sistema | Proceso | Transacción | Explicación | Confianza |
|---|---|---|---|---|---|
| 0 | IberiaNet / iberia.com | Verificar el valor del gasto de gestión | — | IberiaNet → MANUALES EXPRESS → GASTOS DE GESTIÓN.<br><br>**Bloqueante:** no continúes sin esto. | `✔ verbatim` |
| 1 | Amadeus | Abrir el TKT y copiar el FAREBASIS, el DOI y el valor total | `TWD/TKT 075-1422342526`<br>`TWD/L16`<br><sub>TWD/TKT {numeroBillete}</sub> | Del billete se necesitan tres datos: fare basis, DOI (fecha de emisión original) y valor total. | `✔ verbatim` |
| 2 | IberiaNet / iberia.com | [PENALIDAD] Buscar el valor de la penalidad desde iberia.com | — | WWW.IBERIA.COM → TUS VUELOS → GESTIONA TU RESERVA → TUS VUELOS. | `✔ verbatim` |
| 2.1 | Amadeus | [PENALIDAD] Cotizar con FQD (un solo tramo) | `FQDMADBOG/AIB/CN/D10MAR/R,01DEC23,UP`<br><sub>FQD{ORG}{DEST}/A{aerolinea}/C{clase}/D{fechaVuelo}/R,{DOI},UP</sub> | MAD = origen · BOG = destino · IB = aerolínea que opera · N = clase del segmento · 10MAR = fecha del vuelo · 01DEC23 = fecha de emisión. | `✔ verbatim` |
| 2.2 | Amadeus | [PENALIDAD] Cotizar con FQP — roundtrip DIRECTO | `FQPBOG/AIB/CS/D14FEBMAD-/AIB/CN/D10MARBOG/R,01DEC23,UP/FF-BASIC`<br><sub>FQP{ORG}/A{aerolinea}/C{claseIda}/D{fechaIda}{DEST}-/A{aerolinea}/C{claseVuelta}/D{fechaVuelta}{DEST}/R,{DOI},UP/FF-{TARIFA}</sub> | El guion (-) separa la ida del regreso. El UP marca que es cotización a histórico para penalidad. | `✔ verbatim` |
| 2.3 | Amadeus | [PENALIDAD] Cotizar con FQP — roundtrip con ESCALA | `FQPBOG/AIB/CS/D14FEBMADLHR-/AIB/CN/D10MARMADBOG/R,01DEC23,UP/FF-BASIC`<br><sub>FQP{ORG}/A{aerolinea}/C{clase}/D{fecha}{ESCALA}{DEST}-/A{aerolinea}/C{clase}/D{fecha}{ESCALA}{DEST}/R,{DOI},UP/FF-{TARIFA}</sub> | La escala va PEGADA entre la fecha y el destino: D14FEB **MAD** LHR. | `✔ verbatim` |
| 2.4 | Amadeus | [PENALIDAD] Cotizar con FQP — roundtrip SURFACE | `FQPBOG/AIB/CS/D14FEBMAD---LHR/AIB/CN/D10MARMADBOG/R,01DEC23,UP/FF-BASIC`<br><sub>FQP{ORG}/A{aerolinea}/C{clase}/D{fecha}{DEST}---{ORG2}/A{aerolinea}/C{clase}/D{fecha}{ESCALA}{DEST}/R,{DOI},UP/FF-{TARIFA}</sub> | Los TRES guiones (---) marcan el tramo por superficie: el pasajero llega a MAD y sale desde LHR por su cuenta. | `✔ verbatim` |
| 2.5 | Amadeus | [PENALIDAD] PRO TIP — seleccionar una de las tarifas ofertadas | `FQQ01`<br><sub>FQQ{numeroOpcion}</sub> | Estas transacciones (FQD y FQP) deben realizarse DESDE EL BILLETE. | `✔ verbatim` |
| 3 | Amadeus | [PENALIDAD] Verificar penalidad — ADULTO | `FQN02*PE`<br><sub>FQN{lineaOfertada}*PE</sub> | 02 = número de tarifa ofertada.<br><br>⚠️ CORREGIDO 08AGO26 por el usuario (agente Iberia en activo): el FQN SIEMPRE lleva asterisco. El manual escribe "FQN02PE" sin el, pero es una ERRATA DE TRANSCRIPCION del propio manual — el sistema exige FQN{linea}*PE. Se preserva la grafia del manual en "comandoSegunManual" para no perder la trazabilidad. | `✔ verbatim` |
| 3.1 | Amadeus | [PENALIDAD] Verificar penalidad — CHILD e INFANTE | `FQN02CD`<br><sub>FQN{lineaOfertada}CD</sub> | Muestra el DESCUENTO que aplica a cada tipo de pasajero.<br><br>⚠️ PENDIENTE: el usuario confirmo que el PE siempre lleva asterisco; falta confirmar si la variante CD (child/infante) tambien lo lleva (FQN02*CD). | `✔ verbatim` |
| 3.2 | Amadeus | [PENALIDAD] Aplicar el descuento con la calculadora | `DF 150 P 75`<br><sub>DF {penalidadADT} P {porcentajeDescuento}</sub> | 150 = penalidad del ADT · 75 = valor del descuento. | `✔ verbatim` |
| 4 | Amadeus | [PENALIDAD] Documentar valores a cobrar | `RM02MAR26 PAX AVDO COSTE PENTY 3279MXN X ADT + 680MXN SF / WP` | PENTY = penalidad · SF = gasto de gestión. | `✔ verbatim` |
| 7 | Amadeus | [DIFERENCIA] Cotizar la ruta nueva — roundtrip DIRECTO | `FQPBOG/AIB/CS/D14FEBMAD-/AIB/CN/D31MARBOG/R,01DEC23/FF-BASIC`<br><sub>FQP{ORG}/A{aerolinea}/C{clase}/D{fecha}{DEST}-/A{nuevaAerolinea}/C{nuevaClase}/D{nuevaFecha}{DEST}/R,{DOI}/FF-{TARIFA}</sub> | Igual que la penalidad pero SIN el UP y con los datos NUEVOS del tramo que cambia.<br><br>⚠️ La diferencia con el paso 2.2 es sutil y crítica: penalidad lleva ',UP' y diferencia NO. | `✔ verbatim` |
| 7.1 | Amadeus | [DIFERENCIA] Cotizar la ruta nueva — con ESCALA | `FQPBOG/AIB/CS/D14FEBMADLHR-/AIB/CN/D31MARMADBOG/R,01DEC23/FF-BASIC`<br><sub>FQP{ORG}/…{ESCALA}{DEST}-/…/R,{DOI}/FF-{TARIFA}</sub> | Misma estructura que 2.3 pero sin UP. | `✔ verbatim` |
| 7.2 | Amadeus | [DIFERENCIA] Cotizar la ruta nueva — SURFACE | `FQPBOG/AIB/CS/D14FEBMAD---LHR/AIB/CN/D31MARMADBOG/R,01DEC23/FF-BASIC`<br><sub>FQP{ORG}/…{DEST}---{ORG2}/…/R,{DOI}/FF-{TARIFA}</sub> | Misma estructura que 2.4 pero sin UP. | `✔ verbatim` |
| 7.3 | Amadeus | [DIFERENCIA] Varios tipos de pasajero | `FQPBOG/AIB/CS/D14FEBMAD-/AIB/CN/D31MARBOG/RCHADIN,01DEC23/FF-BASIC`<br><sub>…/R{tiposDescuento},{DOI}/FF-{TARIFA}</sub> | IMPORTANTE: si hay diferentes tipos de pasajero, se añade /R{TIPO} antes del DOI. CH = child · AD = adulto · IN = infante. | `✔ verbatim` |
| 7.4 | Amadeus | [DIFERENCIA] Error *NO FARES/RBD/CARRIER/PASSENGER TYPE | `FXR` | La tarifa no está disponible para las clases seleccionadas. Cambia las clases y recotiza reemplazando FXX por FXR. | `✔ verbatim` |
| 8 | Amadeus | [DIFERENCIA] Seleccionar una de las tarifas ofertadas | `FQQ01`<br><sub>FQQ{numeroOpcion}</sub> | Fija la opción con la que se va a trabajar. | `✔ verbatim` |
| 9 | Amadeus | [DIFERENCIA] Calcular la diferencia de tarifa | `DF 1890 - 1750`<br><sub>DF {cotizacionNueva} - {valorTktOriginal}</sub> | Diferencia = valor de cotización nueva − valor del TKT original. | `✔ verbatim` |
| 10 | Amadeus | [DIFERENCIA] Documentar valores a cobrar | `RM02MAR26 PAX AVDO COSTE PENTY 3279MXN X ADT + 604 MXN SF + 2853MXN DF/ WP`<br>`RM02MAR26 PAX AVDO COSTE TOTAL CMB 6736MXN/ WP` | DF = diferencia de tarifa · CMB = coste total del cambio. Guardar con ER. | `✔ verbatim` |
| 11 | Amadeus | Eliminar TST | `TTE/ALL`<br>`TTE/T1` | TTE/ALL = todos · TTE/T{n} = uno específico. | `✔ verbatim` |
| 12 | Amadeus | Eliminar todas las FP | `XE 22`<br><sub>XE {lineaFP}</sub> | 22 = línea del elemento FP. | `✔ verbatim` |
| 13 | Amadeus | Crear la máscara del TST | `TTC/S5`<br><sub>TTC/S{lineaSegmentos}</sub> | S5 = línea de los segmentos. Aquí empieza el montaje manual del TST. | `✔ verbatim` |
| 14 | Amadeus | Colocar el TST en modo CRYPTIC | `TQTC` | PRO TIP: si no abre una lista de opciones, hay que abrir de nuevo el FQP y volver a la opción con FQQ 01. | `✔ verbatim` |
| 15 | Amadeus | Agregar el FAREBASIS, el NVB-NVA y las piezas de equipaje | `TTI/T2/L1/B AANNOB2/V 31MAR31MAR/A1PC`<br><sub>TTI/T{tst}/L{linea}/B {fareBasis}/V {NVB}{NVA}/A{equipaje}</sub> | T2 = nº del TST · L1 = línea que montaremos · AANNOB2 = fare basis · 31MAR31MAR = NVB y NVA · 1PC = piezas de equipaje. Guardar con ER y volver a FQQ 01. | `✔ verbatim` |
| 16 | Amadeus | Agregar el FARE, el equivalente, las tasas y la diferencia | `TTI/T2/RUSD1243/EEUR1243/O130YQ/O28.38JD/…/T140`<br><sub>TTI/T{tst}/R{monedaFare}{importe}/E{monedaEquiv}{importe}/O{tasa}/O{tasa}/…/T{diferencia}</sub> | USD1243 = fare · EUR1243 = equivalente · O130YQ = tasas pagadas · T140 = diferencia de tarifa. Guardar con ER y volver a FQQ 01. | `✔ verbatim` |
| 17 | Amadeus | Agregar el FARE CALCULATION | `TTI/T2/C BOG IB X/MAD…`<br><sub>TTI/T{tst}/C {fareCalculation}</sub> | Se copia la cadena de construcción tarifaria (la línea FC del billete). | `✔ verbatim` |
| 18 | Amadeus | Crear el FO para ADT y CHD | `FOL14/P1`<br><sub>FOL{lineaTicket}/P{pasajero}</sub> | 14 = línea del ticket · P1 = número de pasajero. | `✔ verbatim` |
| 18.1 | Amadeus | Crear el FO para INFANTE | `FOINF*L15/P1`<br><sub>FOINF*L{lineaTicket}/P{pasajero}</sub> | Guardar con ER. | `✔ verbatim` |
| 19 | Amadeus | Solicitar el TSM (donde vivirá la penalidad) | `IU IB NN1 PENF BOG/P1`<br><sub>IU IB NN1 PENF {origenDelCambio}/P{pasajero}</sub> | BOG = origen del cambio · P1 = número de pasajero. | `✔ verbatim` |
| 20 | Amadeus | Crear el EMD para ADT | `TMC/L5`<br><sub>TMC/L{lineaElementoSVC}</sub> | L5 = línea del elemento SVC. | `✔ verbatim` |
| 20.1 | Amadeus | Crear el EMD para INFANTE | `TMC/L6/INF`<br><sub>TMC/L{lineaElementoSVC}/INF</sub> | Igual pero marcando INF. | `✔ verbatim` |
| 21 | Amadeus | Verificar que se haya creado la máscara TSM | `TQM`<br>`TQM/M1` | TQM si hay un solo tipo de pasajero · TQM/M{n} si hay varios. | `✔ verbatim` |
| 22 | Amadeus | Ingresar el valor de la penalidad y el cupón value | `TMI/M1/F3279/CV-3279`<br><sub>TMI/M{tsm}/F{penalidad}/CV-{penalidad}</sub> | El valor va DOS veces: como importe (F) y como cupón value (CV). Guardar con ER. | `✔ verbatim` |
| 23 | Amadeus | Incluir el gasto de gestión | `TTO/ST01/CSF/F604`<br>`TTO/ST01/CSF/F604/T2`<br><sub>TTO/ST01/CSF/F{gastoGestion}</sub> | T2 = número del TST cuando hay varios. | `✔ verbatim` |
| 23.1 *(opc.)* | Amadeus | PRO TIP — comprobar que el gasto quedó agregado | `TQO` | Consulta si el importe está agregado. | `✔ verbatim` |
| 23.2 *(opc.)* | Amadeus | Eliminar el gasto de gestión si quedó mal | `TTO/ST01/T2`<br><sub>TTO/ST01/T{numeroTST}</sub> | Lo elimina para volver a cargarlo. | `✔ verbatim` |
| 24 | Amadeus | Incluir datos del titular de la tarjeta (nuevo Cyber) | `RMCSY/JUAN:PELAEZ`<br><sub>RMCSY/{NOMBRE}:{APELLIDO}</sub> | Guardamos con ER. | `✔ verbatim` |
| 25 | IberiaNet / iberia.com | Tomar los datos de tarjeta | — | PCI Pal o Travel Pay: EUROPA → FORMAS DE PAGO. | `✔ verbatim` |
| 26 | Amadeus | Forma de pago del TST (diferencia de tarifa y gasto de gestión) | `FP O/CCVI+/MS-TT,VI1234567890123456-1023-V1234ABCD`<br><sub>FP O/CCVI+/{token}</sub> | El token se copia de PCI o Travel Pay. | `✔ verbatim` |
| 27 | Amadeus | Forma de pago del TSM (penalidad) | `TMI/M1/FP-MS-TT,VI1234567890123456-1023-V1234ABCD`<br><sub>TMI/M{tsm}/FP-{token}</sub> | La penalidad se cobra en el TSM, aparte del TST. | `✔ verbatim` |
| 28 | Amadeus | Cargar el perfil de PCI en Amadeus | `$$CONFIG:CCTYPE/2` | Configura el perfil de tarjeta antes de cobrar. | `✔ verbatim` |
| 29 | Amadeus | Realizar el cargo a la tarjeta del cliente | `$$PAY` | Ejecuta el cobro. | `✔ verbatim` |
| 30 | Amadeus | Borrar el Cyber para poder emitir | `XE17`<br><sub>XE{linea}</sub> | 17 = línea donde esté el Cyber. | `✔ verbatim` |
| 31 | Amadeus | Reconfirmar el itinerario al cliente | — | Paso de comunicación, sin transacción. | `✔ verbatim` |
| 32 | Amadeus | Eliminar las plazas que el cliente NO va a usar | `XE 14`<br><sub>XE {lineaSegmentos}</sub> | 14 = línea de los segmentos. | `✔ verbatim` |
| 33 | Amadeus | Emitir penalidad y billete AL TIEMPO | `TTP1/TTM/T2/M1/ET/RT`<br><sub>TTP1/TTM/T{tst}/M{tsm}/ET/RT</sub> | T2 = número del TST · M1 = número del TSM. | `✔ verbatim` |
| 33.1 | Amadeus | Emitir SOLO la penalidad | `TTM1/M1/RT`<br><sub>TTM1/M{tsm}/RT</sub> | M1 = número del TSM. | `✔ verbatim` |
| 33.2 | Amadeus | Emitir SOLO el billete | `TTP1/ET/RT/T2`<br><sub>TTP1/ET/RT/T{tst}</sub> | T2 = número del TST. | `✔ verbatim` |
| 34 | Amadeus | Enviar itinerario y documentos | `IBP-EMLA/LPSP`<br>`IEPJ-EMLA/LPSP`<br>`ITR-EMLA` | IBP = itinerario · IEPJ = itinerario y servicios · ITR = billetes electrónicos. | `✔ verbatim` |
| 34.1 | Resiber | Enviar documentos desde RESIBER | `ITP:/RESERVA/EMAIL`<br>`DTR TN 075-1234567890,EML/EMAIL`<br>`DEMR DN 075-1234567890,EML/EMAIL` | Itinerario · billetes electrónicos · EMD. | `✔ verbatim` |

## Lo que falta en el material

Estos puntos **no están en la fuente**. No los inventes: pregúntale
al instructor.

- El manual salta del paso 4 al 7 (no hay pasos 5 ni 6 en la numeración original). Se preserva la numeración del manual.
- El enlace de Google Apps Script del encabezado no se ha abierto ni verificado.
- No explica qué es el elemento SVC cuya línea pide TMC/L5.
- No explica de dónde se copia exactamente el FARE CALCULATION del paso 17.

