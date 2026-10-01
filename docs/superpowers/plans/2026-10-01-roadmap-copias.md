# Copias locales cifradas de Supabase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (native) or superpowers:subagent-driven-development. Steps use checkbox syntax for tracking.

**Goal:** Generar copias de SQL y Storage cifradas con retención segura y guía de restauración.

**Architecture:** Orquestador Node local con dependencias de proceso/fetch inyectables; CLI Supabase genera dumps y age cifra un archivo comprimido. No incorporar el orquestador al runtime web.

**Tech Stack:** Next 16.3, React 19, TypeScript, Mantine, Supabase y Vitest; CLI Supabase y age para copias.

**Spec:** [Diseño aprobado](../specs/2026-10-01-roadmap-design.md).

## Global Constraints

- Hacer push a `main`; Vercel despliega con su integración GitHub. No declarar estado remoto sin evidencia.
- No revertir datos guardados, inventar precios ni modificar dosis del vademécum.
- TDD, aislamiento por clínica, permisos conservados y documentación menor de 200 líneas por archivo.
- Antes de push: suite completa, TypeScript, lint, formato y pipeline `vercel-build`.

## Review Focus

- Fallos de dump, descarga o age: limpiar temporales y no borrar copias anteriores.
- Storage paginado con subcarpetas y nombres especiales: recorrer todas las páginas y evitar rutas fuera del temporal.
- Secrets en errores del proceso: redactar URL/clave y no imprimir argumentos sensibles.
- Dos copias próximas o procesos concurrentes: nombres únicos y promoción atómica del archivo cifrado.
- Retención: contar únicamente archivos propios completos .tar.gz.age, sin borrar otros archivos.

## Tarea: Copias locales cifradas de Supabase

**Files:**
- `scripts/backup/supabase-backup.mjs (nuevo)`
- `scripts/backup/backup-core.mjs (nuevo)`
- `scripts/backup/__tests__/backup.test.ts (nuevo)`
- `scripts/backup/restore.md (nuevo)`
- `package.json`
- `.gitignore`

**Interfaces:** `runBackup({ dbUrl, supabaseUrl, serviceKey, ageRecipient, outputDir, retention }, { run, fetchImpl, now }): Promise<{ archivePath: string }>`; CLI lee `SUPABASE_DB_URL`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `BACKUP_AGE_RECIPIENT`, `BACKUP_RETENTION`.

- [ ] Escribir pruebas en `__tests__` para los cinco casos de Review Focus y estas expectativas de comportamiento (adaptar imports a los módulos reales):

```ts
expect(filesInFinalDirectory).toEqual(["backup-2026-10-01-unique.tar.gz.age"]);
expect(plaintextTemporaryExists).toBe(false);
expect(previousArchivesAfterFailedRun).toEqual(previousArchivesBeforeRun);
```

- [ ] Ejecutar las pruebas del bloque y confirmar fallos por el comportamiento ausente, corrigiendo fixtures antes de modificar producción.
- [ ] Implementar: Validar configuración y herramientas antes de comenzar. Crear temporal privado, ejecutar roles/schema/data, inventariar buckets y descargar objetos autenticados con paginación. Generar manifiesto con hashes y metadatos de restauración. Comprimir/cifrar, promover resultado y aplicar retención solo tras éxito. Documentar restauración aislada SQL/Storage, exclusiones de CLI y requisitos de acceso.
- [ ] Ejecutar `NODE_ENV=test node_modules/.bin/vitest run scripts/backup/__tests__/backup.test.ts --maxWorkers=2`; prueba real y restauración solo con credenciales e infraestructura de prueba disponibles. y confirmar cero fallos; medir cobertura del código nuevo (mínimo 80%).
- [ ] Revisar el diff, comprobar permisos y errores del bloque y crear un commit propio con pruebas verdes.
