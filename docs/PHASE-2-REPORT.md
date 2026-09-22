# Informe F2 · Diseño y shell

## 1. Resumen
1. Se incorporó un tema Denty sobre Mantine con claro/oscuro/automático y densidad cómoda/compacta.
2. Se preservaron los tokens visuales de Denty y se añadió Inter con `next/font`.
3. Se activó `next-intl` con `es` y `Europe/Madrid`; las cadenas nuevas de UI viven en `messages/es.json`.
4. Se creó el AppShell responsive: bottom bar móvil, rail tablet y sidebar de escritorio.
5. Se eliminaron glifos Unicode del shell a favor de Tabler y la navegación usa `next/link`.
6. Se crearon los componentes base de `shared/ui`, incluidos diálogos, estados, tablas y banners.
7. Se separaron route groups público, profesional y paciente sin simular autenticación antes de F4.
8. Se añadieron tests de componentes y un gate Axe E2E para las rutas estructurales.

## 2. Archivos principales
- `src/styles/theme.ts`, `tokens.css`, `global.css`
- `messages/es.json`, `src/i18n/request.ts`
- `src/app/providers.tsx` y route groups `(public)`, `(staff)`, `(patient)`
- `src/features/shell/*`
- `src/shared/ui/*`
- `postcss.config.cjs`, `next.config.ts`, `vitest.config.ts`
- `docs/DESIGN_SYSTEM.md`, ADR 0012–0024

## 3. Decisiones y supuestos
- El shell de F2 no implementa sesión/RBAC; esas garantías pertenecen a F4 y no se falsifican.
- Persistencia local permitida en F2: únicamente densidad de UI.
- No se añade `@mantine/form`, dates, charts ni virtualización hasta que una fase funcional los use.
- A-011 documenta el avance autorizado tras el deployment verde comunicado por el usuario.

## 4. Evidencia de calidad
- Verificación estática de estructura y sintaxis: ejecutada en este entorno.
- `lint`, `stylelint`, `typecheck`, `test`, `build` y axe completos: pendientes de ejecutarse en Vercel porque el shell local no puede resolver npm.
- La fase queda **implementada pero no declarada cerrada** hasta que ese gate sea verde.

## 5. Matriz de paridad
F2 no reclama paridad funcional de módulos clínicos. La fila transversal de dark mode/densidad/i18n/Tabler/next-font sigue en ☐ hasta aportar el log verde y la evidencia axe.

## 6. Riesgos y siguiente fase
- F1 conserva el bootstrap temporal de lockfile; debe sustituirse por `package-lock.json` raíz + `npm ci` puro en cuanto podamos recuperar/generar el lock.
- No iniciar F3 formalmente hasta validar F2 con el gate completo, salvo nueva autorización explícita.
- Tras el gate, F3 será dominio puro: dinero, fechas Madrid, permisos, máquinas de estado, agenda y odontograma.
