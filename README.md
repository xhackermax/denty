# Denty

CRM dental desplegado en Vercel.

## Estructura

- `apps/web`: aplicacion Next.js principal de Denty.
- `docs`: documentacion tecnica, auditorias y decisiones de arquitectura.
- `packages`: espacio preparado para librerias compartidas futuras.
- `tests/e2e`: pruebas de navegador.

## Desarrollo local

```bash
cd apps/web
npm ci
npm run dev
```

## Deploy

Vercel debe usar `apps/web` como Root Directory.

- Install Command: `npm ci`
- Build Command: `node scripts/pipeline/run.mjs vercel-build`
- Framework: Next.js
- Node.js: 24.x