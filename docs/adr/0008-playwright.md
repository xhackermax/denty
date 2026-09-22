# ADR 0008 · Playwright

- Contexto: Denty necesita verificar tablet, escritorio y móvil con interacción real.
- Decisión: usar `@playwright/test` 1.63.0.
- Motivo: Chromium/WebKit, táctil, teclado, capturas y E2E en una sola herramienta.
- Alternativa descartada: Cypress, por menor alineación con la matriz definida.
- Consecuencia: los flujos críticos tendrán pruebas multi-viewport.
