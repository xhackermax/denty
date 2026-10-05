# supabase

Base de datos y servicios de Supabase.

| Carpeta | Contenido |
| --- | --- |
| `migrations/` | Esquema, RLS y RPC. Se aplican por orden de nombre (`AAAAMMDDHHMMSS_*.sql`); no editar migraciones ya aplicadas, crear una nueva |
| `functions/` | Funciones edge (`communication-outbox`) |
| `tests/` | Pruebas SQL de RLS, conflictos de versión, periodontograma y diagnósticos |

El código de aplicación accede a estas tablas solo mediante `src/server/denty-supabase`. Políticas de datos y copias: [docs/architecture](../docs/architecture/data-authority-and-offline-policy.md).