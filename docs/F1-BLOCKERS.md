# F1 · Bloqueos y estrategia de cierre

## F1-01 · Lockfile reproducible
- Fecha: 2026-09-21.
- Primer despliegue falló porque `vercel.json` ejecutaba `npm ci` sin `package-lock.json`.
- Corrección de transición: Vercel ejecuta `npm install --package-lock-only --ignore-scripts`, después `npm ci`.
- El lock generado se conserva en `.artifacts/bootstrap/package-lock.json` como evidencia interna del pipeline; no se publica bajo `public/`.
- Cierre definitivo: incorporar ese lock a la raíz, retirar el bootstrap y dejar `installCommand: npm ci`.

## F1-02 · Puerta de calidad
El target `vercel-build` ejecuta arquitectura, normalización temporal de formato, ESLint, Stylelint,
TypeScript, Vitest y finalmente `next build`. La normalización con `prettier --write` sigue siendo una
medida de transición para este ZIP mientras el entorno de empaquetado no puede instalar Prettier.
El pipeline local/CI normal usa `prettier --check` y no muta el árbol fuente.

F1 no se declara cerrada hasta que todos los gates terminen en verde y el lock generado quede
incorporado al ZIP raíz.

## F1-03 · Compatibilidad ESLint / Next 16
- Fecha: 2026-09-21.
- Next y `eslint-config-next` están alineados en `16.3.5`.
- ESLint queda fijado en `9.39.5`.
- Se rechaza `--force` y `--legacy-peer-deps`; la instalación debe resolver sin saltarse peers.
- F1 seguirá abierta hasta que Vercel complete instalación + verify + build y podamos incorporar el
  `package-lock.json` generado.
