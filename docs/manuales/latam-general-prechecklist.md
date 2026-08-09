# LATAM General — antes de iniciar CUALQUIER proceso

> **Generado automáticamente** desde
> `public/procedimientos/latam-general-prechecklist.json`. No lo edites a mano: corrige
> el JSON y vuelve a correr `node scripts/generar-manual.mjs`.

**Aerolínea:** Iberia (075) · **Categoría:** generalidades · **Fuente:** IberiaNet Lite — #3056 "1. LATAM GENERAL" (hijo de #3043 "0.2 LATAM")

Checklist obligatorio de 5 pasos que precede a emisión, reemisión, reembolsos y servicios en mercados LATAM.

> **Aplica solo a:** Mercado LATAM. NO aplica Brasil.

> ℹ️ Texto crudo copiado del manual. ⚠️ La versión HTML que generó EverGPT del mismo manual añadió asteriscos que el original NO tiene (ver paso 5) — se conserva el crudo.

## Antes de empezar

- 🔴 Siempre ofrecer como PRIMERA opción reserva ON HOLD.
- 🟠 En caso de emitir por el Call Center, informar de los Gastos de Gestión.
- 🟡 Todos los gastos de gestión están publicados en la página web.

## Pasos

| # | Sistema | Proceso | Transacción | Explicación | Confianza |
|---|---|---|---|---|---|
| 1 | Salesforce | Identificar origen de la llamada | — | Mediante Avaya (+00 de la ciudad) o Salesforce.<br><br>**Bloqueante:** no continúes sin esto. | `✔ verbatim` |
| 2 | Amadeus | Ingresar al PID correspondiente | — | Para que coticemos en la moneda correcta.<br><br>⚠️ El manual no da el comando de cambio de PID. Ver la tabla de oficinas de emisión por país en gastos-gestion-latam.json.<br><br>**Bloqueante:** no continúes sin esto. | `✔ verbatim` |
| 3 | Amadeus | Ofrecer reserva ON HOLD como primera opción | — | Siempre ofrecer como primera opción reserva ON HOLD. | `✔ verbatim` |
| 4 | IberiaNet / iberia.com | Informar los Gastos de Gestión | — | En caso de emitir por el Call Center, informar de los Gastos de Gestión. | `✔ verbatim` |
| 5 | Amadeus | Primera emisión desde el Call Center — autorización de Coach | `RMACCNOONHOLD`<br>`RMAUTORIZADA EMISION POR COACH XXX`<br>`RM*EMISION POR (MOTIVO DEL ERROR O INCIDENCIA)` | Se debe solicitar AUTORIZACION de un Coach y agregar los tres campos al PNR.<br><br>⚠️ ⚠️ OJO CON EL ASTERISCO. El manual crudo escribe los dos primeros SIN asterisco (RMACCNOONHOLD, RMAUTORIZADA EMISION POR COACH XXX) y solo el tercero CON asterisco (RM*EMISION POR ...). El HTML que generó EverGPT del mismo manual les puso asterisco a los tres — es contaminación del bot, no del manual. Confirmar con el instructor cuál es la sintaxis que acepta el sistema. | `✔ verbatim` |

## Lo que falta en el material

Estos puntos **no están en la fuente**. No los inventes: pregúntale
al instructor.

- El comando para cambiar de PID no está en el manual.
- Falta el nombre del manual #3062.
- De la rama LATAM tenemos 3 de al menos 14 manuales.

