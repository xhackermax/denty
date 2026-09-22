# ADR 0022 · jsdom

- **Estado:** aceptado · 2026-09-21.
- **Contexto:** Vitest necesita un DOM para probar los componentes React de shared/ui.
- **Decisión:** Usar jsdom solo en tests de componentes. Versión exacta `30.0.1`.
- **Alternativas descartadas:** Happy DOM y mocks DOM parciales.
- **Consecuencias:** Mantiene el runtime de producción limpio y habilita pruebas UI locales.
- **Revisión:** cualquier sustitución o salto incompatible exige un ADR nuevo.
