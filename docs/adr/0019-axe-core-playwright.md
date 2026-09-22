# ADR 0019 · @axe-core/playwright

- **Estado:** aceptado · 2026-09-21.
- **Contexto:** La salida de F2 exige verificar accesibilidad serious/critical en rutas base.
- **Decisión:** Integrar axe en Playwright para gates E2E. Versión exacta `4.13.0`.
- **Alternativas descartadas:** Auditoría manual o axe fuera de la suite.
- **Consecuencias:** La accesibilidad crítica se convierte en evidencia automatizada.
- **Revisión:** cualquier sustitución o salto incompatible exige un ADR nuevo.
