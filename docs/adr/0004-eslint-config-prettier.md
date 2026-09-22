# ADR 0004 · eslint-config-prettier

- Contexto: ESLint y Prettier pueden activar reglas estilísticas incompatibles.
- Decisión: usar `eslint-config-prettier` 10.1.8.
- Motivo: ESLint se centra en calidad y Prettier en formato.
- Alternativa descartada: duplicar reglas de formato en ESLint.
- Consecuencia: menos falsos positivos y una única fuente de formato.
