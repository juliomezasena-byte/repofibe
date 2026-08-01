# Manual — Cambio Voluntario Manual (CON SEGMENTO VOLADO)

> 📌 **Fuente: manual oficial interno de Iberia, copiado verbatim** por el
> usuario (30-31JUL26). Máxima confianza; no re-verificar contra fuentes
> externas.
>
> 🔗 Procedimiento hermano de `MANUAL_CAMBIO_VOLUNTARIO_SIN_SEGMENTO.md`
> (cuando el cliente NO voló ningún segmento). Este aplica cuando el cliente
> **ya voló parte del itinerario** — por eso hay que construir la máscara del
> TST desde los segmentos volados (`TTC`) en vez de reutilizar un TST
> existente.
>
> ⚠️ El manual original salta del paso **4 al 7** (no se pegó contenido de
> los pasos 5-6 — posible limitación de la herramienta de origen, un Google
> Apps Script). Se preserva el salto tal cual, sin inventar los pasos
> faltantes.
>
> ⚠️ **Inconsistencias detectadas en el material fuente (auditoría
> 01AGO26, no corregidas — se preservan verbatim, solo se anotan):**
> - **`FQQ` con espaciado inconsistente**: el paso 8 usa `FQQ01` (sin
>   espacio); los pasos 14, 15 y 16 usan `FQQ 01` (con espacio) al indicar
>   "volver a la opción seleccionada". Probablemente el mismo comando con
>   transcripción inconsistente del material original, no dos comandos
>   distintos — confirmar con el instructor si el espacio importa.
> - **`FQP` — el sufijo `,UP` aparece en penalidad (pasos 2b/2c/2d) pero NO
>   en diferencia (pasos 7/7b/7c/7d)**. ✅ **Aclarado por el usuario
>   (01AGO26, consultado directamente a la misma fuente):** `UP` es
>   simplemente una **orden/modificador que se agrega o quita según haga
>   falta** ("UP" = "hacia arriba"), no tiene un significado de negocio más
>   profundo documentado — por eso aparece en la ida (penalidad) y se quita
>   en el regreso/diferencia. Se mantiene el patrón tal cual está en el
>   manual (con `,UP` en penalidad, sin él en diferencia) sin seguir
>   buscando una explicación semántica adicional.
> - **Paso 4 vs paso 7/10 — el valor de "SF" (gasto de gestión) cambia de
>   `680MXN` (paso 4) a `604MXN` (paso 7/10) para el mismo caso**. El total
>   documentado en el paso 7/10 (`6736MXN`) solo cuadra matemáticamente con
>   604 (3279+604+2853=6736), no con 680 — el "680MXN" del paso 4 parece un
>   error de transcripción del material original (se repite igual en
>   `MANUAL_CAMBIO_VOLUNTARIO_SIN_SEGMENTO.md`, así que probablemente viene
>   heredado de la misma fuente). Usar 604 como referencia si hace falta
>   elegir uno; no se corrige el texto original, solo se deja esta nota.
>
> 🔗 Referencia embebida en el manual original (no visitada, solo
> preservada como cita): `https://script.google.com/macros/s/AKfycbyHiNQsbxiFL9Jiay75HDXv4JvwDijM8Cjpy0FPXe9TioOAPyPlCjd31b-RZz8op69f/exec`

## Diferencia clave frente a "SIN segmento volado"

| | SIN segmento volado | CON segmento volado |
|---|---|---|
| Buscar penalidad | `FXX/S.../R,{DOI},UP/FF-{tarifa}` (a histórico) | `FQD` (por segmento) o `FQP` (roundtrip: directo / escala / surface) — sintaxis mucho más elaborada |
| Elegir tarifa cotizada | — | `FQQ{n}` (selecciona una de las tarifas ofertadas por FQP) |
| Crear la máscara del cambio | `TTI/EXCH/T{n}` (reutiliza TST existente) | `TTC/S{línea}` (construye máscara nueva desde los segmentos volados) + `TQTC` (modo cryptic) |
| Cargar datos al TST | `TTK/T{n}/T{valor}` (un solo paso: diferencia) | `TTI` en **3 sub-pasos distintos**: farebasis+equipaje, luego fare+tasas+diferencia, luego fare calculation |
| Total de pasos | 29 | 34 (con el salto 4→7) |

## Tabla completa (34 pasos)

| # | Proceso | Transacción | Explicación |
|---|---------|--------------|-------------|
| — | Verifica el valor del gasto de gestión en la IberiaNet | — | Manuales express — Gastos de gestión |
| 1 | Abre el TKT y copia el fare basis, el DOI y el valor total | `TWD/TKT 075-1422342526` o `TWD/L16` | `TWD/TKT {billete}` — 075-1… = número del billete. `TWD/L{n}` — 16 = línea de billete |
| 2 | Buscar el valor de la penalidad | Desde **IBERIA.COM** → Tus vuelos → Gestiona tu reserva → Tus vuelos | — |
| 2a | Penalidad con `FQD` | `FQDMADBOG/AIB/CN/D10MAR/R,01DEC23,UP` | `FQD{ORG}{DEST}/A{aerolínea}/C{clase}/D{fecha}/R,{DOI},UP` — MAD=origen · BOG=destino · IB=aerolínea que opera · N=clase del segmento · 10MAR=fecha del vuelo · 01DEC23=fecha de emisión |
| 2b | Penalidad con `FQP` — Roundtrip **directo** | `FQPBOG/AIB/CS/D14FEBMAD-/AIB/CN/D10MARBOG/R,01DEC23,UP/FF-BASIC` | `FQP{ORG}/A{al}/C{clase}/D{fecha}{DEST}-/A{al}/C{clase}/D{fecha}{DEST}/R,{DOI},UP/FF-{tarifa}` — ida: BOG→MAD (IB, clase S, 14FEB) · regreso: MAD→BOG (IB, clase N, 10MAR) · 01DEC23=DOI · BASIC=tarifa |
| 2c | Penalidad con `FQP` — Roundtrip **con escala** | `FQPBOG/AIB/CS/D14FEBMADLHR-/AIB/CN/D10MARMADBOG/R,01DEC23,UP/FF-BASIC` | Igual que el directo, pero incluye el aeropuerto de escala en cada tramo (ida BOG→MAD→LHR, regreso LHR→MAD→BOG) |
| 2d | Penalidad con `FQP` — Roundtrip **surface** (open jaw) | `FQPBOG/AIB/CS/D14FEBMAD---LHR/AIB/CN/D10MARMADBOG/R,01DEC23,UP/FF-BASIC` | El `---` indica tramo de superficie: ida termina en MAD, el regreso empieza en LHR (el cliente se mueve por tierra entre ambos) |
| — | **Pro tip** | Estas transacciones (FQD/FQP) se deben realizar **desde el billete** | — |
| — | **Pro tip** | Seleccione alguna de las tarifas ofertadas: `FQQ{n}` | — |
| 3 | Verificar penalidad (ADULTO) | `FQN02*PE` | `FQN{línea ofertada}*PE` |
| 3b | Verificar penalidad (CHILD e INFANTE) | `FQN02*CD` | `FQN{línea ofertada}*CD` — con esta transacción vemos el descuento que aplica a cada tipo de pasajero |
| 3c | Calcular descuento | `DF 150 P 75` | 150 = valor de la penalidad del ADT · 75 = valor del descuento |
| 4 | Documentar valores a cobrar | `RM*02MAR26* PAX AVDO COSTE PENTY 3279MXN X ADT + 680MXN SF / WP` | — |
| *(salto 5-6 no presente en el manual original)* | | | |
| 7 | Cotiza los vuelos que el cliente VA a volar (diferencia) — Roundtrip **directo** | `FQPBOG/AIB/CS/D14FEBMAD-/AIB/CN/D31MARBOG/R,01DEC23/FF-BASIC` | Mismo patrón que 2b, pero con la NUEVA clase/fecha de regreso (31MAR, clase M) |
| 7b | Diferencia — Roundtrip **con escala** | `FQPBOG/AIB/CS/D14FEBMADLHR-/AIB/CN/D31MARMADBOG/R,01DEC23/FF-BASIC` | — |
| 7c | Diferencia — Roundtrip **surface** | `FQPBOG/AIB/CS/D14FEBMAD---LHR/AIB/CN/D31MARMADBOG/R,01DEC23/FF-BASIC` | — |
| 7d | **Importante** — varios tipos de pasajero | `FQPBOG/AIB/CS/D14FEBMAD-/AIB/CN/D31MARBOG/RCHADIN,01DEC23/FF-BASIC` | Si hay ADT+CHD+INF mezclados, agregar al final `/R{tipos separados},{DOI}` — ej. `RCHADIN` |
| — | **Pro tip — familias tarifarias por cabina** | Turista: `FF-BASIC/OPTIMA/COMFORT/FLEX` · Turista Premium: `FF-PEOPTIMA/PECOMFORT/PEFLEX` · Business: `FF-BUSOPTIMA/BUSCOMFORT/BUSFLEX` | — |
| — | Error `*NO FARES/RBD/CARRIER/PASSENGER TYPE` | — | Tarifa no disponible para las clases elegidas. Cambiar clases y recotizar con **FXR** en vez de FXX. |
| 8 | Seleccione alguna de las tarifas ofertadas | `FQQ01` | `FQQ{n}` |
| 9 | Calcular la diferencia de tarifa | `DF 1890 - 1750` | Diferencia = valor de cotización nueva − valor del TKT original |
| 10 | Documentar valores a cobrar | `RM*02MAR26* PAX AVDO COSTE PENTY 3279MXN X ADT + 604MXN SF + 2853MXN DF/ WP` y `RM*02MAR26* PAX AVDO COSTE TOTAL CMB 6736MXN/ WP` — guardar hasta aquí con `ER` | — |
| 11 | Eliminar TST | Todos: `TTE/ALL` · Uno: `TTE/T1` | `TTE/ALL` o `TTE/T{n}` |
| 12 | Eliminar todas las formas de pago | `XE 22` | `XE {línea FP}` — 22 = línea del elemento FP |
| 13 | **Creamos la máscara** (desde segmentos volados) | `TTC/S5` | `TTC/S{línea}` — S5 = línea de los segmentos |
| 14 | Colocamos el TST en modo **cryptic** | `TQTC` | Pro tip: si no abre lista de opciones, reabrir el `FQP`. Volver a la opción seleccionada: `FQQ 01` |
| 15 | Agregamos fare basis, NVB-NVA y piezas de equipaje (XBAG) | `TTI/T2/L1/B AANNOB2/V 31MAR31MAR/A1PC` | `TTI/T{TST}/L{línea}/B{farebasis}/V{NVB}{NVA}/A{equipaje}` — T2=TST · L1=línea a montar · AANNOB2=fare basis · 31MAR/31MAR=fechas NVB/NVA · 1PC=piezas equipaje. Guardar con `ER`. Volver a `FQQ 01` |
| 16 | Agregamos fare, equivalente, tasas y diferencia | `TTI/T2/RUSD1243/EEUR1243/O130YQ/O28.38JD/…/T140` | `TTI/T{TST}/R{fare}/E{equivalente}/O{tasa}/O{tasa}/…/T{diferencia}` — T2=TST · USD1243=fare · EUR1243=equivalente · O130YQ=tasa pagada · T140=diferencia de tarifa. Guardar con `ER`. Volver a `FQQ 01` |
| 17 | Agregamos el fare calculation | `TTI/T2/C BOG IB X/MAD…` | `TTI/T{TST}/C {fare calculation}` — 2=TST · "BOG IB X..."=cadena de cálculo tarifario |
| 18 | Creamos el FO | ADT/CHD: `FO*L14/P1` · INF: `FOINF*L15/P1` — guardar con `ER` | `FO*L{línea}/P{pax}` |
| 19 | Solicitamos el TSM | `IU IB NN1 PENF BOG/P1` | `IU {aerolínea} NN1 PENF {origen}/P{pax}` |
| 20 | Crear el EMD | ADT: `TMC/L5` · INF: `TMC/L6/INF` | `TMC/L{línea del elemento SVC}` |
| 21 | Verificar máscara TSM | Un tipo: `TQM` · Varios: `TQM/M1` | — |
| 22 | Ingresar valor de penalidad y cupón value | `TMI/M1/F3279/CV-3279` — guardar con `ER` | `TMI/M{TSM}/F{penalidad}/CV-{penalidad}` |
| 23 | Incluir el gasto de gestión | Un TST: `TTO/ST01/CSF/F604` · Varios TST: `TTO/ST01/CSF/F604/T2` | Pro tip: verificar con `TQO`. Eliminar si quedó mal: `TTO/ST01/T{tst}` |
| 24 | Incluir datos del titular de la tarjeta (nuevo cyber) | `RM*CSY/JUAN:PELAEZ` — guardar con `ER` | `RM*CSY/{NOMBRE}:{APELLIDO}` |
| 25 | Toma los datos de tarjeta | PCI PAL / Travel Pay — Europa → Formas de pago | — |
| 26 | Ingresar forma de pago del TST | `FP O/CCVI+/MS-TT,VI1234567890123456-1023-V1234ABCD` | `FP O/CCVI+/{token}` |
| 27 | Ingresar forma de pago del TSM | `TMI/M1/FP-MS-TT,VI1234567890123456-1023-V1234ABCD` | `TMI/M{TSM}/FP-{token}` |
| 28 | Cargar el perfil de PCI en Amadeus | `$$CONFIG:CCTYPE/2` | — |
| 29 | Realizar el cargo a la tarjeta del cliente | `$$PAY` | ⚠️ Confirmar coste total con el cliente ANTES |
| 30 | Borrar el cyber para poder emitir | `XE17` | `XE{línea}` — 17 = línea donde está el cyber |
| 31 | Reconfirmar el itinerario al cliente | — | — |
| 32 | Eliminar las plazas que el cliente NO va a usar | `XE 14` | `XE {línea de los segmentos}` |
| 33 | Emitir el cambio | Penalidad + billete: `TTP1/TTM/T2/M1/ET/RT` · Solo penalidad: `TTM1/M1/RT` · Solo billete: `TTP1/ET/RT/T2` | T2=TST · M1=TSM |
| 34 | Enviar itinerario | Amadeus: `IBP-EMLA/LPSP` / `IEPJ-EMLA/LPSP` / `ITR-EMLA` · Resiber: `ITP:/{RESERVA}/{EMAIL}` / `DTR TN {billete},EML/{EMAIL}` / `DEMR DN {billete},EML/{EMAIL}` | SP en Amadeus = idioma español |

## Comandos NUEVOS que solo aparecen en este manual (no están en el de "sin segmento")

- `FQD{ORG}{DEST}/A{al}/C{clase}/D{fecha}/R,{DOI},UP` — penalidad por segmento
- `FQP` con 3 variantes roundtrip: **directo**, **con escala**, **surface** (open jaw) — sintaxis mucho más rica que el `FQP` simple mencionado en `NOTAS_IBERIA_PROMPT2.md`
- `FQQ{n}` — seleccionar una tarifa de las ofertadas por FQP
- `TTC/S{línea}` — crear la máscara del cambio desde los segmentos volados
- `TQTC` — colocar el TST en modo cryptic
- `TTI` en **modo multi-parámetro** (no es el mismo uso simple de `TTI/EXCH/T#` del otro manual): `/L.../B.../V.../A...` (fare basis+validez+equipaje), `/R.../E.../O.../T...` (fare+equivalente+tasas+diferencia), `/C ...` (fare calculation)

Ver el análisis completo de qué falta implementar en `PLAN_CAMBIO_MANUAL_IBERIA.md`.
