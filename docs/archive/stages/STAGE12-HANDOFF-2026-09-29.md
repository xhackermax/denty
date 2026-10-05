# Denty — Stage 12 Handoff

**Fecha:** 2026-09-29  
**Etapa:** 12 — Portal del paciente, recetas y Oye Denty  
**Estado:** `implemented_code_pending_live_gate`  
**Bloqueo:** `DO_NOT_REIMPLEMENT`

## Resultado

Stage 12 cierra en código los cuatro hallazgos originales que quedaban tras Stage 11. El inventario queda en **91/91 hallazgos abordados en código**: 44 `RESOLVED_IN_CODE`, 47 `IMPLEMENTED_PENDING_LIVE_VALIDATION` y 0 `PENDING_IMPLEMENTATION`.

No se reimplementaron Stages 1–11. `DNT-PRT-001` ya estaba resuelto por Stage 3; Stage 12 amplía el portal patient-scoped con recetas finales reales.

## Hallazgos originales de Stage 12

- `DNT-RX-001` — schema/persistencia Supabase de recetas: **implementado en código**.
- `DNT-RX-002` — firma como evidencia inmutable: **implementado en código**.
- `DNT-TSK-002` — NLU/executor capability mismatch: **implementado en código**.
- `DNT-TSK-003` — voz usando caminos parciales/no canónicos: **implementado en código**.

Los cuatro quedan `IMPLEMENTED_PENDING_LIVE_VALIDATION`; no se consideran certificados en producción hasta ejecutar `S12-LIVE-001…009`.

## Recetas

La migración `supabase/migrations/20260928120000_stage12_prescriptions_voice.sql` incorpora:

- `prescription_clinic_settings`
- `prescription_prescribers`
- `prescriptions`
- `prescription_items`
- `prescription_versions`
- `prescription_signatures`
- bucket privado `prescription-evidence`
- RLS por clínica/paciente y policies patient-scoped
- RPCs de borrador, edición, validación, firma, emisión, cancelación y ajustes
- auditoría + Broadcast

La validación genera snapshot versionado y SHA-256. La firma se sube como `File` multipart a Storage, queda ligada a receta+versión+checksum y la evidencia/versiones se protegen contra mutación. La emisión exige firma de la versión actual.

La API Supabase soporta listado/detalle, create/update, validate, sign, issue, cancel, history y PDF. La UI expone el lifecycle Borrador → Validada → Firma → Emitida, además de cancelación e historial.

## Portal del paciente

La proyección real patient-scoped incorpora recetas. Las policies limitan PATIENT a sus propias recetas finales y excluyen `DRAFT`, `READY` y `SIGNING`. El portal muestra la sección **Recetas** y abre el PDF canónico mediante la API protegida.

## Oye Denty

- `EXECUTABLE_VOICE_ACTION_TYPES` define el subconjunto realmente ejecutable.
- `isExecutableVoiceAction()` valida capability y campos estructurales antes de ejecutar.
- Todo el plan se preflighta antes de la primera escritura, evitando secuencias parcialmente ejecutadas.
- Preview/confirmación bloquean intents entendidos pero no ejecutables.
- Las acciones soportadas usan `getBrowserApi()`, el mismo camino que la UI.
- `payment.record` exige importe y método.
- `patient.create` deja de exigir DNI si el schema canónico lo permite opcional.
- Mutaciones consecuenciales requieren confirmación.

## Hallazgos adicionales corregidos

1. `S12-FIND-001` — Base64 por JSON en la firma rompía el contrato Storage de Stage 5; migrado a multipart.
2. `S12-FIND-002` — portal de recetas endurecido a estados finales patient-scoped.
3. `S12-FIND-003` — ejecución parcial de plan de voz eliminada mediante preflight global.
4. `S12-FIND-004` — requisito artificial de DNI en voz eliminado.
5. `S12-FIND-005` — método de pago obligatorio antes de ejecutar pago por voz.
6. `S12-FIND-006` — manifests reconciliados a API parity 223/223.
7. `S12-FIND-007` — lifecycle visible de receta completado con firma/emisión/cancelación/historial.
8. `S12-FIND-008` — protección de Storage endurecida: upload solo para receta READY y cleanup de huérfanos sin poder borrar evidencia registrada.
9. `S12-FIND-009` — PDF de receta usa WinAnsi y conserva tildes/ñ en lugar de sustituirlas por `?`.
10. `S12-FIND-010` — la RPC de firma exige que el `staff_member` autenticado sea exactamente el prescriptor de la receta; emisión verifica la misma relación.

## Regla de continuación

- **No reimplementar Stages 1–12.**
- Las tareas `S*-LIVE-*` son validación/operación, no autorización para rediseñar etapas cerradas.
- Continuar por **Stage 13 — Gate final de integración**.
