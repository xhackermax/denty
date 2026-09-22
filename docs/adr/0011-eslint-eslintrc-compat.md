# ADR 0011 · @eslint/eslintrc

- Contexto: Next 15 documenta sus presets `next/core-web-vitals` y `next/typescript` en formato eslintrc.
- Decisión: usar `@eslint/eslintrc` 3.3.7 únicamente mediante `FlatCompat`.
- Motivo: mantener Next 15.5.25 sin inventar una configuración de lint incompatible.
- Alternativa descartada: asumir el export flat nativo de Next 16.
- Consecuencia: esta dependencia podrá retirarse al migrar a una versión de Next con flat config nativo.
