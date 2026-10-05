# domain

Reglas de negocio puras en TypeScript: sin React, Next, red ni Supabase. Cada subcarpeta es un área (`odontogram`, `agenda`, `finance`, `plan`…) con su `index.ts` como API pública.

- **Lo consumen:** `src/features` (UI) y `src/server` (persistencia).
- **No debe importar:** `features`, `server` ni `app`.
- **Pruebas:** `__tests__/` y `*.test.ts` junto al código. Cubrir casos normales, límites y errores.

Mapa completo: [docs/architecture/repository-map.md](../../docs/architecture/repository-map.md).