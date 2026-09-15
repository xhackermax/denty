# Agenda V12 Operativa

Agenda V12 anade una capa de operacion diaria sobre Agenda V11: movimiento validado, duracion editable, bloqueos, lista de espera, cancelacion, reprogramacion, cascada y planificacion automatica desde el plan clinico.

## Operacion diaria

- Mover o reprogramar citas valida turno, solapes de doctor, gabinete, ausencias y bloqueos.
- Cambiar duracion recalcula `end_time`, conserva trazabilidad y evita crear conflictos.
- Cancelar una cita marca `status: cancelada` y registra el cambio en `appointmentMoves`.
- La lista de espera propone pacientes compatibles para cubrir huecos liberados.
- Los bloqueos de agenda pueden aplicarse a clinica, profesional, gabinete o sede.

## Plan clinico

La planificacion automatica lee el orden clinico de `clinicalPlanGraph`, crea citas secuenciales para los tratamientos pendientes y respeta visitas multiples por tratamiento.

## Seguridad y trazabilidad

Las mutaciones operativas quedan auditadas localmente en `appointmentMoves`. Los permisos fuertes, overrides con autorizacion y sincronizacion externa quedan reservados para la futura capa backend.
