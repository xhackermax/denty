# Plan de ejecución del roadmap Denty

Diseño: [roadmap aprobado](../specs/2026-10-01-roadmap-design.md).
Base: `1939b60`; documento de diseño guardado en `63dbc7e`.

## Orden y entregables independientes

1. [Recetas y alergia a AINEs](2026-10-01-roadmap-recetas.md).
2. [Procedimientos quirúrgicos](2026-10-01-roadmap-cirugia.md).
3. [Reordenación de tareas](2026-10-01-roadmap-tareas.md).
4. [Volver y cambios sin guardar](2026-10-01-roadmap-navegacion.md).
5. [Contactos especiales](2026-10-01-roadmap-contactos.md).
6. [Copias locales cifradas](2026-10-01-roadmap-copias.md).

## Cierre

- Ejecutar `npm test`, `npm run typecheck`, lint y Prettier en los archivos cambiados.
- Ejecutar `node scripts/pipeline/run.mjs vercel-build`, retirando la caché TS local si el gate lo exige.
- Pedir una revisión independiente del conjunto y corregir los problemas relevantes.
- Comprobar que `main` no avanzó; si avanzó, integrar sin force-push y verificar el resultado.
- Hacer push a `main`; la integración de Vercel realiza el deploy automáticamente.
- Informar de migraciones SQL pendientes y pruebas reales de backup/restauración no ejecutadas por falta de acceso.

## Método propuesto

Ejecución nativa: implementar los bloques en esta sesión, con commits y pruebas por bloque,
y una revisión independiente al final. Evita duplicar contexto entre implementadores.
La elección del método y la revisión de estos planes quedan pendientes de aprobación.
