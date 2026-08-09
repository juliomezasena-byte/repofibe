# Restricciones de Mascotas por Países (PETC / AVIH / Carga)

> **Generado automáticamente** desde
> `public/procedimientos/mascotas-restricciones-paises.json`. No lo edites a mano: corrige
> el JSON y vuelve a correr `node scripts/generar-manual.mjs`.

**Aerolínea:** Iberia (075) · **Categoría:** servicios · **Fuente:** IberiaNet Lite — #3119 "4. RESTRICCIONES POR PAISES"

Manual oficial #3119 de IberiaNet Lite con requisitos sanitarios generales, homologación IATA y restricciones de entrada/tránsito por país para transporte de mascotas en cabina (PETC), bodega (AVIH) y carga.

> ℹ️ Transcripción 100% fiel del manual oficial #3119. Reemplaza las reglas parciales que estaban en _mascotas-restricciones-ruta.json.

## Antes de empezar

- 🔴 IRLANDA (MAD-DUB): No se admiten mascotas en bodega (AVIH) en las rutas DUB - MAD. En la ruta MAD - DUB solo se admiten como CARGA.
- 🔴 ESTADOS UNIDOS: Los animales en bodega (AVIH) NO se pueden enviar en tránsito a destino final (no facturación en tránsito). Las mascotas en cabina (PETC) se deben pagar a cada compañía aérea por separado.
- 🔴 ESPAÑA / MADRID ADUANAS: Los pasajeros con mascotas procedentes de terceros países fuera de la UE deben pasar obligatoriamente el control de aduanas en Madrid.
- 🔴 SUDÁFRICA Y CHINA: Sudáfrica solo admite mascotas como CARGA. China solo admite mascotas en BODEGA (no cabina).
- 🟠 SUECIA: Test de efectividad de la vacuna antirrábica OBLIGATORIO además del pasaporte y microchip. Prohibidos cachorros menores de 3 meses.
- 🟠 ASU-EZE (Paraguay/Uruguay): No se admiten mascotas en cabina en la ruta Asunción - Ezeiza en vuelos de Aerolíneas Argentinas / Latam Airlines Paraguay.

## Pasos

| # | Sistema | Proceso | Transacción | Explicación | Confianza |
|---|---|---|---|---|---|
| 1 | Natiba | 1. Filtro de seguridad y consulta de ruta | — | Verificar el itinerario completo (origen, destino, escalas y aerolíneas operadoras) antes de cotizar o solicitar el servicio PETC/AVIH. | `✔ verbatim` |
| 2 | Amadeus | 2. Verificar restricciones específicas por país de destino y tránsito | — | Comprobar si la ruta involucra EE.UU. (no tránsito en bodega), Irlanda (solo carga a DUB), China (solo bodega), Sudáfrica (solo carga), o Suecia (test antirrábico + prohibido <3 meses). | `✔ verbatim` |
| 3 | Amadeus | 3. Solicitar servicio PETC / AVIH aplicando la sintaxis correspondiente | `SR PETC IB NN1 - DOG CHIHUAHUA 8KG 45X35X25/S2-3/P1` | Usar el formato estándar de Amadeus o Resiber validado en mascota-en-cabina-petc.json o mascota-en-bodega-avih.json. | `✔ verbatim` |

