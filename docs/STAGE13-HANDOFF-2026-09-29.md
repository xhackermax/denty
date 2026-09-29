# Denty — Stage 13 Handoff (Gate final de integración)

**Fecha:** 2026-09-29
**Estado:** `INTEGRATED_LIVE` — código en `main`, base de datos Supabase reconstruida desde cero
con las 25 migraciones, gate local verde bajo Node 24.
**Regla:** Stages 1–13 `DO_NOT_REIMPLEMENT`. Corregir solo fallos reproducibles.

## 1. Qué se hizo

### Base de datos (Supabase `awdqomgbxygtflkwggqb`)
- Se **borró** el esquema anterior (`public`, `private`, historial de migraciones; solo había
  datos de prueba: 1 clínica, 1 paciente) y se aplicaron las migraciones 1→13 en orden.
- Se conserva el usuario de Auth `admin@denty.local` (ADMIN de "Denty Clínica Principal").
  Su contraseña se regeneró (≥ 12 caracteres, entregada al propietario por chat): cámbiala
  en el primer acceso. **El alias de login "admin" ya no existe.**
- Reproducibilidad: una base nueva fallaba en 4 puntos y ahora aplica limpia:
  1. `payment_attempts` se alteraba antes de crearse (113000 → movido a 210000).
  2. `public.is_clinic_staff/is_patient_owner` usados en P1 sin existir (helpers temporales,
     eliminados en Stage 13).
  3. Política de Storage leía `patients.photo_storage_path` antes de crearla (Stage 5).
  4. Alias `month` sin `as` (Stage 9).
- El paquete Stage 12 había perdido el *guard* de `realtime.messages` de `main` (2ee7e70):
  restaurado en Stage 3 y añadido a Stage 7.
- `20260929130000_stage13_integration_gate.sql`:
  - `private.seed_clinic_defaults` + trigger `clinics_seed_defaults`: cada clínica nueva
    recibe **catálogo de tratamientos** (9) y **plantillas** (consentimientos, protección de
    datos, justificante). Antes la clínica creada tras la migración quedaba sin catálogo.
  - RPC `sign_clinical_document`: firma canónica de documentos/consentimientos con evidencia
    en Storage (ruta + SHA‑256), que satisface `consent_requirements`.
  - Índices para **todas** las claves foráneas (antes 68 sin índice).
- `20260929131000_stage13_security_hardening.sql`: ninguna función `SECURITY DEFINER` del
  esquema público es ejecutable por `anon`; `btree_gist` movida a `extensions`.
- Realtime: la política `denty_clinic_broadcast_read` existe (antes 173 rechazos
  "Unauthorized" en los logs → la app no se refrescaba sola).

### Aplicación
- Gate completo en verde: `tsc` (56 errores corregidos), ESLint, Stylelint, Prettier,
  Vitest 61 archivos / 280 tests, cobertura (umbral *ratchet*), `next build`,
  `npm run gate:stage13` (contratos Stages 1–13 + regresiones históricas).
- **Bugs reales corregidos:**
  - Bucle infinito de render en *Pediátrico* y *Periodonto* (props array por defecto).
  - `createProblem` enviaba un esquema Zod como cuerpo de la petición.
  - `/api/voice/transcribe` no exigía sesión (proxy abierto a la API de pago de OpenAI).
  - Exportación CSV contable ignoraba la fecha "hasta".
  - `STRIPE_CONNECTED_ACCOUNT_ID` vs `STRIPE_DEFAULT_CONNECTED_ACCOUNT_ID`.
  - Alias de login "admin" hardcodeado (commit a63f587) eliminado.
- **Flujos que no se podían completar desde la UI y ahora sí:**
  - Firmar consentimientos (Documentos → `?workflow=consents`, "Crear y firmar").
  - Firmar el presupuesto (tarjeta *Sincronizar* en ficha y en Finanzas `?patientId=`).
  - Cobrar al paciente (panel **Cobrar**: efectivo, TPV del banco, transferencia/Bizum,
    financiación, SumUp, Stripe).
  - Configurar datos fiscales y VERI\*FACTU (Ajustes → Facturación).
- Regresiones recuperadas: animación de KPIs en Análisis/Finanzas perdida en Stage 9.
- Tests desactualizados reparados (sesión en tests de rutas, iniciales, regex de rol,
  cuerpo reutilizado) y scripts legacy cableados en `npm run regressions:legacy`.

## 2. Pendiente (no bloquea, requiere acción externa o decisión)

| ID | Qué | Quién |
|---|---|---|
| S13-OPS-001 | Añadir variables en Vercel para **Preview** (hoy solo Production) | Propietario |
| S13-OPS-002 | Dominio propio y/o desactivar Vercel Authentication en producción (hoy pide login de Vercel) | Propietario |
| S13-OPS-003 | Supabase Auth: Site URL, redirect URLs y plantillas en español; activar *Leaked password protection* | Propietario |
| S13-OPS-004 | `OPENAI_API_KEY`, claves de SumUp/Stripe y certificado VERI\*FACTU (ver `docs/guias/`) | Propietario |
| S13-OPS-005 | Revisar textos de las plantillas de consentimiento con asesoría legal | Clínica |
| DNT-S13-COV-001 | Cobertura de dominio 78 % → 90 % | Desarrollo |
| DNT-S13-CSS-001 | 113 avisos de selectores CSS duplicados | Desarrollo |
| DNT-S13-VFX-001 | Conector de envío a la AEAT (VERI\*FACTU) | Desarrollo |
| S1…S12-LIVE | Validaciones con dos clínicas / dos sesiones reales (ver `STAGE12-PENDING-FINDINGS`) | QA |

Mejoras futuras: `docs/ROADMAP-MEJORAS-FUTURAS.md` (backup local cifrado, foto de perfil
optimizada, gestión documental completa).

## 3. Cómo reproducir el gate

```bash
nvm use 24 && npm ci
npm run typecheck && npm run lint && npm run lint:styles && npm run format:check
npm test && npm run test:domain:coverage
npm run gate:stage13
npm run build
```

Migraciones en un proyecto nuevo: `supabase db push` (o aplicar `supabase/migrations/*.sql`
en orden). El usuario propietario se crea con `npm run auth:provision-owner`.
