# ADR 0003 · Prettier

- Contexto: el código histórico contiene líneas minificadas manualmente y formatos inconsistentes.
- Decisión: usar Prettier 3.9.8 con ancho máximo de 100 caracteres.
- Motivo: formato determinista y legible sin debates de estilo.
- Alternativa descartada: formato manual.
- Consecuencia: `format:check` forma parte del control de calidad.
