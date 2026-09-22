# ADR 0009 · Husky

- Contexto: errores simples deben bloquearse antes de llegar a CI.
- Decisión: usar Husky 9.1.7 para hooks locales.
- Motivo: ejecutar lint, typecheck y tests antes del commit.
- Alternativa descartada: confiar únicamente en CI.
- Consecuencia: feedback temprano sin sustituir las comprobaciones remotas.
