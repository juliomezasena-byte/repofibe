# Emisión LATAM General (primera emisión)

> **Generado automáticamente** desde
> `public/procedimientos/emision-latam.json`. No lo edites a mano: corrige
> el JSON y vuelve a correr `node scripts/generar-manual.mjs`.

**Aerolínea:** Iberia (075) · **Categoría:** emision · **Fuente:** IberiaNet Lite — #3058 "1. EMISION" (LATAM GENERAL)

Flujo completo de primera emisión: disponibilidad → venta → cotización → nombres → contactos → on hold → TST → pago PCI/Travel Pay → emisión → envío de documentos.

> ℹ️ Tabla PASO/PROCESO/TRANSACCIÓN/EXPLICACIÓN copiada directamente del manual en IberiaNet. Es la PRIMERA fuente oficial completa que entra al repo (las anteriores eran capturas sueltas o resúmenes de bot).

## Antes de empezar

- 🔴 Para TODAS las reservas de primera emisión, solo se realizarán reservas ON HOLD. El pasajero deberá finalizar el pago a través de IBERIA.COM.
- 🔴 No podemos emitir reservas con fecha de vuelo dentro de las siguientes 24 horas de la emisión. En ese caso se genera Pre-Reserva para pago en la WEB, teniendo en cuenta el tiempo límite para tomar el vuelo (máx 2 horas antes de la salida).
- 🟠 Si el pasajero no puede pagar por la web, se escala con un supervisor para pago durante la llamada con PCI Pal o Travel Pay.
- 🟠 Preguntar SIEMPRE al pasajero si necesita factura. Si la necesita, ver el manual de FACTURAS para LATAM.
- 🟡 Pago por depósito bancario o transferencia: la información de cuenta y oficinas está en 0.04LATAM/LATAM GENERAL/GENERALIDADES/FORMAS DE PAGO.

## Pasos

| # | Sistema | Proceso | Transacción | Explicación | Confianza |
|---|---|---|---|---|---|
| 1 | Amadeus | Buscar fechas de vuelo — solo ida | `AN 11MAR MADBOG`<br><sub>AN {fecha} {origen}{destino}</sub> | 11MAR = fecha · MADBOG = ruta de vuelo. | `✔ verbatim` |
| 1.1 | Amadeus | Buscar fechas — ida y vuelta | `AN 11MAR MADBOG * 23OCT`<br><sub>AN {fecha1} {origen}{destino} * {fecha2}</sub> | 11MAR = fecha de ida · MADBOG = ruta · 23OCT = fecha de regreso. | `✔ verbatim` |
| 1.2 | Amadeus | Buscar todas las clases ofertadas | `SN 11MAR MADBOG`<br><sub>SN {fecha} {origen}{destino}</sub> | Muestra todas las clases ofertadas de la ruta. | `✔ verbatim` |
| 1.3 *(opc.)* | Amadeus | PRO TIP — cambiar la fecha rápido | `MY`<br>`MN` | MY = al día anterior · MN = al día siguiente. | `✔ verbatim` |
| 2 | Amadeus | Seleccionar plazas — un solo vuelo | `SS 2 A 1`<br><sub>SS {plazas} {clase} {lineaVuelo}</sub> | 2 = cantidad de pasajeros · A = clase elegida · 1 = línea del vuelo elegida. | `✔ verbatim` |
| 2.1 | Amadeus | Seleccionar plazas — ida y vuelta | `SS 2 A 1 * S 11`<br><sub>SS {plazas} {claseIda} {lineaIda} * {claseVuelta} {lineaVuelta}</sub> | 2 = pasajeros · A = clase ida · 1 = línea ida · S = clase regreso · 11 = línea vuelta. | `✔ verbatim` |
| 2.2 | Amadeus | Seleccionar plazas — clases diferentes por vuelo | `SS 2 A S 1`<br><sub>SS {plazas} {claseVuelo1} {claseVuelo2} {lineaVuelo}</sub> | 2 = pasajeros · A = clase del vuelo uno · S = clase del vuelo dos · 1 = línea del vuelo elegida. | `✔ verbatim` |
| 3 | Amadeus | Cotizar los vuelos — adulto | `FXX/FF-OPTIMA`<br><sub>FXX/FF-{TARIFA}</sub> | OPTIMA = tarifa elegida. Familias — Turista: FF-BASIC, FF-OPTIMA, FF-COMFORT, FF-FLEX · Turista Premium: FF-PEOPTIMA, FF-PECOMFORT, FF-PEFLEX · Business: FF-BUSOPTIMA, FF-BUSCOMFORT, FF-BUSFLEX. | `✔ verbatim` |
| 3.1 | Amadeus | Cotizar — niño | `FXX/FF-OPTIMA/RCH`<br><sub>FXX/FF-{TARIFA}/RCH</sub> | CH = descuento CHILD. | `✔ verbatim` |
| 3.2 | Amadeus | Cotizar — infante | `FXX/FF-OPTIMA/RIN`<br><sub>FXX/FF-{TARIFA}/RIN</sub> | IN = descuento INFANTE. | `✔ verbatim` |
| 3.3 | Amadeus | Cotizar — varios tipos de pasajero a la vez | `FXX/FF-OPTIMA/RINADCH`<br><sub>FXX/FF-{TARIFA}/R{tipos}</sub> | IN = infante · AD = adulto · CH = child. El ADT también puede omitirse porque el sistema lo toma por defecto.<br><br>⚠️ Probado en vivo 07AGO26: FXX/FF-OPTIMA/RINADCH devolvió cotización correcta con 3 ADT + 1 CHD + 1 INF. La variante FXX/FF-OPTIMA/RCHINCH también funcionó. FXX/FF-OPTIMA/RCH/RIN (con barras separadas) da INVALID PASSENGER TYPE CODE. | `✔ verbatim` |
| 3.4 | Amadeus | Error *NO FARES/RBD/CARRIER/PASSENGER TYPE | `FXR/FF-OPTIMA` | El sistema indica que la tarifa no está disponible para las clases seleccionadas. Cambia las clases y recotiza reemplazando FXX por FXR. | `✔ verbatim` |
| 4 | Amadeus | Documentar los valores informados al cliente | `RM05MAR26PAX AVDO VALOR TKT X CHD xxx MXN, X ADT xxx MXN, X INF xxx MXN//AR`<br><sub>RM{fecha}PAX AVDO VALOR TKT X {tipo} {valor} {moneda}//{iniciales}</sub> | Deja constancia en el PNR de lo que se le informó al pasajero. | `✔ verbatim` |
| 5 | Amadeus | Buscar condiciones de tarifa | `FQN 02 * PE`<br><sub>FQN {lineaTarifa} * PE</sub> | 02 = línea de tarifa elegida · PE = constante.<br><br>⚠️ RESUELVE la discrepancia anterior: el manual oficial lleva el asterisco (FQN 02 * PE). El 'FQN01PE' sin asterisco que citó el bot EverGPT estaba mal transcrito. | `✔ verbatim` |
| 6 | Amadeus | Documentar las condiciones indicadas al cliente | `RM05MAR26PAX AVDO TKT NO REEMBOLSABLE, CHG PERMITIDOS CON PENTY 150 EUR //AR` | Constancia de las condiciones tarifarias comunicadas. | `✔ verbatim` |
| 7 | Amadeus | Agregar nombres — adulto | `NM1 MARTINEZ/PATROCLO`<br><sub>NM1 {APELLIDO}/{NOMBRE}</sub> | MARTINEZ = apellido del adulto. | `✔ verbatim` |
| 7.1 | Amadeus | Agregar nombres — child | `NM1 ALMANZA/JUAN(CHD/13FEB16)`<br><sub>NM1 {APELLIDO}/{NOMBRE}(CHD/{fechaNacimiento})</sub> | 13FEB16 = fecha de nacimiento del child. | `✔ verbatim` |
| 7.2 | Amadeus | Agregar nombres — adulto con infante | `NM1 PEREZ/SARA (INFPEREZ/LUCY/01JAN24)`<br><sub>NM1 {APELLIDO}/{NOMBRE} (INF{APELLIDO}/{NOMBRE}/{fechaNacimiento})</sub> | El infante va asociado al adulto en el mismo NM. SIN barra después de INF.<br><br>⚠️ Error real observado 07AGO26: un asistente IA sugirió 'NM1 LOPEZ/ANA(INF/LOPEZ/LUIS/10JAN25)' con barra extra tras INF. El manual NO lleva esa barra. | `✔ verbatim` |
| 7.3 *(opc.)* | Amadeus | Ingresar el número de Iberia Plus | `FFAIB-12345678`<br><sub>FFA{aerolinea}-{numeroViajeroFrecuente}</sub> | IB = IATA de la aerolínea del FF · 12345678 = número de viajero frecuente. | `✔ verbatim` |
| 8 | Amadeus | Incluir datos de contacto — correo | `APE- AB@AB.COM`<br>`SR CTCE- AB//AB.COM` | APE- = correo del cliente. SR CTCE- = el mismo correo reemplazando la @ por //. | `✔ verbatim` |
| 8.1 | Amadeus | Incluir datos de contacto — teléfono | `AP+ 3463232323`<br>`SR CTCM- 3463232323` | AP+ = número de teléfono. SR CTCM- = el mismo número como SSR de contacto móvil. | `✔ verbatim` |
| 9 | Amadeus | Establecer tiempo de emisión — ON HOLD | `TKXL 11MAR / 2300`<br><sub>TKXL {fecha} / {horaZulu}</sub> | 11MAR = fecha del día siguiente (24 hrs) · 2300 = hora zulú actual. | `✔ verbatim` |
| 9.1 | Amadeus | Tiempo de emisión — inmediata | `TKOK` | El pago se hará de forma inmediata mediante PCI o Travel, autorizado por un coach. | `✔ verbatim` |
| 9.2 | Amadeus | Tiempo de emisión — 72 horas | `TKTL 13MAR/2300`<br><sub>TKTL {fecha}/{horaZulu}</sub> | Solo bajo autorización de supervisor u otra área. 13MAR = fecha de emisión (48 o 72 hrs) · 2300 = hora zulú actual. | `✔ verbatim` |
| 10 | Amadeus | *** SOLO PARA PAGO WEB *** | `OS YY HBFF` | Guardamos con ER para obtener código de reserva. | `✔ verbatim` |
| 11 | Amadeus | Guardar la tarifa cotizada (crea el TST) | `FXP/FF-OPTIMA`<br><sub>FXP/FF-{TARIFA}</sub> | Aplica a ADT / CHD / INF. OPTIMA = tarifa elegida. | `✔ verbatim` |
| 11.1 | Amadeus | Si al guardar hay lista de opciones — seleccionar una | `FXT05/P1`<br><sub>FXT{opcion}/P{pasajero}</sub> | Para varias: FXT05/P1//06/P2. | `✔ verbatim` |
| 12 | Amadeus | Verificar que se haya creado la máscara TST | `TQT`<br>`TQT/T1` | TQT si hay un solo tipo de pasajero; TQT/T1 si hay varios tipos. Guardamos con ER. | `✔ verbatim` |
| 13 | Amadeus | Enviar itinerario | `IBP-EMLA/LPSP`<br>`IEPJ-EMLA/LPSP` | IBP = itinerario · IEPJ = itinerario y servicios · SP = idioma del cliente (español). EN CASO DE SER UNA RESERVA ON HOLD, ESTE ES EL ÚLTIMO PASO. | `✔ verbatim` |
| 14 | Amadeus | Incluir datos del titular de la tarjeta (nuevo Cyber) | `RMCSY/JUAN:PELAEZ`<br><sub>RMCSY/{NOMBRE}:{APELLIDO}</sub> | JUAN = nombre del titular de la tarjeta. | `✔ verbatim` |
| 15 | Amadeus | Incluir el gasto de gestión | `TTO/ST01/CSF/F650`<br><sub>TTO/ST01/CSF/F{gastoGestion}</sub> | Si hay varios TST: TTO/ST01/CSF/F650/T1, donde T1 = número del TST. Guardamos con ER. | `✔ verbatim` |
| 16 | IberiaNet / iberia.com | Tomar los datos de tarjeta | — | PCI Pal: EUROPA → FORMAS DE PAGO → PCI PAL. Travel Pay: EUROPA → FORMAS DE PAGO → TRAVEL PAY. | `✔ verbatim` |
| 17 | Amadeus | Agregar forma de pago | `FP MS-TT,VI1234567890123456-1023-V1234ABCD`<br><sub>FP {TOKEN}</sub> | TOKEN = copia la trama de PCI o Travel Pay. | `✔ verbatim` |
| 18 | Amadeus | Cargar el perfil de PCI en Amadeus | `$$CONFIG:CCTYPE/2` | Configura el perfil de tarjeta antes de cobrar. | `✔ verbatim` |
| 19 | Amadeus | Realizar el cargo a la tarjeta del cliente | `$$PAY` | Ejecuta el cobro. | `✔ verbatim` |
| 20 | Amadeus | Borrar el Cyber para poder emitir | `XE17`<br><sub>XE{linea}</sub> | 17 = línea donde esté el Cyber. | `✔ verbatim` |
| 21 | Amadeus | Emitir el billete | `TTP1/ET/RT` | Emisión final del billete electrónico. | `✔ verbatim` |
| 22 | Amadeus | Enviar documentos — billetes electrónicos (Amadeus) | `ITR-EMLA` | Itinerario: IBP-EMLA/LPSP · Itinerario y servicios: IEPJ-EMLA/LPSP · Billetes electrónicos: ITR-EMLA. | `✔ verbatim` |
| 22.1 | Resiber | Enviar itinerario desde RESIBER | `ITP:/RESERVA/EMAIL`<br><sub>ITP:/{reserva}/{email}</sub> | Variante si la reserva está abierta.<br><br>⚠️ PRIMERA sintaxis de Resiber confirmada VERBATIM en un manual oficial (antes solo la teníamos por resumen de bot). | `✔ verbatim` |
| 22.2 | Resiber | Enviar billetes electrónicos desde RESIBER | `DTR TN 075-1234567890,EML/EMAIL`<br><sub>DTR TN {numeroBillete},EML/{email}</sub> | Envía el billete electrónico por correo desde Resiber.<br><br>⚠️ CONFIRMA el 'DTR TN' que el bot EverGPT había citado para IBEX. La sintaxis del bot era correcta. | `✔ verbatim` |
| 22.3 | Resiber | Enviar EMD electrónicos desde RESIBER | `DEMR DN 075-1234567890,EML/EMAIL`<br><sub>DEMR DN {numeroEMD},EML/{email}</sub> | Envía el EMD por correo desde Resiber. | `✔ verbatim` |

## Errores comunes

**UNABLE TO PROCESS/SERVICES EXCEED NAMES**

Se venden más plazas de las que corresponden, o se añaden SSR sin asociar a pasajero. El INFANTE NO ocupa plaza: 2 ADT + 1 CHD + 1 INF = 3 plazas, no 4.<br><sub>Observado en vivo 07AGO26. Un asistente IA indicó SS4 y luego SS5 cuando lo correcto era SS3; el usuario detectó el error. No está listado como error en el manual.</sub>

**INVALID PASSENGER TYPE CODE al cotizar**

Separar los tipos de pasajero con barras (FXX/FF-OPTIMA/RCH/RIN) en vez de concatenarlos (FXX/FF-OPTIMA/RINADCH).<br><sub>Observado en vivo 07AGO26 contra el sistema real.</sub>

**WARNING - INFANT AGE MAY EXCEED FOR SOME SEGMENTS**

Validación de edad del infante contra la fecha de viaje.<br><sub>Es advertencia, no error: permite continuar si la fecha de nacimiento es válida. Observado en vivo, no documentado en el manual.</sub>

## Lo que falta en el material

Estos puntos **no están en la fuente**. No los inventes: pregúntale
al instructor.

- Falta el manual de FACTURAS para LATAM (referenciado en las advertencias).
- Falta el manual de NATIBA (el bot lo referencia como primera opción de creación de reservas).
- Falta 0.04LATAM/LATAM GENERAL/GENERALIDADES/FORMAS DE PAGO (datos de depósito/transferencia).
- Faltan los submanuales hermanos: ON HOLD 72 HRS (#3063), DESCUENTOS PANAMA (#3064), DESCUENTOS ECUADOR (#3065), ASOCIAR CHILD (#3066), ASOCIAR INFANTE (#3067), RESERVAS Y GASTO GESTION COLOMBIA (#3133), COMUNICACIONES CORTADAS LATAM (#3134).

