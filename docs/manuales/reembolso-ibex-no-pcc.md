# Reembolso Iberia Express (IBEX) por NO PCC

> **Generado automáticamente** desde
> `public/procedimientos/reembolso-ibex-no-pcc.json`. No lo edites a mano: corrige
> el JSON y vuelve a correr `node scripts/generar-manual.mjs`.

**Aerolínea:** Iberia Express (IBEX) (060) · **Categoría:** reembolsos · **Fuente:** Resumen del bot interno EverGPT citando 'IBEX proc. 1' e 'IBEX proc. 20'

Reembolso de billete 060 (Iberia Express) por NO PCC. NO se crea caso en Salesforce: se tramita por Amadeus y se envía a cola.

> **Aplica solo a:** Billetes 060- (IBERIA EXPRESS). Si es 075- es Iberia y aplica OTRO procedimiento.

> 🚨 **La fuente de este manual es un resumen de bot, no el documento
> original.** Los comandos pueden estar mal transcritos. No usar como
> solucionario hasta conseguir los originales.

> ℹ️ ⚠️ NINGÚN paso de este procedimiento es verbatim. Todo proviene de un bot resumiendo documentos que NO tenemos ('IBEX 20 - REEMBOLSO POR NO PCC.md', 'IBEX 14 - VERIFICAR REEMBOLSO EN RESIBER.md'). Los comandos pueden estar mal transcritos. NO usar como solucionario hasta obtener los .md originales.

## Antes de empezar

- 🔴 El cliente muchas veces NO distingue entre 075 (Iberia) y 060 (Iberia Express). Verificar la placa del billete ANTES de aplicar cualquier procedimiento.
- 🔴 En IBEX NO se crea caso en Salesforce. Todo se tramita a través de Amadeus.

## Pasos

| # | Sistema | Proceso | Transacción | Explicación | Confianza |
|---|---|---|---|---|---|
| 1 | Natiba | Filtro de seguridad | — | Apellido del pasajero + localizador.<br><br>⚠️ EverGPT lo cita desde 'IBEX proc. 20'. Coincide con el filtro de seguridad de Natiba visto en manual/reembolso latinoamerica/, lo que lo hace creíble, pero no está corroborado para IBEX. | `≈ derivado` |
| 2 | Resiber | Abrir el número de billete en Resiber | `DTR TN 060-123466`<br><sub>DTR TN {numeroBillete}</sub> | Abre el billete en Resiber. Revisar el status de los cupones (OPEN) y el DOI.<br><br>⚠️ Comando citado por el bot desde 'IBEX proc. 1'. Sin manual de Resiber para verificar la sintaxis exacta. | `≈ derivado` |
| 3 | Resiber | Abrir el histórico del billete | `DTR H` | Revisar si ya existe un número de reembolso RFT y abrir la referencia del reembolso.<br><br>⚠️ Mismo origen que el paso 2. Sin verificar. | `≈ derivado` |
| 4 *(opc.)* | Resiber | Enviar comprobante por correo | — | Ingresar el correo electrónico y agregar Y en RCPT.<br><br>⚠️ EverGPT citando 'IBEX proc. 1'. RCPT no está documentado en ninguna otra fuente que tengamos. | `≈ derivado` |
| 5 | Amadeus | Comprobar que aplica NO PCC | — | El pasajero debe tener una nueva reserva para que aplique el reembolso por NO PCC.<br><br>⚠️ EverGPT citando 'IBEX proc. 20'. Regla de negocio sin comando asociado; no verificada contra el manual original.<br><br>**Bloqueante:** no continúes sin esto. | `≈ derivado` |
| 6 | Amadeus | Dejar nota en el PNR | `RM PAX SOLICITA REEMBOLSO POR NO PCC` | Y una segunda nota: RM NUEVO CODIGO DE RESERVA {nuevoPNR}, ANTERIOR {pnrAnterior}<br><br>⚠️ EverGPT citando 'IBEX proc. 20'. El comando RM sí está corroborado como Amadeus en el simulador; el TEXTO exacto de la nota no. | `≈ derivado` |
| 7 | Amadeus | Eliminar plazas | `XE2`<br><sub>XE{linea}</sub> | Elimina el elemento/segmento indicado.<br><br>⚠️ EverGPT citando 'IBEX proc. 20'. XE sí está corroborado como comando Amadeus en commands_meta.json; lo NO verificado es que aquí sea la línea 2. | `≈ derivado` |
| 8 | Amadeus | Guardar | `ER` | Guarda y redisplaya.<br><br>⚠️ ER sí está corroborado como comando Amadeus por el propio simulador (commands_meta.json). | `✔ verbatim` |
| 9 | Amadeus | Enviar a cola de reembolso | `QE/MADI20500/36` | Cola 36 = NO PCC. Para reembolso por cambio involuntario la cola es 97 (QE/MADI20500/97).<br><br>⚠️ ⚠️ Número de cola crítico: enviar a la cola equivocada pierde el caso. Verificar contra el manual IBEX original antes de enseñarlo. | `≈ derivado` |
| 10 | Salesforce | NO crear caso | — | En IBEX no se crea caso en Salesforce.<br><br>⚠️ EverGPT citando 'IBEX proc. 1' y 'IBEX proc. 20'. Contrasta con Iberia (075), donde SÍ se crea caso — esa asimetría es la trampa principal de este procedimiento. | `≈ derivado` |

## Lo que falta en el material

Estos puntos **no están en la fuente**. No los inventes: pregúntale
al instructor.

- Falta el manual de Resiber completo — bloqueante nº1.
- Faltan los .md originales: 'IBEX 20 - REEMBOLSO POR NO PCC.md', 'IBEX 14 - VERIFICAR REEMBOLSO EN RESIBER.md', 'Iberia 36 - Reembolsos.md'.
- Sin verificar: sintaxis exacta de DTR TN y DTR H.
- Sin verificar: números de cola 36 y 97.

