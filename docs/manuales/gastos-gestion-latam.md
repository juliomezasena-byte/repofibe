# Gastos de gestión y oficinas de emisión — LATAM

> **Generado automáticamente** desde
> `public/procedimientos/gastos-gestion-latam.json`. No lo edites a mano: corrige
> el JSON y vuelve a correr `node scripts/generar-manual.mjs`.

**Aerolínea:** Iberia (075) · **Categoría:** generalidades · **Fuente:** IberiaNet Lite — #3043 "0.2 LATAM" (raíz del árbol LATAM)

Tabla de gastos de gestión por país (emisión / cambio / reembolso) y oficina de emisión + moneda con la que se cotiza en cada mercado LATAM.

> **Aplica solo a:** Mercado LATAM. NO aplica Brasil.

> ℹ️ Tablas copiadas del manual. La versión HTML que generó EverGPT del mismo manual añadió banderas y etiquetas 'Gratuito' que el original no formatea así, pero los VALORES coinciden.

## Antes de empezar

- 🟠 Todos los gastos de gestión se encuentran publicados a través de nuestra página web.
- 🔴 En AMADEUS, todos los países de LATAM se gestionan en diferentes oficinas. Entrar al PID correcto ANTES de cotizar, o se cotiza en la moneda equivocada.
- 🔴 COLOMBIA calcula distinto: si el itinerario NO origina en Colombia se suma tarifa base (FARE) + impuesto YQ. Si SÍ origina en Colombia, solo la tarifa base (FARE) sin impuestos.

## Pasos

| # | Sistema | Proceso | Transacción | Explicación | Confianza |
|---|---|---|---|---|---|
| 1 | Amadeus | Entrar al PID / oficina de emisión del país correcto | — | Cada país LATAM se gestiona en una oficina distinta y cotiza en su moneda. Ver la tabla 'oficinasEmision'.<br><br>⚠️ El manual no da el comando de cambio de PID/oficina. Pendiente de confirmar con el instructor.<br><br>**Bloqueante:** no continúes sin esto. | `✔ verbatim` |
| 2 | IberiaNet / iberia.com | Consultar el gasto de gestión que aplica | — | Buscar el país en la tabla 'gastosGestion'. En Colombia el importe depende del valor de la tarifa (ver 'reglaColombia'). | `✔ verbatim` |
| 3 | Amadeus | Aplicar el gasto de gestión en la emisión | `TTO/ST01/CSF/F650`<br><sub>TTO/ST01/CSF/F{gastoGestion}</sub> | Si hay varios TST: TTO/ST01/CSF/F650/T1. Guardar con ER.<br><br>⚠️ El comando viene del manual #3058 paso 15 (emisión); aquí se referencia porque es donde se usa el valor de esta tabla. | `✔ verbatim` |

## Lo que falta en el material

Estos puntos **no están en la fuente**. No los inventes: pregúntale
al instructor.

- Falta el comando para cambiar de PID / oficina de emisión en Amadeus.
- El manual no indica moneda para los países que comparten oficina (PTY001, LIM001, SDQ001, MVD001, MIA001).
- La escala de Colombia usa '<=' en el manual; el tramo >944 se lee como 'mayor que 944'.
- Discrepancia de cifras de Colombia contra la tabla pública de iberia.com (posible IVA del 19% incluido).
- Honduras y Nicaragua figuran aquí pero NO en la tabla pública, que dice que un país no listado tiene gasto 0.

