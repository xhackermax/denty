# PROMPT MAESTRO — Reescritura de DENTY (CRM dental para España) a arquitectura optimizada

> **Cómo usarlo:** pega este documento completo como primer mensaje a la IA de programación (Claude Code, Cursor, Codex…) y adjunta el ZIP `UPLOAD-THIS-TO-VERCEL-DENTY-200-CLINICAL-FOCUS.zip`.
> Todo lo de la sección 3 sale de una auditoría real de ese ZIP. Si el ZIP contradice este documento: **el ZIP manda para el comportamiento funcional; este documento manda para la arquitectura, el estilo y la calidad.**

---

## 0. MODO DE TRABAJO (obligatorio)

1. **Lee todo este documento y audita el ZIP antes de escribir una línea.** Confirma en tu primera respuesta que has entendido, con un resumen de máximo 15 líneas.
2. **Trabaja por fases** (sección 14). Al cerrar cada fase ejecuta `lint`, `typecheck`, `test` y `build`, y entrega el informe de fase (sección 16).
3. **No te pares a preguntar** salvo bloqueo real. Si falta información, decide, y anótalo en `docs/ASSUMPTIONS.md` con fecha y motivo.
4. **Nunca inventes**: ni versiones de paquetes (consúltalas con `npm view <pkg> version`), ni endpoints, ni normativa. Lo deducido va marcado `INFERIDO`.
5. **Cero regresiones.** La matriz de paridad (sección 15) debe acabar 100 % en ☑, cada fila con evidencia (test, captura o nota).
6. **Cada dependencia nueva** requiere un ADR de 5–10 líneas en `docs/adr/NNNN-titulo.md` (contexto, decisión, alternativas descartadas, consecuencias).
7. **Estilo de código legible.** El código actual está escrito en líneas larguísimas y minificadas a mano; el nuevo debe ser normal, formateado y comentado solo donde haya una regla de negocio.
8. **Idioma:** identificadores, ramas y commits en inglés; textos de interfaz en español de España (`es-ES`); documentación en español.

---

## 1. OBJETIVO

Reescribir **Denty v2.0.0** (frontend Next.js desplegado en Vercel) a la arquitectura objetivo de la sección 4, **conservando todas las funciones y reglas de negocio actuales**, eliminando la deuda técnica de la sección 3.8 y dejando el proyecto listo para producción sanitaria en España.

**Resultados medibles al terminar:**

| Área | Meta |
|---|---|
| Funcionalidad | 100 % de la matriz de paridad (sección 15) |
| Tipado | TypeScript `strict` + `noUncheckedIndexedAccess`; **0** `any` explícitos fuera de fronteras documentadas (hoy hay ≈213) |
| Estilos | **0** `!important`, **0** estilos inline estáticos (hoy ≈74 objetos `style={{}}`), 100 % CSS Modules + tokens del tema |
| Legacy | Eliminados `/legacy`, `denty-app.bundle.js` (578 KB), `public/styles/*` y `legacy-shell.ts` |
| Datos clínicos | **0** datos de pacientes en `localStorage`/`sessionStorage`; sin fallback silencioso |
| Diálogos | **0** usos de `window.prompt` / `window.confirm` (hoy ≈20) |
| Rendimiento | LCP < 2,0 s y INP < 200 ms en Android gama media con 4G; CLS < 0,05 |
| JS inicial por ruta | ≤ 170 KB gzip (sin contar librerías cargadas bajo demanda) |
| Accesibilidad | WCAG 2.2 AA; 0 violaciones `serious/critical` en axe |
| Tests | ≥ 90 % de cobertura en `domain/`; e2e de los flujos críticos (sección 12) |

**No-objetivos (no hagas esto sin aprobación explícita):** cambiar el contrato de API existente, rediseñar el producto, añadir módulos nuevos, introducir dependencias de pago o de licencia comercial.

---

## 2. CONTEXTO DEL PRODUCTO

**Denty** es un CRM/software de gestión para clínicas dentales en España. Cubre: pacientes y ficha clínica, odontograma y periodontograma, plan de tratamiento con presupuesto, agenda por profesional, facturación con VERI*FACTU, cobros, laboratorio, recetas, documentos con firma, comunicaciones (WhatsApp/SMS/portal), marketing, alertas y objetivos, análisis financiero, fichaje del personal, seguridad/RGPD, comandos de voz, **portal del paciente** y **juegos para la sala de espera** con bono de descuento.

**Roles detectados:** `ADMIN`, `DENTIST`, `RECEPTION`, `PATIENT` (más cuentas familiares con relación `GUARDIAN` / `AUTHORIZED` / `FAMILY`).

**Permisos detectados (strings):** `patients.read`, `agenda.read.all`, `agenda.read.own`, `analysis.read`, `finance.read`, `marketing.read`, `alerts.read`, `communications.read`, `lab.read`, `documents.read`, `documents.write`, `documents.sign`, `prescription.read`, `settings.manage`.

**Dispositivos objetivo:** tablet en gabinete (uso principal, táctil), ordenador de recepción, móvil del paciente (portal + juegos). Diseño *tablet-first*, con teclado y ratón como ciudadanos de primera.

**Moneda/locale:** EUR, `es-ES`, zona horaria `Europe/Madrid`.

---

## 3. AUDITORÍA DEL PROYECTO ACTUAL (fuente de verdad del comportamiento)

### 3.1 Stack actual
- Next.js `15.5.25` (App Router), React `19.0.0`, TypeScript `5.9.3`, `@tanstack/react-query 5.62.7`. **Solo 4 dependencias de producción.**
- Node `24.x`. Sin `package-lock.json`. `npm install` en Vercel. Sin ESLint (`eslint.ignoreDuringBuilds: true`), sin Prettier, sin tests.
- `tsconfig`: `strict: true` pero `noImplicitAny: false` y `allowJs: true`.
- Estilos: `src/app/globals.css` (≈37 KB en 63 líneas), clases globales con prefijos `native-*` y `denty-*`, sin dark mode, sin `@keyframes`; más `public/styles/*` (≈117 KB `styles.css` + `phase1-4.css`, `visual-polish.css`, `denty-motion.css`, `cinematic-motion.css`) que pertenecen al legacy.
- Iconos: glifos Unicode (`⌂ ◎ ▦ ◇ ✉ □ € ↗ ! ◷ ⚙ •••`) y SVG sueltos.
- `next.config.mjs`: cabecera `Permissions-Policy: microphone=(self)` y *rewrites* `/api/:path*` y `/health/:path*` → `DENTY_API_URL` (opcional). Sin CSP ni otras cabeceras de seguridad.
- `scripts/preflight-vercel.mjs`: validador casero de estructura (prohíbe monorepo/pnpm/prisma, comprueba imports relativos, dependencias declaradas, etc.).
- PWA: `manifest.webmanifest` (nombre "Denty Web Preview 1.7.2…") y `sw.js` **vacío** (solo `skipWaiting` + `clients.claim`).

### 3.2 Árbol de rutas actual
```
/                              → redirect("/app")
/login                         → LoginForm (login / recuperar / usar token)
/legacy                        → app antigua en HTML inyectado + denty-app.bundle.js   ← ELIMINAR
/demo/juan-perez               → ficha demo hardcodeada                                ← pasar a modo demo
/app                           → Dashboard "Hoy / Lo siguiente"
/app/patients                  → lista + búsqueda + alta rápida
/app/patients/[id]             → ficha: historia clínica, odontograma, plan, documentos, acceso paciente
/app/agenda                    → agenda (vistas Doctores / Día / Lista)
/app/finance                   → Resumen, VERI*FACTU, Facturas, Presupuestos, Cobros
/app/laboratory                → trabajos de laboratorio
/app/prescriptions             → recetas
/app/documents                 → plantillas, firma, entrega, archivo
/app/communications            → mensajes + consentimientos
/app/analysis                  → analítica financiera avanzada
/app/campaigns                 → Meta Ads / Google Ads
/app/alerts                    → centro de alertas + objetivos de facturación
/app/attendance                → fichaje + control horario del equipo
/app/settings                  → usuarios, copias, sesiones, RGPD, recetas, marketing
/patient/[patientId]           → portal del paciente
/patient/[patientId]/games     → iframe a /games/index.html                            ← reescribir
/games/index.html (+js/css)    → 13 juegos en JS vanilla (estático en /public)          ← reescribir
```

### 3.3 Módulos: qué hacen hoy y qué falla

| Módulo | Estado actual (verificado en el código) | Problemas detectados |
|---|---|---|
| **AppShell** | Sidebar con 3 ítems primarios (Inicio, Pacientes, Agenda) + menú "Más" (Laboratorio, Recetas, Comunicaciones, Documentos, Finanzas, Análisis, Campañas, Alertas, Fichaje, Ajustes) filtrado por permisos; campana de alertas (polling 30 s); pill "Local-first / Sincronizado"; `VoiceCommandBar` | Guardia de sesión en cliente con `location.href`; `useSession` sin caché (cada componente repite `/api/auth/session`); menú sin foco/Escape; iconos Unicode |
| **Dashboard** | "Lo siguiente": próxima cita activa, 4 siguientes, tarjetas de atención (presupuestos por cerrar, laboratorio retrasado, receta), botón de fichaje | `todayISO()` usa `toISOString()` (UTC) → entre 00:00 y 01:00/02:00 hora de Madrid muestra **el día anterior** |
| **Pacientes** | Lista con búsqueda (nombre, ficha, DNI) y alta rápida; paciente demo inyectado en cliente | `DEMO_PATIENT` hardcodeado en producción; sin paginación ni virtualización; `autoFocus` forzado |
| **Ficha de paciente** | Cabecera + resumen "Ahora / Próximo paso" + 4 paneles (Historia, Odontograma, Plan, Documentos) + Acceso paciente (invitación 72 h, origen declarado, acceso familiar) | Lógica de negocio mezclada en el componente de página (≈12 KB, muchos `prompt()`) |
| **Odontograma (nativo)** | **NO es visual.** Son inputs de texto (diente, rango de puente, sondaje) + botones: "Implante + pilar + corona", "Endo + perno + corona", "Removible", "Crear puente", "Guardar periodontal", "Guardar foto temporal", y una lista de tarjetas de entidades | Falta el odontograma real (SVG). La versión gráfica solo existe en `/legacy` (ver 3.7) |
| **Historia clínica** | 3 formularios: Endodoncia (AAE 2009), Periodontograma (6 sitios × 32 dientes, Stage/Grade/Extent) y Acto clínico firmado; línea temporal | ≈30 `useState` en un solo componente (19 KB); periodontograma edita un diente cada vez |
| **Plan de tratamiento** | Fases 1–5, dependencias entre pasos con motivo, override de prioridad con motivo obligatorio, alternativas (diente ausente, conservar/extraer, restauración/corona, removible/Kennedy), vista paciente vs profesional, presupuesto por categorías | Estilos inline; `prompt()` para retratamiento y Kennedy |
| **Agenda** | Columnas por doctor / cuadrícula por día (huecos de 20 min de 08:00 a 19:00) / lista; arrastrar y soltar HTML5; menú contextual (clic derecho o pulsación larga 450 ms): copiar, extender (+10/20/30/60), cancelar; pegar en hueco; solicitudes de cita del paciente; estado del bono de juegos; concurrencia optimista con `expectedVersion` | **Bug:** en vista Día solo se pintan citas cuyo `hhmm` coincide exactamente con un hueco (una cita a las 08:30 **desaparece**); el botón "+ Cita" **no tiene handler**; DnD HTML5 no funciona en táctil; paneles flotantes con estilos inline; sin detección de solapes ni altura proporcional a la duración |
| **Finanzas** | Resumen admin (KPIs, tendencia, 5 tartas), VERI*FACTU (estado, reintento, ajustes), Facturas (emitir, rectificar R1–R5, PDF, remitir), Presupuestos → factura borrador, Cobros → asignación a facturas, series, export CSV contable | **Flujos financieros con `prompt()`** (crear factura, serie, cobro, asignar, rectificar, ajustes fiscales); validación inexistente; IVA fijo `taxRateBps: 0` con `exemptionCode: "E1"` |
| **Laboratorio** | Tabla con estados (`IMPRESSION_TAKEN, SCANNED, SENT, IN_PRODUCTION, TRIAL, RECEIVED, PLACED, INCIDENT, CANCELLED`), adjuntos en base64, repetición con coste | Subida de archivos en base64 dentro de JSON |
| **Recetas** | Borrador → validar → emitir/anular; medicamentos con 10 campos; ajustes de prescriptor | Sin validación de esquema en cliente |
| **Documentos** | Plantillas versionadas, finalizar, firmar (firma electrónica simple), entregar por portal, archivar (PDF + hash) | `prompt()` para firma y versiones |
| **Comunicaciones** | Canales WhatsApp/SMS/Portal; 5 categorías; consentimiento por canal+categoría | — |
| **Campañas** | Conexiones Meta/Google, campañas, pausar/activar, presupuesto diario | `prompt()` para presupuesto |
| **Alertas** | Lista con severidad/estado, acciones, objetivos mensuales de facturación con proyección | — |
| **Análisis** | Filtros (año, doctor, sede, especialidad), comparativa interanual, puente de margen, barras, recetas de coste, compras | Gráficos SVG artesanales duplicados (`DentyTrendChart`, `DentyPieChart`, `Bars`, `Lines`, `MarginBridge`) |
| **Fichaje** | Botón entrada/salida con actualización optimista; vista admin diaria con turnos, fichajes y ausencias (`VACATION, SICK_LEAVE, PERMISSION, PERSONAL, OTHER`) | — |
| **Ajustes** | Usuarios, copias de seguridad (crear/verificar), sesiones (revocar), solicitudes RGPD (exportar/rectificar…), export JSON de paciente, ajustes de receta, conexiones de marketing | Todo en una página de 15 KB |
| **Voz** | Barra flotante: dictado (Web Speech API o servidor ASR) → `preview` (plan + `planToken` + política de confirmación) → `execute`; acciones: resolver paciente, llegada, ausencia, añadir tratamiento, dependencias, programar cita, presupuesto, cobro, laboratorio, navegar | Patrón excelente (vista previa + token + confirmación): **conservarlo**. Enlace "Prueba online" apunta a `/legacy` |
| **Portal paciente** | Próxima cita, check-in, reserva con huecos de 30 min o solicitud de cita, plan con alternativas y preferencias (`INTERESTED`/`DISCUSS`), aceptar presupuesto, pagar (`payment-intents` → `checkoutUrl`), firmar documentos, "cómo nos conociste", acceso a juegos | Todo en una página de 11 KB |
| **Juegos** | Ver 3.6 | Ver 3.6 |

### 3.4 Capa de datos actual (el mayor riesgo del proyecto)

- `src/lib/api.ts`: `fetch` con `credentials:"include"`. **Si la respuesta es 404/405/500/502/503/504 o falla la red en cualquier `/api/*`, cae en silencio a `localApi`.**
- `src/lib/local-api.ts` (≈17 KB): API simulada completa sobre `localStorage` (clave `denty.local.v13`) con pacientes, odontograma, plan, presupuestos, agenda, laboratorio, cobros, facturas, fichaje… **Datos de salud en el navegador, sin cifrar.**
- En modo local `/api/auth/login` devuelve `{ok:true}` **sin comprobar credenciales** y `/api/auth/session` devuelve un `ADMIN`. Sin `DENTY_API_URL` cualquiera que abra la URL entra como administrador.
- `use-api-data.ts`: `useQuery` con `initialData` (oculta estados de carga), setter global mutable (`externalClientSetter`) y `useRealtime` que abre un `EventSource("/api/events")` por componente e **invalida todas las queries** ante cualquier evento.
- Eventos SSE escuchados: `appointment.created|arrived|in_chair|completed|no_show`, `clinical_plan.item_created|completed`, `invoice.issued|rectified`, `payment.received|allocated`, `lab.sent|received|placed`, `odontogram.updated`, `document.signed`.
- `QueryClient`: `staleTime 15 s`, `refetchOnWindowFocus`, reintentos ≤2 salvo 401/403.
- Dinero en **céntimos enteros** (correcto, conservar) con `Intl.NumberFormat("es-ES", EUR)`.
- Concurrencia optimista: `expectedVersion` en citas, odontograma, laboratorio (conservar y gestionar el 409 en UI).

### 3.5 Contrato de API inferido (≈100 endpoints; el backend NO viene en el ZIP)

> El backend real vive fuera (variable `DENTY_API_URL`; antes era un monorepo con `apps/api` y Prisma, ya eliminado). **Debes formalizar este contrato en `docs/API_CONTRACT.md` y en esquemas `zod` (`shared/api/schemas`), marcando `INFERIDO` todo lo no confirmado.**

- **Auth:** `POST /api/auth/login|logout|request-password-reset|reset-password`, `GET /api/auth/session`
- **Pacientes:** `GET/POST /api/patients`, `GET /api/patients/:id`, `PUT /api/patients/:id/source`, `POST /api/patients/:id/invitations`, `GET/POST /api/patients/:id/family-grants`, `DELETE …/family-grants/:grantId`, `GET/POST /api/patients/:id/communications`, `PUT …/communication-consents`
- **Clínico:** `GET /api/patients/:id/clinical-workflow`; `POST …/clinical-workflow/endodontics|periodontal-exams|encounters|endodontic-plan`
- **Odontograma:** `GET /api/patients/:id/odontogram`; `POST …/odontogram/batch|entities|periodontal|snapshots`
- **Plan:** `GET /api/patients/:id/clinical-plan`; `POST …/clinical-plan/alternatives|budget|preferences`; `POST /api/clinical-plans/:id/dependencies`, `DELETE …/dependencies?itemId&dependsOnId&reason`; `POST /api/clinical-plan/items/:id/priority-override|rework`; `POST /api/clinical-plan/alternatives/:id/approve`; `POST /api/clinical-plan/alternative-sets/:id/classification`
- **Agenda:** `GET /api/agenda/context|appointment-requests|game-status?date`; `GET/POST /api/appointments`, `PATCH /api/appointments/:id`, `POST /api/appointments/:id/{arrive|chair|no-show|complete|confirm-waiting-room}`; `POST /api/agenda/appointment-requests/:id/{schedule|cancel}`
- **Finanzas:** `GET/POST /api/invoices`, `POST …/:id/issue|rectify|verifactu/submit`, `GET …/:id/pdf`; `GET/POST /api/invoice-series`; `GET /api/budgets`, `POST /api/budgets/:id/invoice-draft`; `GET/POST /api/payments`, `POST …/:id/allocate`; `GET /api/admin/financial-dashboard`, `GET /api/admin/verifactu/status`, `PUT /api/admin/billing-settings`; `GET /api/accounting/export.csv?start&end`; `GET /api/supplier-invoices`
- **Laboratorio:** `GET/POST /api/lab-works`, `POST …/:id/transition|attachments|rework`, `GET …/:id/attachments/:attId`
- **Recetas:** `GET/POST /api/prescriptions`, `GET/PATCH …/:id`, `POST …/:id/validate|cancel`; `GET /api/prescription-settings`, `PUT …/clinic`, `PUT …/prescribers/:id`
- **Documentos:** `GET /api/documents[?patientId]`, `POST …/:id/finalize|sign|deliver|archive`, `GET …/:id/file`; `GET/POST /api/document-templates`, `POST …/:id/versions`
- **Admin:** `GET /api/admin/alerts`, `POST …/alerts/:id/:verb`; `GET/PUT /api/admin/revenue-goals`; `GET/POST /api/admin/communications`; `GET /api/admin/marketing/connections|campaigns`, `POST …/campaigns`, `POST …/campaigns/:provider/:externalId/status|budget`
- **Analítica:** `GET /api/analytics/{summary|monthly|comparison|doctors|specialties|treatments|treatments/drilldown|losses|purchases|events|cost-recipes}`
- **Personal:** `GET /api/attendance/me|daily`, `POST /api/attendance/punch`, `POST/DELETE /api/attendance/absences[/:id]`, `GET/POST /api/users`
- **Seguridad/RGPD:** `GET/POST /api/security/backups`, `POST …/backups/:id/verify`, `GET/DELETE /api/security/sessions[/:id]`, `GET/POST/PATCH /api/security/privacy-requests[/:id]`, `GET /api/security/patient-export/:id`
- **Voz:** `GET /api/voice/capabilities`, `POST /api/voice/preview|execute|transcribe`
- **Portal paciente:** `GET /api/patient/:id/projection`, `GET/POST /api/patient/:id/appointment-requests`, `GET /api/patient/:id/appointment-availability?date&durationMin`, `POST /api/patient/:id/appointments/book`, `POST /api/patient/:id/payment-intents`, `POST /api/patient/budgets/:id/respond`, `POST /api/patient/check-in/:appointmentId`
- **Juegos:** `GET /api/patient/:id/games/dashboard`, `POST …/games/plays/start`, `POST …/games/plays/:playId/finish` (body `{score?}`), `POST …/games/voucher`, `POST /api/game-vouchers/:id/apply`
- **Tiempo real:** `GET /api/events` (SSE)

### 3.6 Juegos (Denty Games)

- **Ubicación:** `public/games/` (JS vanilla, sin build, versionado a mano con `?v=107`), embebido en un `<iframe sandbox="allow-scripts allow-same-origin">` (esa combinación **anula el sandbox** al ser mismo origen).
- **13 juegos:** `snake`, `blockDrop`, `dentyRun`, `memory`, `merge`, `airHockey`, `dentyImpossible`, `ticTacToe` (modos IA/local), `miniGolf`, `breakoutDental`, `whackCavity`, `connectPuzzle`, `endlessRoad`.
- **Con ranking (11):** todos salvo `airHockey` y `ticTacToe`. `memory` y `miniGolf` registran récord al **terminar**; el resto en **directo**.
- **Reglas de negocio a conservar:**
  - Sin registro ni alias: la identidad es el **paciente autenticado**. El ranking muestra solo `Ficha ••NNNN` (últimos 4 dígitos del nº de ficha). **Prohibido** permitir alias o mostrar nombres clínicos.
  - Récords y partidas se guardan **por `patientId` en servidor**.
  - **Bono de visita:** se activa cuando recepción pulsa "Confirmar en sala" (`confirm-waiting-room`). Cada **3 partidas** válidas suman **1 €**, con tope de **15 partidas = 5 €** (`floor(n/3)*100` céntimos, máx. 500). Un único bono por cita; recepción/admin lo aplica con "Aplicar bono completo". Air Hockey no puntúa en ranking pero **sí cuenta para el bono**.
  - Flujo de partida: `start` → `playId` (persistido en `sessionStorage` para reanudar) → `finish` con `score`.
  - Modo demo del paciente `demo-juan-perez` con estado en `localStorage`.
- **Problemas:** el **cliente envía la puntuación** y el servidor no puede fiarse; 13 módulos que se registran en un objeto global (`window.DentyGames`), sin tipos ni tests; CSS propio de 25 KB y tokens `--dg-*` que duplican los de Denty; versionado de caché a mano (`?v=107`).
- **Tokens de color por juego:** snake `#008d8a`, blockDrop `#2764d8`, dentyRun `#4055a8`, memory `#6750b5`, merge `#2f8d62` (con variantes `-soft`).

### 3.7 Lo que solo existe en `/legacy` (hay que portarlo, no perderlo)

El bundle `denty-app.bundle.js` (566 funciones) contiene funcionalidad que **no** está en la app nativa. Extráela leyendo ese bundle como especificación:

- **Odontograma SVG real:** dientes FDI 11–48, **5 superficies** (`V, M, O, D, P`), **25 estados** (`healthy, filling(+_bad/_pending), crown(+…), endo(+_indicated), post, implant(+_review/_indicated), prosthesis, removable, caries, extraction, missing`), incompatibilidad implante↔caries, modelo de **entidades v3** con `parentId` (implante→pilar→corona; puente con pilares y pónticos), conectores de puente/prótesis, leyenda y **comparación entre snapshots**.
- **Periodontograma visual** con 6 sitios por diente, banderas (sangrado, placa, supuración), resumen visual.
- **Agenda avanzada:** bloqueos, lista de espera, huecos libres, opciones de reprogramación, sugerencias en cascada según el plan, colores por doctor (`#409bd7 #ef941f #e66c9e #23a98b #7c6ee6`), validación de solapes y de gabinete, auditoría de movimientos.
- **Consentimientos y certificados de asistencia** generados a partir de plantillas, con firma y auditoría.
- **Importación CSV de pacientes** con validación de filas; **turnos y ausencias** de personal; tareas rápidas; plantillas; asistente.
- **Portal paciente:** salud financiera, plan de pagos, proyección de fechas, sala de espera.
- **Selector de acceso** Administrador / Usuario / Paciente.
- **Parser de comandos de voz** (`parseDentalCommand`, `parseVoiceCommand`): extrae diente, superficie, tratamiento, importe, teléfono, DNI, método de pago, fecha hablada, rango FDI, arcada, sitio periodontal…

### 3.8 Deuda técnica detectada (a eliminar; cada punto debe cerrarse en alguna fase)

1. Fallback silencioso a `localStorage` con **acceso ADMIN sin autenticar** y datos de salud sin cifrar.
2. Guardia de autenticación solo en cliente; sin `middleware.ts`; navegación con `location.href`.
3. `useSession` sin caché; múltiples `EventSource`; invalidación global de queries.
4. `todayISO()`/`toISOString().slice(0,10)` → **bug de zona horaria** (UTC vs Europe/Madrid) en Dashboard, Agenda y otros.
5. Agenda: citas fuera de rejilla no se pintan; sin solapes; sin altura proporcional; DnD no táctil; "+ Cita" sin acción.
6. ≈20 `prompt()`/`confirm()` en flujos fiscales, de cobros, documentos y clínicos.
7. Cero validación de entradas (sin esquemas); ≈213 usos de `any`; `noImplicitAny: false`.
8. Componentes gigantes (`ClinicalWorkspace` 19 KB, agenda 17 KB, ficha 12 KB) con decenas de `useState`.
9. Código en líneas de cientos de caracteres; sin ESLint/Prettier/tests/CI; sin `package-lock.json`; `tsconfig.tsbuildinfo` commiteado.
10. CSS global sin ámbito + ≈74 estilos inline + sin dark mode + iconos Unicode; motion con runtime propio (`DentyMotionRuntime`, `cinematic-motion.js`).
11. Iframe con `allow-scripts allow-same-origin`; sin CSP; puntuaciones de juegos enviadas por el cliente.
12. Demo hardcodeada en producción (`DEMO_PATIENT`, `/demo/juan-perez`).
13. Subida de adjuntos en base64 dentro de JSON.
14. Versiones incoherentes: `package.json 2.0.0`, README "1.0.7", manifest "1.7.2", juegos `v107`, bundle "1.6".
15. Service worker vacío; logo PNG de 154 KB usado con `<img>`; sin `next/font`.
16. `preflight-vercel.mjs` casero que hay que sustituir por lint + tests + CI.

---

## 4. ARQUITECTURA OBJETIVO (decisiones CERRADAS)

> Versiones: usa la **última versión estable** compatible con Next 15.x / React 19 en el momento de ejecutar y **fija versiones exactas** (sin `^`). Consúltalas con `npm view`. Cualquier desviación de esta tabla exige un ADR.

### 4.1 Stack

| Capa | Decisión | Por qué |
|---|---|---|
| Framework | **Next.js App Router** (mantener 15.x salvo ADR), React 19, **Server Components por defecto**, `"use client"` solo en hojas interactivas | Menos JS en cliente, datos iniciales en servidor |
| Lenguaje | **TypeScript** con `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `verbatimModuleSyntax`; `allowJs: false` | Errores en compilación, no en consulta |
| UI | **Mantine** (core, hooks, form, dates, notifications, modals, charts) | Un CRM son tablas, formularios, fechas, modales y avisos: ya vienen hechos, accesibles y con modo oscuro |
| Estilos | **CSS Modules** + `postcss-preset-mantine` + variables CSS del tema | CSS normal con ámbito, sin clases largas en el HTML, sin runtime |
| Tablas | **TanStack Table** + **TanStack Virtual** (listas > 200 filas) | Tablas grandes fluidas |
| Servidor-estado | **TanStack Query 5** con `HydrationBoundary`, fábrica de *query keys*, actualizaciones optimistas | Caché, reintentos, invalidación fina |
| Validación | **zod** (esquemas de API, formularios y variables de entorno) + `@mantine/form` con resolver zod | Una sola fuente de verdad de tipos |
| Fechas | **date-fns** + `@date-fns/tz` (`Europe/Madrid`) | Adiós a `toISOString().slice(0,10)` |
| Estado de URL | **nuqs** (filtros, pestañas, fecha de agenda, `?tab=&budgetId=`) | Enlaces compartibles, botón atrás correcto |
| Animación | **Motion** (`motion`), `prefers-reduced-motion` respetado | Sustituye `DentyMotionRuntime` y `cinematic-motion.js` |
| Iconos | **@tabler/icons-react** (importaciones por icono) + SVG propios para iconos dentales en `shared/ui/icons` | Sustituye glifos Unicode |
| Gráficos | **@mantine/charts** (Recharts por debajo), cargados con `next/dynamic` | Sustituye los 5 gráficos SVG artesanales |
| Odontograma | **Componente SVG propio** (sección 9.5) | Ninguna librería cubre FDI + 5 caras + entidades |
| Agenda | **`AgendaGrid` propio** (CSS Grid + **@dnd-kit** + lógica pura en `domain/agenda`) | La vista por profesional/sillón (*resource view*) de FullCalendar es de pago; @dnd-kit soporta táctil, ratón y teclado |
| PDF | El backend sigue sirviendo los PDF oficiales (`/pdf`, `/file`); visor embebido en modal. En modo demo, `@react-pdf/renderer` en `route handler` Node | Los PDF con hash/QR VERI*FACTU no se generan en cliente |
| Juegos | **Canvas 2D + motor propio mínimo** (sección 9.20). **Phaser queda excluido** salvo ADR con medición de bundle | 13 juegos sencillos; Phaser pesaría ≈1 MB |
| i18n | **next-intl** con solo `es` activo y diccionario tipado (`messages/es.json`) | Preparado para catalán, gallego, euskera y valenciano |
| Auth | Sesión por **cookie httpOnly** del backend; verificación en `middleware.ts` + Server Component; RBAC compartido | Nada de guardias solo en cliente |
| Monitorización | **Sentry** con *scrubbing* de PII sanitaria + Vercel Speed Insights (sin cookies) | Nunca enviar datos de pacientes a terceros |
| Gestor de paquetes | **npm** con `package-lock.json` commiteado y `npm ci` | Reproducible; coherente con `vercel.json` actual |
| Node | `engines.node: 24.x` (mantener) | Igual que hoy |

### 4.2 Reglas de datos sensibles (innegociables)

1. **Prohibido** guardar datos de pacientes/clínicos en `localStorage`, `sessionStorage`, cookies legibles o IndexedDB sin cifrar. Solo se permiten *preferencias de UI* (tema, densidad, sidebar plegado) y el `playId` en curso de un juego.
2. **Eliminar `local-api.ts` y el fallback silencioso.** Si el backend falla, se muestra un estado de error claro (`ErrorState` con reintento) y un banner de "Sin conexión con el servidor".
3. **Modo demostración explícito y aislado:** `NEXT_PUBLIC_DEMO_MODE=true` activa **MSW** con datos ficticios **solo en memoria**, banner permanente "MODO DEMOSTRACIÓN — datos ficticios", y el paciente "Juan Pérez · Ficha 000001". En producción real este modo debe estar **desactivado y no incluido en el bundle** (`process.env` en compilación + `dynamic import`).
4. **Sin sesión → sin datos.** El modo demo tiene su propio login falso, nunca concede rol real.
5. Logs y Sentry: **sin PII** (nombres, DNI, teléfonos, notas clínicas). Usa IDs opacos.
6. Cabeceras de seguridad en `next.config`/`middleware`: **CSP con nonce** (sin `unsafe-inline` en scripts), `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy: microphone=(self), camera=(), geolocation=()`, `frame-ancestors 'none'`, `Cross-Origin-Opener-Policy: same-origin`. Informe CSP a un endpoint propio.
7. Mutaciones críticas (emitir factura, cobro, fichaje, firma, aplicar bono) con **`Idempotency-Key`** generada en cliente y **botón deshabilitado mientras está en curso**.

### 4.3 Capa de datos objetivo

```
shared/api/
  client.ts          # fetch tipado: credentials, timeout, AbortSignal, Idempotency-Key, mapeo de errores
  errors.ts          # ApiError { status, code, message, details } + isConflict(409) / isUnauthorized(401)…
  schemas/*.ts       # zod por recurso (Patient, Appointment, Invoice…) — tipos inferidos con z.infer
  endpoints/*.ts     # funciones por recurso: patients.list(), appointments.move(id, body)…
  query-keys.ts      # fábrica: qk.patients.list(filters), qk.appointments.day(date), …
  realtime.ts        # UNA sola conexión SSE por sesión (provider) → mapa evento→queryKeys a invalidar
features/<x>/api/    # hooks useXQuery/useXMutation que usan lo anterior
```
- **Parsear con zod en la frontera** (`schema.parse`); si falla en desarrollo, lanzar; en producción, registrar (sin PII) y mostrar `ErrorState`.
- **Sin `initialData` falso.** Usa `isPending`/`isError`, *skeletons* con dimensiones estables (sin CLS) y `placeholderData: keepPreviousData` en filtros.
- **Mapa evento → invalidación** (en vez de invalidar todo): p. ej. `appointment.*` → `qk.appointments.*` + `qk.dashboard`; `invoice.*`/`payment.*` → `qk.finance.*`; `odontogram.updated` → `qk.odontogram(patientId)`; `lab.*` → `qk.lab.*`; `document.signed` → `qk.documents.*`; `clinical_plan.*` → `qk.plan(patientId)`.
- **Concurrencia optimista:** en `409` mostrar `ConflictDialog` ("Otra persona modificó este elemento") con opción de recargar y reintentar. Nunca sobrescribir en silencio.
- **Actualizaciones optimistas** (con rollback) en: mover/redimensionar cita, fichaje, cambio de estado de cita, cambio de estado de laboratorio.
- **Sesión:** `getSession()` con `React.cache` en el servidor; en cliente, un `SessionProvider` alimentado desde el layout (una sola petición). Refresco de sesión en `401` → redirigir a `/login?next=`.
- **Subida de archivos:** sustituir base64-en-JSON por `multipart/form-data` (o URL prefirmada si el backend la ofrece; si no, `INFERIDO` + ADR). Límite de tamaño y tipos MIME validados en cliente.

## 5. SISTEMA DE DISEÑO

### 5.1 Tokens actuales a conservar (identidad visual de Denty)

```
--denty-bg     #f5f8fb    --denty-card  #ffffff   --denty-text  #152235
--denty-muted  #687689    --denty-line  #e3eaf1
--denty-blue   #2764d8    --denty-teal  #008d8a   --denty-green #2f8d62
--denty-amber  #b88408    --denty-violet #6750b5  --denty-indigo #4055a8
Colores de doctor en agenda: #409bd7 #ef941f #e66c9e #23a98b #7c6ee6
Radios: 8 / 10 / 14 (controles) / 18 (tarjetas) / 22 (paneles) / 24 (tablero) / pill
Espaciado: sistema de 4 px. Tipografía: Inter, ui-sans-serif, system-ui.
Estados de cita: verde=IN_CHAIR · azul=NO_SHOW · amarillo=ARRIVED (<15 min) · rojo=ARRIVED (>15 min)
```

### 5.2 Requisitos del tema (`src/styles/theme.ts`)
- `createTheme` de Mantine: **primario = teal** (`#008d8a`) con escala de 10 tonos generada y contrastada; azul como color secundario/enlaces; verde/ámbar/rojo semánticos.
- **Modo claro, oscuro y automático** (`prefers-color-scheme`) con selector en Ajustes. Todos los colores como variables CSS; usar `light-dark()` o `[data-mantine-color-scheme]`.
- **Contraste WCAG 2.2 AA** verificado (texto ≥ 4,5:1; UI ≥ 3:1). El color nunca es la única señal (los estados de cita llevan icono y texto).
- **Densidad**: `comfortable` (tablet, objetivos táctiles ≥ 44 px) y `compact` (sobremesa). Persistir solo la preferencia.
- Tipografía con `next/font` (Inter, subsets `latin` y `latin-ext`, `display: swap`).
- Logo: convertir el PNG de 154 KB a **SVG** (o AVIF/WebP) y usar `next/image`.
- Documentar en `docs/DESIGN_SYSTEM.md`: tokens, componentes base, patrones (lista→detalle, formulario, confirmación destructiva, estado vacío/error/carga) y ejemplos de uso.

### 5.3 Componentes base propios (`shared/ui`) — todos con tests y ejemplos
`PageHeader`, `EmptyState`, `ErrorState`, `ConfirmDialog` (sustituye `confirm()`), `PromptDialog`/`FormDialog` (sustituye `prompt()`), `MoneyInput`, `MoneyText`, `DateText`, `TimeText`, `StatusBadge` (mapa de estados → color+icono+texto), `KpiCard`, `DataTable` (TanStack Table + Mantine), `PatientAvatar`, `PermissionGate`, `Toolbar`, `SegmentedTabs` (sincronizado con URL), `FloatingPanel` (sustituye los paneles `position:fixed` con estilos inline), `ContextMenu` (clic derecho + pulsación larga accesible), `Skeletons`, `OfflineBanner`, `DemoBanner`.

## 6. ESTRUCTURA DE CARPETAS OBJETIVO

```
denty/
├─ src/
│  ├─ app/
│  │  ├─ (public)/login/ · forgot-password/ · reset-password/
│  │  ├─ (staff)/app/ layout.tsx (AppShell) · page.tsx (Dashboard)
│  │  │   patients/ · patients/[id]/ · agenda/ · finance/ · laboratory/ · prescriptions/
│  │  │   documents/ · communications/ · analysis/ · campaigns/ · alerts/ · attendance/ · settings/
│  │  ├─ (patient)/patient/[patientId]/ page.tsx · games/ page.tsx
│  │  ├─ api/csp-report/route.ts · api/health/route.ts
│  │  ├─ layout.tsx · global-error.tsx · not-found.tsx · loading.tsx
│  ├─ features/            # 1 carpeta por módulo de negocio
│  │  └─ <feature>/ { components/ · hooks/ · api/ · model/ · schemas/ · __tests__/ · index.ts }
│  ├─ domain/              # TypeScript PURO (sin React, sin fetch): testeable al 90 %+
│  │  ├─ money.ts · dates.ts · agenda/ · odontogram/ · perio.ts · plan/ · billing/ · rewards.ts · permissions.ts · state-machines/
│  ├─ shared/
│  │  ├─ api/ · ui/ · lib/ · config/env.ts (zod) · i18n/ · types/
│  ├─ mocks/               # MSW handlers + fixtures (solo dev, test y demo)
│  ├─ styles/              # theme.ts · tokens.css · global.css (mínimo)
│  └─ middleware.ts
├─ messages/es.json
├─ e2e/                    # Playwright
├─ docs/                   # ARCHITECTURE · API_CONTRACT · DESIGN_SYSTEM · SECURITY · MIGRATION_MATRIX · ASSUMPTIONS · adr/
├─ .github/workflows/ci.yml
├─ package.json · package-lock.json · tsconfig.json · next.config.ts · eslint.config.mjs · .prettierrc · .stylelintrc.json · vitest.config.ts · playwright.config.ts · vercel.json · .env.example
```
- **Regla de dependencias:** `app → features → shared/domain`. `domain` no importa nada de React/Next. Una feature **no importa** de otra feature (solo de `shared` y `domain`); si necesita algo, se sube a `shared`. Forzarlo con `eslint-plugin-boundaries` o `no-restricted-imports`.
- **Componentes de servidor por defecto.** Marcar `"use client"` lo más abajo posible del árbol.

## 7. REGLAS DE CÓDIGO (aplicables a TODO)

1. **Nada de líneas de más de 100 caracteres**; Prettier obligatorio; sin one-liners encadenados.
2. **Funciones ≤ 40 líneas**, **componentes ≤ 200 líneas**, **archivos ≤ 300 líneas**. Un componente grande se divide en subcomponentes + hooks (`useOdontogramSelection`, `usePerioForm`…).
3. **Exportaciones con nombre**; `default` solo en `page/layout/loading/error/not-found`.
4. Archivos en `kebab-case`, componentes en `PascalCase`, hooks `useX`, tipos `PascalCase`, constantes `SCREAMING_SNAKE_CASE`.
5. **Prohibido `any`** (regla ESLint como error). En fronteras inevitables usar `unknown` + zod. `// eslint-disable` solo con motivo escrito.
6. **Prohibido:** `!important`, `style={{...}}` estático, `window.prompt/confirm/alert`, `location.href` para navegar dentro de la app (usar `useRouter`/`<Link>`), `localStorage` para datos de pacientes, `dangerouslySetInnerHTML` (salvo contenido saneado y justificado), `useEffect` para derivar estado (derivarlo en render o con `useMemo`), *prop drilling* de más de 2 niveles.
7. **Formularios:** `@mantine/form` + zod; errores por campo con `aria-describedby`; validación en `onBlur`+`onSubmit`; botón de envío con estado de carga; nunca perder lo escrito al fallar.
8. **Efectos:** limpiar siempre listeners, timers, `AbortController`, `EventSource` y *streams* de audio.
9. **Enums de dominio** como uniones literales + `as const` en `domain/`; **máquinas de estado** explícitas (sección 8) con transiciones permitidas y tests.
10. **Nada de `Date` sin zona:** todas las fechas de negocio pasan por `domain/dates.ts` (`Europe/Madrid`). Se guarda y transmite ISO 8601 con offset; se muestra con `Intl`/date-fns.
11. **Dinero:** céntimos enteros, nunca `float`. Redondeo único y documentado en `domain/money.ts`. Tipo de IVA en puntos básicos (`taxRateBps`).
12. **Comentarios:** solo el *porqué* de reglas clínicas/fiscales (con referencia a norma o guía clínica). No comentar lo obvio.
13. **Textos de interfaz:** todos vía `next-intl` (`t("agenda.copyAppointment")`); ninguna cadena literal en JSX salvo símbolos.
14. **Commits** convencionales (`feat(agenda): …`), un PR por fase, con descripción, capturas y checklist.

---

## 8. DOMINIO Y REGLAS CRÍTICAS (lógica pura en `src/domain`, con tests)

> Extrae estas reglas del código actual y del bundle legacy. Todo aquí es TypeScript sin React. Cada regla lleva tests unitarios con los casos límite indicados.

**8.1 Dinero (`money.ts`)** — `Cents = number` (entero). `formatEUR(cents)`, `parseEUR("1.234,56") → 123456`, `mulQty(unitCents, qty)`, `taxFromBps(baseCents, bps)`. Un único punto de redondeo documentado. Tests: 0, negativos (rectificativas), 0,005 €, importes con coma/punto, `NaN`.

**8.2 Fechas (`dates.ts`)** — `todayMadrid()`, `startOfDayMadrid(d)`, `toMadridISO(d)`, `hhmm(iso)`, `addMinutes`, `overlaps`. Tests obligatorios en los cambios de hora de **2026-03-29** y **2026-10-25**, y a las 23:30/00:30 (el bug actual de `toISOString()`).

**8.3 Máquinas de estado (`state-machines/`)** — transiciones explícitas, con `canTransition(from, action, actorRole)`; el backend sigue siendo la autoridad (lo no evidente en el código se marca `INFERIDO`):
- **Cita:** `PLANNED → CONFIRMED → ARRIVED → IN_CHAIR → COMPLETED`; `NO_SHOW`; `CANCELLED` (se conserva en historial). "Ha llegado" solo desde `PLANNED/CONFIRMED`; "Confirmar en sala" solo `ARRIVED` sin sesión de visita y rol `ADMIN/RECEPTION`. Estados "no activos": `CANCELLED, COMPLETED, NO_SHOW`. Espera > 15 min desde `arrivedAt` → rojo, si no amarillo.
- **Laboratorio:** `DRAFT → IMPRESSION_TAKEN|SCANNED → SENT → IN_PRODUCTION → TRIAL → RECEIVED → PLACED`; `INCIDENT`, `CANCELLED`. Retrasado = `etaAt < ahora` y estado ∉ `{RECEIVED, PLACED, CANCELLED}`.
- **Factura:** `DRAFT → ISSUED → RECTIFIED`. Tipos `STANDARD` / `SIMPLIFIED`. Rectificativas `R1–R5` (por defecto `R5` en simplificada, `R1` en el resto). Una factura con saldo = estado ∈ `{ISSUED, RECTIFIED}` y cobrado < total.
- **Envío VERI*FACTU:** `PENDING → ACCEPTED | REJECTED | ERROR`; reintento permitido en `REJECTED/ERROR`. Modos fiscales: `VERIFACTU`, `NO_VERIFACTU`.
- **Cobro:** métodos `CASH, CARD, TRANSFER, FINANCING, OTHER`; asignación ≤ mínimo(restante del cobro, saldo de la factura).
- **Receta:** `DRAFT (Borrador) → READY (Validada) → ISSUED (Emitida)`; `CANCELLED (Anulada)`. Obligatorios paciente y prescriptor; ≥1 medicamento.
- **Presupuesto:** `DRAFT, PRESENTED, …` (`INFERIDO` el resto). Pendientes de cierre = `DRAFT|PRESENTED`.
- **Plan clínico (ítem):** `PLANNED, ACTIVE, DEFERRED` (pendientes), `COMPLETED`, `CANCELLED`. Fases 1–5 (defecto 5), prioridad 0–100.
- **Alternativas:** `DRAFT → CLINICALLY_APPROVED | REJECTED`; preferencia paciente `INTERESTED | DISCUSS`.
- **Documento:** plantilla versionada → `finalize` (PDF inmutable + hash) → `sign` → `deliver` (PORTAL) → `archive`.
- **Bono de juegos:** `AVAILABLE → APPLIED`.
- **Fichaje:** `nextAction` alterna `IN`/`OUT`.

**8.4 Agenda (`agenda/`)** — funciones puras: `layoutDay(appointments, config)` (posición, altura y columnas por solape), `snap(minutes, step)`, `canMove`, `resizeTo`, `durationMinutes` (mínimo 10), `findConflicts`. Duraciones permitidas `[20,30,45,60,90,120]`; extensiones `[10,20,30,60]`. Rejilla visual por defecto 08:00–19:00 cada 20 min, **configurable** (`INFERIDO`: horario por sede desde `/api/agenda/context`). Tests: citas fuera de rejilla (08:30), solapes triples, citas que cruzan el mediodía, DST.

**8.5 Odontograma (`odontogram/`)**
- Catálogo FDI: permanentes `11–18, 21–28, 31–38, 41–48`; temporales `51–55, 61–65, 71–75, 81–85`. Tipo de diente (incisivo/canino/premolar/molar) y **caras** `V, M, O, D, P` (replicar `occlusalSurfaceForTooth` y `normalizeSurfaceForTooth` del bundle).
- **25 estados** (lista en 3.7) con familias (`wholeToothStateFamily`) y semántica visual; regla **implante ↔ caries activa incompatibles**.
- Modelo de **entidades v3:** `{ id, tooth?, arch?, entityType, status, parentId?, attributes?, active }`. Plantillas de un clic que **deben producir exactamente** lo que hoy produce `NativeOdontogram`:
  - *Implante + pilar + corona:* `implant-{t}` (`IMPLANT/implant_pending`) → `implant-{t}-abutment` (`ABUTMENT/abutment_pending`, `parentId` implante) → `implant-{t}-crown` (`CROWN/crown_pending`, `parentId` pilar).
  - *Endo + perno + corona:* `ENDO/endo_indicated`, `POST/post_pending`, `CROWN/crown_pending`.
  - *Removible:* `REMOVABLE/planned` con `attributes.teeth` y `arch`.
  - *Puente:* `bridge-{from}-{to}` (`BRIDGE/bridge_pending`, `attributes {from,to,pillars,pontics}`) + `pontic-{from}-{to}-{t}` (`PONTIC/pontic_pending`, `parentId` puente). Pilares = extremos; pónticos = intermedios.
- **Bugs conocidos que NO debes heredar:** (a) el puente nativo solo funciona dentro de un cuadrante: de 13 a 23 genera un rango **vacío**; debe recorrer el orden de arcada (18→28 / 48→38) y permitir cruzar la línea media; (b) la arcada se calcula con `Number(tooth) < 30`, incorrecto en dentición temporal (51–65 son superiores).
- **Periodontograma:** sitios por diente = 6. Nombres en la API hoy: `MV, V, DV, MP, P/L, DP` (el legacy usa `mv,v,dv,ml,lp,dl` y el mock `B`): **normaliza con un adaptador** y mantén en la frontera los valores que el backend espera. Resumen: `BOP% = sitios con sangrado / total`, `placa%`, sitios con PS ≥4/5/6/7, `maxPD`, `maxCAL = máx(PS + recesión)`. Rangos de UI: PS 0–15, recesión −5–15, movilidad 0–3, furca 0–3. Clasificación: Stage `I–IV`, Grade `A–C`, Extensión `LOCALIZED | GENERALIZED | MOLAR_INCISOR`.
- **Endodoncia (AAE 2009):** pulpar = *Pulpa normal, Pulpitis reversible, Pulpitis irreversible sintomática, Pulpitis irreversible asintomática, Necrosis pulpar, Previamente tratado, Tratamiento previamente iniciado*; apical = *Tejidos apicales normales, Periodontitis apical sintomática, Periodontitis apical asintomática, Absceso apical agudo, Absceso apical crónico, Osteítis condensante*. Confianza `HIGH|MODERATE|LOW`; complejidad `LOW|MODERATE|HIGH`; restaurabilidad `FAVORABLE|GUARDED|UNFAVORABLE|NON_RESTORABLE`. **Pistas clínicas (conservar):** (1) dolor espontáneo/nocturno o frío persistente ≥10 s → patrón pulpar avanzado; (2) percusión ≠ negativa → componente apical; (3) *necrosis* + respuesta al frío → aviso de incoherencia. Texto: "Denty organiza hallazgos y comprueba coherencia; la decisión diagnóstica sigue siendo del odontólogo".

**8.6 Plan (`plan/`)** — orden de recorrido: fase, luego prioridad. Dependencias `itemId → dependsOnId` con motivo obligatorio (también para quitarla); cambio manual de fase/prioridad **exige motivo clínico**. Categorías de presupuesto por regex (orden fijo): *Terapia básica, Prótesis, Cirugía e implantes, Ortodoncia* (portar los regex de `BudgetFromPlanSelector`). Etiquetas amigables al paciente (`friendly()`): *Conservar el diente, Sustituir el diente, Reponer con puente, Prótesis removible, Alternativa provisional*. Tipos de alternativas: `missing_tooth`, `tooth_prognosis`, `restoration_choice`, `removable_design` (con clasificación de Kennedy confirmada por el profesional).

**8.7 Bono de juegos (`rewards.ts`)** — `rewardCents(n) = min(500, floor(n/3)*100)`; `n` máx. 15; `patientLabel(recordNumber) = "Ficha ••" + últimos 4`. Un solo bono por cita. Tests con n = 0, 2, 3, 14, 15, 16.

**8.8 Permisos (`permissions.ts`)** — `can(actor, permission)`; caso especial `agenda.read` = `agenda.read.all` **o** `agenda.read.own`. Mapa ruta→permiso único, usado por `middleware`, el menú y `PermissionGate`. Rol `PATIENT` solo accede a `/patient/[su id]` (y a los ids de sus `family-grants`).

---

## 9. MAPA DE MIGRACIÓN POR MÓDULO

> Para cada módulo: **Preservar** (comportamiento actual), **Mejorar** (obligatorio) y **Aceptación** (criterios comprobables). Los archivos de origen están en el ZIP.

### 9.1 Autenticación y AppShell
- **Preservar:** login por `identifier` + contraseña (≥10 caracteres al restablecer) con `deviceLabel`; recuperación en 2 pasos (solicitar → token + nueva contraseña); menú principal (Inicio, Pacientes, Agenda) + "Más" filtrado por permisos + Ajustes (`settings.manage`); campana de alertas con contador (9+) y popover con 5 últimas no resueltas; redirección de `PATIENT` a su portal; cierre de sesión.
- **Mejorar:** `middleware.ts` + verificación en servidor (sin parpadeo de "Cargando…"); `?next=` tras login; layout responsivo (rail lateral en tablet, barra inferior en móvil, sidebar completa en escritorio); menú "Más" como `Popover/Menu` de Mantine con foco y Escape; `useNow`/SSE en lugar de *polling* cada 30 s cuando haya SSE; **eliminar la pill "Local-first"** (se sustituye por `OfflineBanner` real y `DemoBanner`); cierre de sesión por inactividad (mejora propuesta, configurable en Ajustes).
- **Aceptación:** acceder a `/app/finance` sin permiso → 403 en servidor; sin sesión → `/login?next=/app/finance`; navegación completa con teclado; axe 0 críticos.

### 9.2 Dashboard "Hoy"
- **Preservar:** cabecera "HOY · Lo siguiente."; tarjeta "Ahora" (próxima cita cuya `endsAt ≥ ahora`, si no la primera activa) con botón "Abrir paciente"; lista "Después" (4); tarjetas de atención: presupuestos `DRAFT|PRESENTED`, laboratorio retrasado, acceso rápido a Receta; `AttendanceButton`.
- **Mejorar:** todos los cálculos de fecha en `Europe/Madrid`; datos iniciales por Server Component; *skeleton* sin CLS; los contadores dejan de descargar listas completas (`INFERIDO`: pedir `?summary=1`; si no existe, `BACKEND_GAPS.md`).
- **Aceptación:** a las 00:30 de Madrid muestra el día correcto (test con reloj falso).

### 9.3 Pacientes
- **Preservar:** búsqueda por nombre, ficha o DNI; alta rápida (nombre, apellidos, teléfono, email); avatar con iniciales; ficha `000001`.
- **Mejorar:** `DataTable` virtualizada + búsqueda con *debounce* y `useDeferredValue`; búsqueda en servidor con paginación (`INFERIDO`); validación de DNI/NIE y teléfono español; **quitar `DEMO_PATIENT`** (solo en modo demo); estado vacío y error; atajo `/` para enfocar el buscador (sin `autoFocus` forzado).
- **Aceptación:** 5.000 pacientes fluidos (test con fixtures); alta con errores por campo.

### 9.4 Ficha de paciente y Historia clínica
- **Preservar:** cabecera con "Continuar/Explorar", resumen "Ahora / Próximo paso", 4 secciones (Problemas y evolución, Odontograma, Plan activo, Documentos); Acceso paciente (invitación por email 72 h, "¿Cómo nos conociste?" con 8 orígenes `GOOGLE, INSTAGRAM, FACEBOOK, PATIENT_REFERRAL, PROFESSIONAL_REFERRAL, WALK_IN, EXISTING_PATIENT, OTHER`, acceso familiar `GUARDIAN/AUTHORIZED/FAMILY` con revocación); Historia clínica con problemas activos + línea temporal (12 últimos) y 3 registros: **Endodoncia**, **Periodoncia**, **Acto clínico** (se firma al registrar).
- **Mejorar:** cada panel es una **subruta con Parallel/Intercepting Routes** o pestaña sincronizada con URL (`?panel=`); `ClinicalWorkspace` se divide en `EndodonticForm`, `PerioChart`, `EncounterForm`, `ClinicalTimeline` (cada uno con su `@mantine/form`+zod, ≤200 líneas); **periodontograma de boca completa en una sola vista** (matriz de dientes × 6 sitios con entrada rápida por teclado: Tab/Enter avanza al siguiente sitio; vista de pie de tablet), con resumen en vivo (BOP%, placa%, ≥4/5/6/7, maxPD/CAL); guardado de borrador **solo en memoria** con aviso al salir (`beforeunload` + guard de navegación); las invitaciones/consentimientos usan `FormDialog` (sin `prompt`).
- **Aceptación:** registrar endodoncia → crea problema activo y aparece en línea temporal; "Crear plan desde diagnóstico" no duplica; perio de 32 dientes en < 3 min de uso simulado (Playwright con teclado).

### 9.5 Odontograma (componente estrella)
- **Preservar:** todo lo de 8.5 (catálogo, 25 estados, entidades v3, plantillas, snapshots con etiqueta "Control dd/mm/aaaa", `expectedVersion`).
- **Construir** `<Odontogram>` en SVG (portando la lógica gráfica del bundle legacy: `toothGeometry`, `surfaceSvg`, `toothMarkers`, `statusVisualSemantics`, `legendItems`, `bridgeConnectorSpansForArc`):
  - Árbol: `Odontogram → ArchRow ×2 → Tooth → ToothSurface ×5 + overlays (StateIcon, ImplantMark, BridgeConnector, PerioMarks)`. Contornos por tipo de diente con `<symbol>/<use>`; colores solo por variables CSS (claro/oscuro).
  - **Modos:** *Restaurativo*, *Periodontal* (6 sitios), *Comparar* (dos snapshots con diferencias resaltadas). **Dentición:** permanente / temporal / mixta.
  - **Interacción táctil y teclado:** toque en diente → `ToothPanel` (bottom-sheet en tablet/móvil, panel lateral en escritorio) con caras, estados (leyenda con icono **y** patrón, no solo color) y plantillas; toque en cara alterna estado; arrastre sobre varios dientes = selección de rango (puente/removible); `Tab` entra en la cuadrícula, flechas mueven (*roving tabindex*), `Enter` abre, `Espacio` alterna cara, `1–5` elige cara, `Ctrl/⌘+Z/Y` deshace/rehace (30 pasos).
  - **Rendimiento:** estado normalizado `Record<ToothId, ToothRecord>`, `React.memo` por diente con props estables, cambios locales sin re-render de los 52; objetivo < 16 ms por interacción en tablet de gama media.
  - **Persistencia:** los cambios se acumulan en un *draft* en memoria y se envían en un `POST …/odontogram/batch` con `expectedVersion`; `409` → `ConflictDialog`. Auto-refresco por SSE `odontogram.updated`.
  - **Accesibilidad:** `role="grid"`, cada diente con `aria-label` ("Diente 26, primer molar superior izquierdo. Oclusal: caries. Vestibular: obturación"); alternativa textual (tabla) conmutable.
  - **Salida:** vista de impresión/PDF del odontograma para el paciente.
  - **Voz:** los comandos ("caries oclusal en el 26") ejecutan las mismas acciones del reductor.
- **Aceptación:** e2e "crear implante+pilar+corona en 36 → 3 entidades encadenadas"; "puente 13→23 cruzando línea media → pilares 13 y 23, pónticos 12, 11, 21, 22"; dentición temporal con arcada correcta; axe 0; captura visual (Playwright `toHaveScreenshot`) en claro y oscuro.

### 9.6 Plan de tratamiento y presupuesto
- **Preservar:** vista profesional/paciente; tarjeta "Plan recomendado" con recorrido en pasos y total; "Otras opciones" + comparar (recorrido, tiempo, coste); grafo por fases 1–5 con dependencias; cambio de prioridad con motivo; retratamiento con motivo; aprobar alternativa; confirmar Kennedy; `BudgetFromPlanSelector` (todo preseleccionado, por categoría, total en vivo) → redirige a `/app/finance?tab=budgets&budgetId=…`; portal paciente con `Me interesa` / `Quiero comentarlo`.
- **Mejorar:** `PlanGraph` real (columnas por fase con *drag* entre fases usando @dnd-kit y diálogo de motivo; flechas SVG de dependencia y detección de **ciclos**); `PromptDialog` para motivos; textos en `next-intl`.
- **Aceptación:** no se puede crear una dependencia circular (test de dominio); cambio de fase sin motivo bloqueado.

### 9.7 Agenda
- **Preservar:** vistas Doctores / Día / Lista; navegación ‹ hoy ›; colores de estado; contador "N esperando" por doctor; DnD para mover; menú contextual (clic derecho o pulsación larga 450 ms) con Copiar · Extender (+10/20/30/60) · Cancelar (confirmación: "Se conservará en el historial"); **copiar → aviso fijo → tocar hueco para pegar**; panel de cita con acciones por estado (Ha llegado, Confirmar en sala, A gabinete, Ausente/NPA, Completar) y selector de duración `[20,30,45,60,90,120]`; solicitudes de cita del paciente (dar cita con fecha/hora/duración/profesional/sede, o cerrar); bloque de **juegos** (progreso `n/15`, bono disponible en €, "Aplicar bono completo" solo `ADMIN/RECEPTION`); `expectedVersion`; SSE.
- **Construir `AgendaGrid`:** CSS Grid con filas de 5 min; tarjetas con altura proporcional a la duración y columnas por solape (`layoutDay`); indicador de "ahora"; @dnd-kit con sensores puntero (distancia 6 px), **táctil (retardo 250 ms)** y teclado; *snap* de 10 min por defecto (configurable, `INFERIDO`); redimensionar arrastrando el borde inferior (área táctil ≥ 24 px); menú "⋯" visible además del contextual (accesibilidad); `Ctrl/⌘+C / V` para copiar/pegar; **un único temporizador compartido** (`useNow(30_000)`) para "Espera N min".
- **Nueva cita:** `NewAppointmentDialog` (buscador asíncrono de paciente, profesional, sede, gabinete, fecha, hora, duración, motivo, vínculo opcional a `clinicalPlanItemId`) → `POST /api/appointments`; el **botón "+ Cita" hoy no hace nada**.
- **Paridad legacy (portar si el backend lo soporta; si no → `docs/BACKEND_GAPS.md`):** bloqueos de agenda, lista de espera, huecos libres, opciones de reprogramación, sugerencias en cascada según el plan, conflicto de gabinete, auditoría de movimientos, colores por doctor.
- **Aceptación:** una cita a las 08:30 **se ve**; solapes se muestran lado a lado; mover en tablet con el dedo funciona; mover con teclado funciona; conflicto 409 → diálogo; e2e completo de copiar/pegar; 200 citas/día sin jank (< 16 ms de *long task* al arrastrar).

### 9.8 Finanzas (presupuestos, facturas, cobros, VERI*FACTU)
- **Preservar:** pestañas Resumen (admin) · VERI*FACTU (admin) · Facturas · Presupuestos · Cobros; KPIs (facturado, cobrado, pendiente, gastos, beneficio con asterisco si `marginIsComplete=false` y "cobertura N %", aceptación % y € aceptado); tendencia facturado/cobrado; 5 tartas (tratamiento, método de pago, sede, doctor, gasto de marketing); export CSV contable del año; series de facturación; factura manual (`STANDARD`/`SIMPLIFIED`, `taxRateBps: 0` + `exemptionCode: "E1"` por defecto); emitir; rectificar (motivo + R1–R5); ver PDF; remitir a AEAT (solo si no aceptada); presupuesto → borrador de factura; registrar cobro; asignar cobro a facturas con saldo; ajustes fiscales (modo + días de vencimiento, `autoSubmitVerifactu` = modo VERIFACTU); estado por factura ("AEAT aceptado", estado del último envío o "Pendiente envío"); pestaña inicial por URL `?tab=&budgetId=` con resaltado del presupuesto.
- **Mejorar (todo con formularios, cero `prompt`):** `InvoiceFormDrawer` (tipo, cliente/paciente, NIF obligatorio en `STANDARD` — `INFERIDO`, serie, editor de líneas con `MoneyInput`, tipo de IVA en bps con motivo de exención cuando es 0, totales en vivo); `SeriesDialog`; `PaymentDialog`; `AllocatePaymentDialog` (lista de facturas con saldo, importe por defecto = restante, tope validado); `RectifyDialog` (tipo R1–R5 con explicación); `FiscalSettingsDialog`. Modal de PDF con visor. `Idempotency-Key` en emitir/cobrar/remitir. Tablas con `DataTable`. Gráficos con Mantine Charts (carga diferida).
- **Aceptación:** e2e "presupuesto → borrador → emitir → cobro parcial → asignar → cobro restante → remitir VERI*FACTU → estado aceptado" con MSW; doble clic no duplica; importes con coma decimal; cero `prompt/confirm`.

### 9.9 Laboratorio
- **Preservar:** tabla (paciente, trabajo, diente/zona, laboratorio, ETA, coste, estado, archivos, acciones), cambio de estado con `expectedVersion`, adjuntos, **repetición** (motivo + coste adicional, marca "Repetición"), tiempo real por SSE.
- **Mejorar:** tablero Kanban opcional por estado (@dnd-kit) además de la tabla; subida `multipart` con barra de progreso y límites; `FormDialog` para repetición; resaltado de retrasados; **Aceptación:** transición inválida deshabilitada; adjunto de 10 MB con progreso.

### 9.10 Recetas
- **Preservar:** listado, borrador, edición, validar, anular, emitir (según `providerEnabled`), `receptionCanDraft`; medicamento con 10 campos (`activeIngredient, brandName, strength, pharmaceuticalForm, route (oral por defecto), unitsPerDose, frequency, duration, packageCount (1), instructions`); resumen legible por línea.
- **Mejorar:** editor de líneas con `@mantine/form`+zod (mín. 1 línea, principio activo o marca obligatorio), autocompletado de vías/formas, botón "Duplicar línea", vista previa en PDF; **aviso claro** de que la emisión oficial depende de la integración de receta electrónica del proveedor. **Aceptación:** no se valida sin paciente ni prescriptor.

### 9.11 Documentos y firma
- **Preservar:** plantillas versionadas (`code, title, body`) con **nueva versión**; filtro por paciente; ciclo `finalize → sign (nombre del firmante) → deliver (canal PORTAL) → archive` (el PDF y su hash se conservan); permisos `documents.write`, `documents.sign`, `settings.manage` (plantillas); aviso legal: "firma electrónica simple con evidencia de identidad, fecha e integridad del documento".
- **Mejorar:** editor de plantillas con vista previa y variables (`INFERIDO`), historial de versiones con comparación; visor PDF embebido; portar consentimientos y certificados de asistencia del legacy (`createConsentDocument`, `createAttendanceCertificateDocument`); `ConfirmDialog` para archivar. **Aceptación:** un documento `finalize`d no es editable en la UI; la firma exige nombre.

### 9.12 Comunicaciones
- **Preservar:** canales `WHATSAPP | SMS | PORTAL`; categorías `APPOINTMENT_REMINDER, APPOINTMENT_CHANGE, PAYMENT_REMINDER, DOCUMENT_AVAILABLE, ADMINISTRATIVE` (solo esta última lleva texto libre); registrar/revocar **consentimiento por canal+categoría** (`source: ADMIN_CONFIRMED`, con nota de evidencia); contador de fallidos; "mensaje puesto en cola".
- **Mejorar:** mostrar el estado de consentimiento **antes** de enviar y **bloquear** el envío sin consentimiento explicando por qué; buscador asíncrono de paciente; historial con estados; contador de caracteres SMS. **Aceptación:** no se puede enviar WhatsApp/SMS sin consentimiento vigente.

### 9.13 Campañas
- **Preservar:** tarjetas de conexión Meta (Facebook+Instagram) y Google Ads (conectado / no conectado + motivo); tabla de campañas (gasto, ingresos atribuidos, leads, clics); filtro por proveedor; pausar/activar; presupuesto diario; crear campaña (proveedor, nombre, presupuesto diario > 0, inicio/fin, canal `GOOGLE_SEARCH` o `META_MIXED`).
- **Mejorar:** `FormDialog`s, ROI/CPL calculados en `domain`, `ConfirmDialog` que muestra el gasto diario antes de activar; **ningún secreto en el cliente**. **Aceptación:** presupuesto ≤ 0 no se envía.

### 9.14 Alertas y objetivos
- **Preservar:** campana + centro de alertas (abiertas/críticas, filtro Abiertas/Todas, severidad, mensaje, `actionUrl`, acciones por verbo); objetivos mensuales (`monthKey`, `targetCents`) con `snapshot` (facturado, proyección, falta, % de progreso).
- **Mejorar:** SSE en vez de polling; agrupación por severidad; barra de progreso accesible; navegación con `router.push`. **Aceptación:** una alerta crítica nueva aparece en < 2 s vía SSE (test con MSW-SSE).

### 9.15 Análisis
- **Preservar:** filtros (año, doctor, sede, especialidad); comparativa con el mismo periodo del año anterior; facturación mensual; tratamientos con *drill-down* por categoría; doctores; especialidades; pérdidas; compras/gastos; últimos 30 eventos; recetas de coste; **puente de margen** (producido − coste directo − pérdidas = margen; campos `marginEligibleProducedCents`, `marginEligibleDirectCostCents`, `lossCents`, `marginCents`).
- **Mejorar:** Mantine Charts con carga diferida y `Suspense` por widget; los límites de periodo calculados en **Europe/Madrid** (hoy en UTC); exportación CSV de cada widget (`INFERIDO`); estados vacíos; vista de impresión. **Aceptación:** cambiar filtros no bloquea la UI (`useDeferredValue`); coherencia con Finanzas.

### 9.16 Fichaje y control horario
- **Preservar:** botón Entrada/Salida con actualización optimista y lista "Hoy: Entrada 09:02 · Salida 14:01"; vista admin diaria (turnos previstos, fichajes, estado, tiempo) y **ausencias** (`VACATION, SICK_LEAVE, PERMISSION, PERSONAL, OTHER`, rango de fechas, motivo, borrar).
- **Mejorar:** `Idempotency-Key`; deshacer último fichaje solo `ADMIN` con motivo; exportación mensual (`INFERIDO`); sin geolocalización. **Aceptación:** doble toque no crea dos fichajes.

### 9.17 Ajustes, seguridad y RGPD
- **Preservar:** alta de usuarios (nombre, email, usuario, rol, contraseña); copias de seguridad (crear/verificar); sesiones activas (cerrar en otro dispositivo); **solicitudes RGPD** (tipo `EXPORT` y otras `INFERIDO`, estados `IN_REVIEW/COMPLETED/REJECTED`, nota de resolución); **exportación JSON de un paciente**; ajustes de receta (clínica, prescriptores); conexiones de marketing.
- **Mejorar:** dividir en subrutas (`/settings/users|security|privacy|prescriptions|marketing|appearance`); política de contraseñas con medidor; `ConfirmDialog` en acciones destructivas; selector de tema/densidad; descarga de exportaciones como *stream*. **Aceptación:** cada subruta ≤ 300 líneas; solo `settings.manage` entra.

### 9.18 Barra de voz
- **Preservar:** flujo **vista previa → `planToken` → confirmación → ejecución**; política (`canExecute`, `requiresConfirmation`, `reasons`), `readback` y `ambiguities`; resolución de paciente con coincidencias múltiples; dictado con Web Speech API o grabación (`MediaRecorder`) transcrita por servidor (`/api/voice/transcribe`, base64 + `mimeType`); `capabilities` (`asrConfigured`, `llmConfigured`, `localNlu`); estados de permiso de micrófono; etiquetas de acción (resolver paciente, marcar llegada/ausente, añadir tratamiento, ordenar tratamientos, programar cita, preparar presupuesto, registrar cobro, actualizar laboratorio, abrir pantalla).
- **Mejorar:** extraer `useSpeechRecognition` y `useAudioRecorder` (limpieza de streams/timers); `aria-live` para el *readback*; **eliminar el enlace a `/legacy`** y portar el parser local (`parseDentalCommand`, `parseVoiceCommand`) a `domain/voice/` en TypeScript con tests de frases reales, usable solo en modo demo/dev; **nunca ejecutar acciones económicas o destructivas sin confirmación**.
- **Aceptación:** "cobro de 50 euros a Juan Pérez con tarjeta" → vista previa con confirmación obligatoria; audio nunca se persiste en cliente.

### 9.19 Portal del paciente
- **Preservar:** próxima cita; check-in; **reserva** con huecos de 30 min (por sede, fecha futura) o **solicitud** de cita con nota; plan con recorrido, alternativas, comparación y preferencias (`INTERESTED`/`DISCUSS`); aceptar presupuesto; **pagar** (`payment-intents` → redirigir a `checkoutUrl`, o mensaje si no hay proveedor); firmar documentos; "cómo nos conociste"; acceso a Juegos; SSE.
- **Mejorar:** *mobile-first*; secciones claras (Próxima cita · Mi plan · Presupuestos y pagos · Documentos · Reservar · Juegos); selector de paciente si la cuenta tiene varios `patientIds` (familia); **PWA instalable** con Service Worker útil (p. ej. **Serwist**) que cachea **solo estáticos** (nunca respuestas con datos personales); texto grande y alto contraste; lenguaje llano.
- **Aceptación:** flujo completo en 390×844; Lighthouse PWA/A11y ≥ 95; ninguna respuesta de `/api/*` en la caché del SW.

### 9.20 Juegos (Denty Games)
- **Preservar:** todo lo de 3.6 (13 juegos, reglas de ranking, identidad `Ficha ••NNNN`, bono 3→1 €/tope 15→5 €, un bono por cita, `start → play → finish`, Air Hockey local a 2 jugadores que cuenta para bono pero no rankea).
- **Arquitectura objetivo (`features/games/`):**
  - `engine/`: `createGameLoop` (paso fijo de 60 Hz para lógica + `requestAnimationFrame` para render), `useCanvas` (escala por `devicePixelRatio`, `ResizeObserver`), `input/` (puntero con `pointerId`, *swipe*, teclado, orientación), `haptics`, audio opcional **silenciado por defecto**.
  - `games/<id>/` con `rules.ts` (lógica **pura y testeada**: fusión única por movimiento en `merge`, parejas en `memory`, minimax en `ticTacToe`, filas en `blockDrop`, bordes infinitos y colisión solo con el propio cuerpo en `snake`…) y `index.ts` que exporta `GameDefinition { id, name, ranked, recordMode: 'live' | 'finish' | 'none', accent, create(canvas, ctx): GameInstance }`; `GameInstance { start, pause, resume, resize, destroy }`.
  - Carga **diferida por juego** (`next/dynamic`, `ssr:false`), ≤ 30 KB gzip cada uno, sin assets binarios (todo vectorial).
  - `useGameSession(patientId)`: `dashboard`, `start`, `finish({score, durationMs})`, `generateVoucher`; `playId` en `sessionStorage` (único dato permitido) y **cola de reintento** de `finish` pendientes.
  - UI con Mantine + CSS Modules; los tokens `--dg-*` se sustituyen por variables del tema (un color de acento por juego).
  - **Sin iframe, sin `public/games`, sin `window.DentyGames`.**
- **Mejorar:** pausa automática en `visibilitychange`/`blur`; `prefers-reduced-motion` reduce partículas; ningún destello > 3 Hz (WCAG 2.3.1); controles alternativos por botones; orientación horizontal solicitada en Air Hockey (con aviso si no se puede bloquear).
- **Antitrampas:** el cliente **no es de fiar**. Documenta en `docs/BACKEND_GAPS.md` la petición al backend: token de partida firmado con semilla, duración mínima, tope de puntuación plausible por segundo y por juego, límite diario por paciente. El frontend ya envía `durationMs` y resumen de la partida (`INFERIDO`).
- **Aceptación:** los 13 juegos arrancan, pausan y terminan; `rewardCents` con casos límite; test de humo Playwright: `start` y `finish` reciben el cuerpo correcto; ranking solo muestra `Ficha ••NNNN`; 60 fps en emulación de gama media; ningún `iframe`.

### 9.21 Modo demostración y retirada del legacy
- Modo demo (4.2 punto 3) con MSW en memoria y paciente "Juan Pérez · 000001". Borrar: `/legacy`, `LegacyDentyRuntime`, `LegacyDentyShell`, `legacy-shell.ts`, `denty-app.bundle.js`, `public/styles/*`, `public/scripts/*`, `public/games/*`, `local-api.ts`, `DEMO_PATIENT` y `/demo/juan-perez` **solo cuando** la matriz de paridad lo permita y existan `docs/legacy-spec/*` con lo extraído del bundle.

---

## 10. CUMPLIMIENTO NORMATIVO (España) — a reflejar en diseño y documentación

> Esto **no es asesoramiento jurídico**. Documenta todo en `docs/SECURITY.md` y recomienda validación por DPO/gestor. Donde haya fechas o umbrales, **verifícalos en la fuente oficial** y hazlos configurables.

- **Datos de salud (RGPD art. 9, LOPDGDD 3/2018, Ley 41/2002 de autonomía del paciente):** minimización, cifrado en tránsito (HTTPS/HSTS), control de acceso por rol y por paciente, **registro de accesos** (UI de consulta `INFERIDO`), conservación de la historia clínica según Ley 41/2002 y normativa autonómica (mín. 5 años desde el alta; puede ser mayor), y **derechos** del interesado (acceso, rectificación, supresión con límites legales, portabilidad, limitación, oposición) ya presentes en `privacy-requests`.
- **Menores y tutores:** relación `GUARDIAN/AUTHORIZED/FAMILY` con evidencia; gestionar capacidad y consentimiento según normativa aplicable.
- **Comunicaciones:** consentimiento por canal y categoría (ya existe); separar informativas/administrativas de comerciales (LSSI-CE, RGPD).
- **Facturación:** **Ley Antifraude (Ley 11/2021)**, **RD 1007/2023** (sistemas informáticos de facturación) y **Orden HAC/1177/2024**, modos `VERIFACTU` / `NO_VERIFACTU`. **Las fechas de obligatoriedad se han aplazado en más de una ocasión: no las fijes en código; confírmalas con la AEAT y deja el modo fiscal configurable.** La huella, el encadenado y el QR los genera el **backend**; el frontend solo muestra estado y reintenta. Numeración correlativa por serie; rectificativas `R1–R5`. Servicios sanitarios de odontología normalmente exentos de IVA (art. 20 LIVA → código `E1`) pero **los tratamientos estéticos pueden no estarlo**: el tipo de IVA debe ser editable por línea (validar con el gestor).
- **Receta:** no presentar como válida una receta sin proveedor de prescripción electrónica integrado; mostrar el estado real.
- **Voz/IA:** audio y texto pueden contener datos de salud → cualquier proveedor de ASR/LLM requiere **contrato de encargado (DPA) y tratamiento en la UE**; documentarlo y hacerlo configurable; no enviar PII innecesaria.
- **Registro de jornada (art. 34.9 ET):** el fichaje debe conservarse y estar disponible (4 años; confirmar con asesor laboral).
- **Cookies (LSSI art. 22.2):** solo técnicas; sin analítica que requiera consentimiento; Speed Insights sin cookies.
- **Alojamiento:** región UE en Vercel (p. ej. `fra1`/`cdg1`), Sentry en región UE, sin herramientas de terceros con datos de pacientes.
- **Entregables de cumplimiento:** borrador de **registro de actividades de tratamiento**, borrador de **EIPD** y matriz de roles/permisos en `docs/SECURITY.md`.

## 11. RENDIMIENTO Y ACCESIBILIDAD

**Rendimiento**
- Presupuesto en CI: JS inicial por ruta ≤ 170 KB gzip (`@next/bundle-analyzer` + `size-limit`); fallo de CI si se supera.
- `next/dynamic` para: gráficos, PDF, editor de plantillas, cada juego, odontograma en modo comparar. `import` **por icono** de Tabler. `optimizePackageImports` para Mantine.
- Datos iniciales en servidor + `HydrationBoundary`; evitar *waterfalls* con `Promise.all`; `Suspense` + *skeletons* de dimensión fija.
- Listas > 200 filas virtualizadas; `useDeferredValue` en buscadores; `React.memo`/`useMemo` solo donde el *profiler* lo justifique (documentar con captura). Evaluar **React Compiler** vía ADR.
- Imágenes con `next/image`; fuentes con `next/font`; logo en SVG.
- Métricas objetivo en 4G y Android de gama media: **LCP < 2,0 s, INP < 200 ms, CLS < 0,05**; Lighthouse ≥ 90 en Rendimiento y ≥ 95 en Accesibilidad.

**Accesibilidad (WCAG 2.2 AA)**
- Todo operable con teclado; foco visible; orden lógico; *skip link*; trampas de foco correctas en modales/drawers; `Escape` cierra.
- Objetivos táctiles ≥ 44×44 px (`comfortable`); contraste AA; el color nunca es la única señal.
- `aria-live` para toasts, resultados de voz y cambios de estado de cita; *landmarks* (`header/nav/main`).
- `prefers-reduced-motion` respetado en **toda** animación (Motion + juegos).
- Odontograma y agenda con alternativa textual/tabla y navegación por flechas.
- `axe` en cada ruta dentro de Playwright: **0 violaciones serious/critical**.

## 12. ESTRATEGIA DE TESTS

| Nivel | Herramienta | Alcance |
|---|---|---|
| Unitarios | **Vitest** (+ `fast-check` en `domain/`) | `domain/*` ≥ 90 % líneas y ramas; reglas de 8.x con casos límite |
| Componentes | Vitest + **Testing Library** + **MSW** | Formularios, diálogos, `DataTable`, `Odontogram`, `AgendaGrid` (interacciones y ARIA) |
| Contrato | Vitest + zod | Cada esquema valida su *fixture* MSW; `API_CONTRACT.md` generado/verificado |
| E2E | **Playwright** (Chromium + WebKit; viewports 1024×768 tablet, 1440×900, 390×844) | Flujos críticos (abajo) + `@axe-core/playwright` |
| Visual | Playwright `toHaveScreenshot` | Odontograma, agenda, portal (claro y oscuro) |
| Rendimiento | Lighthouse CI | Presupuestos de la sección 11 |

**Flujos E2E críticos (todos obligatorios):** (1) login → dashboard → abrir paciente; (2) alta de paciente; (3) odontograma: implante+pilar+corona, puente 13→23, snapshot y comparación; (4) endodoncia → plan → presupuesto; (5) agenda: crear, mover (ratón, **táctil** y teclado), extender, copiar/pegar, cancelar, llegada → sala → gabinete → completar; (6) presupuesto → factura → emitir → cobro parcial → asignar → remitir VERI*FACTU; (7) laboratorio: transición, adjunto, repetición; (8) receta: crear → validar; (9) documento: finalizar → firmar → entregar → archivar; (10) comunicaciones: consentimiento → envío (y bloqueo sin consentimiento); (11) fichaje entrada/salida sin duplicados; (12) portal: reservar, aceptar presupuesto, firmar; (13) juegos: `start → finish → bono → recepción aplica`; (14) voz: vista previa → confirmar → ejecutar; (15) permisos por rol (`ADMIN`, `DENTIST`, `RECEPTION`, `PATIENT`); (16) errores 401/403/409/500 y pérdida de red.

## 13. DX, CALIDAD, CI/CD Y ENTORNO

- **Scripts:** `dev`, `build`, `start`, `lint`, `lint:css`, `typecheck`, `test`, `test:e2e`, `test:cov`, `analyze`, `format`, `knip` (código muerto).
- **Calidad:** ESLint *flat config* con `typescript-eslint` (strict-type-checked), `eslint-plugin-react-hooks`, `jsx-a11y`, `eslint-plugin-boundaries`/`no-restricted-imports`, regla propia o `no-restricted-globals` que **prohíbe `localStorage/sessionStorage` fuera de `shared/lib/ui-preferences` y `features/games`**; Prettier; Stylelint (CSS Modules, sin `!important`); Husky + lint-staged; commits convencionales.
- **CI (`.github/workflows/ci.yml`):** `npm ci` → `lint` → `lint:css` → `typecheck` → `test:cov` → `build` → `size-limit` → `test:e2e` (con MSW) → Lighthouse CI. Cachés de npm y Playwright. **Sustituye por completo `scripts/preflight-vercel.mjs`.**
- **Variables de entorno** validadas con zod en `src/shared/config/env.ts` y documentadas en `.env.example`: `DENTY_API_URL` (servidor; obligatoria en producción → **el build falla si falta**), `NEXT_PUBLIC_DEMO_MODE` (`false` en producción), `NEXT_PUBLIC_APP_ENV`, `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_ENV`.
- **Proxy a backend:** conservar los *rewrites* `/api/:path*` y `/health/:path*` hacia `DENTY_API_URL` (mismo dominio → cookie httpOnly de sesión). Añadir `Cache-Control: no-store` a respuestas autenticadas.
- **Vercel:** Framework Next.js, `Install: npm ci`, `Build: npm run build`, sin `outputDirectory`, región UE, Node 24.x. Entornos *Preview* con `NEXT_PUBLIC_DEMO_MODE=true` y datos ficticios.
- **Higiene:** `package-lock.json` commiteado; no commitear `tsconfig.tsbuildinfo`; versión única en `package.json` (`3.0.0`) reflejada en manifest, README y About (una sola fuente).
- **PWA:** `manifest` correcto (nombre "Denty", iconos 192/512 *maskable*, `start_url`, `display: standalone`); Service Worker con Serwist solo para estáticos y pantalla *offline* genérica (sin datos de pacientes).

---

## 14. PLAN DE EJECUCIÓN POR FASES

> **Puerta de salida de cada fase:** `lint`, `typecheck`, `test`, `build` en verde + matriz de paridad actualizada + informe (sección 16). **No pases a la siguiente fase si no se cumple.** Un PR por fase.

| Fase | Contenido | Definition of Done |
|---|---|---|
| **F0 · Auditoría y línea base** | Ejecuta el ZIP actual; capturas Playwright de cada ruta como línea base; extrae del bundle legacy a `docs/legacy-spec/` (odontograma, agenda, voz, portal, consentimientos); genera `docs/MIGRATION_MATRIX.md`, `docs/API_CONTRACT.md` (borrador, `INFERIDO` marcado) y `docs/BACKEND_GAPS.md`; lista de riesgos | Matriz con todas las filas de la sección 15; contrato con los ≈100 endpoints; capturas archivadas |
| **F1 · Cimientos** | Nuevo scaffold: Next 15, TS estricto, ESLint, Prettier, Stylelint, Vitest, Playwright, Husky, CI, `env.ts`, `package-lock.json`, Vercel config; retirar `preflight` | CI verde con una página de ejemplo; build en Vercel *preview* |
| **F2 · Diseño y shell** | Tema Mantine (claro/oscuro/auto, densidad), `styles/`, componentes base (5.3), i18n, `AppShell` responsivo, `DemoBanner`/`OfflineBanner`, layouts por grupo de rutas | `docs/DESIGN_SYSTEM.md`; tests de componentes base; axe 0 |
| **F3 · Dominio puro** | `domain/*` de la sección 8 con tests (incl. DST 2026-03-29/2026-10-25, cruce de línea media, bono) | Cobertura ≥ 90 % en `domain/` |
| **F4 · Datos y autenticación** | `shared/api` (cliente, errores, esquemas zod, query keys, SSE único con mapa evento→claves), `middleware.ts`, sesión en servidor, RBAC, MSW, `ConflictDialog`; **eliminar `local-api.ts` y el fallback** | Sin sesión no se ve nada; 401/403/409/500 cubiertos por tests |
| **F5 · Dashboard + Pacientes** | 9.1–9.3 | E2E 1 y 2; 5.000 pacientes fluidos |
| **F6 · Clínico** | 9.4 historia, **9.5 odontograma**, 9.6 plan y presupuesto | E2E 3 y 4; capturas visuales; a11y del odontograma |
| **F7 · Agenda** | 9.7 con `AgendaGrid` y nueva cita | E2E 5 (ratón, táctil, teclado); bug de las 08:30 cerrado |
| **F8 · Economía y operativa** | 9.8 finanzas/VERI*FACTU, 9.9 laboratorio, 9.10 recetas, 9.11 documentos, 9.12 comunicaciones | E2E 6–10; **0 `prompt/confirm`** en el repo |
| **F9 · Administración** | 9.13 campañas, 9.14 alertas, 9.15 análisis, 9.16 fichaje, 9.17 ajustes | E2E 11 y 15; gráficos con carga diferida |
| **F10 · Portal del paciente** | 9.19 con PWA | E2E 12; Lighthouse PWA/A11y ≥ 95 |
| **F11 · Juegos** | 9.20: motor, 13 juegos, sesión, sin iframe | E2E 13; 60 fps; `rewardCents` testeado |
| **F12 · Voz** | 9.18 con hooks y parser local en `domain/voice` | E2E 14 |
| **F13 · Endurecimiento** | CSP con nonce y cabeceras, Sentry sin PII, Lighthouse CI, presupuestos de bundle, regresión visual, revisión de accesibilidad manual (lector de pantalla), pruebas de carga con datos grandes | Presupuestos de la sección 11 cumplidos; 0 vulnerabilidades altas (`npm audit`) |
| **F14 · Retirada del legacy y entrega** | 9.21; borrar todo lo marcado; documentación final; ZIP para Vercel; informe comparativo antes/después | Matriz 100 % ☑; `knip` sin código muerto; ZIP arranca con `npm ci && npm run build` |

**Fases opcionales — NO ejecutar sin aprobación expresa:**
- **O1 · Modo sin conexión cifrado:** cola de mutaciones idempotentes + IndexedDB cifrado con WebCrypto (clave derivada de la sesión), caducidad y borrado al cerrar sesión. Hoy la promesa "Denty guarda localmente si el servidor no está disponible" se **retira** porque el mecanismo actual no es seguro.
- **O2 · Modo quiosco de sala de espera:** ruta `/kiosk` en pantalla completa para tablet de la clínica (reinicio por inactividad, *wake lock*, sin navegación).
- **O3 · Backend de referencia** (PostgreSQL, p. ej. Supabase, con RLS por rol) que implemente `API_CONTRACT.md`.

## 15. MATRIZ DE PARIDAD FUNCIONAL (cada fila pasa a ☑ solo con evidencia)

**Acceso y estructura**
- ☐ Login, recuperación de contraseña en 2 pasos, cierre de sesión
- ☐ Menú por permisos (primario + "Más" + Ajustes); redirección de `PATIENT` a su portal
- ☐ Campana de alertas con contador y popover
- ☐ Barra de voz global

**Dashboard y pacientes**
- ☐ "Lo siguiente": Ahora / Después / Necesita atención / Fichaje
- ☐ Lista de pacientes: búsqueda por nombre, ficha, DNI; alta rápida
- ☐ Ficha: resumen "Ahora / Próximo paso" y 4 secciones
- ☐ Acceso paciente: invitación 72 h, origen declarado (8 valores), acceso familiar con revocación

**Clínico**
- ☐ Endodoncia AAE 2009 con pistas de coherencia y "Crear plan desde diagnóstico"
- ☐ Periodontograma boca completa (6 sitios, PS/REC/CAL/BOP/placa/supuración/movilidad/furca) con resumen y Stage/Grade/Extensión
- ☐ Acto clínico firmado + línea temporal (12 últimos)
- ☐ **Odontograma SVG**: 5 caras, 25 estados, temporal/permanente/mixta, leyenda, modos, snapshots y comparación
- ☐ Plantillas: implante+pilar+corona, endo+perno+corona, removible, puente (incl. cruce de línea media)
- ☐ Plan: fases 1–5, dependencias con motivo, override con motivo, retratamiento, alternativas (4 tipos), Kennedy, vista paciente, comparar
- ☐ Presupuesto desde plan por categorías con total en vivo

**Agenda**
- ☐ Vistas Doctores / Día / Lista; navegación por fechas
- ☐ Colores de estado y tiempo de espera; contador de esperando
- ☐ Mover (ratón, táctil, teclado), redimensionar, extender, copiar/pegar, cancelar
- ☐ Panel de cita con acciones por estado y duración
- ☐ Nueva cita (hoy inexistente) y solicitudes de cita del paciente
- ☐ Estado del bono de juegos (n/15, bono, aplicar)
- ☐ Tiempo real y `expectedVersion`/409
- ☐ Legacy: bloqueos, lista de espera, huecos libres, reprogramación, cascada, colores por doctor (o registrado en `BACKEND_GAPS.md`)

**Economía y operativa**
- ☐ Finanzas: resumen, KPIs, tendencia, 5 tartas, export CSV contable
- ☐ Series, factura manual, emitir, rectificar R1–R5, PDF, remitir VERI*FACTU, reintento, ajustes fiscales
- ☐ Presupuestos → borrador de factura; cobros → asignación a facturas
- ☐ Laboratorio: estados, adjuntos, repetición con coste, retrasados, SSE
- ☐ Recetas: borrador, edición, validar, anular, ajustes de prescriptor
- ☐ Documentos: plantillas versionadas, finalizar, firmar, entregar, archivar; consentimientos y certificados
- ☐ Comunicaciones: 3 canales, 5 categorías, consentimientos y bloqueo sin consentimiento

**Administración**
- ☐ Campañas Meta/Google: conexión, listado, pausar/activar, presupuesto, crear
- ☐ Alertas y objetivos mensuales con proyección
- ☐ Análisis: filtros, comparativa, margen, tratamientos con drill-down, doctores, especialidades, pérdidas, compras, eventos, recetas de coste
- ☐ Fichaje propio y control horario admin con ausencias
- ☐ Ajustes: usuarios, copias (crear/verificar), sesiones, solicitudes RGPD, export de paciente, receta, marketing, tema/densidad
- ☐ Importación CSV de pacientes, turnos de personal, plantillas (legacy)

**Paciente y juegos**
- ☐ Portal: próxima cita, check-in, reservar/solicitar, plan y preferencias, presupuesto, pago, firma, origen, familia
- ☐ 13 juegos con reglas originales, ranking `Ficha ••NNNN`, bono 3→1 €/tope 15→5 €, un bono por cita
- ☐ Air Hockey 2 jugadores (cuenta para bono, no rankea) · Tres en raya IA/local
- ☐ Modo demo aislado (MSW) con Juan Pérez · Ficha 000001

**Calidad transversal**
- ☐ 0 `any` · 0 `!important` · 0 `style={{}}` estático · 0 `prompt/confirm` · 0 PHI en `localStorage`
- ☐ Dark mode, densidad, `next-intl`, iconos Tabler, tipografía `next/font`
- ☐ CSP + cabeceras · Sentry sin PII · presupuestos de bundle · axe 0 · Lighthouse ≥ objetivos
- ☐ Legacy eliminado · `knip` limpio · docs completas · ZIP final

## 16. FORMATO DE INFORMES Y ENTREGA

**Al cerrar cada fase**, responde con este esquema exacto:
1. **Resumen** (≤ 10 líneas): qué se hizo y qué queda.
2. **Archivos** creados/modificados/eliminados (árbol resumido).
3. **Decisiones** (enlaces a ADR) y **supuestos** nuevos.
4. **Métricas:** tamaño de bundle por ruta, cobertura, resultados de axe y Lighthouse, tiempo de build.
5. **Matriz de paridad** con las filas que han pasado a ☑ y su evidencia.
6. **Riesgos y bloqueos**; **siguiente fase**.

**Entrega final (F14):**
- ZIP `denty-v3-vercel.zip` con la raíz del proyecto (`package.json`, `package-lock.json`, `next.config.ts`, `vercel.json`, `src/`, `public/`, `docs/`, `.env.example`, `README.md`) que arranque con `npm ci && npm run build`.
- `README.md` (requisitos, variables, scripts, despliegue en Vercel, modo demo, cómo añadir una feature), `docs/ARCHITECTURE.md`, `API_CONTRACT.md`, `DESIGN_SYSTEM.md`, `SECURITY.md`, `MIGRATION_MATRIX.md`, `BACKEND_GAPS.md`, `ASSUMPTIONS.md`, `adr/*`, `CHANGELOG.md`.
- **Informe antes/después:** líneas de código, tamaño de JS/CSS por ruta, nº de `any`, cobertura, Lighthouse, dependencias (de 4 a N con justificación).

## 17. SUPUESTOS Y PREGUNTAS ABIERTAS (regístralos en `ASSUMPTIONS.md`; no bloquean)

1. El **backend no viene en el ZIP**: se asume el contrato de 3.5. Si difiere, se corrige en el adaptador (`shared/api/endpoints`) sin tocar componentes.
2. **Multi-sede y multi-gabinete:** se asume varias sedes y gabinetes (`siteId`, `cabinetId`) y horario por sede.
3. **Rejilla de agenda** 08:00–19:00 cada 20 min como valor por defecto configurable; *snap* de 10 min.
4. **Modo fiscal y fechas VERI*FACTU:** configurables; validar con AEAT/gestor.
5. **Idiomas:** solo `es`; estructura lista para `ca`, `gl`, `eu`, `va`.
6. **Región de despliegue:** UE.
7. **Volumen esperado** (para pruebas de carga): 5.000–50.000 pacientes, 200 citas/día, 10 profesionales.
8. **Rol `RECEPTION` y `DENTIST`:** los permisos exactos se infieren de los strings de 2; el backend manda.
9. **Modo sin conexión:** retirado hasta O1.
10. **Puntuaciones de juegos:** requieren validación de servidor (`BACKEND_GAPS.md`).

## 18. INSTRUCCIÓN FINAL

**Empieza ahora por la Fase 0.** En tu primera respuesta entrega, y nada más:
1. **Resumen de comprensión** (≤ 15 líneas) con tus palabras.
2. **Los 5 mayores riesgos** del proyecto y cómo los mitigarás.
3. **Plan detallado de la Fase 0** (pasos, archivos que vas a generar, criterios de salida).
4. **Preguntas bloqueantes** (máximo 5). Si no hay ninguna, escribe "Ninguna" y continúa con F0 sin esperar.

Recuerda las cuatro reglas que no se negocian: **(1)** nada de datos de pacientes en el navegador; **(2)** nada de fallback silencioso; **(3)** cero regresiones funcionales; **(4)** el código nuevo se lee como código normal.
