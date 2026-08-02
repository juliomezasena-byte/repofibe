# Material de clase — Emisión y Pago (enviado por David, 23JUL26)

> Códigos vistos en clase hoy. Para repasar y agregar al simulador cuando se
> reanude el trabajo (pendiente por límite de gasto). David los agregará al
> documento oficial; esto es la captura fiel de su mensaje.

## Flujo NUEVO: facturación → emisión → pago → ticket

Este es un módulo que el simulador AÚN NO TIENE (va después del FXX/DF/RM):

| Paso | Comando | Significado |
|------|---------|-------------|
| 1 | `FXP/FF-{TARIFA DE CABINA}` | Factura y crea TST según la tarifa de cabina. Ej: `FXP/FF-BUSFLEX` |
| 2 | `TQT` / `TQT/T1` | Muestra el TST (registro de tarifa); `/T1` = línea/tarifa 1 |
| 3 | `ER` | Guarda la reserva |
| 4 | `ERK` | Variante de guardado (end and redisplay) |
| 5 | `TTO/ST01/CSF/F{GASTOS DE GESTIÓN}/T{Nº TARIFA O TICKET}` | Emisión con gastos de gestión. Ej: `TTO/ST01/CSF/F35/T1` |
| 6 | `RM*CSY/ NOMBRE:APELLIDO` | Remark tipo CSY |
| 7 | `ER` | Guarda |
| 8 | `FP CASH,` | Forma de pago: efectivo (Form of Payment) |
| 9 | `$$CONFIG:CCTYPE/2` | Configuración de tipo de pago |
| 10 | `$$PAY` | Ejecuta el pago |
| 11 | `TTP1/ET/RT` | Emite ticket línea 1 + end transact + redisplay → **`OK ETICKET`** |

## Consulta de reservas

| Comando | Uso |
|---------|-----|
| `RT` | Ver la reserva activa |
| `RTR` | Variante de recuperar |
| `RT {CÓDIGO DE VUELO}` | Ver una reserva por su código |

## Datos teóricos (candidatos DIRECTOS para el Quiz de Teoría)

- **Record locator (código de reserva):**
  - **5 caracteres alfanuméricos** → proviene de la página / **NDC**.
  - **6 caracteres alfanuméricos** → generado por **Amadeus**.
- **Movimiento entre páginas:** en el otro aplicativo es **F5** y **F6**; en
  Amadeus es **MD** (F5, página siguiente) y **MU** (F6, página anterior).
- **Códigos de ticket (stock):**
  - `075 25` → propiamente de **Iberia**.
  - `075 21` → **GDS**.
  - `075 29` → otras **agencias**.
- Las **agencias aliadas con Iberia** manejan **GDS**.

## Pendientes cuando se reanude

1. ✅ **Implementado (02AGO26)**, confirmado también en pruebas reales de
   David en producción: `TQT`, `ERK`, `TTO`, `FP`, `TTP1` ya existían;
   `$$CONFIG:CCTYPE/{n}` y `$$PAY` se agregaron ahora (`handleConfigProfile`/
   `handlePay` en `PnrStateMachine.js`, requieren perfil PCI cargado antes
   de poder pagar). `RTR` se agregó como alias funcional de `RT` — el
   comportamiento diferenciado real de "variante de recuperar" sigue sin
   confirmar con David (se documenta, no se adivina). También se agregó
   `RTF` (mencionado por David el 02AGO26, mismo tratamiento de alias).
2. Escenario de práctica del flujo completo de emisión/pago — sigue
   pendiente (candidato natural: extender el Nivel 23/24 o uno nuevo que
   use `$$CONFIG`/`$$PAY` en vez de `FP` directo).
3. Meter los datos teóricos (record locator 5 vs 6, stocks 075, F5/F6) al
   banco del QuizEngine — sigue pendiente.
4. Verificar contra el documento oficial de David cuando lo publique —
   sigue pendiente.
