# server

Fronteras con sistemas externos: Supabase, Stripe, SumUp, Deepgram, IA y Storage. Se importa solo desde `src/app/api` y páginas de servidor; nunca desde componentes de cliente.

- `supabase/` clientes y credenciales · `denty-supabase/` repositorios por agregado · `denty-api/` despachador de la API.
- `payments/`, `voice/`, `documents/`, `storage/`, `realtime/`, `security/`, `auth/`: una responsabilidad cada una.
- Los secretos se leen de variables de entorno (ver `.env.example`); nunca se envían al navegador.
- En tests, simular solo la frontera externa.

Mapa completo: [docs/architecture/repository-map.md](../../docs/architecture/repository-map.md).