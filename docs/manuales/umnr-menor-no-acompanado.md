# UMNR — Menor no acompañado: cobro del servicio por WEMD en Resiber

> **Generado automáticamente** desde
> `public/procedimientos/umnr-menor-no-acompanado.json`. No lo edites a mano: corrige
> el JSON y vuelve a correr `node scripts/generar-manual.mjs`.

**Aerolínea:** Iberia (075) · **Categoría:** servicios · **Fuente:** manual/umr/ (12 capturas de pantalla real de Resiber, MAD905 y MAD002)

Emisión del EMD de UMNR (Unaccompanied Minor Fee, código E0B0) desde la pantalla WEMD de Resiber, con pago por IberiaPay.

> ℹ️ Capturas del sistema real en vivo, no transcripción. Confirma lo que el bot EverGPT solo había insinuado: el cobro del UMNR se hace por WEMD desde Resiber.

## Antes de empezar

- 🔴 Edad obligatoria: menores entre 5 y 11 años. Opcional hasta los 17.
- 🔴 Antelación: reserva del servicio con al menos 24 HORAS de antelación.
- 🔴 Documentación: formulario de "Descargo de Responsabilidad" completo y ORIGINAL.
- 🟠 Contacto: datos de quien entrega y quien recoge al menor. Imprescindible que sean correctos.
- 🟠 Un niño menor de 12 años, en la fecha del vuelo, puede viajar ACOMPAÑADO de alguna persona que haya cumplido al menos 16 años de edad, que sea capaz de cuidar de él durante el vuelo y de aplicar las consignas en tierra y en vuelo, incluyendo formalidades en los aeropuertos.

## Pasos

| # | Sistema | Proceso | Transacción | Explicación | Confianza |
|---|---|---|---|---|---|
| 1 | Resiber | Abrir la pantalla de emisión de EMD con el número de billete | `WEMD:0752000951035`<br><sub>WEMD:{numeroBillete}</sub> | Abre la máscara EMDA. Cabecera: OFC (oficina) · IATA · DVC · CUR (moneda) · AGT (agente) · DOC:EMDA. | `✔ verbatim` |
| 2 | Resiber | Ver la lista de servicios disponibles | `X` | En el campo LISTA SERVICIOS se escribe X y se transmite: "TRANSMIT HERE TO VIEW THE LIST OF SERVICES". Abre el catálogo de 36 servicios EMD. | `✔ verbatim` |
| 3 | Resiber | Seleccionar el servicio UNACCOMPANIED MINOR FEE | `X` | En la lista, marcar con X la línea 4 — código E0B0 UNACCOMPANIED MINOR FEE. El campo TIPO DE SERVICIO queda en E0B0. Teclas: F2 pantalla principal · F3 salir · F4 refrescar. | `✔ verbatim` |
| 4 | Resiber | Escribir el remark | `EMISION UMNR` | En el campo RMK de la máscara. | `✔ verbatim` |
| 5 | Resiber | Marcar el/los segmento(s) a los que aplica | `X` | Cada cupón aparece como '1. IB MAD BOG 0151 O 15NOV OPEN FOR USE'. Se marca con X el que lleva el servicio. En el ejemplo solo el tramo de ida. | `✔ verbatim` |
| 6 | Resiber | Comprobar el importe | — | FARE y TOTAL deben cuadrar. En el ejemplo: EUR 150.00. | `✔ verbatim` |
| 7 | Resiber | Cargar el perfil de pago | `$$CONFIG:CCTYPE/2` | Se escribe en el campo PROCEED TO PAYMENT. El sistema responde: "SITEL TSCLIENT PROFILE LOADED FOR IBERIAPAY PAYMENTS".<br><br>⚠️ Mismo comando que en Amadeus (#3058 paso 18), pero aquí dentro de la máscara WEMD de Resiber. | `✔ verbatim` |
| 8 | Resiber | Cobrar con el token de tarjeta | `$$PAY:MS-TT,VI82000007783311111-0225-V001AS8KM`<br><sub>$$PAY:{token}</sub> | El token se copia de PCI Pal / Travel Pay.<br><br>⚠️ DIFERENCIA CON AMADEUS: en Amadeus el token va en un elemento FP aparte y el cobro es '$$PAY' a secas. Aquí el token va INLINE tras los dos puntos: '$$PAY:{token}'. | `✔ verbatim` |
| 9 | Resiber | Confirmar la creación y abrir el EMD | `DEMR:DN0754013579407`<br><sub>DEMR:DN{numeroEMD}</sub> | El sistema responde "EMD CREATED SUCCESSFULLY" y ofrece el DEMR:DN con el número del EMD recién creado. | `✔ verbatim` |
| 10 | Resiber | Verificar que el EMD quedó asociado al billete | `DTR:TN 0751234567890`<br><sub>DTR:TN {numeroBillete}</sub> | En el billete aparece la línea: EMD: 0754013579407C1'UA' - E0B0 - UNACCOMPANIED MIN  OPEN, colgando del cupón al que aplica.<br><br>**Resultado:** EMD: {numero}C1'UA' - E0B0 - UNACCOMPANIED MIN   OPEN | `✔ verbatim` |

## Errores comunes

**Se cobra el UMNR a un menor que no lo necesita**

Cada aerolínea tiene un límite de edad distinto: IB 12, BA 14, LEVEL 14, AA 15. Aplicar el de Iberia a un vuelo operado por AA cobra de más.<br><sub>Deducido de la tabla de límites por aerolínea del propio manual; el manual no lo lista como error.</sub>

## Lo que falta en el material

Estos puntos **no están en la fuente**. No los inventes: pregúntale
al instructor.

- No se ve de dónde sale el importe de 150.00 EUR: si es tarifa fija, por tramo o por tabla de país.
- No se ve el procedimiento cuando el vuelo es operado por BA/AA/LEVEL en lugar de IB.
- El formulario de "Descargo de Responsabilidad" no está en el material.

## Capturas originales

- [`manual/umr/IMG-20240607T122028073.png`](../../manual/umr/IMG-20240607T122028073.png)
- [`manual/umr/IMG-20260204T1655038.png`](../../manual/umr/IMG-20260204T1655038.png)
- [`manual/umr/IMG-20260204T16555605.png`](../../manual/umr/IMG-20260204T16555605.png)
- [`manual/umr/IMG-20260204T165653696.png`](../../manual/umr/IMG-20260204T165653696.png)
- [`manual/umr/IMG-20260216T140419119.png`](../../manual/umr/IMG-20260216T140419119.png)
- [`manual/umr/IMG-20260216T140541325.png`](../../manual/umr/IMG-20260216T140541325.png)
- [`manual/umr/IMG-20260216T141125962.png`](../../manual/umr/IMG-20260216T141125962.png)
- [`manual/umr/IMG-20260216T141707792.png`](../../manual/umr/IMG-20260216T141707792.png)
- [`manual/umr/IMG-20260216T141937169.png`](../../manual/umr/IMG-20260216T141937169.png)
- [`manual/umr/IMG-20260216T142133349.png`](../../manual/umr/IMG-20260216T142133349.png)
- [`manual/umr/IMG-20260216T142158565.png`](../../manual/umr/IMG-20260216T142158565.png)
- [`manual/umr/IMG-20260311T161346327.png`](../../manual/umr/IMG-20260311T161346327.png)

