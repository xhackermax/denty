# Volver y descartar cambios Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (native) or superpowers:subagent-driven-development. Steps use checkbox syntax for tracking.

**Goal:** Volver a páginas y pasos anteriores conservando datos guardados y protegiendo cambios locales.

**Architecture:** Un proveedor cliente registra destinos internos y el guard activo; PageHeader usa PageBackButton. El editor registra guardar/descartar y conserva su estado inicial.

**Tech Stack:** Next 16.3, React 19, TypeScript, Mantine, Supabase y Vitest; CLI Supabase y age para copias.

**Spec:** [Diseño aprobado](../specs/2026-10-01-roadmap-design.md).

## Global Constraints

- Hacer push a `main`; Vercel despliega con su integración GitHub. No declarar estado remoto sin evidencia.
- No revertir datos guardados, inventar precios ni modificar dosis del vademécum.
- TDD, aislamiento por clínica, permisos conservados y documentación menor de 200 líneas por archivo.
- Antes de push: suite completa, TypeScript, lint, formato y pipeline `vercel-build`.

## Review Focus

- Entrada directa y referencia externa: usar fallback interno, sin asumir que history.length implica historial Denty.
- Guardar falla: no navegar ni cerrar el aviso; mantener cambios.
- Descartar tras deshacer/rehacer: restaurar entidades iniciales y vaciar ambos historiales.
- Snapshot histórico: no mutar un editor de solo lectura.
- Cancelar o navegar entre pasos: conservar estado local y datos ya guardados.

## Tarea: Volver y descartar cambios

**Files:**
- `src/shared/navigation/navigation-provider.tsx (nuevo)`
- `src/shared/navigation/use-unsaved-changes-guard.ts (nuevo)`
- `src/shared/ui/page-back-button.tsx (nuevo)`
- `src/shared/ui/page-header.tsx`
- `src/shared/ui/index.ts`
- `src/app/(staff)/app/layout.tsx`
- `src/features/odontogram/odontogram-workspace.tsx`
- `src/shared/clinical/treatment-flow.tsx`
- `src/shared/clinical/treatment-flow-steps.ts`

**Interfaces:** `useUnsavedChangesGuard({ dirty: boolean, onSave: () => Promise<void>, onDiscard: () => void })` registra el guard; `confirmLeave(navigate: () => void): void`. El proveedor define `backTarget(history: readonly string[], fallbackHref: string): string` para elegir el destino. `PageBackButton({ fallbackHref: string })` pide confirmación antes de navegar.

- [ ] Escribir pruebas en `__tests__` para los cinco casos de Review Focus y estas expectativas de comportamiento (adaptar imports a los módulos reales):

```ts
expect(backTarget([], "/app/patients/p1")).toBe("/app/patients/p1");
expect(stateAfterDiscard.entities).toEqual(initialEntities);
expect(stateAfterDiscard.revision).toBe(0);
```

- [ ] Ejecutar las pruebas del bloque y confirmar fallos por el comportamiento ausente, corrigiendo fixtures antes de modificar producción.
- [ ] Implementar: Leer documentación instalada de Next sobre navegación y boundaries. Añadir historial interno y modal Guardar/Descartar/Cancelar; beforeunload solo cuando dirty. Proteger flecha, pestañas y enlaces internos. Integrar reset del editor y navegación de pasos sin rollback del servidor.
- [ ] Ejecutar `NODE_ENV=test node_modules/.bin/vitest run src/shared/navigation/__tests__ src/shared/ui/__tests__/page-back-button.test.tsx src/features/odontogram/odontogram-workspace.test.tsx src/shared/clinical/treatment-flow-steps.test.ts --maxWorkers=4` y confirmar cero fallos; medir cobertura del código nuevo (mínimo 80%).
- [ ] Revisar el diff, comprobar permisos y errores del bloque y crear un commit propio con pruebas verdes.
