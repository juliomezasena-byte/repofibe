# Mascota en bodega (AVIH) — en Resiber y en Amadeus

> **Generado automáticamente** desde
> `public/procedimientos/mascota-en-bodega-avih.json`. No lo edites a mano: corrige
> el JSON y vuelve a correr `node scripts/generar-manual.mjs`.

**Aerolínea:** Iberia (075) · **Categoría:** servicios · **Fuente:** IberiaNet Lite — #3117 "2. MASCOTA EN BODEGA" (hijo de #3099 "4. MASCOTAS")

Solicitud del servicio AVIH (animal vivo en bodega). El manual da el MISMO servicio en los dos sistemas, lo que permite comparar sintaxis línea a línea.

> **Aplica solo a:** Billetes 075. SOLO vuelos operados por Grupo Iberia: Iberia, Air Nostrum, Iberia Express. NO aplica a Vueling ni LEVEL.

> ℹ️ El manual trae DOS tablas de pasos: una para Resiber y otra para Amadeus. Es la primera fuente oficial que muestra el mismo servicio en ambos sistemas.

## Antes de empezar

- 🔴 El transporte debe autorizarse con antelación por la disponibilidad limitada de jaulas. La autorización NO es definitiva hasta que se confirmen todos los trayectos (ida y vuelta).
- 🔴 Peso máximo 45 kg (animal + contenedor).
- 🔴 El servicio AVIH solo se confirma en vuelos con conexión si el tiempo de conexión es SUPERIOR a 90 minutos y NO MAYOR a 4 horas.
- 🟠 Las reservas del servicio AVIH se pueden hacer hasta 72 HORAS antes del vuelo.
- 🟠 El aeropuerto NO acepta registros de mascotas como: cruce, mestizo, criollo, común, mezcla. Deben garantizar que la mascota sea óptima según su raza, tamaño y peso.
- 🟡 El servicio se puede agregar SIN tener billete emitido, para asegurar que el pasajero pueda volar con su mascota. El estado del billete debe ser "OPEN FOR USE" (O).
- 🟡 Se requiere documentación de importación/exportación o tránsito del animal.

## La regla SR (Amadeus) vs SSR (Resiber) queda CONFIRMADA — y hay tres diferencias más

Este manual documenta el mismo servicio en los dos sistemas, lo que permite comparar carácter a carácter:

Resiber:  SSR AVIH YY NN1 DOG CHIHUAHUA 8KG 45X35X25/P1/S2
Amadeus:  SR  AVIH IB NN1 - DOG CHIHUAHUA 8KG 45X35X25/S2-3/P1

1) Prefijo: SSR (Resiber) vs SR (Amadeus).
2) Código de aerolínea: YY (Resiber) vs IB (Amadeus).
3) Amadeus lleva un GUION tras NN1; Resiber no.
4) Orden de los sufijos: /P{pax}/S{segmento} en Resiber, /S{segmentos}/P{pax} en Amadeus.
5) Resiber va SEGMENTO POR SEGMENTO; Amadeus admite rango (/S2-3).
6) Se guarda con ÑK en Resiber y con ER y ERK en Amadeus.

> ⚠️ Sustituye a la hipótesis que estaba marcada 'derivado' en servicios-adicionales.json, que solo se apoyaba en ejemplos sueltos del bot EverGPT.

## Pasos

| # | Sistema | Proceso | Transacción | Explicación | Confianza |
|---|---|---|---|---|---|
| 0 | Natiba | Filtro de seguridad | — | APELLIDO + PNR. Igual en ambos sistemas.<br><br>**Bloqueante:** no continúes sin esto. | `✔ verbatim` |
| 1 | Resiber | [RESIBER] Documentar la información proporcionada al cliente | `INT IB PAX AVDO DOCUMENTOS A PRESENTAR EN APTO Y VALOR DEL SERVICIO PETC xxx EUR//AR` | Se usa INT (agregar notas) en Resiber.<br><br>⚠️ ⚠️ ERRATA EN EL MANUAL: el texto dice 'VALOR DEL SERVICIO PETC' pero este procedimiento es AVIH (bodega), no PETC (cabina). Parece copiado del manual de mascota en cabina. Se preserva tal cual. | `✔ verbatim` |
| 2 | Resiber | [RESIBER] Solicitar el servicio — una sola mascota | `SSR AVIH YY NN1 DOG CHIHUAHUA 8KG 45X35X25/P1/S2`<br><sub>SSR AVIH YY NN1 {ESPECIE} {RAZA} {PESO} {DIMENSIONES}/P{pasajero}/S{segmento}</sub> | RECUERDA: debemos tomar SEGMENTO POR SEGMENTO. | `✔ verbatim` |
| 2.1 | Resiber | [RESIBER] Más de una mascota | `SSR AVIH YY NN1 2DOG CHIHUAHUA 8KG 45X35X25/P1/S2`<br><sub>SSR AVIH YY NN1 {cantidad}{ESPECIE} {RAZA} {PESO} {DIMENSIONES}/P{pasajero}/S{segmento}</sub> | La cantidad va pegada delante de la especie. | `✔ verbatim` |
| 2.2 | Resiber | [RESIBER] Mascotas que son cruces | `SSR AVIH YY NN1 1DOG CRUCE CHIHUAHUA CON PINCHER 8KG 45X35X25/P1/S2`<br><sub>SSR AVIH YY NN1 {cantidad}{ESPECIE} CRUCE {RAZA} CON {RAZA} {PESO} {DIMENSIONES}/P{pasajero}/S{segmento}</sub> | Se nombran las DOS razas del cruce.<br><br>⚠️ ⚠️ TENSIÓN CON LAS ADVERTENCIAS: el manual dice que el aeropuerto NO acepta registros tipo 'cruce', pero aquí da el formato para registrarlo. La diferencia parece estar en que sí se aceptan las dos razas nombradas y no la palabra 'cruce' a secas. Confirmar con el instructor. | `✔ verbatim` |
| 2.3 | Resiber | [RESIBER] Guardar | `ÑK` | El servicio queda en HN y se confirmará en 24 horas. RECUERDA: cada vez que uses ÑK deberás VOLVER A INGRESAR a la reserva. | `✔ verbatim` |
| 3 | Resiber | [RESIBER] Enviar itinerario y documentos | `ITP:/RESERVA/EMAIL`<br>`DTR TN 075-2534567890,EML/EMAIL`<br>`DEMR DN 075-2534567890,EML/EMAIL` | Itinerario · billetes electrónicos · EMD. | `✔ verbatim` |
| 4 | Amadeus | [AMADEUS] Documentar la información proporcionada al cliente | `RM10APR26PAX AVDO DOCUMENTOS A PRESENTAR EN APTO Y VALOR DEL SERVICIO PETC xxx EUR//AR` | Se usa RM (remark) en Amadeus, frente a INT en Resiber.<br><br>⚠️ Misma errata PETC/AVIH que en el paso 1. | `✔ verbatim` |
| 5 | Amadeus | [AMADEUS] Solicitar el servicio — una sola mascota | `SR AVIH IB NN1 - DOG CHIHUAHUA 8KG 45X35X25/S2-3/P1`<br><sub>SR AVIH IB NN1 - {ESPECIE} {RAZA} {PESO} {DIMENSIONES}/S{segmentos}/P{pasajero}</sub> | Admite rango de segmentos (/S2-3), a diferencia de Resiber. | `✔ verbatim` |
| 5.1 | Amadeus | [AMADEUS] Más de una mascota | `SR AVIH IB NN2 - 2DOG CHIHUAHUA 8KG 45X35X25/S2-3/P1`<br><sub>SR AVIH IB NN{cantidad} - {cantidad}{ESPECIE} {RAZA} {PESO} {DIMENSIONES}/S{segmentos}/P{pasajero}</sub> | OJO: con dos mascotas el NN pasa a NN2 Y además la cantidad se repite delante de la especie. | `✔ verbatim` |
| 5.2 | Amadeus | [AMADEUS] Mascotas que son cruces | `SR AVIH IB NN1 - 1DOG CRUCE CHIHUAHUA CON PINCHER 8KG 45X35X25/S2-3/P1`<br><sub>SR AVIH IB NN1 - {cantidad}{ESPECIE} CRUCE {RAZA} CON {RAZA} {PESO} {DIMENSIONES}/S{segmentos}/P{pasajero}</sub> | Se nombran las DOS razas. | `✔ verbatim` |
| 5.3 | Amadeus | [AMADEUS] Guardar | `ER`<br>`ERK` | Guardamos con ER y ERK. El servicio queda en HN y se confirmará en 24 horas. | `✔ verbatim` |
| 6 | Amadeus | [AMADEUS] Enviar itinerario y documentos | `IBP-EMLA/LPSP`<br>`IEPJ-EMLA/LPSP`<br>`ITR-EMLA` | Itinerario · itinerario y servicios · billetes electrónicos. | `✔ verbatim` |

## Lo que falta en el material

Estos puntos **no están en la fuente**. No los inventes: pregúntale
al instructor.

- El manual no dice cómo se cobra el servicio: si por EMD (C0B3/C026/C05X) o de otra forma.
- No queda claro qué se hace si el tiempo de conexión está fuera de la ventana 90 min – 4 h.
- Tensión entre 'el aeropuerto no acepta cruces' y el formato de comando que sí permite registrar un cruce.

