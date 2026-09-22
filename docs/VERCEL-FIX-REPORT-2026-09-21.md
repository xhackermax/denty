# Vercel fix report · 2026-09-21

## Correcciones aplicadas

- ESLint: `public/games/**` queda fuera de ESLint porque sus 20 assets están protegidos por hash.
- Arquitectura: eliminados los 47 imports `@/features/*` desde features. Los 15 intra-feature pasan a relativos y el código reutilizable se eleva a `shared`; el shell se compone desde `app/_components`.
- React purity: `Date.now()` de la ficha de paciente usa inicialización lazy estable de estado.
- Unused: eliminados los cuatro identificadores/imports sin uso detectados en `src`.
- TypeScript estricto: corregidos los objetos opcionales de voz, errores API, Finance, Alerts, Documents, Clinical Resources, Realtime y Voice Executor sin desactivar `exactOptionalPropertyTypes`.
- Voz: la intención clínica completada navega al odontograma; removibles usa `createRemovable(arch, teeth)` y se tipan superficies como `ToothSurface`.
- Tests: el mock que se consume dos veces crea un `Response` nuevo por llamada.
- Next build: import realtime corregido, export inexistente eliminado y enlaces Mantine de Server Components convertidos a `<a>`.
- Seguridad: CSP y cabeceras defensivas, comprobación same-origin para mutaciones BFF, `/patient/*` dentro del proxy y Games dentro de iframe sandboxed.
- Entorno: añadido `NEXT_PUBLIC_DENTY_REALTIME` a `.env.example`.
- Lock bootstrap: el lock temporal ya no se publica bajo `public/`; la evidencia queda en `.artifacts/bootstrap/package-lock.json`.
- Documentación: Next y `eslint-config-next` alineados documentalmente con 16.3.5.

## Validación ejecutada sobre esta entrega

- `preflight`: 7/7 gates verdes.
- `architecture`: verde.
- `games-integrity`: 20 assets y comparación byte por byte contra el ZIP original.
- `api-parity`: 193/193 contratos browser, 4 rutas server-only excluidas.
- Parse de 168 archivos TS/TSX: 0 diagnósticos de sintaxis.
- Resolución estática de imports internos: verde.
- Escaneo estático de imports entre features, Server/Client Link y unused obvios: verde.
- Smoke NLU/router: `endodoncia realizada en 22` → `/app/patients/patient-42/odontogram`.

## Limitación del entorno de reparación

Este sandbox usa Node 22 y no puede resolver `registry.npmjs.org`, mientras el proyecto exige Node 24.x. Por ello no fue posible reinstalar las 700 dependencias ni reejecutar aquí ESLint, Stylelint, Vitest y `next build` con el árbol npm real. Se mantiene el bootstrap de instalación de Vercel para que la plataforma genere el lock y ejecute esos gates bajo Node 24.x. El cierre definitivo de la deuda del lock sigue siendo incorporar ese `package-lock.json` a la raíz y cambiar `installCommand` a `npm ci` puro.
