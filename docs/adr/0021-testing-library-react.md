# ADR 0021 · @testing-library/react

- **Estado:** aceptado · 2026-09-21.
- **Contexto:** Los componentes base de F2 requieren pruebas desde la perspectiva del usuario.
- **Decisión:** Usar Testing Library para render e interacción. Versión exacta `16.3.3`.
- **Alternativas descartadas:** Tests de implementación o snapshots extensos.
- **Consecuencias:** Reduce acoplamiento a internals de React y mejora la calidad de regresión.
- **Revisión:** cualquier sustitución o salto incompatible exige un ADR nuevo.
