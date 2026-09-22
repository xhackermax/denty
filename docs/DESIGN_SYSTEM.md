# Sistema de diseño Denty v3 · F2

## Principios
- Tablet-first, con objetivos táctiles de 44 px en densidad cómoda y uso completo con teclado/ratón.
- Mantine es la base de componentes; los componentes Denty encapsulan patrones de producto.
- CSS Modules y tokens CSS para estilos propios. No `style={{...}}` estático ni `!important`.
- El color nunca es la única señal. Estado = color + icono + texto/patrón cuando corresponda.
- Todo texto visible sale de `messages/es.json`; `es-ES` y `Europe/Madrid` son los valores activos.

## Identidad visual
Los tokens históricos se preservan como variables `--denty-*` en `src/styles/tokens.css`:
- fondo `#f5f8fb`, tarjeta `#ffffff`, texto `#152235`, muted `#687689`, línea `#e3eaf1`;
- azul `#2764d8`, teal primario `#008d8a`, verde `#2f8d62`, ámbar `#b88408`;
- violeta `#6750b5` e índigo `#4055a8`;
- radios de 8/10/14/18/22/24 px y espaciado base de 4 px.

Mantine recibe una escala `dentyTeal` de 10 tonos y usa `#008d8a` como tono principal. Inter se carga con `next/font`, `display: swap`, subsets latin y latin-ext.

## Color scheme y densidad
- Tema `light`, `dark` o `auto`, controlado por Mantine y `ColorSchemeScript` para evitar parpadeo.
- Densidad `comfortable` o `compact`. Es una preferencia de UI y puede persistirse en `localStorage`; nunca se guardan datos clínicos.
- La densidad se expresa mediante `data-density` y variables CSS, no por ramas de lógica clínica.

## Layouts
### Área profesional
`DentyAppShell` usa:
- móvil: cabecera mínima + barra inferior con Inicio, Pacientes, Agenda y Más;
- tablet: rail lateral compacto;
- escritorio: sidebar completa con labels.

La navegación usa `next/link`; no se usa `location.href`. Los permisos reales se conectarán en F4, por lo que F2 no simula autorización.

### Público y paciente
Los route groups `(public)`, `(staff)` y `(patient)` separan layouts desde la raíz. La pantalla de login de F2 es estructural y no afirma autenticar. El portal paciente es un layout aislado que recibirá funcionalidad en F10.

## Componentes base
- `PageHeader`: título, eyebrow, descripción y acciones.
- `EmptyState` / `ErrorState`: vacío y error con tamaño estable; retry label inyectado desde i18n.
- `ConfirmDialog`: confirmaciones explícitas para sustituir `window.confirm`.
- `FormDialog` / `PromptDialog`: formularios modales para sustituir `window.prompt`.
- `MoneyInput` / `MoneyText`: interfaz en céntimos enteros. La lógica fiscal queda para `domain/money.ts`.
- `DateText` / `TimeText`: presentación `es-ES`/`Europe/Madrid`; las reglas de fechas pasarán a F3.
- `StatusBadge`: badge semántico con icono y texto provisto por el caller.
- `KpiCard`, `PatientAvatar`, `Toolbar`, `FloatingPanel`, `ContextMenu`, `Skeletons`.
- `PermissionGate`: frontera de UI. La autorización verdadera será servidor/RBAC en F4.
- `SegmentedTabs`: tabs sincronizadas con URL mediante nuqs.
- `DataTable`: base Mantine + TanStack Table; la virtualización para listas >200 se añade donde se use en fases funcionales.
- `OfflineBanner` y `DemoBanner`: estados explícitos; no existe fallback silencioso a una API local.

## Patrones
### Lista → detalle
La lista conserva filtros en URL y navega a una ruta estable de detalle. Nunca se inyectan registros demo en producción.

### Formularios
La fase funcional correspondiente añade `@mantine/form` + zod. F2 solo define el contenedor visual para no introducir dependencias sin uso.

### Acción destructiva
Usar `ConfirmDialog` con copy de i18n y estado pending; las mutaciones críticas añadirán `Idempotency-Key` en la capa API.

### Carga, vacío y error
- carga: skeleton con dimensiones estables;
- vacío: `EmptyState`;
- error: `ErrorState` + reintento;
- offline: banner global explícito.

## Accesibilidad
- Foco visible y componentes Mantine para menus/modals.
- Navegación principal semántica y `aria-current` en la ruta activa.
- `prefers-reduced-motion` se respeta desde el tema y Motion.
- Playwright + axe bloquea violaciones `serious` y `critical` en las rutas estructurales de F2.

## Ejemplo
```tsx
const t = useTranslations("Common");

<ErrorState
  title={t("loadError")}
  retryLabel={t("retry")}
  onRetry={refetch}
/>;
```

El ejemplo es de patrón. Las claves concretas de cada feature se añaden al migrarla.
