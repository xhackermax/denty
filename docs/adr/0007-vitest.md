# ADR 0007 · Vitest

- Contexto: el proyecto actual no tiene una suite unitaria moderna ni cobertura de dominio.
- Decisión: usar Vitest 5.0.1.
- Motivo: TypeScript rápido, API clara y buen encaje con módulos ESM.
- Alternativa descartada: Jest, por mayor configuración para este stack.
- Consecuencia: F3 exigirá ≥90 % de cobertura en `domain/`.
