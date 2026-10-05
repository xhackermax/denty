# e2e

Pruebas Playwright (`npm run test:e2e`). Proyectos de escritorio y móvil.

- `odontogram-*.spec.ts`: herramientas, flujo de trabajo, dentición, autoguardado y navegación del odontograma.
- `agenda`, `next-slot-finder`, `phased-budgets`, `navigation-layout`, `mobile-more-menu`: flujos de agenda, presupuestos y menú.
- `accessibility`, `worst-case-data`, `unavailable-data-states`: accesibilidad y datos límite.
- `torture-*.spec.ts`: pruebas de estrés (solo con `DENTY_TORTURE=1`, ver [guía](../docs/testing/odontogram-torture.md)).
- `support/`: utilidades compartidas.