# Agenda V11 · capa de estado operativo

La V11 no crea un módulo de sala de espera. Los estados operativos se representan directamente sobre cada cita de la agenda.

## Colores

- Neutro: cita programada / confirmada.
- Amarillo: `espera`, desde la llegada hasta 15 minutos inclusive.
- Rojo: `espera` cuando han transcurrido más de 15 minutos desde `arrived_at`.
- Verde: `gabinete`.
- Azul: `ausente` / `NPA` / `no presentado`.
- Atenuado: realizada o cancelada.

La transición amarillo → rojo se calcula desde la hora real de llegada y la agenda se refresca automáticamente mientras está abierta.

## Roles

- `admin` y `reception` (recepción / secretaría): visualizan simultáneamente todas las agendas.
- `dentist`: visualiza exclusivamente el profesional asociado mediante `user.employee_id`.

Recepción/secretaría puede marcar `Ha llegado`; el cambio se persiste en la cita y se propaga a las demás sesiones mediante el canal de sincronización compartido. El doctor correspondiente ve el estado en su propia agenda.

## Persistencia

Las citas conservan `arrived_at`, `chair_at`, `absent_at`, `completed_at` y `updated_at` durante las migraciones de la base local.
