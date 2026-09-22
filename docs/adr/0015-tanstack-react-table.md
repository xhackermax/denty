# ADR 0015 · @tanstack/react-table

- **Estado:** aceptado · 2026-09-21.
- **Contexto:** Los módulos administrativos necesitan tablas componibles sin acoplar dominio a un widget cerrado.
- **Decisión:** Usar TanStack Table como motor headless de DataTable. Versión exacta `9.2.4`.
- **Alternativas descartadas:** Tablas HTML manuales y grids comerciales.
- **Consecuencias:** La presentación queda en Mantine/CSS y la lógica de tabla es reutilizable.
- **Revisión:** cualquier sustitución o salto incompatible exige un ADR nuevo.
