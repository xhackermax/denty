# Denty — Handoff Etapa 6

**Fecha:** 2026-09-28  
**Etapa:** 6 — Odontograma, periodoncia y pipeline clínico  
**Estado:** `FINALIZADA_EN_CODIGO / DO_NOT_REIMPLEMENT`

## Resultado

La etapa tenía 10 hallazgos asignados. `DNT-CLN-001` ya estaba resuelto por Etapa 2 y `DNT-CLN-003` por Etapa 3. En esta entrega se cierran en código los otros 8: `DNT-CLN-002`, `004`, `005`, `006`, `007`, `008`, `009` y `010`.

Tras este checkpoint quedan **33 / 91 hallazgos originales pendientes de implementación**. La siguiente implementación funcional es **Etapa 7 — Agenda, recepción, no-show y sala de espera**.

## Fronteras que quedan bloqueadas

- `save_odontogram_batch` sigue siendo la única escritura batch transaccional del odontograma.
- `periodontal_exams` + `periodontal_measurements` forman el historial periodontal versionado.
- `create_odontogram_snapshot` captura entidades y estado periodontal real.
- `treatment_catalog` es el maestro persistente por clínica; no reintroducir catálogos hardcoded.
- Los plan items conservan snapshots de código, etiqueta, precio, coste y metadata clínica.
- Los requisitos de consentimiento se derivan de snapshots persistidos del plan, no de heurísticas de navegador.
- `sync_clinical_plan` / `sync_budget_from_plan` gobiernan vigencia por versiones.
- `finalize_budget_signature` es la única frontera de firma y valida budget/plan/consentimientos dentro de DB.
- El snapshot firmado se construye con budget, items, plan y requirements autoritativos de DB.
- `clinical_history_events` + `audit_log` registran las mutaciones clínicas core.

## Hallazgos adicionales encontrados y corregidos durante Etapa 6

1. La UI del periodontograma completo usaba `/clinical-workflow/periodontal-exams`, ruta que el handler Supabase no atendía aunque existía una ruta periodontal rápida. Se unificó sobre el mismo repositorio/RPC versionado.
2. `sync_budget_from_plan` podía reusar un presupuesto no-DRAFT, con riesgo de degradar un firmado/presentado de nuevo a DRAFT y reescribir líneas. Ahora cualquier no-DRAFT genera una nueva revisión.
3. La nueva tabla `periodontal_exams` no podía heredar el trigger de auditoría de Etapa 2 porque todavía no existía. Se añadió `periodontal_exams_audit_mutation`.
4. `periodontal_exams.patient_id` se había definido inicialmente con `ON DELETE CASCADE`, reabriendo un riesgo que Etapa 4 había cerrado. Queda `ON DELETE RESTRICT`.
5. La firma podía almacenar un `snapshot_json` vacío/de cliente. Ahora la RPC compone el snapshot desde estado autoritativo de DB y solo conserva el JSON cliente como contexto accesorio.
6. Los consentimientos de un plan histórico podían derivar de `treatment_catalog.metadata` vivo y cambiar al editar el catálogo. Se añadió `treatment_metadata_snapshot` y los requirements se derivan de ese snapshot inmutable.
7. El pipeline infería “presupuesto firmado” buscando un documento por título. Ahora usa `budget.status = SIGNED` como fuente canónica y `SIGNED` exige nueva revisión si el plan cambia.

## Pendiente: validación LIVE, no reimplementación

- `S6-LIVE-001`: aplicar `20260928060000_stage6_clinical_pipeline.sql` en Supabase staging.
- `S6-LIVE-002`: validar concurrencia/rollback y comparar revisiones reales de odontograma-periodoncia.
- `S6-LIVE-003`: probar CRUD de catálogo con dos sesiones y confirmar que planes históricos no cambian.
- `S6-LIVE-004`: E2E consentimiento → firma → cambio de plan → nueva revisión de presupuesto.
- `S6-LIVE-005`: comprobar `clinical_history_events` y `audit_log` con actor/JWT/correlation_id reales.
- `S6-LIVE-006`: ejecutar bajo Node 24 con dependencias: `npm ci`, checks Stage 6, typecheck, tests y build Next.

## Verificación local observada

- Contratos Stage 1–6: PASS.
- API parity: 201/201 contratos browser representados; 3 rutas server-only excluidas.
- Architecture gate: PASS.
- Pipeline self-check: PASS.
- 17/17 archivos TS/TSX modificados: transpilación sintáctica PASS.
- Suite completa Next/TypeScript: no certificada en este contenedor porque usa Node 22 y no contiene `node_modules`; queda explícitamente en `S6-LIVE-006`.

## Regla para el siguiente agente

No reimplementar Etapas 1–6. Empezar Etapa 7 desde `transition_appointment` ya existente en Etapa 2. Si una prueba LIVE de Etapa 6 falla, aislar el caso reproducible y corregir esa frontera concreta, sin crear un segundo sistema paralelo.

---

## Extensión 6.1 — Dentición temporal/mixta real + supernumerarios

**Estado:** `FINALIZADA_EN_CODIGO / DO_NOT_REIMPLEMENT`

### Cambios incorporados

1. Se elimina la dentición mixta fija como fuente clínica. `MIXED_DENTITION_SITES` modela cada sitio de recambio temporal → sucesor permanente.
2. La edad solo sugiere el modo temporal/mixto; la presencia real se confirma por pieza.
3. Se añaden estados `unerupted`, `retained`, `impacted` y `congenitally_missing`, además de exfoliación/erupción ya existentes.
4. El panel pediátrico diferencia morfología de incisivo central/lateral, canino, premolares, molares y molares temporales; temporales y permanentes pueden coexistir visualmente en el mismo sitio.
5. Las entidades pediátricas persistidas se rehidratan en el panel mediante `initialEntities`; se elimina la dependencia funcional del antiguo mapa local de drafts.
6. Se añade `SUPERNUMERARY_TOOTH` sin inventar números FDI. La pieza usa identidad propia, ancla FDI posicional y atributos clínicos.
7. Se admite código ISO 10394 opcional de dos caracteres, pero Denty no autogenera semántica normativa sin validación del estándar completo.
8. Cada supernumerario puede tener caries/restauración/endo/corona/extracción enlazadas por `parentId` y `toothIdentityKey`.
9. No se necesita nueva tabla SQL: se reutilizan `odontogram_entities.attributes_json`, `parent_id`, `arch` y el batch transaccional Stage 2/6.

### Pendiente exclusivamente de validación

- `S6-LIVE-001…006`: continúan vigentes del cierre original.
- `S6-LIVE-007`: E2E navegador de temporal, mixta dinámica, coexistencia, reload/snapshot y múltiples supernumerarios.
- `S6-LIVE-008`: validar semántica exacta de designación ISO 10394 con acceso normativo antes de cualquier autogeneración de códigos.

### Gates observados después de 6.1

- `stage6-dentition-engine-runtime`: PASS.
- `stage6-dentition-ui-contract`: PASS.
- `pediatric-numbering-regression`: PASS.
- Stage 1–6 contracts: PASS.
- Architecture gate: PASS.
- API parity: 201/201 PASS.
- Pipeline self-check: PASS.
- 6/6 archivos TS/TSX principales tocados: transpilación sintáctica PASS.
- Full Node 24 install/typecheck/unit/build: sigue pendiente en `S6-LIVE-006`.

### Regla de continuidad

No volver a crear plantillas pediátricas rígidas ni codificar supernumerarios como FDI ficticios. Cualquier vista futura debe consumir el catálogo anatómico/identidad dental de esta extensión.
