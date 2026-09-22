# ADR 0023 · postcss

- **Estado:** aceptado · 2026-09-21.
- **Contexto:** Mantine y CSS Modules necesitan una canalización PostCSS explícita y reproducible.
- **Decisión:** Fijar PostCSS como herramienta de build CSS. Versión exacta `8.5.28`.
- **Alternativas descartadas:** Depender de resolución transitiva implícita.
- **Consecuencias:** La transformación CSS queda versionada y auditable.
- **Revisión:** cualquier sustitución o salto incompatible exige un ADR nuevo.
