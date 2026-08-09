# Índice de manuales que EXISTEN pero NO tenemos

> Extraído de las citas `Sources:` que el bot interno (EverGPT / Prompt 2) fue
> dejando en sus respuestas. **El bot tiene estos documentos cargados; nosotros
> no.** Cada nombre de archivo aquí es real: alguien en Foundever/Iberia lo
> tiene. Esta es la lista de compras para desbloquear el tutor.
>
> Recopilado: 07AGO26 · Fuente: capturas de conversación con el bot interno

## Por qué esto importa

Hoy los procedimientos en `public/procedimientos/` están llenos de pasos
marcados `derivado` — porque salieron de un **bot resumiendo** estos
documentos, no de los documentos. Un resumen de bot no es fuente: puede
transcribir mal un comando y nadie se entera.

Cada archivo que consigas convierte pasos `derivado` → `verbatim`.

## Manuales Ingeridos VERBATIM (100% oficial)

| Manual | Archivo JSON resultante | Estado |
|---|---|---|
| `#3058 1. EMISION (LATAM GENERAL)` | `emision-latam.json` | 100% Verbatim (22 pasos Amadeus + Pago PCI Pal / Travel Pay + Resiber) |
| `#3116 1. MASCOTA EN CABINA` | `mascota-en-cabina-petc.json` | 100% Verbatim (Precios, requisitos, 4 escenarios Amadeus vs Resiber + Dublín) |
| `#3119 4. RESTRICCIONES POR PAISES` | `mascotas-restricciones-paises.json` | 100% Verbatim (14 países: USA, Irlanda, China, Sudáfrica, Suecia, España aduanas) |
| `#3097 2. EQUIPAJES` | `equipaje-adicional-xbag.json` | 100% Verbatim (12 pasos SR XBAG → FXH → FXG → TQM → TMI → $$CONFIG → $$PAY → XE → TTM1) |
| `#3106 1. REMISION DE EQUIPAJES` | `reemision-equipaje-emd.json` | 100% Verbatim (Operativa Resiber WEMD + Amadeus TMI/EXCH + FO + FP-O/CCVI+) |
| `#3639 2. MISMA CLASE Y RUTA` | `cambio-involuntario-clase-ruta.json` | 100% Verbatim (Revalidación directa FHE → XE FA → AN/SS → XE → TTP/ETRV) |






## Prioridad 1 — desbloquean lo que ya empezamos

| Archivo | Desbloquea |
|---|---|
| `IBEX 14 - VERIFICAR REEMBOLSO EN RESIBER..md` | **Los comandos de Resiber** (`DTR TN`, `DTR H`). Es el bloqueante nº1 de todo el proyecto |
| `IBEX 20 - REEMBOLSO POR NO PCC.md` | `reembolso-ibex-no-pcc.json` — hoy 100% derivado, incluidas las colas `QE/MADI20500/36` y `/97` |
| `Iberia 36 - Reembolsos.md` | `reembolso-iberia-general.json` — cierra la discrepancia `FQN01PE` vs `FQN02*PE` |
| `Manual General - SERVICIOS ADICIONALES.pdf` | La matriz SR (Amadeus) vs SSR (Resiber) de servicios |
| `IBEX 23 - CORRECCION DE NOMBRE.md` | El flujo FHE→NU→TTI/EXCH→FO→FPO→TTP1, con la duda `CCSVI+` vs `CCVI+` |
| `Iberia 51 - Glosario.md` | **Equivalencias Amadeus ↔ Resiber** — probablemente el documento más valioso de la lista |

## Prioridad 2 — cubren huecos grandes del simulador

| Archivo | Cubre |
|---|---|
| `Iberia 31 - Cambio Manual.md` | Reemisión (el simulador no la tiene) |
| `Iberia 32 - Correcion De Nombre.md` | Corrección de nombre lado Iberia (075) |
| `Iberia 33 - Reemision De Servicios.md` | Reemisión de servicios |
| `Iberia 15 - Servicios.md` | Catálogo de servicios adicionales |
| `Iberia 16 - Asientos.md` | Asientos (incluye reglas de codeshare) |
| `Iberia 17 - Equipaje.md` | Franquicias de equipaje |
| `Iberia 08 - Formas De Pago.md` | Formas de pago |
| `Transacciones Utiles.pdf` | Catálogo transversal de transacciones |
| `IBERIA EXPRESS - REEMISION.xlsx` | Reemisión IBEX |
| `IBERIA EXPRESS - EMISION.xlsx` | Emisión IBEX |
| `IBERIA EXPRESS - SERVICIOS.pdf` | Servicios IBEX |
| `IBERIA EXPRESS - REEMBOLSOS.pdf` | Reembolsos IBEX |

## Prioridad 3 — completan el catálogo

**Serie Iberia (075)** — la numeración llega al menos a 52; tenemos 0 de estos:

`Iberia 01 - Logado Deslogado.md` · `Iberia 12 - Responsabilidad.md` ·
`Iberia 22 - Servicios En Vuelos Distintos A Iberia.md` · `Iberia 35 - Upg.md` ·
`Iberia 37 - Comunicaciones Cortadas.md` · `Iberia 38 - Reservas On Hold 72H.md` ·
`Iberia 39 - Bonos.md` · `Iberia 41 - Check In.md` · `Iberia 47 - Cabin Baggage.md` ·
`Iberia 52 - Argumentarios.md`

**Serie IBEX (060)** — llega al menos a 28:

`IBEX 11 - CABIN BAGGAGE.md` · `IBEX 12 - EXTRA SEAT.md` ·
`IBEX 13 - REEMBOLSO LOCALIZADORES OBSOLETOS.md` · `IBEX 15 - CONDICIONES DE TARIFA.md` ·
`IBEX 21 - REEMBOLSO EN BONO.md` · `IBEX 22 - CAMBIOS DE VUELO.md` ·
`IBEX 25 - SELECCION ASIENTOS.md` · `IBEX 28 - SERVICIO DE MASCOTAS.md`

**Manuales generales y flowcharts:**

`Manual General - CAMBIO INVOLUNTARIO.pdf` · `Manual General - Errores Comunes.pdf` ·
`Manual Escalaciones y Plantillas - EQUIPO FCR.pdf` · `Telefonos de contacto.pdf` ·
`AMADEUS Remision de equipaje - Flowchart.pdf` ·
`AMADEUS Emision de equipaje - Mermaid Flowchart.pdf` ·
`AMADEUS Verificacion de Reembolsos - Mermaid Flowchart.pdf` ·
`AMADEUS Cambios Involuntarios - Mermaid Flowchart.pdf` ·
`AMADEUS - Cambios Voluntarios - Mermaid Flowchart.pdf` ·
`AMADEUS Servicios adicionales - Mermaid Flowchart.pdf`

## Lo que se ve en la numeración

La serie Iberia llega **al menos a 52** y la IBEX **al menos a 28**: son del
orden de **80 documentos**. Tenemos 0 originales y 2 carpetas de capturas
(`manual/Generar split/`, `manual/reembolso  latinoamerica/`).

Dicho sin adornos: **el material del que aprender existe casi entero, y
nosotros tenemos alrededor del 3%.** Todo lo demás lo estamos reconstruyendo
desde resúmenes de un bot, que es exactamente la fuente que no se debe usar
para enseñar sintaxis.

## Cómo conseguirlos

El bot los tiene cargados en su RAG. Vías posibles, en orden de fiabilidad:

1. Pedir los `.md`/`.pdf` originales a quien administra el bot o a formación.
2. Pedírselos a David (fuente confiable ya establecida para dominio Iberia).
3. Descargarlos de IberiaNet / el repositorio interno de conocimiento.
4. Como último recurso: capturas de pantalla del documento abierto — sirven,
   pero cuestan transcripción y son más propensas a error.

⚠️ **No sirve** pedirle al bot que "te los resuma": eso es justo lo que ya
tenemos y lo que produce los pasos `derivado`.
