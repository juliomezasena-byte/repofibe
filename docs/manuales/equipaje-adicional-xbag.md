# Equipaje Adicional (XBAG) — Emisión de EMD y Errores de Cotización

> **Generado automáticamente** desde
> `public/procedimientos/equipaje-adicional-xbag.json`. No lo edites a mano: corrige
> el JSON y vuelve a correr `node scripts/generar-manual.mjs`.

**Aerolínea:** Iberia (075) · **Categoría:** equipaje · **Fuente:** IberiaNet Lite — #3097 "2. EQUIPAJES"

Procedimiento oficial #3097 de IberiaNet Lite para la venta y emisión de EMD de equipaje adicional (XBAG) en vuelos operados por IB, I2, LEVEL y YW. Incluye reglas de peso/dimensiones, conexiones, resolución de errores de revalidación/histórico, y cobro PCI/Travel Pay.

> ℹ️ Transcripción 100% fiel del manual oficial #3097. Define la secuencia oficial SR XBAG → FXH → FXG → TQM → TMI → $$CONFIG → $$PAY → XE → TTM1/M1/RT.

## Antes de empezar

- 🔴 APLICABILIDAD: Billetes 075 y vuelos operados únicamente por IB, I2, LEVEL y YW.
- 🔴 PESO Y DIMENSIONES: 1 maleta adicional de máx 23 kg y 158 cm (suma total L+A+A). Si sobrepasa los 23 kg, el pasajero asume costo por exceso en aeropuerto (máximo 32 kg).
- 🔴 ESTADO DEL BILLETE Y CHECK-IN: El billete debe estar OPEN FOR USE (O). Si el cliente YA REALIZÓ EL CHECK-IN, NO es posible agregar más equipaje por call center.
- 🟠 CONEXIONES DE 4 HORAS O MÁS: Si el tiempo de conexión es >= 4 horas, el pasajero debe recoger el equipaje en la escala y volver a facturar para el siguiente vuelo.
- 🟠 AGENCIAS GDS vs NDC: Si la reserva proviene de agencia GDS se le ayuda agregando equipaje. Si es agencia NDC se direcciona a la agencia o a Iberia.com.

## Pasos

| # | Sistema | Proceso | Transacción | Explicación | Confianza |
|---|---|---|---|---|---|
| 1 | Amadeus | 1. Solicitar el servicio — un solo pasajero | `SR XBAG/S2,3/P1`<br><sub>SR XBAG/S{segmentos}/P{pasajero}</sub> | SR XBAG = servicio equipaje · S2,3 = segmentos · P1 = número de pasajero. | `✔ verbatim` |
| 1.1 | Amadeus | Solicitar el servicio — todos los pasajeros | `SR XBAG/S2,3`<br><sub>SR XBAG/S{segmentos}</sub> | Aplica el servicio de equipaje a todos los pasajeros de los segmentos seleccionados. | `✔ verbatim` |
| 2 | Amadeus | 2. Cotizar el equipaje | `FXH/L14`<br><sub>FXH/L{lineaSsr}</sub> | FXH = cotizar SSR · L14 = número de línea donde quedó registrado el elemento SSR XBAG. | `✔ verbatim` |
| 3 | Amadeus | 3. Documentar los valores informados al cliente | `RM05APR26PAX AVDO VALOR XBAG X PAX xxx EUR//AR` | Deja constancia en el PNR de la tarifa de equipaje informada al pasajero. | `✔ verbatim` |
| 3.1 | Amadeus | Resolución de Error: ET NOT ISSUED FOR SELECTED SEGMENT (S) | `TTP/ETRV/L14/S2-3/E1-2/RT`<br><sub>TTP/ETRV/L{linea}/S{segmentos}/E{cupones}/RT</sub> | Si sale este error, debes revalidar el ticket antes de continuar. | `✔ verbatim` |
| 3.2 | Amadeus | Resolución de Error: ITINERARY PRICING REQUIRED BEFORE SERVICE PRICING | `FXX/R,02FEB26,UP/L4-BASIC/L5-BASIC`<br><sub>FXX/R,{DOI},UP/L{segmento1}-{farebasis1}/L{segmento2}-{farebasis2}</sub> | Si sale este error, debes crear la máscara cotizando a histórico con la fecha de emisión original (DOI) y fare basis. | `✔ verbatim` |
| 4 | Amadeus | 4. Guardar la cotización del equipaje (crea la máscara TSM) | `FXG/L14`<br><sub>FXG/L{lineaSsr}</sub> | FXG/L14 genera el TSM de equipaje. Verificar con TQM (1 pax) o TQM/M1 (varios). Guardamos con ER y confirmamos con ERK. | `✔ verbatim` |
| 5 | Amadeus | 5. Incluir datos del titular de la tarjeta (nuevo Cyber) | `RMCSY/JUAN:PELAEZ`<br><sub>RMCSY/{NOMBRE}:{APELLIDO}</sub> | Nombre y apellido del titular. Guardamos con ER. | `✔ verbatim` |
| 6 | IberiaNet / iberia.com | 6. Tomar los datos de tarjeta en PCI Pal o Travel Pay | — | EUROPA → FORMAS DE PAGO → PCI PAL o TRAVEL PAY. | `✔ verbatim` |
| 7 | Amadeus | 7. Agregar forma de pago al TSM | `TMI/M1/FP-MS-TT,VI1234567890123456-1023-V1234ABCD`<br><sub>TMI/M{numeroTsm}/FP-{TOKEN}</sub> | M1 = número del TSM (TQM) · TOKEN = trama copiada de PCI Pal o Travel Pay. | `✔ verbatim` |
| 8 | Amadeus | 8. Cargar el perfil de PCI en Amadeus | `$$CONFIG:CCTYPE/2` | Configura el perfil de pago antes del cargo. | `✔ verbatim` |
| 9 | Amadeus | 9. Realizar el cargo a la tarjeta del cliente | `$$PAY` | Ejecuta el cargo en la pasarela. | `✔ verbatim` |
| 10 | Amadeus | 10. Borrar la línea Cyber para poder emitir | `XE17`<br><sub>XE{linea}</sub> | 17 = línea donde se encuentra la nota Cyber RMCSY. | `✔ verbatim` |
| 11 | Amadeus | 11. Emitir el EMD de equipaje | `TTM1/M1/RT`<br><sub>TTM1/M{numeroTsm}/RT</sub> | Emisión del EMD electrónico de equipaje. M1 = número del TSM. | `✔ verbatim` |
| 12 | Amadeus | 12. Enviar documentos finales | `IBP-EMLA/LPSP`<br>`IEPJ-EMLA/LPSP`<br>`ITR-EMLA`<br>`ITP:/RESERVA/EMAIL`<br>`DTR TN 075-2534567890,EML/EMAIL`<br>`DEMR DN 075-2534567890,EML/EMAIL` | Amadeus: IBP (itinerario), IEPJ (servicios), ITR (billetes). Resiber: ITP, DTR TN (e-ticket), DEMR DN (EMD). | `✔ verbatim` |

