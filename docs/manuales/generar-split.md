# Generar SPLIT (separar pasajeros de una reserva)

> **Generado automáticamente** desde
> `public/procedimientos/generar-split.json`. No lo edites a mano: corrige
> el JSON y vuelve a correr `node scripts/generar-manual.mjs`.

**Aerolínea:** Iberia (075) · **Categoría:** gestion-pnr · **Fuente:** manual/Generar split/ (7 capturas, 13AGO2024) — IberiaNet #3592 "9.3 SPLIT"

Separa uno o más pasajeros de un PNR existente. Cada pasajero separado obtiene su propio PNR independiente.

> ℹ️ Tabla PASO/PROCESO/TRANSACCIÓN/EXPLICACIÓN pegada por el usuario desde su material. La presentación HTML que acompañaba el material fue generada por EverGPT (un bot) y NO es fuente: todo lo que solo aparece ahí está marcado 'derivado'.

## Antes de empezar

- 🔴 IRREVERSIBLE. Una vez ejecutado el SPLIT no es posible volver a unir los pasajeros en un mismo PNR. Confirmar antes de ejecutar.

## Pasos

| # | Sistema | Proceso | Transacción | Explicación | Confianza |
|---|---|---|---|---|---|
| 1 | Amadeus | Seleccionar pasajero y/o pasajeros a separar | `SP 1`<br><sub>SP {numeroPasajero}</sub> | SP + número del pasajero a separar. El 1 es el número de pasajero a separar. | `✔ verbatim` |
| 1.1 | Amadeus | Separar varios pasajeros a la vez | `SP1-2` | Separa los pasajeros 1 y 2 juntos al nuevo PNR.<br><br>⚠️ SUBIDO A VERBATIM (08AGO26): SP1-2 aparece en la captura de terminal del PROPIO material (manual/Generar split/IMG-20240813T193016219.png), no solo en el HTML de EverGPT. La tabla escrita del manual solo pone SP 1, pero la pantalla real del manual usa SP1-2. | `✔ verbatim` |
| 2 | Amadeus | Crear nuevo PNR | `EF` | Finaliza la separación y genera el nuevo expediente.<br><br>**Resultado:** El nuevo PNR queda en estado -ASSOCIATE PNR- y el PNR original pasa a -PARENT PNR-. | `✔ verbatim` |
| 3 | Amadeus | Guardar los cambios | `ER` | Guarda y redisplaya.<br><br>**Resultado:** Al final de la reserva aparece una nota informando el nuevo PNR para el/los pasajero(s) separado(s). En la parte superior de la reserva se verá: TST TSM AXR RLR | `✔ verbatim` |
| 4 *(opc.)* | Amadeus | PRO TIP — Ver todos los pasajeros con su respectivo PNR | `RTAXR` | Con esta transacción podemos ver a todos los pasajeros con su respectivo PNR. | `✔ verbatim` |

## Errores comunes

**Se ejecuta el SPLIT sobre el pasajero equivocado**

Confundir el número de línea del pasajero con el número de segmento.<br><sub>Deducido de que la acción es irreversible; no viene listado como error en el material.</sub>

## Capturas originales

- [`manual/Generar split/86ba78e6-81ef-4dbe-8158-5ead82a26b9e.png`](../../manual/Generar split/86ba78e6-81ef-4dbe-8158-5ead82a26b9e.png)
- [`manual/Generar split/IMG-20240813T190338613.png`](../../manual/Generar split/IMG-20240813T190338613.png)
- [`manual/Generar split/IMG-20240813T190405406.png`](../../manual/Generar split/IMG-20240813T190405406.png)
- [`manual/Generar split/IMG-20240813T193016219.png`](../../manual/Generar split/IMG-20240813T193016219.png)
- [`manual/Generar split/IMG-20240813T193306574.png`](../../manual/Generar split/IMG-20240813T193306574.png)
- [`manual/Generar split/IMG-20240813T193601266.png`](../../manual/Generar split/IMG-20240813T193601266.png)
- [`manual/Generar split/IMG-20240813T193803794.png`](../../manual/Generar split/IMG-20240813T193803794.png)

