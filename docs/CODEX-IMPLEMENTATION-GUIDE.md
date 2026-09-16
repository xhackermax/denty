# Guía de ejecución para Codex — Denty V11 → Producción

## Qué debe leer primero

1. `docs/superpowers/specs/2026-09-16-denty-production-platform-design.md`
2. `docs/superpowers/plans/2026-09-16-00-denty-production-master-roadmap.md`
3. Ejecutar después los planes individuales en el orden indicado por el master.

## Estado real de partida

- `apps/web` es Next.js 15/React 19, pero la pantalla principal todavía renderiza `LegacyDentyShell`.
- `apps/api` tiene Fastify y solo endpoints de salud/demo.
- `packages/db/prisma/schema.prisma` solo modela `Patient`.
- `packages/domain` usa todavía `admin | operational`.
- `packages/voice` es un parser mínimo.
- La funcionalidad rica está en `apps/legacy-preview/app.js`, `logic.js` y `voice-router.js`.
- La preview V11 debe tratarse como especificación funcional y banco de regresiones.
- No migrar copiando el monolito a componentes React.

## Orden de trabajo

### Fundación
- 01 Backend + base multiusuario
- 02 Autenticación/permisos
- 12 Seguridad/auditoría, solo baseline necesario

### Operación nativa
- 03 React/Next
- 10 Agenda V12

### Núcleo clínico
- 07 Odontograma V3
- 06 Plan clínico V2
- 05 Voz

### Paciente/documentos/finanzas
- 09 Documentos/firma
- 08 Portal paciente real
- 04 Facturación + VERI*FACTU

### Laboratorio + cierre
- 11 Laboratorio
- completar 12 Seguridad/backups

## Regla de fuente de verdad

Durante la migración hay dos mundos:

- **legacy:** solo referencia funcional y demo,
- **native:** único camino de producción.

No mantener dos bases clínicas activas. Un módulo que ya ha migrado a native no debe escribir además a localStorage.

## Regla de concurrencia

Todo PATCH/acción sobre registro mutable usa `expectedVersion`.

Ejemplo:

```json
{
  "status": "ARRIVED",
  "expectedVersion": 3
}
```

Si otro equipo ya modificó la cita:

```http
409 VERSION_CONFLICT
```

La UI recarga la versión actual y permite al usuario decidir. No sobrescribir silenciosamente.

## Regla de transacción

Toda mutación importante debe ejecutar en una misma transacción:

```text
business change
+ audit event
+ domain outbox event
```

Si cualquiera falla, no se confirma nada.

## Regla clínica

Denty puede:

- representar lo indicado por el profesional,
- ordenar necesidades registradas,
- mostrar dependencias,
- comparar alternativas configuradas,
- explicar pros/contras generales,
- registrar preferencia del paciente.

Denty no debe:

- inventar un diagnóstico,
- elegir por sí solo una alternativa clínica,
- inventar tiempos biológicos,
- convertir preferencia de paciente en aprobación clínica.

## Regla de voz

Nunca:

```text
LLM → SQL / Prisma
```

Siempre:

```text
ASR
→ VoicePlan tipado
→ resolver entidades
→ permisos
→ validación
→ confirmación
→ mismos application services que la UI
→ audit
```

## Regla fiscal

Presupuesto, producción, factura y cobro son entidades distintas.

Nunca:

```text
tratamiento completado = factura pagada
```

Una factura emitida es inmutable; se corrige mediante los mecanismos fiscales correspondientes.

## Regla de documentos

Plantilla editable → versión → documento snapshot → revisión → PDF → firma → bloqueo.

Cambiar una plantilla nunca cambia un documento ya firmado.

## Análisis futuro

Todos los módulos deben emitir eventos trazables para que `Herramientas rápidas → Análisis` pueda calcular sin inferencias frágiles:

```text
appointment.no_show
appointment.completed
clinical_plan.item_completed
treatment.rework_recorded
payment.received
invoice.issued
lab.cost_recorded
```

Añadir `doctorId`, `siteId`, `procedureId`, importes/costes y duración cuando proceda, sin incluir texto clínico libre innecesario.

## Definition of Done de cada plan

Antes de marcar un plan como terminado:

```bash
pnpm typecheck
pnpm test
pnpm legacy:test
```

Además:

- reiniciar API y comprobar persistencia,
- probar dos sesiones simultáneas cuando el módulo sea multiusuario,
- probar permiso denegado,
- probar conflicto de versión,
- comprobar audit/outbox,
- actualizar matriz de paridad.
