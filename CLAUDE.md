# Denty — Desarrollo

## Reglas del repositorio

- Leer [AGENTS.md](AGENTS.md) y la documentación instalada de Next.js antes de cambiar código: esta versión contiene cambios incompatibles.
- Mantener una sola responsabilidad por módulo y separar dominio, API y UI.
- Extender mediante composición y contratos pequeños; inyectar dependencias para poder probarlas.
- Respetar los contratos de las implementaciones sustituibles.
- TypeScript estricto, ESLint y Prettier sin errores.
- Los comentarios deben explicar decisiones, no repetir el código.

## Pruebas

- Cambios de código: test que falle → implementación mínima → refactor con tests verdes.
- Cobertura mínima del 80% en código nuevo; mantener la cobertura global por encima del 80%.
- Lógica: casos normales, límites y errores.
- API: contrato, autenticación, permisos y errores.
- Hooks/UI: estado, interacción y accesibilidad con React Testing Library.
- Supabase: integración, aislamiento y manejo de fallos; mocks en la frontera externa.
- Tests junto al código, en `__tests__`, con Vitest. No duplicar ejemplos ni fixtures en runtime.

## Antes de commit

- Ejecutar las pruebas y los checks afectados por el cambio.
- Para cambios de código, comprobar `npm run typecheck`, lint y formato.
- Declarar qué se verificó y cualquier comprobación que haya quedado bloqueada.

## Dónde está cada cosa

- Visión general y comandos: [README.md](README.md).
- Mapa del código y flujos: [docs/architecture/repository-map.md](docs/architecture/repository-map.md).
- Índice de documentación: [docs/README.md](docs/README.md).

@AGENTS.md
