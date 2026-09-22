# ADR 0016 · motion

- **Estado:** aceptado · 2026-09-21.
- **Contexto:** El legacy mantiene runtimes propios de animación que deben desaparecer.
- **Decisión:** Usar Motion solo para transiciones puntuales y respetar reduced motion. Versión exacta `13.4.0`.
- **Alternativas descartadas:** Animaciones CSS dispersas y runtime legacy.
- **Consecuencias:** Se elimina un runtime propio y se concentra la animación en una API mantenida.
- **Revisión:** cualquier sustitución o salto incompatible exige un ADR nuevo.
