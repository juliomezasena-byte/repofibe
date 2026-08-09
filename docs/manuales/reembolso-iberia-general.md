# Reembolso Iberia — condiciones generales y creación del caso

> **Generado automáticamente** desde
> `public/procedimientos/reembolso-iberia-general.json`. No lo edites a mano: corrige
> el JSON y vuelve a correr `node scripts/generar-manual.mjs`.

**Aerolínea:** Iberia (075) · **Categoría:** reembolsos · **Fuente:** manual/reembolso  latinoamerica/ (2 capturas) + CONDICIONES GENERALES pegadas por el usuario

Validaciones obligatorias antes de tramitar un reembolso de billete 075 (Iberia) y creación del caso en Salesforce para evaluación del BO.

> **Aplica solo a:** Billetes 075- (IBERIA). Si es 060- es Iberia Express y aplica OTRO procedimiento.

> ℹ️ Título del material: 'REEMBOLSOS LATAM GENERAL — JUNIO, 2024'. OJO: el bot interno EverGPT respondió que NO tiene este documento en su base — o sea, este material es una fuente que el bot corporativo desconoce.

## Antes de empezar

- 🔴 ESTE MANUAL SOLO APLICA PARA BILLETES 075- (IBERIA).
- 🔴 No proporciones al cliente detalles específicos sobre el monto del reembolso hasta que el caso sea revisado y aprobado por el BO.
- 🟠 Si tienes dudas sobre las condiciones de la tarifa, consulta con un coach para evitar confusiones.
- 🔴 En ningún caso se reembolsará a una tarjeta o cuenta distinta. Siempre se reembolsará a la misma tarjeta con la que se realizó el pago original.

## Pasos

| # | Sistema | Proceso | Transacción | Explicación | Confianza |
|---|---|---|---|---|---|
| 1 | Natiba | Acceder a la reserva | — | Para ingresar a la reserva SIEMPRE debemos intentarlo primero desde Natiba, solicitando Código de reserva (PNR) y apellido del pasajero. Con esto aseguramos el filtro de seguridad. | `✔ verbatim` |
| 2 | Amadeus | COMPROBAR RESPONSABILIDAD — oficina de emisión PV/IATA | `PV/IOI`<br><sub>PV/{oficina}</sub> | Verifica la responsabilidad de emisión del TKT. Consultar si el PNR pertenece a una agencia o a Iberia. Si es de agencia —incluso si el billete fue reemitido por Iberia— la agencia debe realizar el reembolso. Iberia no reembolsa billetes de agencias: el cliente debe contactar a la agencia emisora.<br><br>⚠️ HUECO CERRADO (08AGO26): el manual #3593 "9.4 TRANSACCIONES UTILES" documenta PV = 'VERIFICAR RESPONSABILIDAD DE EMISION DE TKT', ejemplo PV/IOI. El manual de reembolsos pedía el paso sin dar la transacción.<br><br>**Bloqueante:** no continúes sin esto. | `✔ verbatim` |
| 3 | Amadeus | ESTADO DEL BILLETE | — | El estado del billete debe ser "OPEN FOR USE" (O).<br><br>**Bloqueante:** no continúes sin esto. | `✔ verbatim` |
| 4 | Amadeus | VIGENCIA DEL BILLETE | — | El DOI (fecha de emisión original) respecto a la fecha de solicitud no debe superar 18 MESES de vigencia.<br><br>**Bloqueante:** no continúes sin esto. | `✔ verbatim` |
| 5 | IberiaNet / iberia.com | PENALIZACIÓN Y GASTOS DE GESTIÓN | — | Informar y documentar la penalización y los gastos de gestión que se aplicarán, ya que serán deducidos del reembolso. | `✔ verbatim` |
| 6 | Amadeus | Si el reembolso es por CONDICIONES DE TARIFA — cotizar | `FQP`<br>`FQD` | Hacer FQP / FQD o cotización a histórico, y elegir la opción que contenga el FAREBASIS correcto.<br><br>⚠️ Viene del resumen de EverGPT citando 'dia. 345', no del documento original. El uso de FQP/FQD sí está corroborado por docs/NOTAS_IBERIA_PROMPT2.md. CONFIRMAR la sintaxis exacta. | `≈ derivado` |
| 7 | Amadeus | Consultar condiciones de tarifa / penalidad | `FQN 02 * PE`<br><sub>FQN {lineaTarifa} * PE</sub> | 02 = línea de tarifa elegida · PE = constante. Muestra las condiciones de la tarifa cotizada, incluida la penalización.<br><br>⚠️ DISCREPANCIA CERRADA (08AGO26). Tres fuentes coinciden en el asterisco: #3058 paso 5 ("FQN 02 * PE"), docs/MANUAL_CAMBIO_VOLUNTARIO_SIN_SEGMENTO.md ("FQN02*PE") y el usuario, agente Iberia en activo ("el FQN SIEMPRE va con *, es para mirar la penalidad"). El "FQN01PE" del bot EverGPT y el "FQN02PE" de #3121/#3113 son erratas de transcripcion. | `✔ verbatim` |
| 8 | Salesforce | Crear el caso de reembolso | — | Si la solicitud cumple con los requisitos, crea el caso de reembolso para que sea evaluado por el BO y se pueda realizar el reembolso. | `✔ verbatim` |
| 9 | Salesforce | Reembolsos PARCIALES — qué decirle al cliente | — | Transmite al cliente la comprensión de la situación y la disposición para crear el caso. Enfatiza que el área especializada revisará la solicitud y determinará el monto final del reembolso. | `✔ verbatim` |

## Reglas de negocio

- El reembolso se realizará en 72 horas por parte del BO, pero se verá reflejado en la cuenta bancaria del cliente de 7 días a el ciclo bancario del cliente.
- Si el billete tiene remisiones se consideran las condiciones de tarifa del TKT OPEN. Escenario 1: la tarifa original es reembolsable pero la remisión NO lo es → NO se aplica reembolso de la tarifa original.
- Escenario 2: la tarifa original NO es reembolsable pero la remisión SÍ lo es → solo se genera reembolso en base al cambio.
- En ningún caso se reembolsará a una tarjeta o cuenta distinta. Siempre a la misma tarjeta del pago original.

## Lo que falta en el material

Estos puntos **no están en la fuente**. No los inventes: pregúntale
al instructor.

- Falta el comando exacto para leer el estado OPEN FOR USE del billete (paso 3) — probablemente TWD, sin confirmar.
- Falta el procedimiento de pantalla de Salesforce (qué campos rellenar en el caso).

## Capturas originales

- [`manual/reembolso  latinoamerica/IMG-20240625T125014804.png`](../../manual/reembolso  latinoamerica/IMG-20240625T125014804.png)
- [`manual/reembolso  latinoamerica/IMG-20250910T115001152.png`](../../manual/reembolso  latinoamerica/IMG-20250910T115001152.png)

