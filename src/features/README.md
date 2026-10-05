# features

Interfaz de usuario organizada por funcionalidad (odontograma, agenda, voz, pagos…). Cada carpeta agrupa componentes, hooks, estilos (`*.module.css`) y tests de una misma pantalla o herramienta.

- **Usa:** `src/domain` para reglas y `src/shared` para utilidades y cliente de API.
- **No debe:** hablar con Supabase ni importar `src/server`.
- **Se monta desde:** las rutas de `src/app`.
- **Estilos:** CSS Modules; sin estilos inline estáticos (lo comprueba `npm run architecture:check`).

Qué hace cada carpeta y con qué interactúa: [docs/architecture/repository-map.md](../../docs/architecture/repository-map.md).