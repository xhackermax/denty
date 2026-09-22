# ADR 0005 · Stylelint

- Contexto: el CSS actual es global, denso y contiene numerosos `!important`.
- Decisión: usar Stylelint 17.15.0.
- Motivo: detectar errores CSS y hacer exigible la futura disciplina de CSS Modules.
- Alternativa descartada: revisar CSS solo en code review.
- Consecuencia: `lint:styles` será obligatorio en CI.
