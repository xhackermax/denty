# BACKEND_GAPS · F0

Este archivo registra capacidades requeridas por la arquitectura v3 que no deben inventarse en el frontend.

## BG-001 · Contrato del backend desplegado
El source completo incluye `apps/api`, pero el ZIP de Vercel no contiene backend. `DENTY_API_URL` apunta a un servicio externo cuya versión exacta no está disponible en esta sesión. **Acción:** validar que cada ruta de `API_CONTRACT.md` exista antes de marcar paridad.

## BG-002 · Agenda legacy avanzada
Bloqueos, lista de espera, huecos libres, sugerencias en cascada, conflictos de gabinete y auditoría de movimientos deben portarse solo si el backend desplegado expone contrato suficiente. Las rutas observadas en source (`/api/agenda/blocks`, `/api/agenda/waitlist`, `/api/agenda/availability`, `/api/agenda/schedule-plan-item`) se consideran evidencia de source, no garantía de producción.

## BG-003 · Subidas de ficheros
El cliente actual usa base64 en varias operaciones. La v3 exige `multipart/form-data` o URL prefirmada. No se inventará un flujo de subida si el backend no lo expone.

## BG-004 · Juegos y antitrampas
Se requiere token de partida firmado/semilla, límites plausibles de puntuación y duración mínima. El frontend puede enviar `durationMs`, pero la validación autoritativa debe ser de servidor.

## BG-005 · VERI*FACTU
Huella, encadenado, QR y remisión corresponden al backend. El frontend solo mostrará estado y reintentará endpoints confirmados. Fechas regulatorias no se codifican como constantes.

## BG-006 · Modo demo
La demo v3 será MSW en memoria, habilitada explícitamente por `NEXT_PUBLIC_DEMO_MODE=true`. No reutilizará credenciales ni sesión real y no guardará PHI en almacenamiento persistente.

## BG-007 · Sin conexión
El modo local-first actual se retira. El modo offline cifrado pertenece a la fase opcional O1 y no se ejecuta sin aprobación expresa.
