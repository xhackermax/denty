# Procedimientos quirúrgicos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (native) or superpowers:subagent-driven-development. Steps use checkbox syntax for tracking.

**Goal:** Registrar los cuatro procedimientos y sincronizarlos con agenda, voz y presupuesto.

**Architecture:** Un registro común de procedimientos define códigos, tipos y ámbito; los consumidores conservan los códigos históricos y usan el catálogo de la clínica.

**Tech Stack:** Next 16.3, React 19, TypeScript, Mantine, Supabase y Vitest; CLI Supabase y age para copias.

**Spec:** [Diseño aprobado](../specs/2026-10-01-roadmap-design.md).

## Global Constraints

- Hacer push a `main`; Vercel despliega con su integración GitHub. No declarar estado remoto sin evidencia.
- No revertir datos guardados, inventar precios ni modificar dosis del vademécum.
- TDD, aislamiento por clínica, permisos conservados y documentación menor de 200 líneas por archivo.
- Antes de push: suite completa, TypeScript, lint, formato y pipeline `vercel-build`.

## Review Focus

- Arcada sin implantes planificados: explicar que falta la vinculación y no registrar una férula huérfana.
- Regularización y alveoloplastia anteriores: conservar códigos y registros sin duplicación automática.
- Férula guiada frente a férula de descarga: glifos quirúrgico y oclusal diferenciados.
- Procedimiento realizado: respetar lifecycle y no volver a planificarlo como pendiente.
- Catálogo sin precio configurado: conservar el mecanismo de configuración existente, sin asignar precios inventados.

## Tarea: Procedimientos quirúrgicos

**Files:**
- `src/domain/odontogram/surgery-procedures.ts (nuevo)`
- `src/features/odontogram/surgery-panel.tsx`
- `src/features/odontogram/surgery-visuals.tsx`
- `src/features/odontogram/surgery-legend.tsx`
- `src/domain/agenda/clinical-glyph.ts`
- `src/domain/agenda/treatment-options.ts`
- `src/features/voice/local-nlu.ts`
- `supabase/migrations/20261001150000_roadmap_surgery_procedures.sql (nuevo)`

**Interfaces:** `SURGERY_PROCEDURES`: registros `{ value, label, entityType, scope }`; `scope` es `tooth` o `arch`. La férula guarda `arch`, IDs de implantes vinculados y procedimiento, sin simular una pieza dental.

- [ ] Escribir pruebas en `__tests__` para los cinco casos de Review Focus y estas expectativas de comportamiento (adaptar imports a los módulos reales):

```ts
expect(SURGERY_PROCEDURES.find(p => p.value === "titanium_mesh")?.entityType).toBe("MEMBRANE");
expect(SURGERY_PROCEDURES.find(p => p.value === "guided_surgery_splint")?.scope).toBe("arch");
expect(clinicalGlyphFor({ label: "Férula quirúrgica guiada" })?.family).not.toBe("occlusal_splint");
```

- [ ] Ejecutar las pruebas del bloque y confirmar fallos por el comportamiento ausente, corrigiendo fixtures antes de modificar producción.
- [ ] Implementar: Añadir gingivectomy/SURGERY, bone_regularization/SURGERY, guided_surgery_splint/SURGERY y titanium_mesh/MEMBRANE; conservar alveoloplasty. Seleccionar arcada para la férula, actualizar representación y NLU. Extender los mapeos SQL existentes y las opciones de catálogo usando sus precios configurados.
- [ ] Ejecutar `NODE_ENV=test node_modules/.bin/vitest run src/features/odontogram/surgery-panel.test.tsx src/features/odontogram/surgery-legend.test.tsx src/domain/__tests__/agenda-treatment-options.test.ts src/features/voice/__tests__ --maxWorkers=4`; comprobar también el contrato SQL con fixtures de catálogo y arcada. y confirmar cero fallos; medir cobertura del código nuevo (mínimo 80%).
- [ ] Revisar el diff, comprobar permisos y errores del bloque y crear un commit propio con pruebas verdes.
