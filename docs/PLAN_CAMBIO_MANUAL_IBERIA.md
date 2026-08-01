# Plan — Módulo "Cambio Voluntario Manual" en el simulador

> Fuentes: `MANUAL_CAMBIO_VOLUNTARIO_SIN_SEGMENTO.md` (29 pasos),
> `MANUAL_CAMBIO_VOLUNTARIO_CON_SEGMENTO.md` (34 pasos),
> `NOTAS_IBERIA_PROMPT2.md` (comandos de cotización + cambio de solo ida) y
> `EJERCICIOS_USUARIO_AMADEUS.md` (PNR reales de práctica). Auditado contra
> el código real de `PnrStateMachine.js` (no solo contra la documentación).
> Este documento es SOLO plan — nada de código tocado todavía.

## Por qué esto importa

Este es el flujo real de **reemisión con penalidad** que se usa en el
trabajo diario (cambios de vuelo, cálculo de diferencia de tarifa, gasto de
gestión, EMD de penalidad). El simulador hoy cubre la **venta y emisión
inicial** (SN/AN → SS → NM → FXX/FXP → TTP) y el **módulo de equipaje**
(SRXBAG → FXG → TQM → TMI → TTM), pero **no tiene nada de reemisión/cambio**.
Es el hueco más grande que queda en el simulador frente al trabajo real.

## Hallazgo clave — arquitectura parcialmente reutilizable

El módulo de equipaje que ya existe (`handleAddBaggage`, `handleSaveBaggage`,
`handleShowTsm`, `handleSetFop`, `handleIssueTsm` en `PnrStateMachine.js`) usa
exactamente los mismos comandos que ambos manuales necesitan para la
**penalidad**: `TQM` (ver máscara), `TMI` (cargar valor + forma de pago),
`TTM` (emitir). La diferencia es el **tipo de servicio** dentro del TSM: hoy
solo existe `'XBAG'`; estos manuales necesitan `'PENF'` (penalidad).

✅ **Actualización (01AGO26): todo lo de abajo ya está implementado** (para
el Nivel 23 — versión mínima de la numeración, sin colección completa de
TST/TSM simultáneos, diferida al Nivel 25). Se deja el diagnóstico original
como registro de por qué se hizo así:

⚠️ **Corrección tras auditar el código (no es tan simple como "un
parámetro nuevo"):**
- `state.tst` y `state.tsm` son hoy **objetos únicos** (`{ number: 1, ... }`
  fijo), no colecciones. Ambos manuales referencian TST/TSM por número
  (`TTI/EXCH/T2`, `TTK/T2/T140`, `TTP1/TTM/T2/M1/ET/RT`, `TQM/M1`), lo que
  implica **varios TST/TSM coexistiendo** en el mismo PNR (el original +
  el nuevo tras reemisión). Hay que pasar de objeto único a colección con
  numeración — es un cambio de forma de datos, no un parámetro nuevo.
- `handleShowTst` (`TQT`) hoy rechaza cualquier línea que no sea la 1 —
  depende del mismo cambio de arriba.
- Cuando se borra el TST (`TTE/ALL`) y se crea uno nuevo (`FXP`), el manual
  espera que el nuevo se numere **T2** (numeración continua de la
  transacción), no que reinicie en 1 como hace el motor hoy. Si no se
  corrige, la respuesta "correcta" que el simulador exige puede no
  coincidir con lo que el manual real enseña — impacto pedagógico directo.
- **Bug real si se implementa tal cual el manual pide:** `handleFP`
  (comando `FP` normal) y `handleSetFop` (`TMI/.../FP-`) escriben hoy en el
  **mismo campo** `state.fop`. El manual exige formas de pago
  **independientes** para el TST (diferencia+GG, `FP O/CCVI+/token`) y para
  el TSM (penalidad, `TMI/M1/FP-token`). Sin separar `state.tst.fop` de
  `state.tsm.fop`, seguir el manual paso a paso pisaría una forma de pago
  con la otra sin ningún error visible.
- `TWD` necesita **archivar** fare basis/DOI/total en el momento exacto de
  `TTP` (antes de que la siguiente `FXP` sobreescriba `state.tst`). Hoy
  `handleIssueTicket` genera un número de billete aleatorio que no se
  persiste en ningún lado. Por eso su complejidad real es **Alta**, no
  Media como se estimó antes de revisar el código.

## Dos variantes del procedimiento — comparten arquitectura, NO comparten código de tarificación

| | SIN segmento volado (29 pasos) | CON segmento volado (34 pasos) |
|---|---|---|
| Cuándo aplica | Cliente no voló ningún tramo | Cliente ya voló parte del itinerario |
| Buscar penalidad | `FXX/S.../R,{DOI},UP/FF-{tarifa}` (a histórico) | `FQD` (por segmento) o `FQP` (roundtrip directo/escala/surface) |
| Elegir tarifa cotizada | — | `FQQ{n}` |
| Construir el TST del cambio | `TTI/EXCH/T{n}` (reutiliza TST existente) + `TTK/T{n}/T{valor}` | `TTC/S{línea}` (máscara nueva desde segmentos volados) + `TQTC` (modo cryptic) + `TTI` en 3 sub-pasos (farebasis+equipaje / fare+tasas+diferencia / fare calculation) |
| Complejidad de implementación | Menor — reutiliza casi todo lo del módulo de venta | Mayor — necesita lógica nueva de construcción de máscara y un `TTI` multi-modo |

Recomendación: **implementar primero la variante SIN segmento volado**
completa (valida la arquitectura), y evaluar después si CON segmento
volado se hace como extensión del mismo motor o como módulo aparte.

## Comandos genuinamente nuevos que faltan en el DSL

| Comando | Manual | Función | Complejidad estimada |
|---|---|---|---|
| `TWD/TKT {billete}` / `TWD/L{n}` | Ambos | Ver detalle de un billete emitido (fare basis, DOI, total) | **Alta** — requiere archivar el TST en el instante de `TTP`, antes de que se pierda con la siguiente `FXP` (ver hallazgo clave) |
| `TWD/TAX` | Ambos (confirmado en ejercicio real) | Ver desglose de tasas/fees del billete abierto | Baja — variante de `TWD` |
| `FXR` | SIN segmento | Recotización alternativa cuando `FXX` da error de tarifa/clase | Baja — variante de `handlePrice`, mismo cálculo |
| `TTE/ALL` / `TTE/T{n}` | Ambos | Eliminar TST | Media — depende de que `state.tst` pase a colección numerada |
| `TTI/EXCH/T{n}` | SIN segmento | Marcar el TST como "en reemisión" | Media — depende de la numeración correcta (T2, no T1) |
| `TTK/T{n}/T{valor}` | SIN segmento | Agregar la diferencia de tarifa al TST | Baja, una vez resuelta la colección de TST |
| `FO*L{n}/P{n}` / `FOINF*L{n}/P{n}` | Ambos | Fare Override (vincula tarifa a pasajero/línea) | Media |
| `IU {AL} NN1 PENF {org}/P{n}` | Ambos | Solicitar el TSM de penalidad (en vez de `SRXBAG`) | Baja — mismo patrón que `handleAddBaggage`, service `'PENF'` |
| `TQO` | Ambos | Verificar que el gasto de gestión quedó agregado | Baja |
| `$$CONFIG:CCTYPE/2` / `$$PAY` | Ambos | Perfil de tarjeta + cobro | Media — ya mencionado en `MATERIAL_EMISION_DAVID.md` (pendiente de implementar también) |
| `TTP1/TTM/T{n}/M{n}/ET/RT` | Ambos | Emisión combinada billete+EMD en un solo comando | Media — combina 2 handlers existentes, requiere que `state.fop` del TST y del TSM estén separados |
| `FQD` | CON segmento | Penalidad por segmento (`/A{al}/C{clase}/D{fecha}/R,{DOI},UP`) | Baja |
| `FQP` (roundtrip directo/escala/surface) | CON segmento | Penalidad o diferencia con itinerario completo ida-vuelta | Alta — 3 variantes de sintaxis distintas |
| `FQQ{n}` | CON segmento | Seleccionar una tarifa de las ofertadas por FQP | Baja |
| `TTC/S{línea}` | CON segmento | Crear la máscara del cambio desde segmentos volados | Alta — no hay equivalente hoy en el motor |
| `TQTC` | CON segmento | Colocar el TST en modo cryptic | Media |
| `TTI` multi-modo (`/L.../B.../V.../A...`, `/R.../E.../O.../T...`, `/C ...`) | CON segmento | Cargar farebasis+equipaje, fare+tasas+diferencia, y fare calculation en 3 llamadas separadas | Alta — mismo nombre de comando que `TTI/EXCH` pero comportamiento totalmente distinto |
| `IBP-`/`IEPJ-`/`ITR-`/`ITP:`/`DTR`/`DEMR` | Ambos | Envío de itinerario/documentación | **Fuera de alcance recomendado** — no cambian el estado del PNR, son mensajería; no aportan valor de práctica de comandos crípticos |

## ✅ `DF` — resuelto (decisión del usuario)

`DF` es **un solo comando con múltiples sintaxis según el contexto**, no
transacciones distintas que comparten letra por error de transcripción:

- **Suma / multiplicación** (ya implementado en `handleFareSummation`, del
  manual de clase original — **no se toca, queda igual**):
  `DF valor1;valor2;valor3;gastos*cantidadPax` — suma con `;`, multiplica
  con `*`. Ejemplo real ya en el motor: `DF 2200000;1000000;860000; 240000*3`.
- **Resta** (sintaxis nueva que hay que agregar al mismo comando, para
  diferencia de tarifa y penalidad menos descuento):
  - `DF 150 P 75` → penalidad ADT menos descuento (`P` = separador de resta
    con etiqueta de descuento)
  - `DF 1890 - 1750` → diferencia = cotización nueva − ticket original
  - `DF 267.19 - 267.19` → mismo caso, diferencia = 0 (Ejercicio 2 real)

**Implementación:** en `handleFareSummation`, detectar si la expresión
contiene `-` o `P` (modo resta) en vez de `;`/`*` (modo suma), y ramificar
el cálculo — mismo comando (`DF`), mismo handler, dos modos de parseo. No
requiere una transacción nueva en el DSL.

## 🔍 Auditoría multi-agente (01AGO26) — riesgos verificados antes de programar

4 agentes expertos auditaron en paralelo, cada uno un ángulo distinto, todo
en modo solo-lectura contra el código y los documentos reales (no contra
suposiciones). Resumen de lo que aporta cada uno más allá de lo ya escrito
arriba:

### A. Parser (`src/engine/DslParser.js`) — riesgo real para `TTI` y comandos multi-modo

- El parser es genérico y data-driven (lee `commands_meta.json`), así que
  **agregar entradas nuevas sí escala** mecánicamente.
- Pero **no existe ningún concepto de "sub-modos" de un mismo `code`**. Hoy
  cada comando tiene UN esquema de tokens. `TTI` necesita 4 sintaxis
  distintas bajo el mismo nombre (`/EXCH/T{n}`, `/T2/L1/B.../V.../A...`,
  `/R.../E.../O.../T...`, `/C ...`) — con la arquitectura actual, la única
  forma de meterlo es un token catch-all (`"^(.+)"`, mismo patrón que ya
  usan `FXX`/`FXP`/`TTP`) y delegar el 100% de la discriminación al handler
  en `PnrStateMachine.js`, a mano, con `.includes()`/regex manuales.
- **Hallazgo colateral importante:** la validación de formato del parser
  (`payloadPattern`) se salta por completo en cuanto un comando declara
  `tokens` (`DslParser.js:58`). Como casi todos los comandos nuevos
  necesitarán un token catch-all, **ninguno tendrá validación de formato
  real** — un error de tecleo del estudiante no dará "FORMAT ERROR" limpio,
  fallará más abajo, dentro de la lógica de negocio, con mensajes menos
  predecibles.
- `TTP1/TTM/T{n}/M{n}/ET/RT` (emisión combinada) rompe la premisa "un
  comando = un handler": el parser lo vería como `TTP` con todo el resto
  (incluido el `TTM` embebido) en un solo blob de texto.
- Desambiguación de prefijos compartidos (`TT*`, `FQ*`) hoy funciona por
  casualidad (solo hay 3 comandos "TT" y todos miden igual). La regla real
  es "código más largo gana"; un empate se resuelve por **orden de
  declaración en el JSON**, sin ningún aviso — con ~10 comandos "TT*"/"FQ*"
  combinados, hace falta más disciplina (y tests) que hoy no existen.

### B. UI/UX del modo guiado — tamaño real del cambio

- `Terminal.jsx::submitCommand` ejecuta **todas las líneas de un envío
  ciegamente** en un `forEach`, sin ningún punto de intercepción entre
  línea y línea — es el obstáculo estructural real para un modo de "un
  comando esperado a la vez, bloqueante".
- `App.jsx::handleExecuteCommand` es el punto de control correcto para
  insertar el gating (todo el estado ya vive centralizado ahí vía Context),
  así que **no hace falta reestructurar el árbol de componentes**.
- Los "chips" de `ScenarioSelector.jsx` (done/current/pending) son
  **puramente decorativos** — comparan texto normalizado contra
  `suggestedFlow`, nunca bloquean nada, y el propio código lo advierte:
  *"es guía visual, NO evaluación"*.
- El `DslParser` ya devuelve un AST estructurado (`{ code, params }`), que
  es mejor base para un validador de paso real que el matching de texto
  literal que usa `chipStatus` hoy — pero esa conexión no existe todavía.
- **Estimación honesta:** no es "agregar una prop", tampoco es "reescribir
  todo". Son 4 frentes reales: (1) romper el supuesto de multilinea libre
  en `Terminal.jsx`, (2) un esquema de "paso esperado" más rico que el
  `suggestedFlow` de texto plano actual, (3) un validador semántico de paso
  que no existe en ningún archivo hoy, (4) la lógica de gating en
  `App.jsx`. El renderizado de chips de `ScenarioSelector.jsx` sí es
  reutilizable casi tal cual.

### C. Testing/regresión — salto de escala sin precedente

- El flujo encadenado más largo que existe hoy en `test-regression.js` es
  de **4 comandos** (equipaje/EMD); el escenario más largo del catálogo es
  de **11 pasos** (`scenario-22`). El módulo nuevo pide **29-34 pasos** — no
  es "más de lo mismo", es un salto de escala sin precedente en el repo.
- `EvaluationEngine` es 100% outcome-based y ciego al orden — no existe
  ninguna infraestructura para probar que el motor **rechace** un comando
  por estar fuera de secuencia, que es justo lo que un modo estricto
  necesitaría validar. El patrón actual (`probarTolerancia`,
  `probarRegresionNegativa`) no está diseñado para esa clase de aserción.
- No hay Jest/Vitest: `test-regression.js`/`test-parser.js` son scripts
  Node planos sin runner; Playwright solo cubre 3 specs de humo de UI.
- **No hay ningún CI que corra estos tests.** El único workflow de GitHub
  Actions del repo (`evals.yml`) pertenece a un sistema no relacionado
  ("repofibe") — confirmado con grep, cero referencias a
  `PnrStateMachine`/`EvaluationEngine`/`scenarios.json`. Todo el testing de
  este módulo depende hoy de ejecución manual antes de cada deploy.

### D. Consistencia de contenido — 6 discrepancias nuevas encontradas y anotadas

Además de `DF` (ya resuelto), se encontraron y ya se anotaron directamente
en los archivos fuente (verbatim preservado, solo con nota de auditoría):
`FQQ01` vs `FQQ 01` (espaciado inconsistente en `CON_SEGMENTO`, sin
resolver — probable error de transcripción, no afecta la lógica), el valor
de "SF" que cambia de 680MXN a 604MXN entre pasos del mismo caso en AMBOS
manuales (el total solo cuadra con 604 — probable error de transcripción
heredado de la fuente original, sin resolver), y `XE 22` (con espacio,
manual) vs `XE13` (sin espacio, ejercicio real — no funcionalmente
relevante). También se corrigió la descripción de `FQP` como "pasivo" en
`NOTAS_IBERIA_PROMPT2.md` vs su uso "activo" real en `CON_SEGMENTO`.

✅ **Las otras dos ya se resolvieron con el usuario (01AGO26):**
- El sufijo `,UP` de `FQP` es solo un modificador/orden que se agrega o
  quita según haga falta, sin significado de negocio más profundo
  documentado — no es un patrón a descifrar, se mantiene tal cual aparece.
- La contradicción de moneda del Ejercicio 2 ("35 USD" del profesor vs
  "35EUR" en el `RM` practicado) **no era un error**: el gasto de gestión
  se cobra según la moneda del billete/origen del cliente, y la conversión
  se hace con el comando **`FQC`** (`FQC{monto}{origen}/{destino}`, ej.
  `FQC35USD/COP`) — comando que **ya existe** en
  `commands_meta.json` y por tanto ya está soportado por el parser sin
  trabajo adicional.

Se confirmó también que el hueco de información entre los pasos 2b→5 del
manual SIN segmento (falta el `AN`/`SS` de la nueva plaza) ya estaba
correctamente parcheado en el Nivel 21 usando el Ejercicio 2 real — no
requiere acción adicional.

## Escenarios propuestos (por orden de complejidad)

> ⚠️ **Renumeración (01AGO26):** `scenarios.json` ya tenía ocupados
> `scenario-21` (Equipaje Extra) y `scenario-22` (Examen) con contenido no
> relacionado. Este módulo se implementó como **Nivel 23** (no 21), para no
> chocar con esos ids y mantener la convención id↔título 1:1 del archivo.
> Los niveles siguientes de este módulo corren desde ahí: 23, 24, 25.

### ✅ Nivel 23 — Cambio Voluntario Manual: solo la ida (Intermedio) — IMPLEMENTADO

`scenario-23` en `public/profiles/amadeus/scenarios.json`, construido sobre
el PNR real (`DA SILVA/RONALDO(CHD/13FEB20)`, billete con `TWD/TKT`
mostrando DOI `30JUL26`, fare basis ida `NDHNENM2/CH`, total `EUR 267.19`)
del `Ejercicio 2` en `EJERCICIOS_USUARIO_AMADEUS.md`. Mueve solo la ida +2
días, sin tocar la vuelta. Secuencia real implementada y verificada por
`test-regression.js` (23/23 escenarios, incluidas 6 pruebas de tolerancia y
2 regresiones negativas nuevas para este módulo):

```
TWD/TKT{billete}       → copiar DOI, fare basis, total del billete emitido
AN{fecha}{ruta}        → disponibilidad de la nueva ida
SS1{clase}{línea}      → vender la nueva plaza
FXX/S{n}/FF-{tarifa}   → cotizar informativo
DF {nueva} - {original} → diferencia de tarifa
RM + ER                → documentar y guardar
TTE/ALL                → eliminar el TST viejo
FXP/S{n}/FF-{tarifa}   → nueva tarifa (TST renumera a T2, no reinicia en T1)
TTI/EXCH/T2 → TTK/T2/T{valor} → FO*L{n}/P{n}
IU {AL} NN1 PENF {org}/P{n} → TMC → TQM
TMI/M{n}/F{valor}/CV-{valor}   → valor de la penalidad en el TSM
TTO/ST01/CSF/F{gg} → TQO       → gasto de gestión
RM*CSY/... + ER                → titular de la tarjeta (¡RM resetea isTransacted, hay que volver a ER!)
FP {forma} (TST) → TMI/FP-{forma} (TSM)  → formas de pago independientes
XE{línea}               → elimina la plaza vieja que ya no se usa
TTP1/TTM/T2/M1/ET/RT    → emisión combinada billete + EMD
```

**Valores de ejemplo del profesor para practicar** ("llamada desde
México"): `GG = 35 USD` (cobrado en la moneda del billete vía `FQC`, ver
sección `DF`/moneda arriba), `PENTY` y `DF` variables según el caso.

**Comandos nuevos implementados**: `TWD/TKT`, `TWD/L{n}`, `TWD/TAX`,
`TTE/ALL`, `TTE/T{n}`, `TTI/EXCH/T{n}`, `TTK/T{n}/T{valor}`, `FO*L{n}/P{n}`,
`FOINF*L{n}/P{n}`, `IU {AL} NN1 PENF {org}/P{n}`, `TMC`, `TQO`,
`TTP1/TTM/T{n}/M{n}/ET/RT`, y una sub-sintaxis nueva de `TMI`
(`TMI/M{n}/F{valor}/CV-{valor}` — carga el valor de la penalidad, un paso
del manual que se había pasado por alto en el diseño inicial y se detectó
recién al construir el escenario real).

### ✅ Nivel 24 — Cambio Voluntario Manual completo, ambos segmentos (Avanzado) — IMPLEMENTADO

`scenario-24` en `scenarios.json` (01AGO26), construido sobre el mismo
pasajero real (`DA SILVA/RONALDO(CHD/13FEB20)`, billete 075-1000213262 del
`Ejercicio 1`, Intento 1). A diferencia del Nivel 23 (solo la ida), este
mueve **ambos segmentos** — ida 11MAR→18MAR y vuelta 11ABR→18ABR — con dos
llamadas `AN`/`SS` independientes, dos `DF` (penalidad y diferencia), y un
`XE2,3` final para limpiar los dos segmentos viejos de una vez. No usó
comandos nuevos — toda la infraestructura construida para el Nivel 23 se
reutilizó sin cambios (confirma que el diseño del Nivel 23 sí generaliza).
Sin cambios en `EvaluationEngine.js` (se reutilizaron los mismos target
checks, más `segmentsCount: 2` que ya existía como check genérico). 24/24
escenarios en verde, verificado 5 veces seguidas sin fallos intermitentes.

**Simplificaciones deliberadas frente al manual real** (documentadas para
que no se confundan con errores): la penalidad "a histórico" (`FXX/.../R,
{DOI},UP/FF-...`) no filtra realmente por segmento ni usa el DOI para
recalcular — el motor de precios (`handlePrice`) no tiene ese filtro (ver
auditoría del parser arriba); mecánicamente el comando se ejecuta y
devuelve éxito, pero el monto no es "históricamente exacto". Aceptable
porque la evaluación se basa en invariantes de flujo (se usó `DF`, se marcó
la reemisión, etc.), no en verificar el monto exacto.

### Nivel 25 (futuro, requiere más trabajo previo) — Cambio con segmento volado

Basado en `MANUAL_CAMBIO_VOLUNTARIO_CON_SEGMENTO.md` (34 pasos). No se
recomienda abordarlo hasta tener el Nivel 24 funcionando y validado, porque
introduce comandos de alta complejidad sin equivalente actual
(`TTC`, `TQTC`, `TTI` multi-modo, `FQP` con 3 variantes de ruta).

## Orden de ejecución — Nivel 23: ✅ completado (01AGO26)

1. ✅ Separado `state.fop` en `state.tst.fop` / `state.tsm.fop`.
2. ✅ `state.tst`/`state.tsm` mantienen numeración continua vía
   `tstCounter`/`tsmCounter` (versión mínima: un TST/TSM activo a la vez,
   pero numerado correctamente — T2 tras un `TTE`+`FXP`, no reinicia en
   T1). La colección completa con varios TST/TSM simultáneos sigue
   diferida al Nivel 25.
3. ✅ Sintaxis de resta en `DF` implementada (mismo comando, dos modos
   nuevos: diferencia `DF nueva-original` y penalidad-descuento
   `DF penalidad P descuento`, además del modo suma original intacto).
4. ✅ Implementados: `IU...PENF`, `TQO`, `TWD/TAX`. (`FXR` quedó fuera de
   esta iteración — no lo necesita el Nivel 23; se hará junto al Nivel 24).
5. ✅ `TWD/TKT`/`TWD/L{n}` implementado con `state.issuedTicket`, un campo
   separado del TST activo (no requirió archivar en el instante de `TTP`
   porque el nivel siembra el billete ya emitido vía `initialState`).
6. ✅ `TTE`, `TTI/EXCH`, `TTK` implementados.
7. ✅ Emisión combinada `TTP1/TTM/T{n}/M{n}/ET/RT` implementada.
8. ⏳ `$$CONFIG`/`$$PAY` — sigue pendiente, no lo necesitó el Nivel 23
   (se pagó con `FP CASH,`/`TMI/FP-CASH,` directamente, sin tarjeta).
9. — (el Nivel 23 solo usa `TTI/EXCH`, no el `TTI` multi-modo — ese diseño
   sigue pendiente para el Nivel 25).
10. ✅ Nivel 23 creado (`scenario-23`) con el `Ejercicio 2` real como punto
    de partida.
11. ✅ Nivel 24 creado (`scenario-24`) con el `Ejercicio 1` real como punto
    de partida — confirmó que la infraestructura del Nivel 23 generaliza
    sin comandos nuevos.
12. ✅ `test-regression.js` extendido: 6 pruebas de tolerancia nuevas (DF
    resta/penalidad, renumeración T2, separación FP TST/TSM, TWD tras
    reemisión, valor de penalidad en TSM) + 1 regresión negativa específica
    del Nivel 23 (no completa sin `TTI/EXCH`). 24/24 escenarios en verde,
    verificado 5 veces seguidas sin fallos intermitentes (la disponibilidad
    dinámica de vuelos usa clase `Y`, siempre abierta). El rechazo de
    comandos fuera de secuencia sigue sin infraestructura de test (no hace
    falta mientras el Escenario actual sea agnóstico al orden).
13. Sigue pendiente evaluar el Nivel 25 (con segmento volado) — ahí sí
    hacen falta comandos nuevos (`TTC`, `TQTC`, `TTI` multi-modo, `FQP`
    roundtrip) que no se necesitaron para 23/24.

## Pendiente de decisión del usuario/instructor

- Si el envío de itinerario (`IBP-`, `ITR-`, etc.) vale la pena simular o se
  deja fuera (mi recomendación: fuera, no aporta práctica de comandos).
- Si el Nivel 25 (con segmento volado) se implementa como módulo separado o
  generalizando el mismo motor de los Niveles 23/24 — decidir al llegar ahí,
  no antes.
- ✅ **Resuelto (01AGO26):** el fork arquitectónico de "Procedimientos
  guiados" — el usuario decidió quedarse con el sistema de Escenarios
  actual (terminal libre, sin bloqueo estricto de secuencia), mejorando la
  guía visual en su lugar. Ver `MANUAL_CAMBIO_VOLUNTARIO_SIN_SEGMENTO.md`
  para el manual completo del Nivel 24, y la sección "Guía visual" abajo
  para lo implementado.
- $$CONFIG/$$PAY (tarjeta) sigue sin implementarse — unificar con
  `MATERIAL_EMISION_DAVID.md` cuando se aborde.

## Guía visual — implementado (01AGO26)

- `Terminal.jsx`: se quitó el límite de 3 apariciones por dispositivo del
  tip de error (`localStorage.tipErrorCount`) — la queja original del
  usuario era exactamente esta: la ayuda se apagaba sola justo cuando más
  se necesitaba. Ahora el tip aparece siempre que el último comando falló.
- No se tocó `ScenarioSelector.jsx`/chips — siguen siendo decorativos
  (no vinculantes), tal como se decidió al descartar el modo estricto.
