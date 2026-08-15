# Auditoría de HyntibIA / Tutor de casos

Fecha: 2026-08-14  
Rutas revisadas: `https://hyntibia.com.co/landing`, `https://campus.hyntibia.com.co/`, `/tutor/libre` en build local.

## Alcance y evidencia

- La landing pública respondió `200` y no mostró errores de consola en Chromium.
- El Campus público redirigió a `/login`; no se probó una sesión real ni se tocaron credenciales.
- El tutor local se revisó en escritorio de 1440×900 y móvil de 390×844.
- El móvil no presentó desbordamiento horizontal (`0px`) y el cuerpo mantiene 16px.
- Se inspeccionaron tipografía, burbujas, teclado, carga, continuidad entre turnos y reinicio.

## Hallazgos corregidos

### F-001 · El tutor perdía datos entre turnos — alto

La API devolvía `datosCaso`, pasajeros y respuestas activas, pero `TutorPanel` solo conservaba la intención. Un segundo mensaje podía volver a pedir origen, destino o datos ya confirmados.

Corrección: el cliente absorbe los hechos estructurados y los reenvía en la siguiente petición.

### F-002 · “Empezar de nuevo” podía romper la pantalla — alto

`reiniciar()` llamaba a `setComando`, que no existía en el componente.

Corrección: se eliminó la llamada inválida y se invalida cualquier respuesta de IA que llegue tarde.

### F-003 · La fuente dependía de Google Fonts — medio

La importación externa provocaba un error de red en un entorno sin acceso a internet y podía cambiar la apariencia de las letras.

Corrección: se usa una pila local estable (`Inter`, `Segoe UI`, `Helvetica Neue`, `Arial`).

### F-004 · El campo de chat no estaba preparado para casos largos — medio

El input de una sola línea hacía incómodo pegar una tipificación o una pantalla extensa.

Corrección: textarea de dos líneas, Enter para enviar y Shift+Enter para salto de línea.

### F-005 · El chat no daba suficiente orientación — medio

Las burbujas no identificaban quién hablaba y no había entrada rápida para las tareas más frecuentes.

Corrección: etiquetas `Tutor`/`Usted`, auto-scroll, estado de redacción y atajos para corregir tuteo, tipificar y hacer role play.

## Pendientes

- El build todavía produce un bundle JavaScript de aproximadamente 1.1 MB sin comprimir. Conviene dividir rutas con `import()` en una siguiente iteración.
- El Campus público requiere iniciar sesión, por lo que la conversación real de producción necesita una sesión autorizada para una auditoría final.

## Verificación

- `npm run build`: correcto.
- Pruebas de continuidad e IA determinista: correctas.
- 8 pruebas E2E de rutas y tutor: correctas.
- 2 pruebas de regresión nuevas del tutor: correctas.
- Suite E2E completa: 24/29 correctas. Las 5 fallas están fuera del tutor modificado: chips del simulador, un flujo interactivo, una ruta antigua de aprendizaje y el role play.
