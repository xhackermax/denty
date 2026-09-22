# ADR 0020 · @testing-library/jest-dom

- **Estado:** aceptado · 2026-09-21.
- **Contexto:** Los componentes base necesitan aserciones DOM legibles y orientadas a comportamiento.
- **Decisión:** Usar jest-dom con Vitest. Versión exacta `7.0.1`.
- **Alternativas descartadas:** Aserciones DOM manuales.
- **Consecuencias:** Los tests de UI expresan estados visibles y accesibles con menos código.
- **Revisión:** cualquier sustitución o salto incompatible exige un ADR nuevo.
