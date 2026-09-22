# ADR 0024 · postcss-preset-mantine

- **Estado:** aceptado · 2026-09-21.
- **Contexto:** El sistema de estilos debe usar las utilidades PostCSS recomendadas por Mantine sin runtime CSS-in-JS propio.
- **Decisión:** Añadir el preset Mantine al PostCSS de F2. Versión exacta `1.18.0`.
- **Alternativas descartadas:** CSS manual sin preset o plugins no alineados con Mantine.
- **Consecuencias:** Facilita variables y utilidades del ecosistema manteniendo CSS Modules.
- **Revisión:** cualquier sustitución o salto incompatible exige un ADR nuevo.
