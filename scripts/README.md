# scripts

Herramientas de verificación y mantenimiento. Se ejecutan con `npm run <script>` (ver `package.json`).

| Carpeta o patrón | Para qué |
| --- | --- |
| `pipeline/` | Orquestador de `verify`, `ci`, `test`, `e2e` y `preflight` |
| `verify-*.mjs` | Comprobaciones de arquitectura, paquete desplegable, Node 24, esquema, pagos… |
| `stage*-*.test.mjs`, `roadmap/`, `payments/` | Contratos por etapa o área (`npm run <area>:stageN-check`) |
| `tests/`, `regression/` | Regresiones puntuales |
| `backup/` | Copias de seguridad y [restauración](backup/restore.md) |
| `auth/` | Alta del primer propietario (`auth:provision-owner`) |
| `nlu/` | Genera el léxico dental para el dictado |
| `clinical/`, `games/` | Fixtures y utilidades de esas áreas |