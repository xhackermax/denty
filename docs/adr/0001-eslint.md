# ADR 0001 · ESLint

- Contexto: Denty actual carece de lint y acumula patrones peligrosos.
- Decisión: fijar `eslint` **9.39.5** durante F1.
- Motivo: `eslint-config-next` 15.5.25 declara compatibilidad hasta ESLint 9; ESLint 10.11.0 provoca `ERESOLVE` en npm y no puede formar parte de un lock reproducible con Next 15.5.25.
- Evidencia: build Vercel 2026-09-21 falló con el peer `eslint ^7.23 || ^8 || ^9` de `eslint-config-next@15.5.25`.
- Alternativa descartada: `--force`/`--legacy-peer-deps`, porque ocultaría un árbol de dependencias inválido.
- Alternativa futura: actualizar Next cuando exista una migración compatible con ESLint 10 y documentarla en otro ADR.
- Consecuencia: `npm run lint` sigue siendo puerta obligatoria de CI; el pin es deliberado y exacto.
