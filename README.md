# Denty Web Preview 1.7.2 · Página Autónoma

Esta build está pensada para **probar y configurar Denty directamente desde la página**. No incluye ni necesita `ABRIR-DENTY.bat`.

## Abrir la preview

Puedes abrir `index.html` directamente en un navegador moderno o desplegar la carpeta/ZIP en un hosting estático como Vercel. La página carga `denty-app.bundle.js`, un bundle local generado desde los módulos fuente, por lo que la navegación principal no depende de iniciar `server.py`.

## Preview autónoma

- Puerta de acceso Administrador / Usuario / Paciente.
- Pacientes, ficha, odontograma y periodoncia.
- Agenda, tareas, laboratorio, presupuestos y finanzas.
- Ajustes editables.
- Voz/NLU por reglas locales cuando el navegador soporta reconocimiento.
- Cobro por tarjeta con **datáfono virtual de preview** cuando no existe backend de pagos.
- Persistencia local; si el navegador bloquea `localStorage`, Denty continúa en memoria durante esa sesión.

## Integraciones reales

`server.py` se conserva como componente opcional para futuras integraciones reales que no deben exponer secretos en el navegador: SumUp físico, IA externa/MCP y sincronización. Su ausencia no debe bloquear la preview.

## Documentación

- `docs/DOCUMENTACION-DENTY.md`: mapa funcional y técnico completo.
- `docs/UI-MAP.json`: inventario estructurado de vistas, paneles, datos e intenciones de voz.
- `docs/REGLAS-DE-ACTUALIZACION.md`: reglas para que las próximas iteraciones no vuelvan a introducir botones muertos, dependencias ocultas o configuraciones decorativas.

## Desarrollo

Después de modificar `logic.js`, `voice-router.js` o `app.js` ejecuta:

```bash
node build-static-bundle.mjs
node verify_static_page.mjs
```

`denty-app.bundle.js` es generado. No debe editarse manualmente.

## Estado pendiente

Todavía faltan autenticación real con usuario/contraseña, portal del paciente, fichaje ligado a sesión autenticada, sincronización clínica real y backend multiusuario seguro. La documentación marca estas áreas como pendientes para evitar confundir una pantalla preparada con una función terminada.

## Backend opcional para pruebas avanzadas

La preview no necesita backend para abrirse. Si en una fase de desarrollo quieres probar una LLM local, `server.py` sigue admitiendo Ollama mediante variables de entorno como `DENTY_AI_PROVIDER=ollama` y `DENTY_AI_MODEL=qwen2.5:3b`. Para un conector MCP, la URL se mantiene fuera del navegador mediante `DENTY_MCP_URL` y, si procede, `DENTY_MCP_TOKEN`. Estas opciones son auxiliares y no forman parte del arranque normal de la preview.
