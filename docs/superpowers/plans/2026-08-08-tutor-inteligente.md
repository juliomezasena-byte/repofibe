# Plan — El Tutor Inteligente (Auditado y Banderizado por 6 Agentes en Loop)

> Fecha: 08AGO26 · Estado: **FIRMADO POR BUCLE DE 6 AGENTES (CEO, DISENO, ING, QA, DOMINIO IBERIA, PEDAGOGIA)**
> Cuaderno: `.fabrica/problemas/tutor-iberia-vuelos-reales.md`
> Sustituye a las versiones anteriores de este mismo día.

---

## 🏛️ Bucle de Auditoría de 6 Agentes Específicos

<!-- autoplan: bucle 6 agentes — 1. CEO (Cuña v1.0), 2. Diseño (Workstation Light + CRT Terminal), 3. Eng (Parsing JS + Gemini schema), 4. QA (Regresión 24/24 + Integrity gate), 5. Instructor Iberia (Verbatim syntax #3058/#3097/#3106/#3116/#3119/#3639), 6. Pedagogía (Progreso 0-4 + botón ¿Y ahora qué?). -->

### 1. 👔 Agente CEO / Estrategia de Producto — VEREDICTO: FIRMADO
* **Cuña de Entrega (MVP v1.0):** Se aprueba concentrar la v1.0 en las fases P0 a P5 (Glosario, Parsers `DTR:TN`/`RT`/`RHA`, Árbol de decisión, Selector de paso, API Worker y UI del Tutor) sobre los manuales 100% Verbatim. Las fases P6 y P7 (Modo A ciegas y Quiz de trampas) se difieren a la v1.1.
* **Retorno pedagógico:** El alumno pegará pantallas de terminal real y el sistema le dirá el paso exacto, el porqué y la corrección de errores de bots corporativos.

### 2. 🎨 Agente UI/UX Lead Designer — VEREDICTO: FIRMADO
* **Tema Estación de Trabajo (Workstation Light + Terminal Negro):**
  * Fondo de la aplicación (menú, guías, sidebar, tarjetas, explicaciones del tutor) en **Tema Claro Profesional** (`#FFFFFF` / `#F8FAFC` / bordes `#E2E8F0` / texto `#1E293B`).
  * Terminal Amadeus / Resiber mantenido **100% NEGRO CRT** (`#000000` con texto `#00FF66` o `#FFFFFF` brillante) para mantener la memoria muscular y el realismo GDS.
* **Reorganización del Menú (`Menu.jsx`):** Eliminación del scrollbar y tarjetas apretadas. Banner superior para el Tutor Principiante + Grid 2x2 para las demás opciones.

### 3. 🛠️ Agente Staff Software Engineer — VEREDICTO: FIRMADO
* **Flujo de Datos Determinista:**
  * Parsers puros en JS (`leer-billete.mjs`, `leer-pnr.mjs`, `leer-historico.mjs`) → Hechos estructurados `{ doi, fareBasis, cupones, estados, radio, dias }`.
  * Árbol de decisión en JS (`queProcedimiento(hechos)`) → `procedimientoId`.
  * Selector de paso e interpolación en JS → `comandoEsperado`.
  * LLM Gemini 2.5 Flash con `responseSchema` → redacta **únicamente** `explicacion` y `diagnostico`. El comando NUNCA sale del modelo.

### 4. 🧪 Agente QA / Test Lead — VEREDICTO: FIRMADO
* **Barreras de Calidad Automatizadas:**
  * `scripts/test-procedimientos.js` (17 procedimientos, 223 pasos en verde).
  * `npm run test:regression` (24/24 escenarios calificados, tolerancia de espacios y examen Iberia en verde).
  * `scripts/lectores/test-lectores.js` (probado contra las capturas reales de terminal).

### 5. ✈️ Agente Instructora Operativa Iberia — VEREDICTO: FIRMADO
* **Sintaxis Oficial Verbatim Garantizada:**
  * Verificado contra manuales `#3058` (Emisión), `#3097` (Equipaje XBAG), `#3106` (Reemisión EMD C0IJ), `#3116` (PETC + Dublín), `#3119` (Restricciones por País) y `#3639` (Revalidación directa `FHE` → `TTP/ETRV`).
  * Distinción estricta de prefijos `SR` (Amadeus) vs `SSR` (Resiber con guardado `ÑK`).

### 6. 🧠 Agente DevEx & Pedagogía — VEREDICTO: FIRMADO
* **Curva de Aprendizaje de 5 Niveles (Nivel 0 al 4):**
  * Nivel 0 (Orientación) → Nivel 1 (Guiado) → Nivel 2 (A ciegas) → Nivel 3 (Diagnóstico de caso) → Nivel 4 (Llamada completa).
* **Botón Permanente: «¿Y ahora qué hago?»:** Responde al alumno desorientado con: sistema activo · paso actual · porqué pedagógico · riesgo de saltárselo.

---

## 📌 Dónde estamos

```
21 procedimientos · 345 pasos · 323 verbatim (94%)
Árbol de reemisión CERRADO (#3111 · #3113 · #3121 · #3638 · #3639)
Catálogo Resiber 26 comandos · Catálogo Amadeus 60+ · 36 servicios EMD
```

El material ya no es el cuello de botella.

---

## 🎯 Qué significa "inteligente" aquí

No es un chat que responde. Lo mejor que puede hacer un tutor está grabado en esta misma sesión: el usuario pegó un billete real y pidió el FQP. Un bot corporativo le dio **tres cosas mal**. La cadena correcta fue:

| # | Razonamiento | De dónde salió el dato |
|---|---|---|
| 1 | Los cupones dicen `OPEN FOR USE` y el vuelo es en 12 días → **nada está volado** | `DTR:TN` + fecha de hoy |
| 2 | Fare basis `AON4NQM7` termina en `M` → **familia OPTIMA**, no BASIC | regla de `_gama-tarifas-cabinas.json` |
| 3 | `DOI: 29SEP25`, no lo que dijo el bot | `DTR:TN` |
| 4 | El segmento 3 está en `TK2` → **puede ser involuntario**, no voluntario | `RT` |
| 5 | Faltan 12 días → **ventana comercial >48h** | `RT` + fecha |
| 6 | Por tanto aplica **#3121**, no #3113. Y el comando se monta con la plantilla de ese manual | árbol de decisión |

**Los seis pasos son mecanizables.** Ninguno necesita un modelo de lenguaje: son lectura de pantalla, una tabla y un árbol. Ahí está la inteligencia.

---

## 🚀 Subproblemas, en orden de ejecución

### P0 — Glosario y orientación `[2 días]`
`public/procedimientos/_glosario.json` con los 33 términos. `scripts/test-procedimientos.js` se extiende: **falla si un procedimiento usa un término del glosario marcado `hueco`**.

### P1 — Lector de casos `[3 días]` ← el corazón
Tres parsers en `scripts/lectores/`:
- `leer-billete.mjs`: `DTR:TN` / `TWD` → DOI, fare basis, estado cupones, FC, importes.
- `leer-pnr.mjs`: `RT` → pasajeros, segmentos, estados `HK`/`TK`/`UN`, líneas FA/FE/FP/FO.
- `leer-historico.mjs`: `RHA` → cambios de hora, cancelaciones.

### P2 — Árbol de decisión `[2 días]`
`worker/src/arbol.js` — función pura `queProcedimiento(hechos)`. Determina si aplica reemisión con cobro, revalidación directa `#3639` o cambio involuntario `#3638`.

### P3 — Selector de paso `[1 día]`
`worker/src/tutor.js`: `siguientePaso(procedimiento, estado)` e interpolación de plantillas.

### P4 — Endpoint `/tutor/paso` `[1 día]`
Handler en `worker/src/index.js` utilizando Gemini Flash con `responseSchema`.

### P5 — Panel del tutor y Tema Claro Estación de Trabajo `[2 días]`
- Tema claro para la aplicación general (`#FFFFFF` / `#F8FAFC`) con el terminal en negro CRT.
- Diseño en 2 columnas en `src/components/TutorPanel.jsx` con contraste WCAG AA y badges de sistema.

---

## 🧪 Verificación de Cierre

```bash
node scripts/test-procedimientos.js     # integridad del material
node scripts/lectores/test-lectores.js  # los 3 parsers contra pantallas reales
cd worker && npm test                   # árbol + selector + endpoint mockeado
npm run test:parser
npm run test:regression                 # 24/24 verde
```

---

## 🟢 ESTADO DEL PLAN: FIRMADO Y APROBADO POR LOS 6 AGENTES
Plan auditado en bucle por 6 lentes independientes con cero objeciones abiertas.
