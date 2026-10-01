# Recetas para alergia a AINEs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (native) or superpowers:subagent-driven-development. Steps use checkbox syntax for tracking.

**Goal:** Bloquear AINEs y priorizar las nuevas pautas sin duplicar paracetamol.

**Architecture:** Una política de dominio común se consume en el editor y en PrescriptionRepository; el servidor vuelve a leer el perfil clínico vigente.

**Tech Stack:** Next 16.3, React 19, TypeScript, Mantine, Supabase y Vitest; CLI Supabase y age para copias.

**Spec:** [Diseño aprobado](../specs/2026-10-01-roadmap-design.md).

## Global Constraints

- Hacer push a `main`; Vercel despliega con su integración GitHub. No declarar estado remoto sin evidencia.
- No revertir datos guardados, inventar precios ni modificar dosis del vademécum.
- TDD, aislamiento por clínica, permisos conservados y documentación menor de 200 líneas por archivo.
- Antes de push: suite completa, TypeScript, lint, formato y pipeline `vercel-build`.

## Review Focus

- Alergia escrita como AINEs, antiinflamatorios o un AINE conocido: bloquear también nombres normalizados y medicamentos combinados.
- Cambio de paciente con líneas ya rellenadas: recalcular conflictos antes de guardar.
- Receta antigua editada con alergia posterior: validar el perfil actual en servidor.
- Texto manual que contiene un AINE: impedir guardado y emisión, sin depender del autocompletado.
- Paracetamol y tramadol/paracetamol: ofrecer alternativas y evitar inserción simultánea automática.

## Tarea: Recetas para alergia a AINEs

**Files:**
- `src/domain/prescriptions/nsaid-allergy.ts (nuevo)`
- `src/domain/prescriptions/dental-vademecum.ts`
- `src/features/parity/modules/prescription-line-editor.tsx`
- `src/features/parity/modules/prescriptions-module.tsx`
- `src/server/denty-supabase/prescription-repository.ts`

**Interfaces:** `hasNsaidAllergy(profile: unknown): boolean`; `isNsaidMedication(name: string): boolean`; `prescriptionAllergyConflicts(profile: unknown, ingredients: readonly string[]): string[]`.

- [ ] Escribir pruebas en `__tests__` para los cinco casos de Review Focus y estas expectativas de comportamiento (adaptar imports a los módulos reales):

```ts
expect(hasNsaidAllergy({ allergies: ["Alergia a AINEs"] })).toBe(true);
expect(isNsaidMedication("Dexketoprofeno")).toBe(true);
expect(isNsaidMedication("Paracetamol")).toBe(false);
```

- [ ] Ejecutar las pruebas del bloque y confirmar fallos por el comportamiento ausente, corrigiendo fixtures antes de modificar producción.
- [ ] Implementar: Añadir los cinco grupos del diseño con medicamentos del vademécum actual, sin metamizol por defecto ni dosis nuevas. Integrar perfiles completos al crear/editar, priorización de protocolos y aviso de conflicto. Validar create/update/validate/issue con el perfil de la clínica antes de escribir o emitir.
- [ ] Ejecutar `NODE_ENV=test node_modules/.bin/vitest run src/domain/prescriptions src/features/parity/modules/__tests__/prescription-allergy.test.tsx src/server/denty-supabase/__tests__/prescription-allergy.test.ts --maxWorkers=4` y confirmar cero fallos; medir cobertura del código nuevo (mínimo 80%).
- [ ] Revisar el diff, comprobar permisos y errores del bloque y crear un commit propio con pruebas verdes.
