# Mapa de IberiaNet Lite — la base de conocimiento completa

> Capturado del navegador del propio IberiaNet (08AGO26). Los números son los
> IDs reales de cada manual; el número de la derecha es cuántos hijos tiene.
>
> **Para qué sirve:** saber exactamente qué existe y qué nos falta, sin
> adivinar. Cada nodo es un manual que se puede pedir por su ID.

## ROOT

| ID | Manual | Hijos | ¿Lo tenemos? |
|---|---|---|---|
| 3777 | 0. CX | 10 | ✗ |
| 2111 | 0.0.0 BUSCAR CONDICIONES | 4 | ✗ |
| 3693 | **0.001 NATIBA** | 4 | ✗ ← Natiba es el primer paso de todo |
| 3840 | 0.01 ESCALAMIENTO DE CASOS | 7 | ✗ |
| 2827 | 0.01 MANUALES EXPRESS | 10 | ✗ |
| 3805 | 0.01 REDIRECCION DE LLAMADAS | 2 | ✗ |
| 3044 | 0.02 DATOS DE CONTACTO | 0 | ✗ |
| 2959 | 0.1 EUROPA | 5 | ✗ |
| **3043** | **0.2 LATAM** | 2 | **✓** |
| 3226 | 0.3 USA & PUERTO RICO | 7 | ✗ |
| 3529 | 0.4 MANUAL BRASIL | 5 | ✗ |
| 3261 | 0.5 IBERIA CLUB (PROGRAMA FIDELIZACION) | 8 | ✗ |
| 3287 | 0.6 ON BUSINESS | 10 | ✗ |
| 2897 | 0.7 MANUAL CLAIMS | 5 | ✗ |
| 1745 | 0.8 AGENCIAS | 12 | ✗ |
| 3422 | 0.9 IBERIA EXPRESS | 5 | ✗ ← toda la rama IBEX (060) |
| 3515 | LEVEL | 6 | ✗ |
| 3086 | 2. PROCESOS GENERALES | 18 | ✗ ← la rama más grande |
| 3618 | 3. CHAT | 2 | ✗ |
| 3664 | 4. RECLAMACION | ? | ✗ |

## Rama LATAM (#3043) — la única que hemos empezado

```
#3043  0.2 LATAM ....................................... ✓ gastos-gestion-latam.json
  ├─ #3056  1. LATAM GENERAL (5 hijos) ................. ✓ latam-general-prechecklist.json
  │    ├─ #3058  1. EMISION (7 hijos) .................. ✓ emision-latam.json
  │    │    ├─ #3063  1. ON HOLD 72 HRS (1) ............ ✗
  │    │    ├─ #3064  2. DESCUENTOS PANAMA ............. ✗
  │    │    ├─ #3065  3. DESCUENTOS ECUADOR ............ ✗
  │    │    ├─ #3066  4. ASOCIAR CHILD ................. ✗
  │    │    ├─ #3067  5. ASOCIAR INFANTE ............... ✗
  │    │    ├─ #3133  6. RESERVAS Y GASTO GESTION COLOMBIA ✗
  │    │    └─ #3134  7. COMUNICACIONES CORTADAS LATAM . ✗
  │    ├─ #3059  2. REMISION (2 hijos) ................. ✗
  │    │    └─ #3638  1. DIFERENTE CLASE Y/O RUTA ...... ✓ cambio-involuntario-clase-ruta.json
  │    ├─ #3060  3. REEMBOLSOS (9 hijos) ............... ✗ ← el más grande que falta
  │    ├─ #3061  4. SERVICIOS (7 hijos) ................ ✗
  │    └─ #3062  5. (nombre no capturado) .............. ✗
  └─ #3057  2. ARGENTINA (5 hijos) ..................... ✗

#3592  9.3 SPLIT ...................................... ✓ generar-split.json
```

## Cuánto falta, medido

Sumando los hijos declarados en ROOT: **más de 130 manuales**. Tenemos **6**.

No es motivo de alarma — no necesitas los 130. Los que de verdad mueven la
aguja para aprenderte los comandos son los que tienen transacciones, y esos
están concentrados en LATAM, IBERIA EXPRESS y PROCESOS GENERALES.

## Prioridad para pedir

1. **#3060 — 3. REEMBOLSOS** (9 hijos). Es la rama con más procedimientos y
   la que hoy tenemos casi toda en `derivado` (resúmenes de bot).
2. **#3061 — 4. SERVICIOS** (7 hijos). Cierra la matriz SR/SSR y los huecos
   de AVIH y DPNA.
3. **#3693 — 0.001 NATIBA** (4 hijos). Natiba es el primer paso de casi todo
   procedimiento y no tenemos nada.
4. **#3422 — 0.9 IBERIA EXPRESS** (5 hijos). Toda la operativa 060 y los
   comandos de Resiber.
5. **#3086 — 2. PROCESOS GENERALES** (18 hijos). La rama más grande; ver
   primero su índice para no traerla entera a ciegas.

## Avisos del Feed (novedades que pueden invalidar manuales)

IberiaNet publica cambios en un feed. Estos aparecían al pie de #3043 —
**varios tocan directamente cosas que ya tenemos capturadas**:

| Fecha | Aviso | Por qué importa |
|---|---|---|
| 07JUL2026 | Nuevo paso en PCI Pal | **Toca #3058 pasos 16-19** — nuestro flujo de pago puede estar desactualizado |
| 22MAY2026 | COMUNICACIONES DE REEMBOLSO | Toca la rama de reembolsos |
| 05MAY2026 | OPERATIVA ESPECIAL MAYO DISRUPCIONES | Cambios involuntarios |
| 01ABR2026 | Upgrade durante el Checking | — |
| 12MAR2026 | USO DE NATIBA - CAMBIOS Y REEMBOLSOS | Natiba |
| 26JUN2024 | NUEVO PROCESO SARA IBERIA EXPRESS (BILLETES 060) | IBEX |
| 23MAY2024 | REEMBOLSOS TOTALES Y PARCIALES | Reembolsos |
| 17ABR2024 | ITINERARIO DESDE RESIBER | **Resiber** — confirma `ITP:/` |
| 12ENE2024 | Cambios involuntarios | #3638 |
| 02ENE2024 | **MALAS PRACTICAS REALIZADAS CON FXI** | **#3638 paso 8** — hay malas prácticas documentadas con el comando que acabamos de capturar |

⚠️ **El más urgente es "Nuevo paso en PCI Pal" (07JUL2026)**: es de hace un
mes y toca el flujo de pago del manual de emisión que ya dimos por `verbatim`.
Si ese aviso cambió los pasos 16-19, nuestro `emision-latam.json` está viejo
en su parte final.

## Otras herramientas visibles en el menú

`BUHO` · `Calendario y Tabla de utilizacion` · `Condiciones Programa Iberia
Club` · `Contacto.Iberia.com` · **`Herramienta FQP`** · `Formulario de salud` ·
`Reclamaciones` · `Gasto de gestión`

La **Herramienta FQP** llama la atención: hay una herramienta web dedicada
para lo que en Amadeus se hace con el comando `FQP`. Puede que en la práctica
real se use la web y no el comando.
