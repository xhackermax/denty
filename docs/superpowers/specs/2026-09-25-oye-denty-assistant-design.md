# Oye Denty — Asistente dental virtual

Fecha: 2026-09-25. Estado: aprobado. Base: Denty v3 / Next.js 16.3.5.

## Decisión y ciclo de uso

- Autonomía B: asistente reactivo y proactivo asistido, con control del dentista.
- `Asistente activo` es opt-in. Wake word `Oye Denty` procesada localmente mientras Denty está visible.
- Activación abre conversación temporal; no hay que repetir wake word durante la sesión.
- Cerrar a los **45 segundos de inactividad**, reiniciados por cada turno, o con `gracias Denty`, `terminar` o la UI.
- Ocultar la página detiene escucha/audio; al volver, rearmar solo si sigue habilitado.
- NLU local resuelve órdenes simples; Realtime interpreta conversación/contexto complejo mediante herramientas tipadas.
- La proactividad produce notificaciones silenciosas, nunca voz espontánea por defecto.

## Arquitectura

| Componente                                  | Responsabilidad                                                                                                                   |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `AssistantProvider`                         | Estado global, activación, visibilidad, conversación, ejecución y confirmación.                                                   |
| `VisibilityGate`                            | `document.visibilityState`/`visibilitychange`; impedir audio o nuevas sesiones en segundo plano.                                  |
| `WakeWordEngine`                            | Interfaz desacoplada del proveedor, procesamiento local y liberación al ocultar/apagar. Verificar licencia, peso y soporte móvil. |
| `ConversationSessionManager`                | WebRTC, timeout, cierre y referencias de paciente/pantalla/diente/última acción.                                                  |
| `RealtimeSessionGateway`                    | Sesión Denty autenticada → `POST /v1/realtime/client_secrets` → credencial efímera en navegador.                                  |
| `ContextBroker`                             | Contexto mínimo por turno; consultas por herramienta, sin volcar historia clínica completa.                                       |
| `Denty Tool Registry`                       | Catálogo cerrado: Zod, riesgo, permisos, ejecución, auditoría y undo cuando aplique.                                              |
| `ActionPolicyEngine`                        | Validación y autorización antes de ejecutar cualquier herramienta.                                                                |
| `AssistantLearningStore` / `PatternLearner` | Preferencias operativas por profesional; evidencias, correcciones y confianza.                                                    |
| `ProactiveEngine`                           | Reglas deterministas por eventos y datos existentes; IA solo si hace falta interpretación semántica.                              |

Reutilizar `src/features/voice/local-nlu.ts`, `voice-router.ts`, `voice-executor.ts`, `voice-patient-resolver.ts` y `voice-command-bar.tsx`. Adaptar `LocalVoicePlan.actions` a `AssistantToolCall`; conservar los comandos y resolver de pacientes existentes.

## Máquina de estados

- `OFF`: sin micrófono.
- `ARMED`: wake word local.
- `CONNECTING` / `LISTENING`: apertura y conversación Realtime.
- `PROCESSING` / `EXECUTING`: interpretación y ejecución.
- `CONFIRMING`: operación sensible esperando aprobación explícita.
- `PAUSED_HIDDEN`: cero escucha mientras la página está oculta.
- `ERROR`: fallo recuperable; timeout cierra conversación y vuelve a `ARMED`.

## Herramientas propuestas

| Área        | Herramientas                                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------------------------------- |
| Contexto    | `navigation.open`, `navigation.patient`, `patient.search`, `patient.summary`, `odontogram.select_tooth`                   |
| Odontograma | `odontogram.set_state`, `odontogram.set_surfaces`, `odontogram.bridge`, `odontogram.removable`                            |
| Periodoncia | `periodontal.update`                                                                                                      |
| Plan        | `clinical.add_item`, `clinical.complete_item`, `clinical.mark_unsatisfactory`, `clinical.add_dependency`, `clinical.note` |
| Agenda      | `appointment.schedule`, `appointment.reschedule`, `appointment.arrive`, `appointment.no_show`                             |
| Presupuesto | `budget.sync`, `budget.open`, `budget.prepare_signature`                                                                  |
| Finanzas    | `payment.prepare`, `payment.record`                                                                                       |
| Laboratorio | `lab.transition`                                                                                                          |

La tabla describe alcance propuesto; cada capacidad exige una implementación real antes de anunciar éxito.

## Política de acciones

| Riesgo   | Comportamiento                                                                                                          |
| -------- | ----------------------------------------------------------------------------------------------------------------------- |
| Verde    | Navegar, consultar, seleccionar o preparar borradores: ejecutar si hay contexto y permiso.                              |
| Amarillo | Cambios reversibles de odontograma, periodoncia, plan o nota: feedback, auditoría y `Deshacer` seguro.                  |
| Rojo     | Cobros, borrado, firma/aceptación, cierre clínico irreversible o cambio de evidencia firmada: confirmación obligatoria. |

La IA usa los mismos permisos que la acción manual y no puede saltarse el motor ni mutar datos fuera del registry.

## Contexto y NLU

- Fast path con `planLocalVoiceCommand` solo si hay confianza suficiente, ninguna ambigüedad y todas las acciones tienen esquema conocido.
- Realtime para referencias como `lo mismo`, órdenes multidominio, consulta contextual o lenguaje abierto.
- Conservar referencias explícitas durante la sesión; al cambiar de diente, reutilizar solo la acción aplicable, no argumentos obsoletos.
- Si falta contexto o hay dos interpretaciones válidas, preguntar; nunca inventar IDs.
- Respuestas breves por audio durante conversación; listas y resultados extensos en la UI.

## Aprendizaje personal

- Scope: `clinicId + staffId`; fallback `clinicId + userId`.
- Activar tras **3 evidencias equivalentes**, exitosas, no corregidas y compatibles con reglas clínicas/de seguridad.
- Aprender alias, vocabulario, abreviaturas, duraciones y preferencias de flujo; no diagnósticos, reglas médicas universales ni datos identificables de pacientes.
- Activación silenciosa; correcciones reducen confianza y pueden desactivar la regla.
- `Ajustes > Denty AI > Mi aprendizaje`: listar tipo/valor/evidencias/confianza/fecha, editar, desactivar, borrar y restablecer.
- La memoria de un dentista no afecta a otro ni modifica pesos del modelo.

## Proactividad inicial

Notificaciones con `Ver`, `Preparar` y `Descartar`, derivadas de seis familias:

1. Presupuesto generado sin firma.
2. Historia médica incompleta antes de un acto clínico.
3. Espera superior al umbral.
4. Siguiente paso ya planificado pendiente tras completar otro.
5. Diagnóstico sin tratamiento asociado en el plan.
6. Documento pendiente de firma.

No mantener una sesión IA para revisar la clínica continuamente ni inventar tratamientos.

## Seguridad, persistencia y coste

- `OPENAI_API_KEY` solo servidor; nunca `NEXT_PUBLIC_OPENAI_API_KEY`. El navegador recibe una credencial efímera.
- Verificar actor `userId`, `clinicId`, `staffId` y permisos de la sesión antes de crear sesiones/ejecutar herramientas.
- Persistencia multi-tenant mediante el backend Denty canónico. Memoria efímera solo en pruebas aisladas.
- Auditoría por tool: actor/clínica/paciente, timestamp, argumentos normalizados, origen, riesgo, confirmación, resultado y error.
- Separar auditoría clínica de telemetría; minimizar contexto y no usar historia clínica para entrenamiento o memoria operativa.
- Reducir coste con wake local, timeout, NLU rápido y reglas por eventos; métricas de sesiones/minutos, ratio local/IA, tools y coste por clínica/día.

## Contratos propuestos

- `POST /api/assistant/realtime/session`; `GET/PUT /api/assistant/preferences`.
- `GET /api/assistant/learning`; `PATCH/DELETE /api/assistant/learning/:id`; `POST /api/assistant/learning/reset`.
- `POST /api/assistant/tool/execute`, `/api/assistant/tool/confirm` y `/api/assistant/feedback/correction`.
- `AssistantPreference`: scope `userId/clinicId/staffId?`, `assistantEnabled`, `wakeWordEnabled`, `conversationTimeoutSec`, `voiceReplies`.
- `LearnedPattern`: `id`, scope, `kind` (`ALIAS/DURATION/WORKFLOW/VOCABULARY`), `trigger`, `value`, `evidenceCount`, `correctionCount`, `confidence`, `active`, `createdAt`, `updatedAt`.
- `AssistantAuditEvent`: `id`, scope, `patientId?`, `sessionId?`, `source` (`LOCAL_NLU/REALTIME/PROACTIVE`), `tool`, `risk`, `arguments`, `confirmed`, `status` (`SUCCESS/FAILED/CANCELLED`), `createdAt`.

## UX y fallbacks

- Barra: interruptor, micrófono, estado, cierre e historial breve; ajustes `Denty AI` para tiempo, voz, aprendizaje y privacidad.
- Mostrar acción y confirmación de forma legible, no JSON técnico.
- OpenAI caído: mantener NLU/UI; avisar solo cuando una orden necesita IA.
- Wake fallido: micrófono manual. Permiso de micro denegado: texto mediante el mismo motor.

## Implementación y aceptación

Orden: [Foundation](../plans/2026-09-25-oye-denty-01-foundation.md) → [Realtime](../plans/2026-09-25-oye-denty-02-realtime.md) → [Aprendizaje](../plans/2026-09-25-oye-denty-03-learning.md) → [Proactividad](../plans/2026-09-25-oye-denty-04-proactivity.md) → [Hardening](../plans/2026-09-25-oye-denty-05-hardening.md).

- Tests de estados/visibilidad/timeout, riesgo, adaptación de herramientas y aprendizaje exacto tras tres evidencias.
- Integración de sesión autenticada, permisos, confirmación/cancelación, contexto y fallback.
- Regresión de NLU, pacientes, odontograma/periodoncia y almacenamiento clínico.
- E2E: activar, ocultar/volver, despertar, ejecutar verde/amarillo+undo, confirmar/cancelar rojo y cerrar por timeout.
- Aceptación: sin escucha oculta, secretos expuestos, mutaciones sin validación ni memoria compartida; degradación funcional ante fallos.

## Fuera de alcance

Wake en segundo plano/pantalla bloqueada, app nativa, diagnóstico/prescripción autónomos, aprendizaje global y fine-tuning con historias clínicas.

## Referencias

- [Realtime](https://developers.openai.com/api/docs/guides/realtime)
- [MCP y herramientas](https://developers.openai.com/api/docs/guides/realtime-mcp)
- [Conversaciones](https://developers.openai.com/api/docs/guides/realtime-conversations)
- [WebRTC](https://developers.openai.com/api/docs/guides/voice-webrtc)
