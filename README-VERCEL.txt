DENTY R7 - ZIP PLANO PARA VERCEL

Este ZIP está preparado para subirse con package.json en la raíz.
No selecciones apps/web como Root Directory para este archivo: la raíz del proyecto ya es la aplicación Next.js.

Ajustes recomendados en Vercel:
- Framework Preset: Next.js
- Root Directory: . (raíz)
- Install Command: npm ci
- Build Command: npm run build
- Output Directory: dejar vacío / automático
- Node.js: 24.x

Esta entrega de prueba arranca en modo demo aunque NEXT_PUBLIC_DEMO_MODE no esté configurada.
Para una instalación real con autenticación/backend, define NEXT_PUBLIC_DEMO_MODE=false y configura DENTY_API_URL y el resto de variables de servidor.
