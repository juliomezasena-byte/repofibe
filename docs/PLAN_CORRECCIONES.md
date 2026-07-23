# Plan de Correcciones — Cryptic Trainer GDS (Amadeus)

> Fuente de verdad: **`COMANDOS DE AMADEUS.docx`** (manual de clase).
> Estado auditado: HEAD `430c3e6` (perfil `amadeus` v1.2.0, 15 escenarios).

## Contexto importante antes de empezar

- **Otra sesión/proceso está commiteando en paralelo** sobre este mismo repo (pasó de 4 a 8 commits durante la auditoría). Antes de aplicar cualquier corrección: **cerrar/pausar la otra sesión** y partir de un árbol limpio (`git status` sin cambios), para no perder trabajo ni generar conflictos.
- Trabajar en una rama: `git switch -c fix/alinear-manual`.

## El manual solo enseña 8 comandos (este es el flujo real de clase)

| Paso | Comando | Ejemplo del manual |
|------|---------|--------------------|
| 1 | `DAN {ciudad}` | `DAN MEXICO` |
| 2 | `DAC {iata}` | `DAC MEX` |
| 3 | `FQC {monto}USD/{moneda}` | `FQC 35USD/DOP` |
| 4 | `SN {fecha} {orig} {dest}` | `SN 12 APR MEX SDQ` |
| 5 | `SS {pax}{clase}{vuelo}` | `SS2C1` |
| 6 | `FXX/FF-{tarifa}/RAD*CH*IN, {oficina}` | `FXX/FF-BUSFLEX/RAD*CH, SDQ` |
| 7 | `DF {v1};{v2};{gg}*{cantPax}` | `DF 2200000;1000000;860000; 240000*3` |
| 8 | `RM *{fecha}* {notas}` | `RM *22JUL26* ADT 2200000, CHD 1000000, INF 860000, GG 240000 COP` |

Los comandos `NM / AP / TK / RF / ER / ET / IG / RT / XE / XI / FXP / TTP / SR / OS / SO` **no están en este manual**. Decisión a tomar con el instructor: dejarlos como "módulo avanzado opcional" y que los escenarios del núcleo (1–15) sigan el flujo del manual.

---

## FASE 1 — 🔴 BLOQUEANTE: `NM` multipasajero (desbloquea 2 ejercicios)

**Archivo:** `src/engine/PnrStateMachine.js` → `handleAddName` (~línea 207).
**Problema:** `NM2PEREZ/JUAN MR/MARIA MRS` guarda **1 solo** pasajero → escenarios **2** y **15** (target 2 pax) nunca llegan a 100%.

Reemplazar el handler por uno que divida por el contador:

```js
handleAddName(params, rawInput) {
  const m = rawInput.match(/^NM(\d+)?(.+)$/);
  const body = (m ? m[2] : '').trim();            // "PEREZ/JUAN MR/MARIA MRS"
  if (!body.includes('/')) return { success: false, error: 'FORMAT ERROR - NAME' };
  const count = parseInt((m && m[1]) || '1', 10);
  const [surname, ...rest] = body.split('/');
  const firsts = rest.join('/').split('/');        // ["JUAN MR", "MARIA MRS"]
  const added = firsts.slice(0, count || 1).map(fn => {
    const p = { id: this.state.passengers.length + 1, name: `${surname}/${fn.trim()}` };
    this.state.passengers.push(p);
    return p;
  });
  return { success: true, passengers: added };
}
```

---

## FASE 2 — 🟠 Alinear escenarios con el manual (no dar mal ejemplo)

Archivo: `public/profiles/amadeus/scenarios.json`.

1. **scenario-2:** enunciado dice MAD→BCN pero el comando es `AN15DECBCNMAD` (invertido y sin vuelo real). Cambiar a **`AN15DECMADBCN`** (existe IB6588/UX7701).
2. **scenario-7:** el enunciado manda `OS AV PASAJERO VIP` pero `suggestedFlow` trae `OS AV PASSENGER IS VIP PLATINUM`. **Unificar** ambos.
3. **scenario-12:** `initialState.searchDestination: "COP"` — **COP es la moneda, no una ciudad**. Cambiar a **`"BOG"`**. Además corregir el default en `PnrStateMachine.js` → `handleSchedule` (`destination || 'COP'` ➜ `'BOG'`).
4. **scenario-13 (DF):** usar los números **exactos del manual**: `DF 2200000;1000000;860000; 240000*3` y actualizar la descripción para que coincida.
   - ⚠️ **Confirmar con el instructor:** en el manual, la suma literal de esa línea da **4.780.000**, pero el manual escribe `TTL 12 900 000`. Hay una inconsistencia en el propio manual. El motor `DF` debe **calcular la suma real** (no fijar 12.900.000). Aclarar la composición correcta de PAX con el docente.
5. **scenario-15 (integrador):** ya sigue el manual (`SN 12 APR MEX SDQ`, `SS2C1`, `FXX/FF-BUSFLEX/RAD*CH, SDQ`). Solo depende del fix de `NM` (Fase 1).

---

## FASE 3 — 🟡 Evaluación real del objetivo (no solo "vio ayuda")

**Archivo:** `src/engine/EvaluationEngine.js`.
Los escenarios **11** (DAN/DAC/FQC) y **13** (DF) solo validan `viewedHelp: true`: un alumno que escriba `HE` aprueba sin practicar. Añadir invariantes reales y trackearlas en `PnrStateMachine` (banderas cuando se ejecuta cada handler):

- scenario-11 → `hasEncoded` (DAN) + `hasDecoded` (DAC) + `hasConverted` (FQC).
- scenario-13 → `usedDf` (se ejecutó `DF`).
- scenario-14 → `remarksCount >= 3` (ya hay `remarks[]`, solo exponerlo como `hasRemarks`).

---

## FASE 4 — 🟡 Fidelidad de datos (para que el caso Rep. Dominicana funcione)

1. **Tasa `USD_DOP`** en `handleConvertCurrency` (`PnrStateMachine.js`): hoy `DOP` cae al default de COP (4150). Agregar `'USD_DOP': 59.0` (verificar valor con la tabla de la clase).
2. **Diccionarios DAN/DAC:** agregar `MEX`/`MEXICO` (ya está) y **`SDQ` / SANTO DOMINGO** (falta), usado en el caso del manual.
3. **`flights.json`:** agregar ruta **MEX→SDQ** con grilla de clases real (incluyendo Business `C`, `J`) para que `SS2C1` valide la clase en vez de vender por vuelo sintético sin grilla.
4. **Regex `SR`** en `commands_meta.json`: `^([A-Z4]{4})` es un typo → **`^([A-Z]{4})`**.

---

## FASE 5 — ⚪ Pulido visible al estudiante

**Archivo:** `src/engine/ResponseGenerator.js` y `src/components/Terminal.jsx`.

1. Typo **`PASENGER`** → `PASSENGER` (emisión TTP).
2. Typo **`emision`** → `emisión` (help).
3. Header **"DSL ENGINE 1.0"** → `1.2.0` (`Terminal.jsx:52`).
4. `HE {comando}` hoy devuelve *"Consulte ...commands_meta.json"*. Renderizar de verdad `syntax` + `examples` + `description` desde el JSON (los datos ya existen).

---

## FASE 6 — ✅ Red de seguridad (esto habría atrapado el bug de NM)

**Archivo:** `scripts/test-regression.js` (`npm run test:regression`).
Escribir un test que, por **cada** escenario, ejecute su `suggestedFlow` completo contra el motor y afirme `evaluationResult.completed === true`. Correrlo en CI antes de cada commit. Un flujo sugerido que no completa = escenario roto.

---

## FASE 7 — 🔄 Cierre del flujo (política de reembolso/cambio + tiquete completo)

> **En construcción** — el usuario irá trayendo la info exacta a medida que la aprendan en clase.

Flujo de cierre según lo indicado:

1. **Consulta del ADT:** el adulto pregunta si el tiquete se puede **cancelar o cambiar** y **si tiene gasto de penalidad**.
2. **Nota final `RM`** que registra esa política (formato del manual):
   - Con penalidad: `RM *{fecha}* FC1,2 TKT REEMB, CHG PENTY {valor} + DF + GG`
   - Sin penalidad: `RM *{fecha}* FC1,2 TKT NO REEMB, CHG NO PENTY + DF + GG`
3. **Emisión final:** el flujo debe entregar el **número de tiquete completo** (hoy `handleIssueTicket` genera `791-XXXXXXXXXX`; confirmar con el manual el formato/longitud real del ticket number).

**Pendiente de confirmar con clase/instructor:**
- Formato y longitud exactos del número de tiquete.
- Qué comando dispara la emisión final en el manual (¿`TTP` u otro?) y qué debe mostrar en pantalla.
- Reglas de penalidad por cabina/tarifa (valores).
- Composición de PAX correcta para que `DF` cuadre con el `TTL` de las notas `RM`.

> A medida que llegue info nueva, se actualiza esta fase y los escenarios correspondientes (14, 15 y el caso integrador Rep. Dominicana / SDQ).

---

## Orden de ejecución recomendado

1. Fase 1 (NM) — imprescindible.
2. Fase 2 (escenarios 2, 7, 12, 13).
3. Fase 6 (test de regresión) — para congelar el arreglo.
4. Fases 3, 4, 5 (evaluación, datos, pulido).

**Criterio de "terminado":** `npm run test:regression` pasa los 15 escenarios en verde y el flujo del manual (DAN→DAC→FQC→SN→SS→FXX/FF→DF→RM) corre sin errores en la terminal.
