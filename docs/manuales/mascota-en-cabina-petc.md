# Mascota en Cabina (PETC) — Requisitos, Precios y Comandos (Amadeus y Resiber)

> **Generado automáticamente** desde
> `public/procedimientos/mascota-en-cabina-petc.json`. No lo edites a mano: corrige
> el JSON y vuelve a correr `node scripts/generar-manual.mjs`.

**Aerolínea:** Iberia (075) · **Categoría:** servicios · **Fuente:** IberiaNet Lite — #3116 "1. MASCOTA EN CABINA"

Procedimiento oficial #3116 de IberiaNet Lite para la solicitud de Mascota en Cabina (PETC) en billetes 075. Incluye requisitos de peso/transportín, tabla de precios por trayecto directo/conexión, y comparación de sintaxis exacta entre Amadeus y Resiber.

> ℹ️ Transcripción 100% fiel del manual oficial #3116 pegado por el usuario. Contiene sintaxis exacta para Resiber y Amadeus en 4 escenarios de PETC.

## Antes de empezar

- 🔴 ESTO SOLO APLICA PARA BILLETES 075 (IBERIA).
- 🔴 PESO MÁXIMO: 8 kg incluyendo el transportín. Dimensiones máximas: 45 x 35 x 25 cm (resistente, con ventilación, fondo impermeable y cierre seguro).
- 🔴 RESTRICCIÓN DE RAZA EN AEROPUERTO: No se aceptan registros como 'cruce', 'mestizo', 'criollo', 'común' o 'mezcla' a secas. Se debe especificar la raza exacta o la combinación de razas (ej: CRUCE CHIHUAHUA CON PINCHER).
- 🟠 FILA DE EMERGENCIA: No se permiten mascotas en asientos de fila de salida de emergencia. Viajan bajo el asiento delantero sin molestar a los demás.
- 🟠 GUARDADO EN RESIBER: Se guarda con ÑK y cada vez que se use ÑK se debe volver a ingresar a la reserva. En Amadeus se guarda con ER y se confirma con ERK.

## Pasos

| # | Sistema | Proceso | Transacción | Explicación | Confianza |
|---|---|---|---|---|---|
| 1 | Resiber | FASE RESIBER — 1. Verificar disponibilidad | `BSK/IB6458/17MAR`<br><sub>BSK/{placaVuelo}/{fecha}</sub> | BSK = comando disponibilidad mascota · IB6458 = vuelo · 17MAR = fecha. | `✔ verbatim` |
| 2 | Resiber | FASE RESIBER — 2. Documentar la información proporcionada al cliente | `INT IB PAX AVDO DOCUMENTOS A PRESENTAR EN APTO Y VALOR DEL SERVICIO PETC xxx EUR//AR` | Documenta la información entregada al cliente sobre requisitos y valor del servicio en Resiber. | `✔ verbatim` |
| 3 | Resiber | FASE RESIBER — 3. Solicitar servicio (1 sola mascota) | `SSR PETC YY NN1 DOG CHIHUAHUA 8KG 45X35X25/P1/S2`<br><sub>SSR PETC YY NN1 ESPECIE RAZA PESO DIMENSIONES/P{pasajero}/S{segmento}</sub> | Resiber exige segmento por segmento. YY NN1 = estatus · P1 = pasajero · S2 = segmento. | `✔ verbatim` |
| 3.1 | Resiber | FASE RESIBER — Solicitar servicio (>1 mascota en el mismo transportín) | `SSR PETC YY NN1 2DOG CHIHUAHUA 8KG 45X35X25/P1/S2`<br><sub>SSR PETC YY NN1 2{ESPECIE} RAZA PESO DIMENSIONES/P{pasajero}/S{segmento}</sub> | Indica la cantidad delante de la especie (ej: 2DOG). El peso total sumado no puede superar 8 kg. | `✔ verbatim` |
| 3.2 | Resiber | FASE RESIBER — Solicitar servicio (Mascota con cruce de razas) | `SSR PETC YY NN1 1DOG CRUCE CHIHUAHUA CON PINCHER 8KG 45X35X25/P1/S2`<br><sub>SSR PETC YY NN1 1{ESPECIE} CRUCE {RAZA1} CON {RAZA2} PESO DIMENSIONES/P{pasajero}/S{segmento}</sub> | El aeropuerto rechaza 'cruce' a secas. Debe detallarse la mezcla exacta. | `✔ verbatim` |
| 3.3 | Resiber | FASE RESIBER — Solicitar servicio (Origen/Destino DUB — Dublín) | `SSR PETC DOG CHIH TTL 8KG DIM 45X35X25CM/P1/S2`<br><sub>SSR PETC {ESPECIE} {RAZA_REDUCIDA} TTL {PESO} DIM {DIMENSIONES}CM/P{pasajero}/S{segmento}</sub> | Formato comprimido especial para itinerarios con origen o destino Dublín (DUB). | `✔ verbatim` |
| 4 | Resiber | FASE RESIBER — 4. Guardar la reserva | `ÑK` | En Resiber se guarda con ÑK. Importante: cada vez que usas ÑK debes volver a ingresar a la reserva. | `✔ verbatim` |
| 5 | Resiber | FASE RESIBER — 5. Enviar documentos desde Resiber | `ITP:/RESERVA/EMAIL`<br>`DTR TN 075-2534567890,EML/EMAIL`<br>`DEMR DN 075-2534567890,EML/EMAIL` | ITP para itinerario · DTR TN para e-ticket · DEMR DN para EMD. | `✔ verbatim` |
| 6 | Amadeus | FASE AMADEUS — 1. Verificar disponibilidad | `BSK/IB6458/17MAR`<br><sub>BSK/{placaVuelo}/{fecha}</sub> | Mismo comando de disponibilidad de plaza de mascota BSK en Amadeus. | `✔ verbatim` |
| 7 | Amadeus | FASE AMADEUS — 2. Documentar la información proporcionada al cliente | `RM10APR26PAX AVDO DOCUMENTOS A PRESENTAR EN APTO Y VALOR DEL SERVICIO PETC xxx EUR//AR` | Remark tipo RM con fecha, texto del aviso de documentos/precio e iniciales del agente. | `✔ verbatim` |
| 8 | Amadeus | FASE AMADEUS — 3. Solicitar servicio (1 sola mascota) | `SR PETC IB NN1 - DOG CHIHUAHUA 8KG 45X35X25/S2-3/P1`<br><sub>SR PETC IB NN1 - ESPECIE RAZA PESO DIMENSIONES/S{segmentos}/P{pasajero}</sub> | Amadeus permite rango de segmentos con guión (/S2-3/). Lleva el prefijo SR PETC IB NN1 -. | `✔ verbatim` |
| 8.1 | Amadeus | FASE AMADEUS — Solicitar servicio (>1 mascota en el mismo transportín) | `SR PETC IB NN1 - 2DOG CHIHUAHUA 8KG 45X35X25/S2-3/P1`<br><sub>SR PETC IB NN1 - 2{ESPECIE} RAZA PESO DIMENSIONES/S{segmentos}/P{pasajero}</sub> | Sintaxis para varias mascotas en un mismo transportín (máx 8 kg total sumado). | `✔ verbatim` |
| 8.2 | Amadeus | FASE AMADEUS — Solicitar servicio (Mascota con cruce de razas) | `SR PETC IB NN1 - 1DOG CRUCE CHIHUAHUA CON PINCHER 8KG 45X35X25/S2-3/P1`<br><sub>SR PETC IB NN1 - 1{ESPECIE} CRUCE {RAZA1} CON {RAZA2} PESO DIMENSIONES/S{segmentos}/P{pasajero}</sub> | Especifica el cruce exacto para evitar el rechazo del aeropuerto. | `✔ verbatim` |
| 8.3 | Amadeus | FASE AMADEUS — Solicitar servicio (Origen/Destino DUB — Dublín) | `SR PETC-DOG CHIH TTL 8KG DIM 45X35X25CM/S2-3/P1`<br><sub>SR PETC-{ESPECIE} {RAZA_REDUCIDA} TTL {PESO} DIM {DIMENSIONES}CM/S{segmentos}/P{pasajero}</sub> | Formato comprimido con guión unido PETC-DOG para ruta Dublín. | `✔ verbatim` |
| 9 | Amadeus | FASE AMADEUS — 4. Guardar y confirmar el servicio | `ER`<br>`ERK` | Guardamos con ER y confirmamos el servicio con ERK. | `✔ verbatim` |
| 10 | Amadeus | FASE AMADEUS — 5. Enviar documentos | `IBP-EMLA/LPSP`<br>`IEPJ-EMLA/LPSP`<br>`ITR-EMLA` | IBP = itinerario · IEPJ = itinerario y servicios · ITR = billetes electrónicos. | `✔ verbatim` |

