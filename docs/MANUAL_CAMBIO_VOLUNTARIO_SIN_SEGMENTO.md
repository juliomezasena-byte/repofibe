# Manual — Cambio Voluntario Manual (SIN SEGMENTO VOLADO)

> 📌 **Fuente: manual oficial interno de Iberia, copiado verbatim** (no es
> síntesis de un bot ni reconstrucción — el usuario confirmó que es el
> propio texto del manual para esta sección). Máxima confianza; no
> re-verificar contra fuentes externas.
>
> 🔁 **Nota de deduplicación:** el material original pegado por el usuario
> traía este MISMO procedimiento de 29 pasos **dos veces** — una vez como
> tabla cruda, y otra reorganizada por el bot Prompt2 en su propia respuesta
> ("Sí. Ese bloque es..."). Es un solo procedimiento repetido dos veces, no
> dos manuales distintos. Aquí se conserva UNA sola versión consolidada.
>
> ℹ️ El manual tiene una variante hermana: **"Cambio Manual CON SEGMENTO
> VOLADO"** (cuando el cliente ya voló parte del itinerario), guardada en
> `MANUAL_CAMBIO_VOLUNTARIO_CON_SEGMENTO.md` (34 pasos). Es un procedimiento
> sustancialmente más complejo: usa `FQD`/`FQP` (roundtrip directo/escala/
> surface) para buscar la penalidad en vez de `FXX` a histórico, y construye
> la máscara del TST con `TTC`+`TQTC` (segmentos volados) en vez de
> reutilizar el TST con `TTI/EXCH`.

> Transcrito y organizado del material pegado por el usuario (30JUL26).
> Procedimiento completo: penalidad + diferencia de tarifa + gasto de gestión
> + EMD de penalidad, para un cliente que aún no voló ningún segmento.
> ⚠️ Antes de cualquier cobro o emisión, **confirma el coste total con el cliente**.

## Tabla completa (29 pasos)

| # | Proceso | Transacción | Explicación |
|---|---------|--------------|-------------|
| — | Verifica el valor del gasto de gestión en la IberiaNet | — | Manuales express — Gastos de gestión |
| 1 | Abre el TKT y copia el fare basis, el DOI y el valor total | `TWD/TKT 075-1422342526` (por número de billete) o `TWD/L16` (por línea de billete) | `TWD/TKT {billete}` — 075-1… = número del billete. `TWD/L{n}` — 16 = línea de billete |
| 2 | Buscar el valor de la penalidad | Desde **IBERIA.COM** → Tus vuelos → Gestiona tu reserva → Tus vuelos | — |
| 2b | Penalidad a histórico | `FXX/S2,3/R,02FEB26,UP/FF-BASIC` | `FXX/S#,#/R,DOI,UP/FF-TARIFA` — 2,3 = segmentos originales · 02FEB26 = fecha de emisión (DOI) · BASIC = fare basis del ticket |
| 3 | Verificar penalidad (ADULTO) | `FQN02*PE` | `FQN{línea ofertada}*PE` — 02 = número de tarifa ofertada |
| 3b | Verificar penalidad (CHILD e INFANTE) | `FQN02*CD` | `FQN{línea ofertada}*CD` — con esta transacción vemos el descuento que aplica a cada tipo de pasajero |
| 3c | Calcular descuento | `DF 150 P 75` | 150 = valor de la penalidad del ADT · 75 = valor del descuento |
| 4 | Documentar valores a cobrar | `RM*02MAR26* PAX AVDO COSTE PENTY 3279MXN X ADT + 680MXN SF / WP` | ⚠️ **Posible error de transcripción del material original (auditoría 01AGO26):** el total del paso 7 (`6736MXN`) solo cuadra matemáticamente con SF=604 (3279+604+2853=6736), no con 680. Se preserva 680 tal cual aparece en la fuente; no se corrige sin confirmar con el instructor. |
| 5 | Cotiza los vuelos que el cliente SÍ va a volar | `FXX/S2,3/FF-BASIC` | `FXX/S#,#/FF-TARIFA` — 2,3 = segmentos que el cliente va a volar · BASIC = tarifa elegida |
| — | **Pro tip — familias tarifarias por cabina** | Turista: `FF-BASIC`, `FF-OPTIMA`, `FF-COMFORT`, `FF-FLEX` · Turista Premium: `FF-PEOPTIMA`, `FF-PECOMFORT`, `FF-PEFLEX` · Business: `FF-BUSOPTIMA`, `FF-BUSCOMFORT`, `FF-BUSFLEX` | — |
| — | Error `*NO FARES/RBD/CARRIER/PASSENGER TYPE` | — | La tarifa no está disponible para las clases seleccionadas. Cambia las clases y recotiza reemplazando **FXX por FXR**. |
| 6 | Calcular la diferencia de tarifa | `DF 1890 - 1750` | Diferencia de tarifa = valor de cotización nueva − valor del TKT original |
| 7 | Documentar valores a cobrar | `RM*02MAR26* PAX AVDO COSTE PENTY 3279MXN X ADT + 604MXN SF + 2853MXN DF/ WP` y `RM*02MAR26* PAX AVDO COSTE TOTAL CMB 6736MXN/ WP` — guardar hasta aquí con `ER` | — |
| 8 | Eliminar TST | Todos: `TTE/ALL` · Uno solo: `TTE/T1` | `TTE/ALL` (todos los TST) o `TTE/T{n}` (TST específico) |
| 9 | Eliminar todas las formas de pago | `XE 22` | `XE {línea FP}` — 22 = línea del elemento FP |
| 10 | Guardar los vuelos que el cliente va a volar (crear TST) | `FXP/S2,3/FF-BASIC` | `FXP/S#,#/FF-TARIFA` — usa la MISMA transacción con la que cotizaste (FXX↔FXP) para evitar errores |
| 11 | Colocar el TST en reemisión | `TTI/EXCH/T2` | `TTI/EXCH/T{TST}` — 2 = número del TST |
| 12 | Agregar valor de la diferencia | `TTK/T2/T140` | `TTK/T{TST}/T{valor}` — 2 = número del TST · 140 = diferencia de tarifa |
| 13 | Crear el FO (fare override / linking) | ADT/CHD: `FO*L14/P1` · INF: `FOINF*L15/P1` — guardar hasta aquí con `ER` | `FO*L{línea}/P{pax}` — 14 = línea del ticket · P1 = número de pasajero |
| 14 | Solicitar el TSM (de penalidad) | `IU IB NN1 PENF BOG/P1` | `IU {aerolínea} NN1 PENF {origen}/P{pax}` — BOG = origen del cambio · P1 = pasajero |
| 15 | Crear el EMD | ADT: `TMC/L5` · INF: `TMC/L6/INF` | `TMC/L{línea del elemento SVC}` |
| 16 | Verificar que se creó la máscara TSM | Un tipo de pasajero: `TQM` · Varios tipos: `TQM/M1` | — |
| 17 | Ingresar valor de la penalidad y cupón value | `TMI/M1/F3279/CV-3279` — guardar hasta aquí con `ER` | `TMI/M{TSM}/F{penalidad}/CV-{penalidad}` — M1 = número del TSM |
| 18 | Incluir el gasto de gestión | Un TST: `TTO/ST01/CSF/F604` · Varios TST: `TTO/ST01/CSF/F604/T2` | `TTO/ST01/CSF/F{gasto}[/T{tst}]` — Pro tip: verificar con `TQO`. Para eliminarlo si quedó mal: `TTO/ST01/T{tst}` |
| 19 | Incluir datos del titular de la tarjeta (nuevo cyber) | `RM*CSY/JUAN:PELAEZ` — guardar con `ER` | `RM*CSY/{NOMBRE}:{APELLIDO}` |
| 20 | Tomar datos de tarjeta | PCI PAL: Europa → Formas de pago → PCI PAL · Travel Pay: Europa → Formas de pago → Travel Pay | — |
| 21 | Ingresar forma de pago del TST (diferencia de tarifa + GG) | `FP O/CCVI+/MS-TT,VI1234567890123456-1023-V1234ABCD` | `FP O/CCVI+/{token}` — token = trama copiada de PCI o Travel Pay |
| 22 | Ingresar forma de pago del TSM (penalidad) | `TMI/M1/FP-MS-TT,VI1234567890123456-1023-V1234ABCD` | `TMI/M{TSM}/FP-{token}` |
| 23 | Cargar el perfil de PCI en Amadeus | `$$CONFIG:CCTYPE/2` | — |
| 24 | Realizar el cargo a la tarjeta del cliente | `$$PAY` | ⚠️ Confirmar coste total con el cliente ANTES |
| 25 | Borrar el cyber para poder emitir | `XE17` | `XE{línea}` — 17 = línea donde está el cyber |
| 26 | Reconfirmar el itinerario al cliente | — | — |
| 27 | Eliminar las plazas que el cliente NO va a usar | `XE 14` | `XE {línea de los segmentos}` |
| 28 | Emitir el cambio | Penalidad + billete juntos: `TTP1/TTM/T2/M1/ET/RT` · Solo penalidad: `TTM1/M1/RT` · Solo billete: `TTP1/ET/RT/T2` | T2 = número del TST · M1 = número del TSM |
| 29 | Enviar itinerario | Amadeus: `IBP-EMLA/LPSP` (itinerario) · `IEPJ-EMLA/LPSP` (itinerario + servicios) · `ITR-EMLA` (billetes electrónicos) · Resiber: `ITP:/{RESERVA}/{EMAIL}` (itinerario) · `DTR TN 075-1234567890,EML/{EMAIL}` (billetes) · `DEMR DN 075-1234567890,EML/{EMAIL}` (EMD) | SP en Amadeus = idioma español |

## Resumen ultra corto (orden lógico)

```
TWD ................... ticket original (fare basis, DOI, total)
FXX/S.../R,DOI,UP/FF- . penalidad a histórico
FQN...*PE / *CD ....... verificar penalidad (ADT / CHD-INF)
DF (penalidad-descuento) calcular descuento
RM .................... documentar penalidad
FXX/S.../FF- .......... cotizar vuelos que SÍ va a volar (o FXR si error de tarifa)
DF (nueva - original) . diferencia de tarifa
RM + ER ............... documentar valores, guardar
TTE/ALL ............... eliminar TST viejo
XE {línea FP} ......... eliminar forma de pago
FXP/S.../FF- .......... guardar nueva tarifa (crea TST)
TTI/EXCH/T# ........... TST en reemisión
TTK/T#/T{valor} ....... agregar diferencia
FO*L#/P# + ER ......... crear FO, guardar
IU {AL} NN1 PENF {org}/P# .. solicitar TSM de penalidad
TMC/L# ................ crear EMD
TQM [/M#] ............. verificar máscara TSM
TMI/M#/F{val}/CV-{val} + ER  cargar penalidad y cupón
TTO/ST01/CSF/F{gg}[/T#]  incluir gasto de gestión (verificar con TQO)
RM*CSY/{nombre}:{apellido} + ER  titular de la tarjeta
FP O/CCVI+/{token} .... forma de pago del TST
TMI/M#/FP-{token} ..... forma de pago del TSM
$$CONFIG:CCTYPE/2 ..... cargar perfil PCI
$$PAY ................. cobrar (¡confirmar costo con cliente antes!)
XE {cyber} ............ borrar cyber
XE {plazas no usadas} . limpiar plazas sobrantes
TTP1/TTM/T#/M#/ET/RT .. emitir penalidad + billete juntos
IBP- / IEPJ- / ITR- ... enviar documentación al cliente
```

> Los ejercicios de práctica del usuario relacionados con este flujo (PNR
> reales que hizo en el sistema) NO están en este archivo — son práctica,
> no manual. Ver `EJERCICIOS_USUARIO_AMADEUS.md`.
