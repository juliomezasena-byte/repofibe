# Ejercicios de práctica del usuario en Amadeus

> ⚠️ Esto **NO es manual** ni respuesta de un bot — son capturas reales de
> PNR que el usuario generó practicando en el sistema. Se guardan aparte
> para no confundirlas con el contenido oficial de los manuales
> (`MANUAL_CAMBIO_VOLUNTARIO_SIN_SEGMENTO.md`, `NOTAS_IBERIA_PROMPT2.md`).

## Ejercicio 1 — Emisión con niño (CHD), ida y vuelta MAD-BER

Relacionado con el flujo de `MANUAL_CAMBIO_VOLUNTARIO_SIN_SEGMENTO.md` (el
usuario practicó la emisión inicial sobre la que luego se aplicaría un
cambio manual).

**Intento 1:**
```
--- TST RLR ---
RP/MADIB0900/MADIB0900 BA/SU 30JUL26/1739Z 7IS2AJ
  1.DA SILVA/RONALDO(CHD/13FEB20)
  2 IB 781 N 11MAR 4 MADBER HK1 4 0740 1045 1A/E
  3 IB 788 Q 11APR 7 BERMAD HK1 1 0635 0945 1A/E
  4 AP +5554545454
  5 TK OK30JUL/MADIB0900//ETIB
  6 SSR CHLD IB HK1 13FEB20
  7 SSR OTHS 1A HK/ MADBER0781N11MAR.POC ES
  8 SSR OTHS 1A HK/ BERMAD0788Q11APR.POC ES
  9 FA PAX 075-1000213262/ETIB/EUR267.19/30JUL26/MADIB0900/00250
       025/S2-3
 10 FB PAX 0000000000 TTP1/ET/RT OK ETICKET/S2-3
 11 FE PAX CHGS WITH REST AND NOREF/S2-3
 12 FP CASH,
 13 FV PAX IB/S2-3
```

**Intento 2** (mismo ejercicio, número de billete distinto — repetición):
```
--- TST RLR ---
RP/MADIB0900/MADIB0900 BA/SU 30JUL26/1547Z 7HFVVZ
  1.DA SILVA/RONALDO(CHD/13FEB20)
  2 IB 781 N 11MAR 4 MADBER HK1 4 0740 1045 1A/E
  3 IB 788 Q 11APR 7 BERMAD HK1 1 0635 0945 1A/E
  4 AP +5554545454
  5 TK OK30JUL/MADIB0900//ETIB
  6 SSR CHLD IB HK1 13FEB20
  7 SSR OTHS 1A HK/ MADBER0781N11MAR.POC ES
  8 SSR OTHS 1A HK/ BERMAD0788Q11APR.POC ES
  9 FA PAX 075-1000213233/ETIB/EUR267.19/30JUL26/MADIB0900/00250
       025/S2-3
 10 FB PAX 0000000000 TTP1/ET/RT OK ETICKET/S2-3
 11 FE PAX CHGS WITH REST AND NOREF/S2-3
 12 FP CASH,
 13 FV PAX IB/S2-3
```

**Lectura de la pantalla (ambos intentos, mismo resultado):** pasajero
`DA SILVA/RONALDO(CHD/13FEB20)` (niño), ida `IB781 MADBER` (S2), vuelta
`IB788 BERMAD` (S3), billete emitido y activo, importe `EUR 267.19`,
restricción `CHGS WITH REST AND NOREF` (cambios con restricción, no
reembolsable), forma de pago `CASH`, emisión confirmada con
`TTP1/ET/RT OK ETICKET`.

**Detalle del billete con `TWD/TKT` (mismo billete del Intento 2,
075-1000213233):**
```
TKT-0751000213233 RCI- 1A LOC-7HFVVZ
OD-MADMAD SI- FCPI-0 POI-MAD DOI-30JUL26 IOI-00250025
1.DA SILVA/RONALDO CHD S I
1 OMAD IB 781 N 11MAR0740 OK NDHNENM2/CH O 11MAR11MAR 1PC
2 OBER IB 788 Q 11APR0635 OK QDHNENM2/CH O 11APR11APR 1PC
MAD
FARE F EUR 216.00
TOTALTAX EUR 51.19
TOTAL EUR 267.19
/FC MAD IB BER138.19IB MAD111.01NUC249.20END ROE0.86473
FE CHGS WITH REST AND NOREF
FP CASH
FOR TAX/FEE DETAILS USE TWD/TAX
```
Lectura: `DOI-30JUL26` confirma la fecha de emisión, fare basis por
segmento `NDHNENM2/CH` (ida) y `QDHNENM2/CH` (vuelta), tarifa base
`FARE F EUR 216.00` + tasas `TOTALTAX EUR 51.19` = `TOTAL EUR 267.19`,
cálculo tarifario (`/FC`) `MAD IB BER138.19 IB MAD111.01 NUC249.20 END
ROE0.86473`. La pantalla indica que para ver el desglose de tasas
individual se usa `TWD/TAX` (comando nuevo, variante de `TWD` no
documentada antes — ver `NOTAS_IBERIA_PROMPT2.md`).

## Ejercicio 2 — Cambio SOLO de la ida (+2 días), mismo PNR (DA SILVA/RONALDO)

Continuación del Ejercicio 1: el usuario practicó el flujo de "cambiar solo
la ida" (documentado en `NOTAS_IBERIA_PROMPT2.md` → *Cómo cambiar SOLO la
ida*) sobre el mismo pasajero, con un nuevo número de billete/localizador
(reemisión de práctica).

**Pantalla `TWD/TKT` de partida (billete 075-1000213325, LOC-7KDAFV):**
```
TKT-0751000213325 RCI- 1A LOC-7KDAFV
OD-MADMAD SI- FCPI-0 POI-MAD DOI-30JUL26 IOI-00250025
1.DA SILVA/RONALDO CHD S I
1 OMAD IB 781 N 11MAR0740 OK NDHNENM2/CH O 11MAR11MAR 1PC
2 OBER IB 788 Q 11APR0635 OK QDHNENM2/CH O 11APR11APR 1PC
MAD
FARE F EUR 216.00
TOTALTAX EUR 51.19
TOTAL EUR 267.19
/FC MAD IB BER138.19IB MAD111.01NUC249.20END ROE0.86473
FE CHGS WITH REST AND NOREF
FP CASH
FOR TAX/FEE DETAILS USE TWD/TAX
```

**Datos copiados del paso 1 (según el manual):**
- `TWD/TKT 075-1000213325` (por número) o `TWD/L9` (por línea, porque el
  elemento FA estaba en la línea 9 de ese PNR)
- DOI = `30JUL26`
- Fare basis ida = `NDHNENM2/CH`
- Fare basis vuelta = `QDHNENM2/CH`
- Total original = `EUR 267.19`

**Objetivo del ejercicio:** mover la ida **+2 días** (de 11MAR a 13MAR),
sin tocar la vuelta.

**Secuencia practicada:**
```
AN13MARMADBER          → disponibilidad de la nueva ida
SS1N2                   → vender la nueva plaza (clase N, línea 2 ofertada)
FXX/S3,4/FF-OPTIMA      → cotizar (los segmentos quedaron en S3,4 tras vender el nuevo)
DF 267.19 - 267.19      → diferencia de tarifa = 0 (misma tarifa OPTIMA)
RM*30JUL26* PAX AVDO COSTE PENTY 65EUR + 35EUR SF + 0EUR DF/ WP
RM*30JUL26* PAX AVDO COSTE TOTAL CMB 100EUR/ WP
ER
TTE/ALL
XE13                    → eliminar forma de pago anterior
FXP/S3,4/FF-OPTIMA      → guardar la nueva tarifa (TST)
```
(la secuencia continúa con el resto del flujo estándar: `TTI/EXCH` → `TTK`
→ `FO` → `IU...PENF` → `TMC` → `TQM` → `TMI` → `TTO` gasto de gestión →
forma de pago → `$$PAY` → `TTP1/TTM/.../ET/RT`, igual que en
`MANUAL_CAMBIO_VOLUNTARIO_SIN_SEGMENTO.md`)

### Nota del profesor — valores de ejemplo para práctica ("llamada desde México")

> Cuando el cliente llama **desde México**, los valores de ejemplo que dio
> el profesor para practicar este flujo son:
> - **GG (gasto de gestión) = 35 USD** (así lo dijo el profesor en la
>   explicación)
> - **PENTY (penalidad)**: el valor concreto varía caso a caso
> - **DF (diferencia de tarifa)**: obviamente varía según el origen de la
>   llamada y cuánto valga el gasto de gestión en ese mercado
>
> ✅ **Resuelto (confirmado por el usuario, 01AGO26):** no es un error de
> transcripción — el gasto de gestión se cobra **según de dónde llame el
> cliente / la moneda del billete**, y la conversión la hace el propio
> agente con el comando **`FQC`** (ya existe en el DSL:
> `FQC{monto}{moneda origen}/{moneda destino}`, ej. `FQC35USD/COP`). El
> profesor dio "35 USD" como valor base de ejemplo; en la secuencia
> practicada (`RM*30JUL26* PAX AVDO COSTE PENTY 65EUR + 35EUR SF + 0EUR
> DF/ WP`) ese valor ya viene convertido a EUR porque el billete de este
> PNR está emitido en EUR. El flujo real sería: `FQC35USD/EUR` (o la
> moneda que corresponda) → tomar el resultado → documentar con `RM` en
> esa moneda.
>
> Es decir, estos son valores de **práctica/ejemplo docente**, no una
> tarifa oficial fija — el gasto de gestión cambia según el mercado/país
> desde el que llama el cliente (confirmar siempre en la IberiaNet, paso 1
> del manual).

## Cómo se usó esto

✅ **Ejercicio 2 → implementado (01AGO26)** como `scenario-23` ("Nivel 23:
Cambio Voluntario Manual — Solo la Ida") en
`public/profiles/amadeus/scenarios.json`, usando este PNR real (billete
075-1000213325, LOC 7KDAFV) como `initialState`. Ver
`PLAN_CAMBIO_MANUAL_IBERIA.md` para el detalle de la secuencia final y los
comandos nuevos que hizo falta construir.

Este mismo PNR (con su niño CHD, su ida/vuelta, su ticket ya emitido —
Ejercicio 1) sigue siendo el candidato natural para el **Nivel 24**
(pendiente): el flujo completo de cambio voluntario manual sobre ambos
segmentos, no solo la ida.
