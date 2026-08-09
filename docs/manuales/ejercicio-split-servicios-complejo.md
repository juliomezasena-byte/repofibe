# Ejercicio Maestro — Reserva 4 Pax (2 ADT + 1 CHD + 1 INF), 2 SPLITs y Servicios por PNR

> **Generado automáticamente** desde
> `public/procedimientos/ejercicio-split-servicios-complejo.json`. No lo edites a mano: corrige
> el JSON y vuelve a correr `node scripts/generar-manual.mjs`.

**Aerolínea:** Iberia (075) · **Categoría:** ejercicio-practica · **Fuente:** Ejercicio práctico del estudiante pegado en chat (07AGO26)

Escenario completo de práctica: creación de reserva inicial de 4 pasajeros (2 ADT, 1 CHD, 1 INF asociado), separación en 3 PNRs mediante 2 SPLITs y adición de servicios específicos (UMNR, silla de ruedas, equipaje especial, equipaje adicional, mascota en cabina, comida, asiento, corrección de nombre y mascota en bodega) en cada reserva resultante.

> ℹ️ Ejercicio diseñado para evaluar el dominio conjunto de Venta inicial, SPLIT progresivo (SP/EF/ER) y adición de servicios especiales por PNR.

## Antes de empezar

- 🔴 El INFANTE NO ocupa plaza. Una reserva de 2 ADT + 1 CHD + 1 INF requiere SS 3 plazas (no 4). La venta de 4 plazas daría error EXCEEDS NAMES.
- 🔴 El SPLIT es un proceso IRREVERSIBLE. Tras ejecutar EF + ER, los PNRs quedan permanentemente separados.
- 🟠 En la reserva de CHD solo, al agregar UMNR y silla de ruedas (WCHR), Amadeus requiere SR mientras que Resiber requiere SSR.

## Pasos

| # | Sistema | Proceso | Transacción | Explicación | Confianza |
|---|---|---|---|---|---|
| 1 | Amadeus | FASE 1: Reserva Inicial — Buscar disponibilidad | `AN 15MAR MADBOG`<br><sub>AN {fecha} {origen}{destino}</sub> | Muestra vuelos disponibles para Madrid a Bogotá en fecha 15MAR. | `✔ verbatim` |
| 2 | Amadeus | Reserva Inicial — Vender plazas (2 ADT + 1 CHD = 3 plazas) | `SS 3 A 1`<br><sub>SS 3 {clase} {linea}</sub> | 3 plazas en clase A de la línea 1. El infante no ocupa plaza física. | `✔ verbatim` |
| 3 | Amadeus | Reserva Inicial — Nombres (2 ADT, 1 INF asociado, 1 CHD) | `NM1 GARCIA/CARLOS MR` | Línea 1: Primer adulto. Luego agregar ADT2+INF en Línea 2 y CHD en Línea 3. | `✔ verbatim` |
| 3.1 | Amadeus | Nombres — Adulto 2 con Infante asociado | `NM1 LOPEZ/ANA MRS (INFLOPEZ/LUIS/10JAN25)` | Línea 2: Adulto con infante asociado. SIN barra extra tras INF. | `✔ verbatim` |
| 3.2 | Amadeus | Nombres — Child (Niño) | `NM1 MARTINEZ/SOFIA(CHD/15FEB18)` | Línea 3: Niño con fecha de nacimiento en formato DDMMMYY. | `✔ verbatim` |
| 4 | Amadeus | Reserva Inicial — Contacto, tiempo límite, cotización y guardado | `AP+ 34600000000` | Teléfono de contacto. Seguido de APE-, TKXL 16MAR/2300, FXX/FF-OPTIMA/RINADCH y ER. | `✔ verbatim` |
| 5 | Amadeus | FASE 2: SPLIT 1 — Separar al CHD (Pasajero 3) a un nuevo PNR | `SP 3` | Selecciona la línea 3 (Child MARTINEZ/SOFIA) para separar al PNR de Reserva 2. | `✔ verbatim` |
| 6 | Amadeus | SPLIT 1 — Crear nuevo PNR y guardar | `EF` | Genera el nuevo PNR ASSOCIATE (Reserva 2: 1 CHD). Seguido de ER. | `✔ verbatim` |
| 7 | Amadeus | SPLIT 2 — En el PNR PARENT (2 ADT + 1 INF), separar al ADT solo (Pasajero 1) | `SP 1` | Selecciona la línea 1 (Adulto GARCIA/CARLOS) para separar a la Reserva 3. | `✔ verbatim` |
| 8 | Amadeus | SPLIT 2 — Crear nuevo PNR y guardar | `EF` | Genera el PNR ASSOCIATE (Reserva 3: 1 ADT solo). Seguido de ER. El PNR original queda con Reserva 1: 1 ADT + 1 INF. | `✔ verbatim` |
| 9 | Amadeus | FASE 3: Reserva 2 (CHD) — Agregar UMNR (Menor No Acompañado) | `SR UMNR IB NN1-UM08`<br>`SSR UMNR IB NN1 UM08` | Amadeus usa SR UMNR. Resiber usa SSR UMNR con edad UM08.<br><br>⚠️ Prefijo SR en Amadeus vs SSR en Resiber corroborado en servicios-adicionales.json. | `≈ derivado` |
| 10 | Amadeus | Reserva 2 (CHD) — Agregar Silla de Ruedas (WCHR) | `SR WCHR/S1/P1`<br>`SSR WCXX/S1/P1` | WCHR = Ramp wheelchair. Amadeus usa SR, Resiber usa SSR WCXX.<br><br>⚠️ Corroborado en servicios-adicionales.json. | `≈ derivado` |
| 11 | Amadeus | Reserva 2 (CHD) — Agregar Equipaje Especial (Bicicleta / Esquí SPEQ) | `SR SPEQ - ESQUI 21X50X130 13KG/S1/P1`<br>`SR BIKE IB NN1` | Equipaje deportivo o especial. Seguido de ER para guardar.<br><br>⚠️ Corroborado en servicios-adicionales.json. | `≈ derivado` |
| 12 | Amadeus | FASE 4: Reserva 3 (SOLO ADULTO) — Agregar Equipaje Adicional (XBAG) | `IU IB NN1 XBAG MAD/P1` | Solicita XBAG. Cotizar con FXH/L1-2, crear TSM con FXG/L1-2, registrar FP y emitir EMD con TTM1/M1/RT.<br><br>⚠️ Flujo de equipaje adicional documentado en servicios-adicionales.json. | `≈ derivado` |
| 13 | Amadeus | Reserva 3 (SOLO ADULTO) — Agregar Mascota en Cabina (PETC) | `SR PETC IB NN1 DOG HUSKY 5KG DIM 45X35X25/S1/P1`<br>`SSR PETC IB NN1 MADBOG 123 Y 15MAR 1 DOG HUSKY 5KG DIM45X35X25CM/P1` | Mascota en cabina (PETC) con raza, peso y dimensiones del contenedor.<br><br>⚠️ Corroborado en servicios-adicionales.json. | `≈ derivado` |
| 14 | Amadeus | Reserva 3 (SOLO ADULTO) — Agregar Comida Especial (VGML / SPML) | `SR VGML`<br>`SSR VGML IB NN1/S1/P1` | VGML = Vegetarian Meal. Seguido de ER para guardar.<br><br>⚠️ Corroborado en servicios-adicionales.json. | `≈ derivado` |
| 15 | Amadeus | FASE 5: Reserva 1 (ADULTO CON INFANTE) — Asignar Asiento | `ST/24A/P1` | Asigna el asiento 24A para el adulto (el infante viaja en regazo o cuna BSCT).<br><br>⚠️ Sintaxis estándar ST/asiento/Ppasajero en Amadeus. | `≈ derivado` |
| 16 | Amadeus | Reserva 1 (ADULTO CON INFANTE) — Corrección de Nombre (NU) | `NU 1LOPEZ/ANA MRS` | Transacción NU para corregir el elemento de nombre si aplica error tipográfico.<br><br>⚠️ Flujo de corrección de nombre documentado en docs/fuentes/INDICE-MANUALES-FALTANTES.md (IBEX 23). | `≈ derivado` |
| 17 | Amadeus | Reserva 1 (ADULTO CON INFANTE) — Agregar Mascota en Bodega (AVIH) | `SR AVIH IB NN1 DOG HUSKY 25KG DIM 80X60X60/S1/P1`<br>`SSR AVIH IB NN1 DOG HUSKY 25KG DIM 80X60X60/S1/P1` | AVIH = Mascota en bodega. Seguido de ER para guardar.<br><br>⚠️ Corroborado en servicios-adicionales.json y mascota-en-bodega-avih.json. | `≈ derivado` |

