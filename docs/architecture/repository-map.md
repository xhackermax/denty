# Mapa del repositorio

Qué hay en cada carpeta, qué responsabilidad tiene y con qué se relaciona.

## Capas y dirección de dependencias

```
 Navegador ──▶ src/app (rutas) ──▶ src/features (UI) ──▶ src/domain (reglas puras)
                    │                    │                      ▲
                    │                    └──▶ src/shared ───────┘
                    ▼
              src/app/api ──▶ src/server ──▶ Supabase / Stripe / SumUp / Deepgram / IA
                                   └──▶ src/domain
```

Reglas:

- `domain` **no importa** React, Next ni `server`. Es TypeScript puro y se prueba sin red.
- `features` no habla con Supabase directamente: llama a la API (`src/shared/api`) y usa `domain`.
- `server` solo se importa desde `src/app/api` y desde páginas de servidor.
- Los tests viven junto al código, en `__tests__` o como `*.test.ts(x)`.

## `src/app` — rutas

| Carpeta | Qué es |
| --- | --- |
| `(public)/` | Páginas sin sesión: `login`, `forbidden` |
| `(staff)/app/` | Aplicación del equipo: `agenda`, `patients`, `tasks`, `clinic-contacts`, `admin`, `[module]` genérico |
| `(authenticated)/admin/` | Administración (contactos de clínica) |
| `(patient)/patient/[patientId]` | Portal del paciente |
| `api/denty/[...path]` | API principal, delega en `server/denty-api/request-handler.ts` |
| `api/denty/payments`, `card-terminal` | Cobros y datáfonos |
| `api/voice/*` | `deepgram-token`, `transcribe`, `interpret`, `realtime-session` |
| `api/health`, `api/clinic-contacts` | Salud del servicio y contactos |
| `fonts/` | Fuentes locales |

## `src/features` — interfaz por funcionalidad

| Carpeta | Qué hace | Interactúa con |
| --- | --- | --- |
| `odontogram/` | Odontograma: dibujo SVG, herramientas (diagnóstico, endodoncia, implantes, ortodoncia, cirugía, aparatos por arcada), historial, autoguardado | `domain/odontogram`, `shared/odontogram` (geometría), `diagnosis`, `voice`, API `denty` |
| `diagnosis/` | Barra de diagnóstico rápido, sugerencias de tratamiento e historial del diente | `domain/diagnosis`, `odontogram` |
| `periodontal/` | Periodontograma, comparación e impresión | `domain/periodontal`, `voice/perio-dictation` |
| `voice/` | Dictado: transcripción (Whisper local, Deepgram, Web Speech), normalizador y léxico dental, NLU local, interpretación con Claude | `api/voice/*`, `odontogram`, `periodontal`, `assistant` |
| `assistant/` | Asistente «Oye Denty»: estado y proveedor global | `voice`, `domain/state-machines` |
| `agenda/` | Agenda diaria/mensual, tarjetas de cita, arrastrar y soltar, buscador de hueco | `domain/agenda`, API `denty` |
| `patients/` | Alta, edición, resumen clínico, carrusel | `domain/tenancy`, `plan` |
| `payments/` | Cobro, checkout rápido, datáfonos | `server/payments` vía API, `domain/finance` |
| `parity/` | Panel de administración: usuarios, sedes, catálogo de tratamientos, exportaciones, datáfonos | API `denty` |
| `dashboard/` | Panel de inicio y calendario | `agenda` |
| `navigation/` | Menú configurable por usuario | `domain/navigation` |
| `portal/` | Portal del paciente | API `denty` |
| `auth/` | Login, logout, cambio de contraseña | `server/auth` |
| `games/` | Juegos para pacientes | `public/games` |

## `src/domain` — reglas de negocio

| Carpeta | Contenido |
| --- | --- |
| `odontogram/` | Entidades dentales (`index.ts`: implante, endo+perno+corona, puentes, prótesis, férula, ortodoncia), dentición y numeración, reglas clínicas, cirugía, estado de boca |
| `diagnosis/` | Clasificación 2017 y sugerencias de tratamiento |
| `periodontal/` | Examen periodontal y cursor de entrada |
| `plan/` | Plan de tratamiento y fases |
| `agenda/` | Huecos, calendario, vistas |
| `finance/`, `fiscal/` | Conciliación y cadena VeriFactu |
| `prescriptions/` | Vademécum dental y alergias a AINE |
| `communications/`, `reception/`, `sync/`, `integrations/`, `interoperability/`, `ai/` | Recall, autocheck-in, resolución de conflictos, idempotencia, FHIR, revisión radiográfica |
| `tenancy/`, `navigation/`, `state-machines/` | Multi-clínica, menús, máquinas de estado |

## `src/server` — fronteras externas

| Carpeta | Responsabilidad |
| --- | --- |
| `supabase/` | Clientes (SSR, REST, auth) y credenciales |
| `denty-supabase/` | Repositorios por agregado (clínica, agenda, analítica…) y rutas de diagnóstico |
| `denty-api/` | Despachador de la API principal |
| `auth/` | Sesión y repositorio de usuarios |
| `payments/` | Stripe, SumUp, intentos de pago, conciliación |
| `voice/` | Token de Deepgram, intérprete Claude, límites de uso |
| `documents/`, `storage/` | Documentos y Storage privado |
| `realtime/`, `security/` | Pasarela Realtime y estado de copias |

## `src/shared`, `src/i18n`, `src/styles`

- `shared/odontogram/tooth-geometry.ts`: formas SVG de dientes y marcas (`TOOTH_MARK_PATHS`).
- `shared/api`, `query`, `browser`, `tenancy`: cliente de API, caché y utilidades de navegador.
- `shared/ui`, `motion`, `drag`, `print`: componentes y utilidades visuales.
- `i18n/es.json`: textos de interfaz; `styles/`: estilos globales.

## Fuera de `src`

| Carpeta | Contenido |
| --- | --- |
| `supabase/migrations` | Esquema, RLS y RPC (orden cronológico por nombre) |
| `supabase/functions` | Función edge `communication-outbox` |
| `supabase/tests` | Pruebas SQL (RLS, conflictos de versión, periodontal…) |
| `scripts/pipeline` | Orquestador de `verify`, `ci`, `test`, `e2e` |
| `scripts/*.test.mjs`, `scripts/payments`, `scripts/roadmap` | Contratos por etapa o área |
| `scripts/backup` | Copias de seguridad y [restauración](../../scripts/backup/restore.md) |
| `scripts/nlu` | Genera `dental-lexicon.generated.json` |
| `e2e/` | Playwright: odontograma, agenda, accesibilidad, móvil, pruebas de estrés |
| `messages/`, `public/` | Mensajes estáticos y recursos públicos |

## Flujos clave

**Dictado → odontograma**

```
Micrófono → local-whisper / Deepgram / Web Speech → dental-normalizer
          → local-nlu (rápido) ── si no basta ──▶ /api/voice/interpret (Claude)
          → plan de acciones → confirmación → mismo handler que la pantalla
          → use-autosave → /api/denty → Supabase
```

**Marcar un diente**: `odontogram-workspace.tsx` crea entidades con `domain/odontogram`, `odontogram-layer-projection.ts` decide qué se dibuja por diente y `tooth-geometry.ts` aporta las formas.

**Cobro**: `features/payments` → `/api/denty/payments` → `server/payments` (Stripe/SumUp) → `domain/finance` para conciliar.