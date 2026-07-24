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

## Pendientes cuando se reanude (NO hacer hasta subir el límite de gasto)
1. Agregar comandos de emisión al DSL (`TQT`, `ERK`, `TTO`, `FP`, `$$CONFIG`,
   `$$PAY`, `TTP1`, `RTR`) con sus handlers y respuestas (`OK ETICKET`).
2. Escenario de práctica del flujo completo de emisión/pago.
3. Meter los datos teóricos (record locator 5 vs 6, stocks 075, F5/F6) al banco
   del QuizEngine — el flujo de datos ya lo soporta (bancos estáticos SYNTAX_BANK
   / FLOW_BANK) o vía un nuevo banco de "teoría de tickets".
4. Verificar contra el documento oficial de David cuando lo publique.
