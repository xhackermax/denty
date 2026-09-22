# ADR 0013 · @mantine/hooks

- **Estado:** aceptado · 2026-09-21.
- **Contexto:** El shell y los componentes base necesitan hooks de UI compatibles con Mantine.
- **Decisión:** Usar Mantine Hooks junto a Mantine Core. Versión exacta `9.6.1`.
- **Alternativas descartadas:** Hooks caseros dispersos y utilidades de terceros.
- **Consecuencias:** Evita duplicar lógica de UI y mantiene una sola familia de dependencias.
- **Revisión:** cualquier sustitución o salto incompatible exige un ADR nuevo.
