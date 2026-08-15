# Plan firmado: Tutor Iberia conversacional, auditable y sin alucinaciones

Estado: FIRMADO PARA CONSTRUIR, con una precondición operativa: verificar o
configurar `GEMINI_API_KEY` en el Worker de Cloudflare antes de activar la
capa conversacional.

Fecha: 2026-08-11

## 1. Resultado que se busca

El tutor debe comportarse como un agente experto, no como un IVR:

- El usuario puede escribir libremente, pegar un billete, PNR, histórico,
  AN/SN o un mensaje de error.
- El asistente entiende el mensaje, conserva el caso entre turnos y hace solo
  la pregunta que falta.
- Los botones son atajos opcionales, nunca el único camino.
- Gemini conversa, explica y responde dudas abiertas; el árbol y los manuales
  siguen siendo la única fuente de procedimientos y comandos.
- Una corrección explícita del instructor se puede aprender; un billete real
  no se guarda como memoria personal.
- Ante información insuficiente, el tutor lo dice y pregunta. Nunca completa
  una sintaxis por intuición.

<!-- autoplan: principio 1 — se incluye el ciclo completo conversación → comprensión → manual → verificación → siguiente turno. -->
<!-- autoplan: principio 2 — la cuña de esta iteración es el tutor de operaciones Iberia, no un chatbot general. -->
<!-- autoplan: principio 3 — se reutilizan `arbol.js`, `tutor.js`, `pantalla.js` y los JSON de procedimientos existentes. -->

## 2. Evidencia de la situación actual

Verificado en esta sesión:

1. `worker/src/arbol.js` decide la rama y `worker/src/tutor.js` decide el paso
   y el comando desde el manual.
2. `worker/src/pantalla.js` ya lee billetes, PNR, históricos y disponibilidad
   AN.
3. El flujo `2 ADT + 1 CHD + 1 INF` ya calcula tres plazas y el caso de prueba
   llega a `SS 3 J 1`.
4. El widget ya está servido en producción y conserva pasajeros, respuestas y
   pantallas entre turnos.
5. La conversación libre de línea y clase está cubierta por pruebas locales:
   `20/20` en disponibilidad conversacional y la suite del Worker completa en
   verde.
6. Cloudflare responde al Worker correcto:
   `roleplay-iberia-worker.roleplay-worker.workers.dev`.
7. La comprobación `wrangler secret list` del Worker exacto devuelve `[]`.
   Por tanto, no se puede afirmar que Gemini esté instalado en producción;
   `GEMINI_MODEL` sí está configurado, pero `GEMINI_API_KEY` no aparece como
   secreto de ese Worker.
8. El límite actual por IP es un límite de red, no de usuario. En una oficina
   puede bloquear a varias personas o al propio usuario tras las pruebas.

## 3. Arquitectura objetivo

```text
texto / pantalla / botón
        │
        ▼  RequestCase {conversationId, caso, consulta, pantalla}
widget chat ──────────────────────────────────────────────┐
        │                                                  │
        ▼                                                  │
Worker /coach/publico                                     │
        │                                                  │
        ├─ lector determinista → LecturaPantalla           │
        ├─ extractor determinista → HechosCaso             │
        ├─ árbol → Decision {pregunta o procedimiento}     │
        ├─ tutor → PasoManual {comando, confianza}         │
        ├─ Gemini opcional → ExplicacionConversacional     │
        │       (solo texto; nunca decide comando)         │
        └─ memoria explícita → CorreccionInstructor        │
        ▼                                                  │
ResponseCase {mensaje, decision, paso, estado, avisos} ◄──┘
```

Contrato obligatorio del paso:

```js
{
  n: Number,
  sistema: 'amadeus' | 'resiber' | 'amadeus/resiber',
  proceso: String,
  comando: String | null,
  explicacion: String,
  confianza: 'verbatim' | 'derivado' | 'hueco'
}
```

Regla de confianza:

- `verbatim`: se puede mostrar el comando del manual.
- `derivado`: se puede mostrar solo si los datos necesarios están confirmados
  y el comando se construye desde una plantilla existente.
- `hueco`: se muestra la nota de falta de documentación; no se genera ningún
  comando.

## 4. Conversación y estado

El estado mínimo que viaja en cada turno será:

```js
{
  conversationId: String,
  intencion: String | null,
  procedimientoId: String | null,
  pasoActual: Number | null,
  respuestas: Record<String, String | Boolean>,
  pasajeros: { ADT: Number, CHD: Number, INF: Number, plazas: Number } | null,
  pantallas: String[]
}
```

Transiciones:

```text
NUEVO
  ├─ saludo/duda general ──► CONVERSACION
  ├─ intención clara ──────► DESCUBRIMIENTO
  └─ pantalla pegada ──────► LECTURA

DESCUBRIMIENTO ──dato confirmado──► SIGUIENTE_PREGUNTA
SIGUIENTE_PREGUNTA ──texto o botón──► DESCUBRIMIENTO
DESCUBRIMIENTO ──rama resuelta──────► PASO_MANUAL
PASO_MANUAL ──resultado pegado─────► VERIFICACION
VERIFICACION ──correcto────────────► PASO_MANUAL
VERIFICACION ──incorrecto/hueco────► ACLARACION
```

Reglas de conversación:

1. Primero se intenta extraer una respuesta de las opciones existentes del
   árbol. Si no hay coincidencia única, se conserva la pregunta.
2. Una respuesta libre como “la línea 1”, “la J”, “no ha volado” o “fue una
   cancelación de Iberia” debe avanzar igual que un botón.
3. El modelo no recibe autoridad para rellenar `respuestas`, `procedimientoId`
   ni `comando`; esos campos los produce JavaScript.
4. La pantalla se conserva, pero los datos personales del billete no se
   guardan en memoria de aprendizaje.

## 5. Gemini: instalación, contrato y límites

### Configuración

Antes de activar la capa Gemini:

```powershell
cd worker
npx wrangler secret list
npx wrangler secret put GEMINI_API_KEY
```

La verificación de éxito es que el Worker arranque y una consulta sintética
devuelva `200`; nunca se imprime ni se prueba la clave en el cliente.

### Roles permitidos para Gemini

Gemini podrá:

- responder saludos y preguntas abiertas sobre el caso;
- explicar en español el paso ya elegido;
- resumir una pantalla ya interpretada por los lectores;
- pedir aclaraciones con tono natural;
- contestar “¿por qué?” usando el contexto verificado del manual.

Gemini no podrá:

- elegir una rama del árbol;
- extraer un pasajero o una clase sin validación determinista;
- crear o modificar un comando;
- inventar una regla que no esté en el procedimiento o glosario;
- convertir una corrección espontánea en conocimiento permanente.

El endpoint debe devolver siempre el paso determinista aunque Gemini falle,
agote cuota, tarde demasiado o devuelva JSON inválido.

### Modo sin clave

Si `GEMINI_API_KEY` falta, el tutor no queda inutilizado: responde con el
guion determinista, acepta texto libre y muestra la pregunta o el comando del
manual. La interfaz debe decir “modo manual” en vez de “no puedo conectar”.

## 6. Aprendizaje seguro

Solo se guarda memoria cuando el usuario utiliza una orden explícita, por
ejemplo “recuerda que en este caso se hace así”. Cada entrada tendrá:

```js
{
  id: String,
  createdAt: String,
  author: 'instructor',
  text: String,
  scope: 'global' | 'procedimiento',
  status: 'pending' | 'approved'
}
```

Una memoria pendiente no cambia comandos. La memoria aprobada se incluye en el
contexto de explicación y se audita con fecha y procedimiento. Nunca se
almacenan nombre, número de billete, forma de pago ni PNR completo.

## 7. Cuota y acceso personal

Problema: una IP de oficina no identifica a una persona.

Diseño recomendado:

- El endpoint público conserva un techo global diario para controlar coste.
- Se elimina el bloqueo por IP para el uso personal de la página, porque el
  usuario lo ha autorizado explícitamente.
- Se añade un endpoint privado con Firebase para el uso sin límite por usuario
  autenticado; el frontend de simulador ya tiene el patrón de autenticación.
- El widget público muestra claramente el techo global cuando se alcanza.

<!-- autoplan: principio 4 — quitar el tope por IP es una decisión de seguridad; queda explícita y limitada por el techo global. -->
<!-- autoplan: principio 6 — se conserva el comportamiento personal solicitado, pero no se presenta la página pública como una frontera de identidad. -->

## 8. UX: dejar de parecer un IVR

El chat debe tener estas reglas visuales y de interacción:

- El campo libre es el control principal y recibe foco al abrir.
- Las opciones aparecen como “respuestas rápidas”, debajo de una pregunta
  conversacional, y no bloquean escribir.
- El asistente confirma lo que entendió: “Entiendo que quieres vender la línea
  1; me falta la clase”.
- El comando aparece en una tarjeta separada solo cuando el paso está listo.
- Cargar, error de red, límite, modo manual, respuesta Gemini y hueco de manual
  son estados distintos.
- El error de red ofrece reintentar y conserva el texto escrito.
- Teclado, foco visible, labels y contraste deben funcionar sin ratón.
- No se usan emojis como sustituto de iconos ni mensajes genéricos de “bot”.

Auditoría UX inicial del estado actual:

| Dimensión | Actual | Objetivo | Corrección |
|---|---:|---:|---|
| Jerarquía | 6/10 | 9/10 | chat y respuesta entendida primero |
| Flujo | 5/10 | 9/10 | texto libre como camino principal |
| Estados | 5/10 | 9/10 | manual/Gemini/error/límite separados |
| Consistencia | 7/10 | 9/10 | reutilizar estilos del widget existente |
| Microcopy | 4/10 | 9/10 | tono de agente, no menú telefónico |
| Accesibilidad | 6/10 | 9/10 | foco, labels, teclado y aria-live |

## 9. Mapa de archivos y contratos de cambio

| Archivo | Cambio planificado | Prueba principal |
|---|---|---|
| `worker/src/publico.js` | conversación libre, estado, memoria explícita y fallback | `test-publico.js`, `test-disponibilidad.js` |
| `worker/src/coach.js` | detección de intención, saludo y composición de pasajeros | `test-coach.js` |
| `worker/src/arbol.js` | no cambia la autoridad; solo se añaden preguntas/opciones si falta un caso | `test-arbol.js` |
| `worker/src/tutor.js` | no cambia la fuente del comando; conserva `confianza` y huecos | `test-tutor.js` |
| `worker/src/prompts.js` | mensajes conversacionales y prompts acotados al paso | `test-prompts.js` |
| `worker/src/gemini.js` | timeout, JSON estricto, errores clasificados y validación de salida | `test-gemini-contract.js` |
| `worker/src/index.js` | rutas públicas/privadas, fallback y observabilidad sin PII | `test-endpoint-tutor.js` |
| `worker/src/quota.js` | cuota por usuario autenticado y techo global público | `test-quota.js` |
| `static/assets/hyntibia-bot-widget.js` | chat principal y persistencia de estado permitido | `test-hyntibia-chat.mjs` |
| `worker/wrangler.toml` | modelo y límites no secretos | smoke test de deploy |

Validación de la explicación de Gemini, obligatoria antes de mostrarla:

1. El texto no puede contener un bloque de código ni una transacción que no
   aparezca literalmente en `paso.comando`.
2. Si contiene un comando, debe ser exactamente el comando autorizado del paso;
   de lo contrario se descarta toda la explicación y se usa el fallback manual.
3. El JSON debe tener únicamente `explicacion` y `diagnostico`, ambos strings,
   con límites de tamaño.
4. La llamada tendrá timeout; un timeout, 429, 401, 403, 5xx o JSON inválido
   son fallos recuperables, nunca un 500 al usuario.
5. El contexto enviado a Gemini se sanitiza: no incluye número de billete,
   nombre, forma de pago, localizador ni PNR completo.

## 10. Plan de implementación

### Fase A — Contratos y fuente de verdad

1. Crear `RequestCase`, `ResponseCase` y estados explícitos.
2. Centralizar la respuesta anclada en `prompts.js`.
3. Mantener `arbol.js`, `tutor.js`, lectores y JSON como autoridades únicas.
4. Eliminar código muerto de Gemini que quede detrás de retornos inalcanzables.

### Fase B — Conversación libre

1. Extraer opciones por pregunta con coincidencia única.
2. Persistir `respuestas`, pasajeros y conversación en el widget.
3. Añadir confirmación de lo entendido.
4. Añadir saludos, preguntas abiertas y modo manual sin clave.

### Fase C — Gemini

1. Confirmar `GEMINI_API_KEY` en el Worker exacto.
2. Implementar `generateTutorText` con timeout y respuesta estructurada.
3. Pasar a Gemini solo el caso sanitizado, la decisión y el paso.
4. Validar la salida y descartar cualquier comando no igual al paso autorizado.
5. Medir error, latencia y consumo sin registrar datos personales.

### Fase D — Cuota y seguridad

1. Eliminar el contador por IP del flujo personal público.
2. Mantener techo global diario.
3. Mantener autenticación Firebase para roleplay y evaluación.
4. Prohibir que una clave de página pública se considere secreto de identidad.
5. Auditar CORS, headers, tamaño de pantallas pegadas y rate limit global.

### Fase E — UI y publicación

1. Actualizar el widget estático.
2. Ejecutar build de landing.
3. Desplegar Worker.
4. Desplegar Firebase Hosting.
5. Probar desde `hyntibia.com.co` en navegador real y desde la red del trabajo.

## 11. Matriz de pruebas de aceptación

| Caso | Tipo | Resultado obligatorio |
|---|---|---|
| saludo “hola” | unidad | responde como asistente y no muestra menú frío |
| pregunta abierta “¿qué significa TST?” | integración Gemini/manual | explica solo vocabulario verificado |
| “crear reserva 2 ADT 1 CHD 1 INF” | integración | detecta emisión y 3 plazas |
| AN pegada + “línea 1” escrito | integración | conserva línea y pregunta clase |
| siguiente turno “la J” | integración | llega a `SS 3 J 1` |
| “no ha volado” | unidad | no se interpreta como respuesta afirmativa |
| billete DTR real | parser/e2e | no guarda PII y usa hechos del billete |
| comando fuera del manual | seguridad | no se muestra como comando válido |
| procedimiento con hueco | unidad | no inventa sintaxis |
| Gemini ausente | integración | modo manual funcional, no error genérico |
| Gemini lento/500/JSON inválido | integración | fallback determinista |
| 401 roleplay | seguridad | no expone Gemini ni manuales protegidos |
| cuota global agotada | e2e | mensaje claro y reintento al siguiente día |
| dos usuarios en misma IP | e2e | no se bloquean por contador individual |
| widget recargado | e2e | borra el caso sensible y conserva solo preferencias permitidas |

## 12. Auditorías realizadas sobre el plan

### Auditor CEO / producto

Veredicto inicial: DEVUELTO.

Hallazgos:

1. “Cualquier respuesta” podía convertirse en chatbot general sin relación con
   Iberia.
2. “Aprender” podía guardar PII o convertir una opinión en regla.
3. El límite por IP confundía red con usuario.

Correcciones incorporadas: cuña Iberia, aprendizaje explícito y versionado,
modo manual sin Gemini, techo global y acceso privado separado.

Veredicto final: APROBADO.

### Auditor UX / diseño

Veredicto inicial: DEVUELTO.

Hallazgos:

1. Los botones eran el camino dominante.
2. No había confirmación de lo entendido.
3. El error de red se presentaba como desconexión sin diagnóstico.

Correcciones incorporadas: chat principal, respuestas rápidas opcionales,
confirmación, estados diferenciados y reintento.

Veredicto final: APROBADO CON 6 DIMENSIONES ≥ 9/10 COMO CRITERIO DE QA.

### Auditor de ingeniería

Veredicto inicial: DEVUELTO.

Hallazgos:

1. El Worker es sin estado y el cliente debía reenviar todas las respuestas.
2. Gemini podía estar ausente sin un contrato de fallback claro.
3. Había código de generación detrás de retornos deterministas.

Correcciones incorporadas: `ResponseCase`, máquina de estados, persistencia de
estado explícita, fallback manual, timeout/esquema y limpieza de código muerto.

Veredicto final: APROBADO CON MATRIZ DE PRUEBAS OBLIGATORIA.

### Auditor de seguridad y confianza

Veredicto inicial: DEVUELTO.

Hallazgos:

1. El hash público de la página no prueba identidad.
2. Quitar el límite por IP puede ampliar abuso y coste.
3. Billetes y PNR contienen datos personales.

Correcciones incorporadas: techo global, separación de endpoint privado, no
guardar PII, sanitización de contexto y regla de que Gemini no puede crear
comandos.

Veredicto final: APROBADO CON REVISIÓN POST-PUBLICACIÓN DE SEGURIDAD.

### Auditor adversarial de conversación

Casos atacados: respuestas ambiguas, “sí” sin pregunta, clase inexistente,
AN sin vuelos, pantalla enorme, instrucción “ignora el manual”, corrección falsa
y Gemini ausente.

Resultado: el plan obliga a coincidencia única, pregunta ante ambigüedad,
respeta `hueco`, limita el contexto al caso sanitizado y mantiene el comando
fuera de la autoridad del modelo.

Veredicto final: APROBADO.

### Segunda pasada hostil sobre el plan

Hallazgos corregidos antes de firmar:

1. El plan decía “Gemini no puede inventar” pero no definía una validación
   ejecutable. Se añadió la validación literal contra `paso.comando`.
2. Faltaban timeouts y clasificación de errores externos. Se añadieron al
   contrato de `gemini.js` y a la matriz de pruebas.
3. La arquitectura no nombraba todos los archivos y tests. Se añadió el mapa
   de cambios.
4. “Solo yo” podía confundirse con identidad en la página pública. Se separó
   explícitamente el endpoint público con techo global del endpoint privado
   autenticado.

Resultado de la segunda pasada: sin hallazgos sustanciales abiertos.

## 13. Gate de publicación

No se considera terminado hasta que todos sean ciertos:

- [ ] `wrangler secret list` confirma `GEMINI_API_KEY` en el Worker exacto.
- [ ] `npm test` del Worker está verde.
- [ ] tests conversacionales cubren texto libre en dos turnos.
- [ ] prueba de rechazo demuestra que Gemini no contamina el comando.
- [ ] build de la landing contiene el widget nuevo.
- [ ] navegador real en producción completa el caso `SS 3 J 1`.
- [ ] producción distingue modo manual, error Gemini, error de red y límite.
- [ ] auditoría de seguridad post-publicación no encuentra exposición de PII.

Conclusión: FIRMADO para ejecutar con `/construir`. La única precondición no
resuelta por código es la presencia real de `GEMINI_API_KEY` en Cloudflare;
el modo manual debe seguir funcionando aunque esa clave falte.
