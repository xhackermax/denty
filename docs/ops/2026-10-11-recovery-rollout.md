# Recuperación de pacientes · bitácora de arranque (11/10/2026)

## Alcance del plan recibido

**Fase 0:** validar Vercel, Supabase, proveedor de comunicaciones y pruebas internas.
**Fase 1:** lista de revisiones pendientes, planes sin cita, presupuestos sin respuesta y seguimiento trazable.
**Fases 2 y 3:** entrada de WhatsApp y bajas reales; resultados atribuidos a citas, no simples coincidencias.

La entrega inicial de este PR es **fase 1A, solo lectura**. No ejecuta envíos ni marca pacientes como contactados.

## Comprobaciones realizadas

- La cuenta conectada a Supabase permite consultar el proyecto real. El 11/10 se observaron 2 registros en `patient_recalls`, 84 ítems de plan y 14 presupuestos. Estos son recuentos brutos, **no** pacientes recuperables; el worklist aplica sus propios filtros.
- Supabase acepta sintácticamente la migración `20261011010000_recovery_worklist_phase1.sql` ejecutada dentro de `BEGIN … ROLLBACK`; no se ha activado antes del merge.
- Consulta de despliegues Vercel para el proyecto `denty-repo`: **403 Forbidden** para el scope `xhackermax`. No se puede certificar el último commit desplegado ni los errores/variables de producción con esa credencial. La CLI de Vercel no está disponible en este entorno. Es un bloqueo real de fase 0, no un éxito.
- El documento fuente confirma que `communication-outbox` es saliente, que falta un webhook de entrada y que aún no hay una ejecución programada comprobada. No se ha activado ningún cron ni enviado mensajes de prueba.

## Criterios de inclusión de 1A

- **RECALL**: revisión `pending/contacted` vencida o próxima en 30 días, sin otra cita futura.
- **PLAN**: ítem `PLANNED` de un plan con **presupuesto firmado**, sin cita futura vinculada al ítem. Los planes en borrador no se interpretan como aceptados.
- **BUDGET**: `PRESENTED/SENT` con fecha explícita de presentación/envío y más de tres días sin respuesta, sin seguimiento futuro aplazado y sin estar caducado. `created_at` no se usa falsamente como fecha de envío.
- **Una fila por paciente**, priorizando vencimientos y tratamientos, con etiquetas para motivos adicionales.
- La fase 1A está protegida por el permiso `communications.read` y filtrada por `clinic_id` en PostgreSQL.

## Siguiente incremento 1B

1. Persistir intentos de contacto, responsable, resultado y fecha del siguiente paso en `recovery_contact_attempts` con RLS y auditoría.
2. Acciones explícitas: llamar, posponer, descartar con motivo y reservar desde `next-slot-finder` vinculando el origen.
3. Generar revisiones desde una periodicidad clínica acordada, sin presuponer que todos los tratamientos requieren el mismo intervalo.
4. Filtrar por sede donde exista una relación fiable, sin inventar una sede para planes o presupuestos sin `site_id`.

## Bloqueos para cerrar la fase 0

- Restablecer acceso al scope correcto de Vercel y confirmar el commit de producción, env y errores.
- Elegir proveedor homologado de WhatsApp Business y validar tratamiento de datos y contratos.
- Configurar worker y webhook real en entorno controlado; usar **teléfonos internos**, no pacientes, para pruebas de entrega, lectura y baja.
- No habilitar automatismos publicitarios hasta poder procesar oposiciones por el canal real.
