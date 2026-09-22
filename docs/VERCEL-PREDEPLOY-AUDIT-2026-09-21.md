# Denty V3 — Vercel pre-deploy audit

Fecha: 2026-09-21

## Validado

- Raíz plana de Next.js apta para Vercel.
- `framework: nextjs` sin `outputDirectory` manual.
- Node `24.x` declarado en `package.json`.
- `vercel-install` y `vercel-build` delegan al pipeline único.
- Preflight 7/7: history, pipeline-self-check, games-integrity, deployable, api-parity, bff-policy y domain-smoke.
- Arquitectura verificada.
- API parity 193/193 y 20 assets legacy de Denty Games protegidos por hash.
- `/app/*` y `/patient/*` protegidos por Next Proxy fuera de demo mode.
- Cabeceras de seguridad globales activas.

## Correcciones de esta auditoría

1. Denty Games tenía un conflicto entre su iframe same-origin y las cabeceras globales `frame-ancestors 'none'` + `X-Frame-Options: DENY`. `/games/*` dispone ahora de una política específica: `frame-ancestors 'self'` + `SAMEORIGIN`; el resto de la aplicación conserva `DENY`.
2. npm avisó en Vercel de scripts de instalación no aprobados para `@parcel/watcher@2.6.0`, `@swc/core@1.16.2` y `unrs-resolver@1.12.2`. Quedan aprobados de forma explícita y fijada por versión en `package.json`.
3. El gate histórico comprueba ambas protecciones para impedir que regresen.

## Deuda abierta

- No existe todavía `package-lock.json` en la raíz del ZIP. `vercel-install` crea un lock temporal y después ejecuta `npm ci`, por lo que el árbol es exacto dentro de cada deploy pero puede resolver transitivas diferentes entre despliegues futuros. El objetivo final es fijar el lock generado con Node 24 y sustituir el bootstrap por `npm ci` puro.
- El target de Vercel conserva `vercel-format-bootstrap` (`prettier --write`). No bloquea el deploy y después ejecuta `prettier --check`, pero el artefacto ideal debe llegar ya formateado y no mutarse durante el build.
- `next/font/google` sigue siendo una dependencia externa de build admitida por Next/Vercel. No se modificó para preservar la tipografía actual.
- Los E2E de Playwright no forman parte de `vercel-build`; deben permanecer en CI antes de promover producción.

## Variables Vercel

Producción:

- `DENTY_API_URL`: obligatorio para que `/app/*` y `/patient/*` puedan validar sesión.
- `NEXT_PUBLIC_DEMO_MODE=false`.
- `NEXT_PUBLIC_DENTY_REALTIME=true|false` según disponibilidad real del backend.

Preview sin backend real:

- `NEXT_PUBLIC_DEMO_MODE=true` únicamente en Preview.
- No usar demo mode en Production.

## Estado del build remoto recibido

El log real de Vercel recibido llegó hasta Stylelint y ya había superado instalación, preflight, arquitectura, Prettier y ESLint con tolerancia cero. Todavía debe confirmarse en el log remoto el resultado final de Stylelint, TypeScript, Vitest y `next build`.
