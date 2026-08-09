# Perro de asistencia (SVAN) — en Resiber y en Amadeus

> **Generado automáticamente** desde
> `public/procedimientos/perro-asistencia-svan.json`. No lo edites a mano: corrige
> el JSON y vuelve a correr `node scripts/generar-manual.mjs`.

**Aerolínea:** Iberia (075) · **Categoría:** servicios · **Fuente:** IberiaNet Lite — #3118 "3. MASCOTA DE ASISTENCIA" (hijo de #3099 "4. MASCOTAS")

Solicitud del servicio SVAN (perro de asistencia / lazarillo). A diferencia de AVIH y PETC, el servicio queda CONFIRMADO (HK), no pendiente.

> **Aplica solo a:** Billetes 075. SOLO para PERROS – LAZARILLOS.

> ℹ️ Segundo manual que documenta el mismo servicio en Resiber y Amadeus lado a lado. Confirma por segunda vez la regla SR/SSR.

## Antes de empezar

- 🔴 El perro debe estar entrenado individualmente para realizar tareas que beneficien a una persona con discapacidad física, sensorial, psíquica o intelectual. Solo se aceptan perros adiestrados como animales de servicio (guía, rescate, etc.).
- 🔴 La presentación de la documentación completa NO garantiza el transporte. La decisión final la toma el personal de Iberia en el aeropuerto.
- 🔴 Si el cliente no puede presentar la documentación requerida, deberá PAGAR el transporte como "mascota en cabina" o "mascota en bodega".
- 🟠 Solicitar la reserva del transporte al menos 48 HORAS antes de la salida del vuelo.
- 🟠 Ambos formularios incluyen un apartado para vuelos de MÁS DE 8 HORAS, donde hay que especificar que el perro puede hacer sus necesidades "de manera higiénica".
- 🟡 El formulario debe IMPRIMIRSE y presentarse junto con el resto de documentación en el aeropuerto.
- 🟡 El servicio se puede agregar SIN tener billete emitido. El estado del billete debe ser "OPEN FOR USE" (O).

## Pasos

| # | Sistema | Proceso | Transacción | Explicación | Confianza |
|---|---|---|---|---|---|
| 0 | Natiba | Filtro de seguridad | — | APELLIDO + PNR. Igual en ambos sistemas.<br><br>**Bloqueante:** no continúes sin esto. | `✔ verbatim` |
| 1 | Resiber | [RESIBER] Documentar la información proporcionada al cliente | `INT IB PAX AVDO DOCUMENTOS A PRESENTAR EN APTO (CERTIFICADO DE ADIESTRAMIENTO, FORMULARIO DE LA WEB, REQUISITOS DE INGRESO AL PAIS DONDE SE DIRIGE)//AR` | Se usa INT (agregar notas) en Resiber. | `✔ verbatim` |
| 2 | Resiber | [RESIBER] Solicitar el servicio | `SSR SVAN YY NN1 DOG CHIHUAHUA 8KG/P1 /S2`<br><sub>SSR SVAN YY NN1 {ESPECIE} {RAZA} {PESO}/P{pasajero}/S{segmento}</sub> | RECUERDA: debemos tomar SEGMENTO POR SEGMENTO. Sin dimensiones, solo peso.<br><br>⚠️ ⚠️ La plantilla del manual escribe 'PESO//PPASAJERO' con DOS barras, pero el ejemplo usa una sola ('8KG/P1 /S2'). Se toma el ejemplo, que es la columna TRANSACCIÓN. | `✔ verbatim` |
| 2.1 | Resiber | [RESIBER] Guardar | `ÑK` | El servicio queda en HK CONFIRMADO. RECUERDA: cada vez que uses ÑK deberás VOLVER A INGRESAR a la reserva. | `✔ verbatim` |
| 3 | Resiber | [RESIBER] Enviar itinerario y documentos | `ITP:/RESERVA/EMAIL`<br>`DTR TN 075-2534567890,EML/EMAIL`<br>`DEMR DN 075-2534567890,EML/EMAIL` | Itinerario · billetes electrónicos · EMD. | `✔ verbatim` |
| 4 | Amadeus | [AMADEUS] Documentar la información proporcionada al cliente | `RM10APR26PAX AVDO DOCUMENTOS A PRESENTAR EN APTO (CERTIFICADO DE ADIESTRAMIENTO, FORMULARIO DE LA WEB, REQUISITOS DE INGRESO AL PAIS DONDE SE DIRIGE)//AR` | Se usa RM (remark) en Amadeus, frente a INT en Resiber. | `✔ verbatim` |
| 5 | Amadeus | [AMADEUS] Solicitar el servicio | `SR SVAN IB NN1 - DOG CHIHUAHUA 8KG/S2-3/P1`<br><sub>SR SVAN IB NN1 - {ESPECIE} {RAZA} {PESO}/S{segmentos}/P{pasajero}</sub> | Admite rango de segmentos (/S2-3), a diferencia de Resiber. | `✔ verbatim` |
| 5.1 | Amadeus | [AMADEUS] Guardar y confirmar | `ER`<br>`ERK` | GUARDAMOS con ER y CONFIRMAMOS el servicio con ERK. Son dos pasos distintos, no sinónimos.<br><br>⚠️ Este manual distingue lo que el de AVIH decía junto ('ER y ERK'): ER guarda, ERK confirma. | `✔ verbatim` |
| 6 | Amadeus | [AMADEUS] Enviar itinerario y documentos | `IBP-EMLA/LPSP`<br>`IEPJ-EMLA/LPSP`<br>`ITR-EMLA` | Itinerario · itinerario y servicios · billetes electrónicos. | `✔ verbatim` |

## Lo que falta en el material

Estos puntos **no están en la fuente**. No los inventes: pregúntale
al instructor.

- El manual no da el procedimiento si el personal del aeropuerto rechaza al animal en el último momento.
- No dice qué hacer si el vuelo supera 8 h y el cliente no puede garantizar el apartado higiénico del formulario.

