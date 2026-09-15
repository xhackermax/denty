# Denty Web Preview 1.7.3 · Correcciones de auditoría

## Alcance

Esta revisión aplica los hallazgos confirmados de la auditoría de la 1.7.2 sin ampliar funcionalidad clínica.

## Corregido

- `toast()` tolera la ausencia de `#toast`.
- `bindTop()` enlaza controles estáticos mediante `bindClick()`, evitando `TypeError` si falta un nodo.
- `openDrawer()` y `closeDrawer()` toleran drawer/scrim ausentes.
- `showAccountAccess()` valida todos los nodos necesarios antes de modificar la pantalla.
- Eliminada la implementación duplicada del gateway que vivía inline en `index.html`. La fuente única es `app.js`.
- `denty-app.bundle.js` se carga con `defer`.
- El canvas de firma ya no usa un buffer fijo 620×240. Su tamaño interno se calcula desde el tamaño CSS real y `devicePixelRatio`.
- Se restauró `requestExternalVoiceInterpret()` tras detectar que un parche de edición de la firma lo había eliminado accidentalmente.

## Decisiones técnicas

- Las tablas clínicas con `min-width` se mantienen dentro de `.table-wrap{overflow:auto}`. Ese ancho mínimo es intencional para preservar legibilidad, no un overflow accidental.
- SEO/Open Graph no se modifica en esta revisión porque la preview sigue siendo una aplicación clínica de prueba, no una landing pública.
- Los handlers de nodos creados inmediatamente dentro de modales dinámicos pueden acceder directamente a esos nodos si la función valida primero el modal contenedor; los controles estáticos del shell deben ser siempre null-safe.

## Pruebas añadidas/actualizadas

- `verify_review_fixes.mjs`: evita regresiones en null-safety, gateway único, firma responsive/DPR y fallback externo de voz.
- `verify_access_gateway_runtime.mjs`: simula Administrador → Continuar ejecutando las funciones reales de `app.js`, ya sin bootstrap inline.
- `verify_voice_ui.mjs`: valida el flujo real actual, donde toda orden externa pasa por `validateStructuredCommand(command)` antes de `executeVoiceCommand`.
