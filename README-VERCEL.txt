DENTY R7 - ZIP PLANO PARA VERCEL

Este ZIP está preparado para subirse con package.json en la raíz.
No selecciones apps/web como Root Directory para este archivo: la raíz del proyecto ya es la aplicación Next.js.

Ajustes recomendados en Vercel:
- Framework Preset: Next.js
- Root Directory: . (raíz)
- Install Command: npm ci
- Build Command: node scripts/pipeline/run.mjs vercel-build
- Output Directory: dejar vacío / automático
- Node.js: 24.x (package.json engines.node es la fuente de verdad y prevalece sobre el ajuste del panel)

Esta entrega usa autenticación y datos reales de Supabase. No existe un modo alternativo de acceso ni un backend secundario.
Configura las variables de Supabase y los secretos de servidor requeridos por el entorno.

Alineación local / CI:
- .node-version: 24
- .nvmrc: 24
- @types/node: 24.x
- package-lock.json: lockfile npm v3
