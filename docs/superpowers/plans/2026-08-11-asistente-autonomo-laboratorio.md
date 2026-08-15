# Plan firmado: Asistente autónomo de casos Iberia en laboratorio aislado

Estado: FIRMADO PARA CONSTRUIR EN LABORATORIO
Fecha: 2026-08-11
Entorno objetivo: Firebase Hosting separado + Cloudflare Worker separado

## 1. Resultado buscado

El usuario podrá escribir una intención completa o incompleta:

> “Créame una reserva de 2 ADT, 1 CHD y 1 INF de MAD a BOG el 11MAR.”

El asistente debe:

1. entender el objetivo y resumir lo que ha entendido;
2. elegir el procedimiento y justificar qué manual aplica;
3. detectar los datos que faltan;
4. pedir solo esos datos, sin mostrar un menú de manuales;
5. construir el siguiente comando únicamente desde el procedimiento cargado;
6. pedir al usuario que lo ejecute y pegue la respuesta de Amadeus/Resiber;
7. leer esa respuesta, conservar el caso y avanzar;
8. validar los comandos que el usuario escriba;
9. detenerse ante un hueco, conflicto o dato ambiguo;
10. completar el procedimiento o explicar exactamente por qué no puede seguir.

No se considera autónomo por hablar de forma natural. Se considera autónomo
cuando mantiene el objetivo, el estado, la evidencia y el siguiente paso sin
obligar al usuario a navegar el árbol manualmente.

<!-- autoplan: principio 1 — el criterio de éxito es el ciclo completo de caso, no solo una respuesta conversacional. -->
<!-- autoplan: principio 2 — la primera cuña es creación guiada de reserva y lectura de pantallas; la ejecución directa en GDS queda fuera hasta tener integración autorizada. -->
<!-- autoplan: principio 3 — los procedimientos JSON, lectores, árbol y selector de pasos existentes siguen siendo la autoridad. -->
<!-- autoplan: principio 4 — el laboratorio tendrá Worker, KV, secreto y Hosting separados para que las pruebas no escriban en producción. -->

## 2. Diagnóstico que motiva el plan

Verificado en el código y en producción:

- `arbol.js` decide ramas, pero no existe una fase de descubrimiento del caso
  que recoja objetivo, origen, destino, fecha, pasajeros y disponibilidad.
- `tutor.js` sabe construir pasos y comandos, pero no sabe coordinar el caso
  completo ni distinguir ejemplo de comando ejecutable cuando faltan datos.
- El widget conservaba parte del estado, pero convertía preguntas y comandos
  en botones o consultas; eso producía sensación de IVR y no de copiloto.
- El bundle actual contiene 29 procedimientos, 389 pasos y 9 tablas de
  referencia, pero pegar un manual nuevo en el chat no lo convierte en una
  fuente de procedimiento auditada.
- El asistente puede guiar la ejecución con pantallas pegadas; no puede
  ejecutar Amadeus o Resiber directamente porque no existe una conexión GDS
  autorizada.

## 3. Alcance y no alcance

### Incluido

- Caso persistente por conversación.
- Planificador de reserva y de otros casos Iberia.
- Selector de procedimiento con catálogo cerrado.
- Extracción determinista de datos y lectura de pantallas.
- Confirmación de lo entendido antes de cada acción sensible.
- Siguiente comando exacto, solo cuando todos sus datos estén confirmados.
- Recepción y validación de resultados pegados por el usuario.
- Ingestión de manuales nuevos con trazabilidad, conflictos y aprobación.
- Laboratorio separado de producción.
- Auditoría funcional, UX, ingeniería, seguridad y adversarial.

### Fuera de esta iteración

- Ejecutar comandos dentro de Amadeus/Resiber sin una integración oficial y
  credenciales autorizadas.
- Emitir billetes o cobrar automáticamente.
- Aprender como autoridad desde cualquier texto pegado sin revisión.
- Sustituir el manual por RAG libre o por memoria de Gemini.

## 4. Entorno de laboratorio aislado

El laboratorio se publica como un sitio distinto al actual:

```text
Firebase Hosting actual       https://yntibia-saas-prod.web.app
Firebase Hosting laboratorio  https://yntibia-tutor-lab.web.app
Worker actual                 roleplay-iberia-worker
Worker laboratorio            roleplay-iberia-lab-worker
KV actual                     ROLEPLAY_KV
KV laboratorio                ROLEPLAY_LAB_KV
```

Reglas:

- El laboratorio nunca apunta al Worker de producción.
- El laboratorio usa una copia versionada del bundle de procedimientos.
- El laboratorio tiene su propio `GEMINI_API_KEY` o funciona en modo manual.
- Las conversaciones, cuotas y aprendizajes del laboratorio no se mezclan con
  producción.
- Cada build muestra versión, fecha y entorno en un diagnóstico no sensible.
- El despliegue a producción queda bloqueado hasta pasar el gate de aceptación.

<!-- autoplan: principio 4 — el aislamiento evita que un experimento de ingestión, estado o cuota modifique reservas, memoria o límites del sitio real. -->

El laboratorio no es una versión recortada ni una demo: implementa el mismo
alcance completo del asistente. La diferencia es únicamente el destino y los
datos. El build que pase el gate se promocionará sin cambios de código; si no
pasa, producción no recibe nada.

Configuración operativa obligatoria:

- Firebase tendrá un target de Hosting explícito para `yntibia-tutor-lab`;
- `firebase.json` definirá el sitio lab sin reemplazar el hosting actual;
- `wrangler.lab.toml` tendrá nombre, KV, variables y origen del lab propios;
- el Worker lab solo aceptará el origen lab y el widget lab solo llamará al
  Worker lab;
- el pipeline guardará el hash del bundle de manuales usado en cada build;
- un smoke test fallará si cualquier URL, binding o secreto apunta a producción.

## 5. Modelo de caso

```js
CaseState {
  conversationId: string,
  environment: 'lab',
  objetivo: {
    tipo: 'emision' | 'cambio' | 'reembolso' | 'servicio' | 'split' | null,
    textoOriginal: string,
    confianza: 'confirmado' | 'inferido' | 'ambiguo'
  },
  procedimientoId: string | null,
  fuenteManual: { documento: string, version: string } | null,
  etapa: 'descubrimiento' | 'listo_para_comando' | 'esperando_pantalla' |
    'validando_resultado' | 'completado' | 'bloqueado' | 'error',
  datos: {
    origen: string | null,
    destino: string | null,
    fecha: string | null,
    fechaRegreso: string | null,
    pasajeros: { ADT: number, CHD: number, INF: number, plazas: number } | null,
    lineaVuelo: string | null,
    clase: string | null,
    placa: string | null
  },
  respuestas: Record<string, string | boolean>,
  pasoActual: number | null,
  evidencia: { tipo: 'consulta' | 'pantalla' | 'resultado', texto: string }[],
  avisos: string[],
  ultimaActualizacion: string
}
```

PII se conserva solo durante la conversación activa. Nombres, PNR, billetes,
correos, teléfonos, tarjetas y tokens nunca entran en memoria de aprendizaje.
La conversación activa se mantiene en memoria de sesión del navegador y en el
payload del turno; KV solo puede guardar contadores, versión del caso y
metadatos sanitizados. Nunca se persiste en KV la evidencia cruda.

## 6. Máquina de estados

```text
NUEVO
  │ petición libre / pantalla / saludo
  ▼
DESCUBRIMIENTO ── objetivo claro ──► MANUAL_SELECCIONADO
  │                                      │
  │ faltan datos                         │ datos suficientes
  ▼                                      ▼
PREGUNTA_CONCRETA ◄── nueva información  LISTO_PARA_COMANDO
                                             │
                                             │ usuario pega resultado
                                             ▼
ESPERANDO_PANTALLA ───────────────────► VALIDANDO_RESULTADO
                                             │
                         correcto ──────────┘
                         ambiguo/hueco ──► BLOQUEADO
                         último paso ────► COMPLETADO
```

Reglas de transición:

- Una respuesta libre solo modifica un campo si coincide con una opción o
  patrón determinista único.
- Gemini puede redactar y resumir, pero no puede cambiar `procedimientoId`,
  `datos`, `pasoActual` ni `comando`.
- Si hay dos manuales plausibles, el asistente explica la diferencia y pide
  un dato discriminante; no escoge al azar.
- Un comando con plantilla incompleta se representa como `comando: null`.
- Un paso `hueco` siempre termina en `BLOQUEADO` con la fuente que falta.

## 7. Flujo de creación de reserva

Para una emisión el asistente seguirá esta secuencia:

1. Confirmar intención: crear reserva, no cambio ni reembolso.
2. Recoger origen, destino, fecha, ida/vuelta, placa/aerolínea y pasajeros.
3. Calcular plazas: `ADT + CHD`; `INF` no ocupa plaza.
4. Mostrar resumen y preguntar solo por los campos faltantes.
5. Construir `AN` o `SN` desde la plantilla del manual.
6. Esperar la pantalla de disponibilidad pegada por el usuario.
7. Mostrar vuelos realmente leídos y pedir línea/clase; nunca elegir por él.
8. Construir `SS` con plazas, clase y línea confirmadas.
9. Avanzar por cotización, nombres, contactos, tiempo límite, guardado y
   documentos según el procedimiento y sus condiciones.
10. Confirmar antes de pasos sensibles: ON HOLD, pago, emisión o envío.

Ejemplo de interacción objetivo:

```text
Usuario: Créame una reserva a BOG.
Asistente: La crearé contigo. Ya tengo destino BOG. Me faltan origen y fecha.
           ¿Desde qué aeropuerto sales y para qué día?
Usuario: MAD, 11MAR. Son 2 ADT, 1 CHD y 1 INF.
Asistente: Entendido: MAD → BOG, 11MAR, 2 ADT + 1 CHD + 1 INF = 3 plazas.
           Ejecuta este comando del manual y pega la respuesta:
           AN 11MAR MADBOG
Usuario: [pega AN]
Asistente: Leo 2 vuelos. ¿Quieres la línea 1 o la 2?
Usuario: Línea 1, clase J.
Asistente: Comando siguiente: SS 3 J 1. Pega el resultado para continuar.
```

## 8. Selección de manual y autoridad

Se implementará un `resolverProcedimiento` en dos capas:

1. Reglas deterministas y catálogo de alias: comandos, títulos, categorías,
   lectores y señales de negocio.
2. Clasificador Gemini opcional con salida cerrada:

```js
{
  procedimientoId: string | null,
  candidatos: string[],
  confianza: number,
  datoDiscriminante: string | null,
  razon: string
}
```

El servidor valida que todos los ids existan en el bundle. Una confianza baja
o dos candidatos cercanos producen una pregunta, no una selección automática.

La autoridad queda así:

```text
manual verbatim / plantilla
        > parser y árbol deterministas
        > corrección aprobada del instructor
        > Gemini para explicación y clasificación acotada
        > texto libre del usuario como evidencia pendiente
```

## 9. Ingestión segura de manuales nuevos

Flujo obligatorio:

```text
archivo pegado / PDF / imagen
  → extracción con fuente y páginas
  → revisión de tablas e imágenes
  → id único y hash de contenido
  → detección de colisiones y contradicciones
  → procedimiento JSON con confianza por paso
  → tests generados
  → sync-procedimientos
  → revisión humana
  → habilitación en laboratorio
```

Un manual nuevo no entra a producción por el hecho de existir en una carpeta.
Debe tener documento, versión, fecha, fuente, confianza y procedimiento
seleccionable. Las imágenes se consideran fuente primaria cuando contienen la
transacción.

## 10. Contratos de API

`POST /coach/publico` y el endpoint de laboratorio compartirán este contrato:

```js
RequestCase {
  conversationId?: string,
  consulta?: string,
  comandoEscrito?: string,
  caso?: CaseState parcial,
  pantalla?: string
}

ResponseCase {
  mensaje: string,
  caso: CaseState parcial,
  procedimiento: { id: string, titulo: string, fuente: string } | null,
  pregunta: { id: string, texto: string, motivo: string } | null,
  paso: {
    n: number,
    sistema: string,
    proceso: string,
    comando: string | null,
    faltanDatos: string[],
    confianza: 'verbatim' | 'derivado' | 'hueco'
  } | null,
  evidenciaLeida: object | null,
  avisos: string[],
  modo: 'gemini' | 'manual' | 'bloqueado'
}
```

No se devuelven secretos, tokens, prompts internos ni PII innecesaria.

## 11. UX del sitio laboratorio

El chat será el centro de la experiencia:

- campo libre enfocado al abrir;
- resumen del caso arriba del hilo;
- etiqueta visible del manual activo y su fuente;
- pregunta concreta en lenguaje natural;
- comando en tarjeta solo cuando esté completo;
- botón opcional para copiar, nunca botón obligatorio para avanzar;
- estado “esperando pantalla” claramente visible;
- estado “manual incompleto” con fuente y acción siguiente;
- historial de pasos del caso, no un menú de procedimientos;
- reintento de red sin perder la consulta;
- accesibilidad de teclado, foco y lector de pantalla.

### Auditoría UX incluida

| Dimensión | Criterio de 10/10 | Gate |
|---|---|---:|
| Jerarquía | objetivo, resumen y siguiente acción son lo primero | 9 |
| Flujo | ningún paso obliga a elegir botones | 9 |
| Estados | nuevo, pregunta, comando, espera, error, bloqueo y éxito son distintos | 9 |
| Consistencia | reutiliza el widget actual sin menú telefónico | 9 |
| Microcopy | pregunta qué falta y por qué, sin jerga innecesaria | 9 |
| Accesibilidad | teclado, foco, labels y aria-live verificables | 9 |

## 12. Arquitectura y flujo de datos

```text
Widget lab
  └─ RequestCase {consulta, pantalla, caso parcial}
      └─ Worker lab /coach/publico
          ├─ sanitizar entrada y límite de tamaño
          ├─ leer pantalla → Evidence
          ├─ extraer hechos → CaseFacts
          ├─ resolver manual → ProcedureSelection
          ├─ actualizar máquina de estados → CaseState
          ├─ seleccionar paso → ManualStep
          ├─ construir comando o declarar faltantes
          ├─ Gemini opcional → explicación validada
          └─ ResponseCase
      └─ Widget actualiza solo el estado permitido
```

Fallos:

- Gemini ausente, lento, 401, 429, 5xx o JSON inválido: `modo: manual`.
- Parser ambiguo: pregunta aclaratoria y no avanza.
- Manual sin paso: `modo: bloqueado`, fuente explícita.
- Pantalla enorme o malformada: límite, mensaje y reintento.
- KV caída: conversación local de un turno, sin afirmar memoria permanente.
- Deploy lab fallido: no se modifica producción.

## 13. Matriz de pruebas y gates

### Unitarias

- `resolverProcedimiento`: reserva, cambio, reembolso, servicio, split y
  preguntas de comandos.
- extracción de fecha, ruta, pasajeros, placa y respuestas naturales.
- cálculo ADT/CHD/INF.
- máquina de estados y transiciones inválidas.
- plantilla incompleta devuelve `comando: null`.
- colisión de ids y manuales contradictorios.
- sanitización de PNR, billete, email, teléfono y tarjeta.

### Integración

- reserva incompleta → pregunta origen/fecha.
- reserva completa → `AN` exacto.
- disponibilidad pegada → líneas reales.
- línea/clase escritas → `SS 3 J 1`.
- comando pegado → validación y avance.
- pregunta sobre el paso → explicación sin cambiar estado.
- Gemini activo/fallando/ausente → mismo comando determinista.
- dos manuales candidatos → pregunta discriminante.
- manual nuevo pendiente → no aparece como autoridad.

### E2E del laboratorio

- abrir sitio lab en navegador real;
- crear reserva de 2 ADT + 1 CHD + 1 INF MAD–BOG;
- pegar disponibilidad real del contexto;
- llegar a `SS 3 J 1`;
- continuar hasta ON HOLD sin ejecutar cobro/emisión;
- recargar y verificar que no se conserva PII;
- probar móvil, teclado, error de red y cuota.

### Gate de salida

- [ ] sitio lab separado y accesible;
- [ ] Worker lab apunta a KV lab;
- [ ] manuales cargados con hash, fuente y versión;
- [ ] suite Worker verde;
- [ ] E2E reserva completo verde;
- [ ] no hay comandos de ejemplo cuando faltan datos;
- [ ] ningún botón es necesario para avanzar;
- [ ] Gemini no puede modificar procedimiento, estado ni comando;
- [ ] auditoría de seguridad sin hallazgos críticos/altos;
- [ ] revisión adversarial sin fallo abierto;
- [ ] prueba manual de nuevos documentos aprobada;
- [ ] producción permanece intacta durante todo el experimento.

### Regla de todo o nada

No se publica una versión parcial. El gate es binario:

- si falla cualquier prueba crítica, seguridad o aislamiento, el laboratorio
  queda bloqueado y se corrige;
- si todos los gates están verdes, se conserva el artefacto exacto y se hace
  promoción controlada a producción;
- nunca se arregla directamente producción durante una auditoría;
- nunca se considera “casi listo” un caso que todavía muestra un manual genérico,
  un comando incompleto o una pregunta que el usuario debe resolver por menú.

## 14. Auditorías del plan

### Auditor CEO / producto — APROBADO CON ALCANCE SELECTIVO

Hallazgos corregidos:

1. “Autónomo” se definió como chat libre; se redefinió como gestión de caso
   completo con estado, evidencia y siguiente acción.
2. Se evitó prometer ejecución directa en GDS sin integración autorizada.
3. Se añadió el laboratorio aislado como producto de validación, no como
   copia accidental de producción.

### Auditor UX / diseño — APROBADO, GATE 9/10

Hallazgos corregidos:

1. Se sustituyó el menú de manual por resumen, fuente, pregunta y siguiente
   acción.
2. Se especificaron estados de espera de pantalla, bloqueo y manual faltante.
3. Se prohibieron botones obligatorios y microcopy genérico.

### Auditor de ingeniería — APROBADO CON GATES

Hallazgos corregidos:

1. Se definió `CaseState` y una máquina de estados explícita.
2. Se separaron hechos, evidencia, procedimiento, paso y explicación.
3. Se definieron contratos RequestCase/ResponseCase y fallos externos.
4. Se incluyó la matriz de pruebas antes de construir.

### Auditor de seguridad / CSO — APROBADO CON REVISIÓN POST-BUILD

Controles obligatorios:

- laboratorio con secretos y KV separados;
- no confiar en hash público como identidad;
- sanitizar PII antes de Gemini;
- limitar tamaño de pantalla y coste global;
- validar ids contra catálogo;
- bloquear comandos inventados o incompletos;
- no guardar PNR, billete, tarjeta ni contacto en aprendizaje.

### Auditor adversarial — APROBADO CON PRUEBAS OBLIGATORIAS

Ataques cubiertos:

- “ignora el manual”;
- comando inventado en una pantalla pegada;
- dos manuales con instrucciones distintas;
- frase ambigua como “sí”;
- clase inexistente;
- AN sin origen/fecha;
- pantalla enorme;
- Gemini devolviendo comando falso;
- manual nuevo con id duplicado;
- recarga del navegador con PII.

### Segunda pasada hostil del plan — APROBADA CON CORRECCIONES

La segunda pasada buscó contradicciones que podían esconder una versión
incompleta:

1. El nombre “laboratorio” podía interpretarse como alcance reducido. Se
   aclaró que es el mismo producto completo con destino y datos aislados.
2. El aislamiento de Firebase estaba descrito conceptualmente, pero no como
   configuración verificable. Se añadieron target de Hosting, `wrangler.lab.toml`,
   smoke test de URLs/bindings y hash del bundle.
3. “Persistente por conversación” podía acabar guardando PII en KV. Se fijó la
   política: sesión/payload para evidencia activa; KV solo metadatos saneados.
4. Faltaba una regla explícita para detener una publicación parcialmente
   correcta. Se añadió el gate binario de todo o nada.

Resultado: no quedan contradicciones de producto abiertas para comenzar la
construcción del laboratorio. La validación externa de otro proveedor sigue
siendo un gate de promoción, no se inventa como realizada.

### Segunda opinión independiente

Debe ejecutarse sobre el diff de implementación del laboratorio con otro motor
disponible (Codex CLI, Gemini CLI o Copilot CLI). No se da por realizada ahora:
la opinión solo cuenta cuando el comando se ejecuta y devuelve hallazgos
reproducibles. El gate de publicación exige resolver coincidencias entre
revisores.

## 15. Secuencia de construcción

1. Crear sitio Firebase lab, Worker lab, KV lab y configuración separada.
2. Crear contratos y máquina de estados con tests primero.
3. Implementar `resolverProcedimiento` y `CaseState`.
4. Implementar intake de reserva y preguntas concretas.
5. Integrar lector de pantalla y espera de evidencia.
6. Conectar pasos/manuales sin permitir ejemplos incompletos.
7. Actualizar widget lab sin menús obligatorios.
8. Implementar ingestión auditada de manuales.
9. Ejecutar suite completa y E2E real.
10. Ejecutar auditorías de seguridad, adversarial y segunda opinión.
11. Iterar hasta que todos los gates estén verdes.
12. Solo después decidir si se promociona a producción.

Conclusión: FIRMADO para `/construir` en el sitio laboratorio. No autoriza
todavía modificar ni reemplazar el sitio de producción.
