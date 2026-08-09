# Ejecución — cómo se construye el tutor

> Compañero de `2026-08-08-tutor-inteligente.md` (el diseño).
> Esto es la lista de trabajo: qué se toca, en qué orden y cómo se comprueba.
>
> Fecha: sábado 08AGO26 · Material nuevo prometido: **lunes 10AGO26**

---

## El hallazgo que ordena todo el trabajo

**Nada de lo que falta bloquea la construcción.**

Con lo que ya hay —21 procedimientos, 345 pasos, 94% verbatim, árbol de
reemisión cerrado— se puede construir **el tutor entero**. Lo que llegue el
lunes (#3060 reembolsos, #3693 Natiba) añade **cobertura**, no capacidad.

De ahí la restricción de diseño que gobierna todo:

> **Ningún manual nuevo puede requerir código nuevo.**
> Un manual entra como JSON en `public/procedimientos/` y funciona.
> Si hace falta tocar código para que un manual funcione, el diseño está mal.

Eso se verifica el lunes: los manuales nuevos entran y el tutor los usa sin
recompilar nada.

---

## BLOQUE A — este fin de semana (no depende de nadie)

### A1 · Glosario ✅ **HECHO 08AGO26**

**Toca:** `public/procedimientos/_glosario.json` (nuevo) ·
`scripts/test-procedimientos.js`

- [x] Los 33 términos de `medir-vocabulario.mjs`, cada uno con
      `confianza: verbatim | derivado | hueco`
- [x] Los `derivado` llevan de dónde se dedujo; los `hueco` van a la lista de
      preguntas para el instructor
- [x] El guardián falla si un procedimiento usa un término `hueco` sin avisar

```bash
node scripts/medir-vocabulario.mjs      # la lista de entrada
node scripts/test-procedimientos.js     # debe seguir verde
```

**Hecho cuando:** cada término del listado tiene entrada, y la lista de
`hueco` es la agenda de preguntas del lunes.

### A2 · Lector de casos ✅ **HECHO 08AGO26** (84/84)

**Toca:** `scripts/lectores/` (nuevo) — patrón de `parse-an.mjs`, ya probado.

- [x] `leer-billete.mjs` — `DTR:TN` / `TWD` → DOI · fare basis por cupón ·
      estado de cada cupón · FC · importes · placa
- [x] `leer-pnr.mjs` — `RT` → pasajeros · segmentos · `HK`/`TK`/`UN` · líneas
      FA/FE/FP/FO
- [x] `leer-historico.mjs` — `RHA` → `AS`/`CS`/`OS`/`XS` · hora nueva vs
      original · cancelaciones
- [x] `derivar.mjs` — cruza los hechos con las tablas: fare basis → familia ·
      clase → cabina · duración → radio · fecha → ventana 48 h

**Corpus de prueba: pantallas reales que ya tenemos guardadas.**

| Pantalla | Dónde está |
|---|---|
| `DTR:TN` de GARCIABRAVO | conversación 08AGO26 |
| `RT` de KFQQV (2 pax, TK2 + HK2) | conversación 08AGO26 |
| `RHA` con `CS`+`UN1` y `AS`+`TK1` | `manual/Cambios involutarios/` |
| `RHA` con cambio de hora | `manual/Cambios involutarios/` |
| `AN` MAD-BOG | `docs/fuentes/an/mad-bog-15mar.txt` |
| `FXP/FF-BASIC` | `docs/fuentes/SALIDAS-REALES-TERMINAL.md` |

```bash
node scripts/lectores/test-lectores.js
```

**Hecho cuando:** el `DTR:TN` real de esta sesión produce
`{ doi:'29SEP25', familia:'OPTIMA', volado:false, placa:'075' }`.

**Por qué va tan pronto:** si los parsers no aguantan pantallas reales, el
diseño entero se cae. Mejor saberlo el día 2 que el día 20.

---

## ✅ BLOQUE A CERRADO — 08AGO26

```
Glosario: 33 términos · Lectores: 84/84 contra pantallas reales
QA 24/24 · Integridad OK
```

---

## BLOQUE B — lunes, cuando llegue el material

### B1 · Ingesta `[~2 h por manual]`

- [ ] **#3060 REEMBOLSOS** (9 hijos) — desbloquea la única categoría que hoy
      no puede entrar al tutor (`reembolso-ibex-no-pcc` está al 10% verbatim)
- [ ] **#3693 NATIBA** (4 hijos) — es el primer paso de casi todo procedimiento
      y no tenemos nada
- [ ] **#3112 CAMBIO MANUAL** — comprobar si aporta algo sobre #3113 y #3121

### B2 · Preguntas para el instructor

La lista sale sola de los `hueco` del glosario y de las discrepancias
abiertas. Las que ya están cerradas esperando respuesta:

- [ ] Colombia: ¿los importes internos llevan IVA? ¿el tramo 2 es 32,32 o 33,32?
- [x] ~~`FQN 02 * PE` vs `FQN02PE`~~ **RESUELTO 08AGO26 por el usuario: SIEMPRE con asterisco.** Queda por confirmar si la variante CD también lo lleva (`FQN02*CD`).
- [x] ~~Clases en rojo del diagrama: ¿son Avios?~~ **RESUELTO 08AGO26: sí. U (Business) · P (T.Premium) · G y X (T.Económica).**
- [ ] `F` y `Z` salen en la pantalla `AN` pero no en dos diagramas oficiales
- [ ] `DTR:TN` con dos puntos (#3593) vs `DTR TN` con espacio (#3058)
- [ ] Qué son `MADIB0500` y `MADIB0296`
- [ ] Qué significa la constante `UNDCIBAAPP,UP`
- [ ] A qué da derecho un **DOWNGRADING** (no está en la matriz de #3129)

### B3 · Prueba de la restricción de diseño

- [ ] Los manuales del lunes entran **sin tocar una línea de código**

Si hay que tocar código, se para y se arregla el diseño antes de seguir.

---

## BLOQUE C — la semana: el tutor usable

### C1 · Árbol de decisión ✅ **HECHO 08AGO26** (47/47)

**Toca:** `worker/src/arbol.js` (nuevo)

- [x] `queProcedimiento(hechos)` — función pura
- [x] Tests de tabla para las 6 hojas del árbol
- [x] **El caso de esta sesión devuelve `#3121`, no `#3113`** ✅

### C2 · Selector de paso ✅ **HECHO 08AGO26** (28/28)

**Toca:** `worker/src/tutor.js` (nuevo)

- [x] `siguientePaso(procedimiento, estado)`
- [x] `validarComando(paso, escrito)` — usa el campo `validacion` que ya existe
- [x] `construirComando(plantilla, hechos)` + `construirFqp()` — rellena con datos del caso real

**Hecho cuando:** con el caso de esta sesión y el paso 2.2 de #3113 produce
`FQPSCL/AIB/CA/D20AUGMAD-/AIB/CO/D18SEPSCL/R,29SEP25,UP/FF-OPTIMA`

### C3 · Endpoint `/tutor/paso` ✅ **HECHO 08AGO26** (35/35)

**Toca:** `worker/src/index.js` · `worker/src/prompts.js`

- [x] Reutiliza `authenticate()`, `checkAndConsumeQuota()`, `corsHeaders()`
      **sin modificarlos**
- [x] Test con la IA **mockeada**: `comandoEsperado` byte-a-byte contra lo
      construido en JS
- [x] Test de paso `hueco`: NUNCA devuelve comando

### C4 · Panel ✅ **HECHO 08AGO26** (e2e 16/16)

**Toca:** `src/components/TutorPanel.jsx` (nuevo) · `src/index.css`

- [x] Reutiliza `sidebar-panel` / `quiz-big-btn` de `ScenarioSelector`
- [x] Badge de sistema y badge de confianza por paso
- [x] Caja "pega tu pantalla aquí" → lector de casos
- [x] Botón permanente **«¿y ahora qué hago?»**
- [x] e2e Playwright: `generar-split` (5 pasos) de principio a fin

---

## ✅ BLOQUE C CERRADO — 08AGO26

El tutor funciona de punta a punta: árbol → selector → endpoint → panel.

```
integridad OK · lectores 84/84 · worker 121/121 · QA 24/24 · e2e 16/16 · build ✓
```

---

## BLOQUE D — después

- [ ] **D1** Modo A ciegas + puntuación `[1 día]`
- [ ] **D2** Maestría por comando, reutilizando `reviewIntervals: [1,3,7,14]` `[2 días]`
- [ ] **D3** Quiz de trampas, generado desde los datos `[1 día]`
- [ ] **D4** Nivel 4: la llamada completa, uniendo tutor + roleplay `[3 días]`

---

## La prueba de aceptación

No se declara terminado por sensación. Se declara con esto:

> Se le pega el PNR **KFQQV** y el `DTR:TN` de **GARCIABRAVO** de esta sesión.
> El tutor tiene que sacar **solo**:
>
> 1. Nada está volado — los cupones dicen `OPEN FOR USE` y el vuelo es en 12 días
> 2. La familia es **OPTIMA**, no BASIC — el fare basis termina en `M7`
> 3. El DOI es **29SEP25**
> 4. Aviso: el segmento 3 está en `TK2`, puede ser involuntario — comprobar `RHA`
> 5. Aplica **#3121**, no #3113
> 6. `FQPSCL/AIB/CA/D20AUGMAD-/AIB/CO/D18SEPSCL/R,29SEP25,UP/FF-OPTIMA`

Va como test automático, no como demo manual.

---

## Verificación en cada checkpoint

```bash
node scripts/test-procedimientos.js      # integridad del material
node scripts/lectores/test-lectores.js   # parsers contra pantallas reales
cd worker && npm test                    # árbol + selector + endpoint
npm run test:regression                  # 24/24 — el tutor no puede romperlo
npm run test:parser                      # 15/15
npm run test:learning
npm run build
```

**Regla:** ningún bloque se da por cerrado con un test en rojo. Si la
regresión baja de 24/24, se para.

---

## Riesgos de la ejecución

| Riesgo | Señal temprana | Qué hacer |
|---|---|---|
| Los parsers no aguantan pantallas reales | A2 tarda más de 2 días | Reducir a `DTR:TN` solo; el resto se pega a mano de momento |
| El material del lunes exige tocar código | B3 falla | Parar. Arreglar el diseño antes de seguir |
| El endpoint acaba siendo un chat | El test de C3 se pone rojo | Es el guardián: no se toca para "que pase" |
| Se alarga y no se ve nada funcionando | Fin de semana sin nada usable | C4 con `generar-split` (5 pasos) da algo tocable pronto |

---

## Qué se puede empezar ahora mismo

**A1 (glosario).** No depende de nada, no toca código de la app, y es lo que
convierte los manuales en algo que un principiante puede leer.

De paso produce la lista concreta de preguntas para el lunes.
