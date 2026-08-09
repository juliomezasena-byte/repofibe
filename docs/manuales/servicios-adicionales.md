# Servicios adicionales — qué se añade por Amadeus y qué por Resiber

> **Generado automáticamente** desde
> `public/procedimientos/servicios-adicionales.json`. No lo edites a mano: corrige
> el JSON y vuelve a correr `node scripts/generar-manual.mjs`.

**Aerolínea:** Iberia (075) · **Categoría:** servicios · **Fuente:** Respuestas del bot interno citando 'Manual General - SERVICIOS ADICIONALES.pdf', 'Iberia 15 - Servicios.md', 'Iberia 51 - Glosario.md'

Matriz de servicios especiales (SSR) y en qué sistema se documenta su adición. La diferencia de sintaxis entre sistemas es el dato clave.

> 🚨 **La fuente de este manual es un resumen de bot, no el documento
> original.** Los comandos pueden estar mal transcritos. No usar como
> solucionario hasta conseguir los originales.

> ℹ️ El bot se autocorrigió a mitad de la conversación: primero afirmó 'dónde se usa más' y luego reconoció que solo podía afirmar 'dónde aparece documentado'. Aquí se conserva la versión corregida.

## Antes de empezar

- 🔴 "No visible en el material" NO significa "no existe". Un servicio sin evidencia documental queda como no confirmado, no como imposible.
- 🟠 Si la pregunta es "qué servicios PODEMOS ADICIONAR por cada sistema", se responde por evidencia documental de adición — no por frecuencia de uso. Son cosas distintas.

## Amadeus usa SR, Resiber usa SSR

El mismo servicio se pide con prefijo distinto según el sistema. Amadeus: 'SR SPEQ - ESQUI 21X50X130 13KG/S3/P1'. Resiber: 'SSR SPEQ IB NN1 ESQUI 21X50X130 13KG/S3/P1'. Resiber además incluye la aerolínea y el estado (IB NN1) que Amadeus no siempre lleva.

> ⚠️ Patrón observado en los ejemplos que el bot interno dio para SPEQ, PETC, SVAN y WCxx. Es consistente en los 4, pero NO está confirmado como regla en ningún manual que tengamos. Verificar contra 'Iberia 51 - Glosario.md'.

## Pasos

| # | Sistema | Proceso | Transacción | Explicación | Confianza |
|---|---|---|---|---|---|
| 1 | Amadeus | Añadir un servicio especial en Amadeus | `SR PETC IB NN1 DOG HUSKY 5KG DIM 45X35X25/S2/P1`<br><sub>SR {codigoServicio} {aerolinea} NN1 {descripcion}/S{segmento}/P{pasajero}</sub> | Prefijo SR. Se indica el segmento (/S) y el pasajero (/P).<br><br>⚠️ Ejemplo dado por el bot interno citando 'AMADEUS Servicios adicionales - Mermaid Flowchart.pdf'. Sin el PDF no se puede confirmar la sintaxis exacta. | `≈ derivado` |
| 2 | Resiber | Añadir el mismo servicio en Resiber | `SSR PETC IB NN1 MADBCN 123 Y 15SEP 1 DOG HUSKY 15KG DIM83X65X76CM/P1`<br><sub>SSR {codigoServicio} {aerolinea} NN1 {ruta} {vuelo} {clase} {fecha} {descripcion}/P{pasajero}</sub> | Prefijo SSR. Resiber pide además ruta, vuelo, clase y fecha en la misma línea.<br><br>⚠️ Mismo origen que el paso 1. Es LA diferencia práctica entre sistemas y por eso urge confirmarla con 'Iberia 51 - Glosario.md'. | `≈ derivado` |
| 3 | Amadeus | Equipaje adicional (XBAG) — flujo completo de cobro | `IU IB NN1 XBAG MAD/P1` | Tras solicitarlo: FXH/L#-# (cotizar) → FXG/L#-# (crear TSM) → TMI/M#/FP-TOKEN → $$CONFIG:CCTYPE/2 → $$PAY → TTM1/M#/RT (emitir EMD).<br><br>⚠️ Bot citando 'AMADEUS Emision de equipaje - Mermaid Flowchart.pdf'. El simulador YA tiene un módulo de equipaje (SRXBAG→FXG→TQM→TMI→TTM) — comparar ambos flujos: no coinciden del todo y hay que resolver cuál es el vigente. | `≈ derivado` |

## Matriz de servicios

| Servicio | Qué es | Amadeus | Resiber |
|---|---|---|---|
| **UMNR** | Menor no acompañado | ✅ | ✅ |
| **PETC** | Mascota en cabina | ✅ | ✅ |
| **SPEQ** | Equipaje deportivo | ✅ | ✅ |
| **SVAN** | Perro de asistencia | ✅ | ✅ |
| **WCxx** | Silla de ruedas | ✅ | ✅ |
| **XBAG** | Equipaje adicional | ✅ | ⚠️ no visible |
| **DPNA** | Discapacidad intelectual/del desarrollo | ⚠️ no visible | ✅ |
| **AVIH** | Animal vivo en bodega | ❔ sin confirmar | ❔ sin confirmar |

## Lo que falta en el material

Estos puntos **no están en la fuente**. No los inventes: pregúntale
al instructor.

- AVIH sin confirmar en ningún sistema.
- El ejemplo de DPNA parece contaminado con el de PETC/SVAN.
- La regla SR (Amadeus) vs SSR (Resiber) es un patrón observado, no una regla documentada.
- El flujo XBAG del bot no coincide con el módulo de equipaje ya implementado en el simulador.

