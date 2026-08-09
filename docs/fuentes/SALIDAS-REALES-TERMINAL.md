# Salidas reales del terminal — referencia de formato

> Capturas del sistema real de producción, aportadas por el usuario 07AGO26.
> **Propósito:** que `src/engine/ResponseGenerator.js` reproduzca el formato
> exacto que el agente ve en el trabajo. Hoy el simulador inventa el layout.
>
> ⚠️ Contienen datos de una sesión real (nombres, billetes, PID). Uso interno
> del repo; **no publicar ni desplegar estas salidas tal cual**.

## Entorno real

| Capa | Qué es |
|---|---|
| **Asseco** | El proveedor del acceso: *Call Center Market Manager by Asseco* (`asseco.com`). Login con pestañas **Administrador / Agente**. |
| **SITELPRO / TSClient** | El emulador de terminal dentro de Asseco. Barra de título: `MAD905 - SITELPRO - TSClient`. |
| **MAD905** | Oficina/PID activo. Pestañas adicionales: VARIABLE2, VARIABLE3, VARIABLE4. |
| Barra de estado | `L:23 R:2 Aplic` (línea, registro, modo) + reloj. |

**Consecuencia para el proyecto:** Asseco NO es proveedor de datos de vuelo —
es la capa de acceso. La incógnita queda cerrada. El GDS sigue siendo Amadeus
y el host propio de Iberia sigue siendo Resiber.

---

## `FXP/FF-BASIC` — máscara TST (página 2 de 3)

Salida verbatim del sistema real:

```
FXP/FF-BASIC

01 DDD ROZO/MARIO


-------------------------------------------------------------
    AL FLGT  BK T DATE  TIME  FARE BASIS     NVB  NVA   BG
 BOG
MAD IB  156 O  O 01MAR 1400  ONLONNB7            01MAR01MAR OP
BOG IB  155 O  O 01APR 0010  ONLONNB7            01APR01APR OP

USD   405.00     01MAR27BOG IB MAD202.50IB BOG202.50NUC
EUR   352.00     405.00END ROE1.00
EUR   347.22-YQ   XT EUR 0.63-OG EUR 3.99-QV EUR 43.41-CO
EUR    20.80-JD    EUR 36.55-DG EUR 66.43-YS
EUR   151.01-XT
EUR   871.03
RATE USED 1USD=0.86802635EUR
FARE FAMILIES:   (ENTER FQFn FOR DETAILS, FXY FOR UPSELL)
FARE FAMILY:FC1:1:BASIC
FARE FAMILY:FC2:2:BASIC
                                           PAGE  2/ 3
>
```

### Anatomía (lo que el simulador debe reproducir)

| Elemento | Detalle |
|---|---|
| Cabecera pax | `01 DDD ROZO/MARIO` — nº de TST + código + nombre |
| Separador | Línea de guiones a todo el ancho |
| Columnas del itinerario | `AL FLGT BK T DATE TIME FARE BASIS NVB NVA BG` |
| Ciudad de origen | En línea propia y **indentada** (` BOG`) antes de los tramos |
| Tramos | `MAD IB 156 O O 01MAR 1400 ONLONNB7 01MAR01MAR OP` |
| Fare basis | `ONLONNB7` |
| NVB / NVA | `01MAR01MAR` pegados, sin separador |
| BG | `OP` |
| Bloque tarifario | Moneda + importe + cadena de construcción NUC |
| Impuestos | Sufijo con guion: `-YQ`, `-OG`, `-QV`, `-CO`, `-JD`, `-DG`, `-YS`, `-XT` |
| `XT` | Agrupa varios impuestos; se desglosa en las líneas siguientes |
| Total | Última línea del bloque (`EUR 871.03`) |
| Tipo de cambio | `RATE USED 1USD=0.86802635EUR` |
| Familias tarifarias | `FARE FAMILY:FC{n}:{n}:{FAMILIA}` una por componente |
| Paginación | `PAGE  2/ 3` alineado a la derecha |
| Prompt | `>` seguido del cursor |

### Diferencias contra lo que hoy genera el simulador

**Pendiente de auditar** contra `src/engine/ResponseGenerator.js`. A simple
vista el simulador no produce: bloque de impuestos con sufijo, cadena NUC,
`RATE USED`, `FARE FAMILY:FC…`, ni paginación `PAGE n/ m`.

---

## `DTR:TN` — salida Resiber (parcial, legible en la captura)

```
>DTR:TN 0752533334760
ISSUED BY: IBERIA LINEA...
«E/R:»
AIRLINE DATA: ABQCDYIB
PASSENGER: ALBARRA RODR...
EXCH:
O FM: BOG IB      0152  R
X TO: MAD IB      0871  R
O TO: BUD IB      0872  R
X TO: MAD IB      0155  T
   TO: BOG
FC: BOG IB X/MAD IB BUD
OO 1212.37NUC2719.24EN...
FARE:        USD 27…
EQIV.FARE PD:  COP 884…
TAXES:         COP 529…
TOTAL:         COP1413…
```

Confirma que **Resiber usa `DTR:TN` con dos puntos** en la consulta directa,
mientras el manual #3058 documenta `DTR TN {billete},EML/{email}` con espacio
para el envío por correo. ⚠️ Son dos usos distintos del mismo comando —
confirmar si ambas formas son válidas o si una es abreviatura de terminal.

---

## Qué falta capturar

Para que el simulador se parezca al sistema real hacen falta las salidas de:

- `AN` / `SN` (disponibilidad) — **la más importante**: es la que el usuario
  pidió "que los vuelos salgan así"
- `RT` (redisplay del PNR completo)
- `TQT` (máscara TST)
- `FQN … * PE` (condiciones de tarifa)
- `TTP1/ET/RT` (confirmación de emisión)
- Pantallas de error reales
