# Orden de tareas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (native) or superpowers:subagent-driven-development. Steps use checkbox syntax for tracking.

**Goal:** Reordenar inbox y agenda con arrastre, teclado y botones táctiles.

**Architecture:** Reutilizar mergeVisibleOrder y la mutación optimista existente; añadir acciones accesibles sin dnd-kit.

**Tech Stack:** Next 16.3, React 19, TypeScript, Mantine, Supabase y Vitest; CLI Supabase y age para copias.

**Spec:** [Diseño aprobado](../specs/2026-10-01-roadmap-design.md).

## Global Constraints

- Hacer push a `main`; Vercel despliega con su integración GitHub. No declarar estado remoto sin evidencia.
- No revertir datos guardados, inventar precios ni modificar dosis del vademécum.
- TDD, aislamiento por clínica, permisos conservados y documentación menor de 200 líneas por archivo.
- Antes de push: suite completa, TypeScript, lint, formato y pipeline `vercel-build`.

## Review Focus

- Filtro activo: conservar posición relativa de tareas ocultas.
- Primera/última tarjeta: deshabilitar subida/bajada fuera de rango.
- Servidor falla: restablecer orden anterior y mostrar error.
- Guardado pendiente: impedir otra mutación de orden concurrente.
- Lista vacía o de una tarea: no ofrecer movimientos inválidos.

## Tarea: Orden de tareas

**Files:**
- `src/features/parity/tasks/tasks-timeline.tsx`
- `src/features/parity/tasks/task-node.tsx`
- `src/features/parity/tasks/inbox-list.tsx`
- `src/features/parity/tasks/use-task-actions.ts`
- `src/features/parity/tasks/__tests__/tasks-timeline.test.tsx`

**Interfaces:** Reutilizar `reorder(orderedIds: string[])` y `mergeVisibleOrder(allIds, visibleIds)`; añadir `moveVisibleTask(id: string, direction: -1 | 1): void` al consumidor de tarjetas.

- [ ] Escribir pruebas en `__tests__` para los cinco casos de Review Focus y estas expectativas de comportamiento (adaptar imports a los módulos reales):

```ts
expect(moveIdToIndex(["a", "b", "c"], "c", 0)).toEqual(["c", "a", "b"]);
expect(orderAfterServerFailure).toEqual(orderBeforeMove);
```

- [ ] Ejecutar las pruebas del bloque y confirmar fallos por el comportamiento ausente, corrigiendo fixtures antes de modificar producción.
- [ ] Implementar: Eliminar la restricción que impide drop en inbox. Añadir Subir tarea/Bajar tarea con iconos y aria-label por tarjeta, usando el orden visible y fusionándolo con todos los IDs. Mantener el rollback existente y bloquear durante reorder.isPending.
- [ ] Ejecutar `NODE_ENV=test node_modules/.bin/vitest run src/features/parity/tasks/__tests__ --maxWorkers=4` y confirmar cero fallos; medir cobertura del código nuevo (mínimo 80%).
- [ ] Revisar el diff, comprobar permisos y errores del bloque y crear un commit propio con pruebas verdes.
