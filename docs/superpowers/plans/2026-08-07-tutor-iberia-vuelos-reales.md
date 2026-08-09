# Plan — Tutor IA paso a paso (Resiber + Amadeus), manuales estructurados y vuelos reales

> Cuaderno de razonamiento: `.fabrica/problemas/tutor-iberia-vuelos-reales.md`
> (léelo primero: contiene los hechos DEMOSTRADOS que no se re-litigan).
>
> Fecha: 07AGO26 · Estado: **plan, sin código ejecutado**

---

## La idea en una frase

Una sola estructura de datos — `procedimiento.json` — se renderiza como
**manual**, se recorre como **tutor paso a paso** y se mide como **maestría
por comando**; el siguiente paso siempre lo elige el código, y la IA solo
redacta la explicación. Los vuelos reales entran **congelados** para no
romper la calificación.

## Qué cambia respecto al pedido original

| Pedido | Realidad verificada | Qué se hace |
|---|---|---|
| "Analiza la APK" | No hay APK: es una PWA (Vite+React 19, Firebase Hosting) | Se analiza la app. Empaquetar como APK (TWA) es otra conversación |
| "Google tiene una API de vuelos" | **Falso.** QPX Express murió en 2018; hoy solo enterprise o scrapers | Se usa **Amadeus Self-Service** (mismo vendor del GDS que enseñas) |
| "Crear los manuales" | Los manuales son **de Iberia**, distintos de Amadeus, con huecos | Manuales estructurados con marca de **sistema** y de **confianza** |
| — | **El trabajo cruza 2 sistemas: Resiber (cotizar) + Amadeus (pagar)** | Perfil `resiber/` hermano de `amadeus/` |

---

## Contrato central: `procedimiento.json`

Ruta: `public/profiles/<sistema>/procedimientos/<slug>.json`

```json
{
  "id": "cambio-voluntario-sin-segmento",
  "titulo": "Cambio Voluntario Manual (sin segmento volado)",
  "aerolinea": "IB",
  "fuente": {
    "documento": "docs/MANUAL_CAMBIO_VOLUNTARIO_SIN_SEGMENTO.md",
    "tipo": "manual-oficial-interno",
    "fecha": "2026-07-30",
    "confianzaGlobal": "verbatim"
  },
  "pasos": [
    {
      "n": 1,
      "sistema": "amadeus",
      "proceso": "Abre el TKT y copia el fare basis, el DOI y el valor total",
      "comando": "TWD/TKT 075-1422342526",
      "plantilla": "TWD/TKT {numeroBillete}",
      "variantes": ["TWD/L16"],
      "explicacion": "075-1… = número del billete. TWD/L{n} — 16 = línea de billete",
      "confianza": "verbatim",
      "validacion": { "tipo": "regex", "patron": "^TWD/(TKT\\s?[0-9-]+|L\\d+)$" },
      "erroresComunes": []
    },
    {
      "n": 2,
      "sistema": "resiber",
      "proceso": "Buscar el valor de la penalidad",
      "comando": null,
      "explicacion": "Desde IBERIA.COM → Tus vuelos → Gestiona tu reserva",
      "confianza": "hueco",
      "nota": "El material no da el comando Resiber para este paso. Confírmalo con el instructor antes de usarlo."
    }
  ]
}
```

**Reglas de integridad (las hace cumplir `scripts/test-procedimientos.js`):**

1. Todo paso con `confianza: "verbatim"` **debe** tener `fuente` heredada o propia.
2. Todo paso con `confianza: "hueco"` **debe** tener `comando: null` y una `nota`.
   Un `hueco` con comando es un fallo de test — es exactamente la alucinación
   que este diseño existe para impedir.
3. Todo paso **debe** declarar `sistema`.
4. `confianza` ∈ `verbatim | derivado | hueco`. `derivado` exige `nota`
   explicando de qué se dedujo.

---

## Contrato del tutor: `/tutor/paso`

Worker (`worker/src/index.js`), handler nuevo. Reutiliza `authenticate()`,
`checkAndConsumeQuota()` y `corsHeaders()` **sin modificarlos**.

**Request**
```json
{ "procedimientoId": "...", "pasoActual": 3, "comandoEscrito": "TWD/L16", "estadoPnr": { } }
```

**Response**
```json
{
  "paso": 4,
  "sistema": "amadeus",
  "comandoEsperado": "FXX/S2,3/R,02FEB26,UP/FF-BASIC",
  "confianza": "verbatim",
  "explicacion": "<texto redactado por la IA>",
  "veredictoComandoAnterior": "correcto | incorrecto | parcial",
  "diagnostico": "<por qué falló, redactado por la IA>"
}
```

**La regla que hace que esto no alucine:** `comandoEsperado`, `sistema`,
`paso` y `confianza` se copian **literalmente del JSON en código JavaScript**.
La IA recibe el paso ya elegido y **solo** rellena `explicacion` y
`diagnostico`. El `responseSchema` de Gemini (ya usado en
`worker/src/gemini.js:36-47`) restringe la salida a esos dos campos de texto.

Si el paso tiene `confianza: "hueco"`, el handler **corta antes de llamar a
la IA** y devuelve la `nota` del JSON tal cual.

---

## Subproblemas, en orden de ataque

El orden es **por incertidumbre, no por facilidad**. Los vuelos van al final
a propósito: son lo menos incierto y lo que más puede romper la suite verde.

### S0 — Ingesta del material `[independiente]` ← empieza aquí

Sin saber qué comandos existen, todo lo demás es adivinar.

1. Extraer `COMANDOS DE AMADEUS.docx`, `MATERIAL DE APOYO DE COMANDOS
   AMADEUS.docx/.pdf` a Markdown crudo en `docs/fuentes/`.
2. **Pedir al usuario los manuales de Resiber** (bloqueante nº1).
3. Convertir los 6 documentos Iberia existentes + lo extraído a
   `procedimientos/*.json`, marcando `confianza` paso a paso.
4. Escribir `scripts/test-procedimientos.js` con las 4 reglas de integridad.

**Resuelto cuando:** `node scripts/test-procedimientos.js` pasa y todo paso
tiene `sistema` y `confianza`.

### S1 — Spike API Amadeus `[independiente]` ← en paralelo con S0

Prototipo **desechable de 1 hora**. Responde "¿esto sirve siquiera?" antes de
invertir días.

1. Alta en `developers.amadeus.com`, obtener key de test.
2. `POST /v1/shopping/availability/flight-availabilities` para una ruta IB real.
3. Comparar el `availabilityClasses` devuelto contra la forma `classes` de
   `public/profiles/amadeus/flights.json`.

**Resuelto cuando:** hay una respuesta real pegada en el cuaderno y un
veredicto escrito: mapea 1:1 / mapea con transformación / no sirve.

**Riesgo conocido (D5):** el test env es un *snapshot estático*, no tiempo
real. El spike debe decir explícitamente si hace falta alta a producción.

### S2 — Modelo de dos sistemas `[depende de: S0]`

1. Agregar `sistema` a cada comando de `commands_meta.json`.
2. Crear `public/profiles/resiber/` (comandos + procedimientos).
3. Test que falla si algún comando queda sin `sistema`.

### S3 — Tutor determinista `[depende de: S0, S2]` ← el corazón del pedido

1. `worker/src/tutor.js` — selección de paso **pura, sin IA**.
2. `worker/src/prompts.js` — `buildTutorPrompt()`: recibe el paso ya elegido.
3. Handler `/tutor/paso` en `index.js`.
4. **Test con la IA mockeada** que compara `comandoEsperado` byte-a-byte
   contra el JSON, y test de `hueco` que exige que NO se devuelva comando.
5. UI: panel del tutor en el simulador (reutiliza `sidebar-panel` /
   `quiz-big-btn` de `ScenarioSelector`, como ya hizo `RoleplayPanel`).

### S4 — Manuales en la app `[depende de: S0, S2]`

Página que renderiza los `procedimientos/*.json` con badge de sistema
(Resiber/Amadeus) y badge de confianza, buscable, con botón "practicar esto"
que abre el tutor. e2e Playwright.

### S5 — Maestría por comando `[depende de: S2]`

Extender `useLearningProgress` de escenario a **comando**, reutilizando
`reviewIntervals: [1,3,7,14]` de `curriculum.json`. UI de "comandos débiles".
Esto es lo que cierra el pedido *"hasta que me aprenda esos comandos"*.

### S6 — Snapshot de vuelos reales `[depende de: S1]`

`scripts/sync-flights.mjs`: Amadeus → transforma → reescribe `flights.json`.

**Resuelto cuando:** tras regenerar, `npm run test:regression` sigue en
**24/24**. Si baja, el criterio no está cumplido — se preservan las rutas que
los escenarios exigen o se actualizan los escenarios en el mismo commit.

### S7 — Modo Real `[depende de: S6]`

Toggle de datos en vivo para práctica libre, **rechazado dentro de escenarios
calificados** (con test que lo comprueba).

---

## Hito 1 (tras S3)

Pre-mortem sobre lo que falte, crítica hostil sobre lo hecho, y revisión del
árbol. Tres subproblemas atascados seguidos = la descomposición está mal →
volver a Fase 4 con lo DEMOSTRADO como base.

---

## Verificación final (los 8 criterios del cuaderno)

```
npm run build
npm run test:parser        # 15/15
npm run test:regression    # 24/24  ← el que S6 no puede romper
npm run test:learning
npm run test:e2e
node scripts/test-procedimientos.js
cd worker && npm test      # 16/16
```

Cada criterio C1-C8 se cierra pegando la salida del comando, no con
"debería funcionar".

---

## Lo que este plan NO hace (declarado, no omitido)

- **No empaqueta la PWA como APK.** Es viable (TWA / Bubblewrap) pero es un
  problema distinto; se decide aparte.
- **No promete "tiempo real" con el test env de Amadeus** — es un snapshot
  estático (D5). El tiempo real real exige alta a producción.
- **No modela Resiber de verdad hasta tener sus manuales.** Sin ellos, el
  perfil `resiber/` nace con los pasos marcados `hueco`, que es honesto pero
  no es un simulador de Resiber.
- **No integra estado de vuelo en vivo** (retrasos/puertas). Existe la API
  (D4) y sería un módulo de irregularidades, fuera de este alcance.

---

## Bloqueantes para el usuario

1. **Los manuales de Resiber.** Son el bloqueante nº1: sin ellos, la mitad
   del trabajo real (cotizar) no se puede modelar.
2. **Qué es "Asseco"** en esta cadena — no encontré evidencia pública que lo
   ligue a Iberia/Resiber, y no se asume nada.
3. **Alta en Amadeus for Developers** (gratis) para desbloquear S1.
