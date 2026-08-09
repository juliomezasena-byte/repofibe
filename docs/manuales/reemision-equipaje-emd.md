# Reemisión de Equipaje (EMD) — Resiber y Amadeus

> **Generado automáticamente** desde
> `public/procedimientos/reemision-equipaje-emd.json`. No lo edites a mano: corrige
> el JSON y vuelve a correr `node scripts/generar-manual.mjs`.

**Aerolínea:** Iberia (075) · **Categoría:** equipaje · **Fuente:** IberiaNet Lite — #3106 "1. REMISION DE EQUIPAJES"

Procedimiento oficial #3106 de IberiaNet Lite para la reemisión/remisión de EMDs de equipaje (XBAG / C0IJ) tanto en Resiber (consola WEMD) como en Amadeus (TMI/EXCH, FO, FP-O/CCVI+).

> ℹ️ Transcripción 100% fiel del manual oficial #3106. Define la operativa en Resiber (WEMD, DTR TN, DEMR DN) y en Amadeus (EWD/EMD, FXH/R, FXG/R, TMI/EXCH, FO, FP-O/CCVI+, TTM1).

## Antes de empezar

- 🔴 ANTES DE INICIAR EN AMADEUS: Recuerda eliminar los TSM anteriores con TMX/ALL.
- 🔴 PRO TIP: Verificar siempre el valor del EMD original antes de procesar la remisión.
- 🟠 RESIBER CONSOLA WEMD: El tipo de servicio para equipaje interlineal es C0IJ INTERLINE EXCESS BAGGAGE. En FP se incluye O/MS-TT y el valor Total 0.00 si no hay diferencia.
- 🟠 AMADEUS CONEXIÓN FO Y TMI: El FO del EMD se construye con el formato TMI/MTSM/FO-075-EMD M# POI DOI / IOI. La forma de pago a coste 0 usa TMI/M1/FP-O/CCVI+.

## Pasos

| # | Sistema | Proceso | Transacción | Explicación | Confianza |
|---|---|---|---|---|---|
| 1 | Resiber | FASE RESIBER — 1. Buscar EMDs OPEN en el billete anterior | `DTR TN 075-2531234567`<br><sub>DTR TN {numeroTicket}</sub> | Busca los EMDs OPEN que estarán en el billete anterior (el cual aparecerá en EXCH). | `✔ verbatim` |
| 2 | Resiber | FASE RESIBER — 2. Verificar el valor y estatus de cada EMD | `DEMR DN 0754013668261`<br><sub>DEMR DN {numeroEMD}</sub> | Muestra el estatus de los cupones y el valor pagado originalmente por el servicio. | `✔ verbatim` |
| 3 | Resiber | FASE RESIBER — 3. Ingresar a la consola WEMD | `WEMD: 075-2000635369`<br><sub>WEMD: {numeroTicketOpen}</sub> | Ingresa a la consola WEMD. Dentro de la máscara busca la lista de servicio, marca X y da INTRO. | `✔ verbatim` |
| 4 | Resiber | FASE RESIBER — 4. Seleccionar el tipo de servicio | — | Seleccionar C0IJ INTERLINE EXCESS BAGGAGE marcando con una X. | `✔ verbatim` |
| 5 | Resiber | FASE RESIBER — 5. Verificar y cargar los campos de la máscara WEMD | — | Tipo de servicio: C0IJ · PC: 1PC · RMK: Motivo de la remisión · Segmentos: Marcar X en los cupones del nuevo billete · FARE: Importe pagado originalmente · FP: O/MS-TT · OI: EMD original marcando cupón (M12...) · Total: 0.00 (si no hay diferencia). | `✔ verbatim` |
| 6 | Resiber | FASE RESIBER — 6. Verificar el billete con EMDs asociados y enviar | `DTR TN 075-2531234567`<br>`ITP:/RESERVA/EMAIL`<br>`DTR TN 075-2534567890,EML/EMAIL`<br>`DEMR DN 075-2534567890,EML/EMAIL` | Verificar billete y enviar itinerario / billetes / EMDs. | `✔ verbatim` |
| 7 | Amadeus | FASE AMADEUS — PRO TIP: Eliminar TSM anteriores | `TMX/ALL` | Elimina todas las máscaras TSM previas antes de iniciar la reemisión. | `✔ verbatim` |
| 8 | Amadeus | FASE AMADEUS — 1. Leer EMDs originales | `EWD/EMD075-454545445`<br><sub>EWD/EMD{numeroEMD}</sub> | Ingresa al EMD original y copia: número de EMD, POI, DOI, IOI y número de cupón desde el que se hará la revalidación (M#). | `✔ verbatim` |
| 9 | Amadeus | FASE AMADEUS — 2. Solicitar el servicio de equipaje | `SR XBAG/S2,3/P1`<br>`SR XBAG/S2,3` | Solicita el servicio XBAG para el/los pasajeros y segmentos elegidos. | `✔ verbatim` |
| 10 | Amadeus | FASE AMADEUS — 3. Cotizar a histórico | `FXH/L14/R,11MAR26,UP`<br><sub>FXH/L{lineaSsr}/R,{DOI},UP</sub> | L14 = línea del SSR XBAG · 11MAR26 = fecha de emisión del DOI. | `✔ verbatim` |
| 11 | Amadeus | FASE AMADEUS — 4. Guardar la cotización a histórico (crear TSM) | `FXG/L14/R,11MAR26,UP`<br><sub>FXG/L{lineaSsr}/R,{DOI},UP</sub> | Guarda el TSM cotizado a histórico. Guardamos con ER y confirmamos con ERK. | `✔ verbatim` |
| 12 | Amadeus | FASE AMADEUS — 5. Colocar el TSM en modo reemisión | `TMI/EXCH/M2`<br><sub>TMI/EXCH/M{numeroTsm}</sub> | M2 = número del TSM. Coloca la máscara en estado EXCH. | `✔ verbatim` |
| 13 | Amadeus | FASE AMADEUS — 6. Crear el FO (linking) para el EMD | `TMI/M3/FO-075-5551234567M1MAD11MAR26/023045`<br><sub>TMI/M{numeroTsm}/FO-075-{numeroEmd}M{cupon}{POI}{DOI}/{IOI}</sub> | M3 = TSM · 075-5551234567 = número EMD · M1 = cupón OPEN · MAD = POI · 11MAR26 = DOI · 023045 = IOI. | `✔ verbatim` |
| 14 | Amadeus | FASE AMADEUS — 7. Agregar forma de pago a coste 0 | `TMI/M1/FP-O/CCVI+`<br><sub>TMI/M{numeroTsm}/FP-O/CCVI+/</sub> | Agrega la forma de pago original a coste cero para el EMD reemitido. | `✔ verbatim` |
| 15 | Amadeus | FASE AMADEUS — 8. Emitir el EMD reemitido | `TTM1/M1/RT`<br><sub>TTM1/M{numeroTsm}/RT</sub> | Emisión final del EMD de equipaje reemitido. | `✔ verbatim` |
| 16 | Amadeus | FASE AMADEUS — 9. Enviar documentos | `IBP-EMLA/LPSP`<br>`IEPJ-EMLA/LPSP`<br>`ITR-EMLA` | Envío de itinerario, servicios y billetes en Amadeus. | `✔ verbatim` |

