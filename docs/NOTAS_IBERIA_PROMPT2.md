# Notas del bot interno de Iberia ("Prompt 2") — recopiladas 30JUL26

> El usuario consultó el bot interno de Iberia (entrenado con los manuales
> reales de la aerolínea) y trajo estas respuestas. A diferencia del bot de
> iberia.com público (inaccesible para Claude), este SÍ cita fuentes internas
> ("Sources: Iberia XX - ....md"), lo cual le da más peso que una respuesta
> genérica. Se guarda tal cual, organizado, sin reinterpretar los comandos.

## Diferencias entre comandos de cotización (confirmado para Iberia, no genérico)

| Comando | Para qué sirve |
|---|---|
| **FXP** | Cotiza **y guarda** la tarifa en el PNR (crea el TST). Se usa para emitir. |
| **FXX** | Recotización **informativa**, no almacena TST. Sirve para revisar precio antes de decidir. |
| **FXR** | Igual que FXX pero se usa cuando FXX da error `*NO FARES/RBD/CARRIER/PASSENGER TYPE` (tarifa no disponible para las clases elegidas) — se cambian las clases y se recotiza con FXR. |
| **FQN** / **FQN{línea}** | Muestra las **reglas** de la tarifa cotizada (cambios, reembolsos, equipaje, estancia mínima/máxima, anticipación, penalizaciones, temporada, combinabilidad). |
| **FQP** | Muestra el **desglose** de la tarifa ya cotizada: fare basis, base, impuestos, recargos, total. Se usa para encontrar el fare basis y las condiciones cuando el cliente ya tomó uno de los vuelos (hay variantes para ida/vuelta directo vs con conexión). ⚠️ **Matiz confirmado en `MANUAL_CAMBIO_VOLUNTARIO_CON_SEGMENTO.md` (auditoría 01AGO26):** ahí `FQP` se usa de forma **activa** como motor de cotización — se le da origen/destino/aerolínea/clase/fecha/DOI desde cero y devuelve tarifas nuevas para elegir con `FQQ{n}`, no solo "mostrar una tarifa ya cotizada". Esta fila describe el uso pasivo que dio el bot; el manual real muestra también el uso activo — ambos son válidos según el contexto. |
| **FQD** | Variante de consulta de condiciones — **solo se puede usar por segmento** (a diferencia de FQP). |
| **TQT** / **TQT/T{n}** | Muestra el **TST** ya almacenado en el PNR (tarifa base, impuestos, total, fare basis, validez, segmentos, pasajero). `TQT` solo = todos los TST; `TQT/T1`, `TQT/T2` = uno específico. Se usa DESPUÉS de `FXP` para confirmar que la tarifa quedó bien guardada antes de emitir. |

**Flujo resumido:** `FXP` cotiza y guarda → `TQT` confirma qué quedó guardado → (si aplica) `FQN`/`FQP` para reglas/desglose → emitir.

## Orden recomendado para buscar condiciones de una tarifa original (cambio)

Según el manual, en este orden de preferencia:
1. Desde la web (iberia.com)
2. Cotizando a histórico (`FXX/.../R,{DOI},UP/FF-{tarifa}`)
3. Desde SalesForce
4. `FQD` (recordar: solo por segmento)
5. `FQP`

Y el orden para **informar al cliente** en un cambio manual es: **gasto de gestión → penalización → diferencia de tarifa**.

## Cómo cambiar SOLO la ida (sin tocar la vuelta)

Fórmula de cotización de cambio parcial (según manual FQP 3.4):

```
FQP{ORIGEN}/A{AEROLÍNEA}/C{NUEVA CLASE}/D{NUEVA FECHA}{DESTINO}/R,{DOI ORIGINAL},UP/FF-{TARIFA ORIGINAL}
```

Se cotiza solo el tramo nuevo (nueva fecha/clase), **manteniendo el DOI y la
tarifa original** — igual lógica que el flujo completo, pero limitado al
segmento de la ida (ej. `S2` si la ida es la línea 2 del PNR).

**Reglas duras del manual:**
- No se puede cambiar la **naturaleza de la ruta**: de nacional a
  internacional, ni al revés.
- Si el cliente no voló ningún segmento → sigue el flujo "sin segmento
  volado" completo (ver `MANUAL_CAMBIO_VOLUNTARIO_SIN_SEGMENTO.md`).

Datos que hacen falta para dar el comando exacto de un cambio de ida: **ruta
original, nueva fecha de la ida, DOI, tarifa original/fare basis**.

## Flowchart genérico "cambio manual sin segmento volado" (versión corta que dio el bot)

```
SS#A#                      → seleccionar plazas
TQT                        → ver tarifa (tras eliminar/recotizar)
TTO/ST01/CSF/F35/T#        → agregar gasto de gestión
TTP1/ET/RT/T#              → cobrar y emitir
IBPJ-EMLA/LPSP             → enviar itinerario
```
(Esta es la versión resumida citada por el bot; el procedimiento detallado de
29 pasos está en `MANUAL_CAMBIO_VOLUNTARIO_SIN_SEGMENTO.md`.)

## Política de embarazo — Iberia (confirmado por el usuario)

- **Desde la semana 28**: se puede pedir certificado médico (apto para
  volar + semanas + fecha probable de parto).
- **Hasta la semana 36** (embarazo único): se puede volar con evolución
  normal.
- **A partir de la semana 36**: generalmente ya no se permite viajar.
- **Embarazo múltiple**: el límite se adelanta (antes de la semana 36).

> Nota para el quiz (`ib-q10` en `src/engine/quizBanks/iberia.js`): la
> pregunta actual solo cubre "desde qué semana se exige certificado" (28,
> correcto). Este hallazgo AGREGA el dato del límite máximo para volar (36
> semanas) — útil si se quiere ampliar la pregunta o añadir una nueva. No se
> tocó el código, queda para el plan.

## Comandos del manual de Reemisión/Emisión mencionados en la conversación con el bot

(Detalle completo de cada uno en `MANUAL_CAMBIO_VOLUNTARIO_SIN_SEGMENTO.md`;
aquí solo el propósito de cada uno, como los explicó el bot)

| Comando | Propósito |
|---|---|
| `TWD/TKT {billete}` / `TWD/L{n}` | Abrir el ticket y ver fare basis, DOI, total |
| `TWD/TAX` | Ver el desglose detallado de tasas/fees del billete abierto (confirmado en pantalla real de `TWD/TKT`, ejercicio del usuario — ver `EJERCICIOS_USUARIO_AMADEUS.md`) |
| `TTE/ALL` / `TTE/T{n}` | Eliminar TST (todos o uno) |
| `TTI/EXCH/T{n}` | Colocar el TST en reemisión |
| `TTK/T{n}/T{valor}` | Agregar el valor de la diferencia de tarifa al TST |
| `FO*L{línea}/P{pax}` / `FOINF*L{línea}/P{pax}` | Crear el Fare Override (ADT/CHD vs INF) |
| `IU {aerolínea} NN1 PENF {origen}/P{pax}` | Solicitar el TSM de penalidad |
| `TMC/L{línea}` / `TMC/L{línea}/INF` | Crear el EMD (ADT/CHD vs INF) |
| `TQM` / `TQM/M{n}` | Verificar la máscara TSM creada |
| `TMI/M{n}/F{valor}/CV-{valor}` | Cargar el valor de la penalidad y el cupón |
| `TTO/ST01/CSF/F{gg}[/T{n}]` | Incluir el gasto de gestión (verificar con `TQO`) |
| `RM*CSY/{nombre}:{apellido}` | Registrar el titular de la tarjeta (cyber) |
| `FP O/CCVI+/{token}` | Forma de pago del TST (diferencia + gasto de gestión) |
| `TMI/M{n}/FP-{token}` | Forma de pago del TSM (penalidad) |
| `$$CONFIG:CCTYPE/2` | Cargar el perfil PCI en Amadeus |
| `$$PAY` | Ejecutar el cobro (⚠️ confirmar costo con el cliente antes) |
| `TTP1/TTM/T{n}/M{n}/ET/RT` | Emitir penalidad + billete al mismo tiempo |
| `TTM1/M{n}/RT` | Emitir solo la penalidad |
| `TTP1/ET/RT/T{n}` | Emitir solo el billete |
| `IBP-EMLA/LPSP` / `IEPJ-EMLA/LPSP` / `ITR-EMLA` | Enviar itinerario / itinerario+servicios / billetes (Amadeus) |
| `ITP:/{reserva}/{email}` | Enviar itinerario (Resiber) |
| `DTR TN {billete},EML/{email}` | Enviar billetes electrónicos (Resiber) |
| `DEMR DN {billete},EML/{email}` | Enviar EMD electrónicos (Resiber) |

## Nota sobre Amadeus vs Sabre/Reciber

El bot dio inicialmente una comparación genérica Amadeus vs Sabre/Reciber
(`AN` vs formato numérico, `SS` vs formato corto, `RT` vs `*`, etc.). El
usuario corrigió: **"estamos en Iberia, necesito la info de Iberia"** — la
comparación con Sabre no aplica al entorno real de trabajo. Se descarta esa
tabla; solo se documentan aquí los comandos confirmados para Iberia/Amadeus.
