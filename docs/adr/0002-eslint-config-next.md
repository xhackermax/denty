# ADR 0002 · eslint-config-next

- Contexto: Next.js necesita reglas específicas de App Router, React y Core Web Vitals.
- Decisión: fijar `eslint-config-next` 15.5.25 para alinearlo exactamente con Next 15.5.25.
- Motivo: evita divergencia entre reglas y framework.
- Alternativa descartada: mantener solo reglas ESLint genéricas.
- Consecuencia: errores típicos de Next se detectan antes de Vercel.
