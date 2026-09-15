# Agenda V12 Operativa Design

## Objetivo

Convertir Agenda V11 en una agenda operativa diaria capaz de mover, redimensionar, bloquear, cancelar, reprogramar y planificar citas complejas sin perder seguridad clínica ni coherencia con pacientes, doctores, gabinetes y plan clínico.

## Alcance

Agenda V12 cubre siete capacidades:

1. Drag and drop de citas entre hora, doctor y gabinete.
2. Resize de duración desde la propia cita.
3. Validación de disponibilidad contra turnos, ausencias, bloqueos, gabinete y solapes.
4. Lista de espera inteligente para llenar huecos liberados.
5. Cancelación y reprogramación con propuestas reales.
6. Reprogramación en cascada cuando una cita movida afecta a citas relacionadas.
7. Planificación automática de tratamientos de varias citas desde el plan clínico.

La preview sigue siendo local y sin backend real. Toda la persistencia continúa en el modelo local existente y los cambios se sincronizan con el bundle legacy y la app Next.

## Modelo de Datos

Se añaden colecciones locales conservadoras:

- `agendaBlocks[]`: bloqueos por doctor, gabinete, sede o clínica.
- `appointmentMoves[]`: auditoría clínica de movimientos, resize, cancelación y cascada.
- `waiting_list[]`: ya existe en estado de portal paciente; se normaliza para uso clínico con prioridad y compatibilidad.

Se amplían citas:

- `duration_minutes`: duración fuente cuando `end_time` no baste.
- `cabinet_id`: gabinete real asignado.
- `site_id`: sede cuando exista.
- `treatment_plan_id`, `clinical_item_id`, `sequence_index`, `sequence_total`: citas de tratamientos multi-sesión.
- `cancelled_at`, `cancel_reason`, `rescheduled_from_id`: trazabilidad de cancelación y reprogramación.

## Motor de Disponibilidad

El motor de agenda vive en `apps/legacy-preview/logic.js` para que sea testeable sin DOM. Debe exponer:

- `agendaSlotKey({date,start_time,employee_id,cabinet_id})`
- `agendaValidateMove(db, appointment, patch)`
- `agendaMoveAppointment(db, appointmentId, patch, actor)`
- `agendaResizeAppointment(db, appointmentId, duration_minutes, actor)`
- `agendaCreateBlock(db, input, actor)`
- `agendaCancelAppointment(db, appointmentId, reason, actor)`
- `agendaFindOpenSlots(db, request)`
- `agendaWaitingListMatches(db, gap)`
- `agendaCascadeSuggestions(db, appointmentId, patch)`
- `agendaPlanClinicalSequence(db, patientId, options)`

Toda mutación debe registrar `appointmentMoves[]` y actualizar `updated_at`.

## UI

La agenda diaria mantiene la capa visual V11, pero gana una barra operativa:

- Modo `Mover`: las tarjetas aceptan drag and drop en vista día.
- Modo `Duración`: la tarjeta muestra controles de `-10` y `+10` minutos.
- Modo `Bloquear`: seleccionar hueco crea bloqueo de doctor/gabinete/sede.
- Panel de huecos: cuando se cancela o libera un hueco, muestra pacientes compatibles de lista de espera.
- Panel de reprogramación: muestra huecos reales y el impacto temporal.
- Panel de cascada: lista citas relacionadas y acciones sugeridas.
- Panel de planificación clínica: toma tratamientos pendientes y propone citas secuenciales.

En móvil, si drag real no es cómodo, las mismas acciones deben poder hacerse con botones y selects.

## Reglas de Negocio

- Nunca guardar un movimiento inválido si hay solape de doctor, gabinete ocupado, ausencia o bloqueo.
- Permitir override solo si el usuario es administrador y queda registrado en auditoría; en esta fase local, el override se simula con el PIN de administrador ya existente.
- Lista de espera prioriza urgencia, compatibilidad por duración, doctor, sede y antigüedad.
- Cascada no modifica citas automáticamente; propone cambios y el usuario confirma.
- Plan clínico respeta dependencias: un tratamiento dependiente no se agenda antes del requisito.
- Tratamientos multi-cita usan duración del procedimiento si existe; si no, `settings.agenda.default_duration`.

## Pruebas

Se añaden pruebas de motor puro y pruebas estáticas de UI:

- Movimiento válido e inválido.
- Resize con conflicto.
- Bloqueos y vacaciones.
- Lista de espera para hueco liberado.
- Cancelación con trazabilidad.
- Sugerencias de cascada.
- Secuencia clínica multi-cita.
- UI con controles de mover, duración, bloqueos, lista de espera, cascada y plan clínico.

## Fuera de Alcance

- Sin integración con Google Calendar, Outlook ni WhatsApp real.
- Sin drag and drop multiusuario en tiempo real con backend.
- Sin IA remota obligatoria; las sugerencias son deterministas.
