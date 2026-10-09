# Rendimiento clínico e incidencias: contrato de integración
## Fuentes canónicas
- `appointments`: visitas finalizadas por `staff_id` y pacientes únicos por doctor, con intervalo y sede.
- `clinical_treatment_executions`: actuaciones realmente ejecutadas, `treatment_category`, doctor, paciente, cita, `clinical_plan_item_id`; nunca contar presupuestos pendientes.
- `implant_placement_outcomes`: implantes colocados, intentos fallidos, fracasos posteriores y diferimientos separados.
- `clinical_incidents`: complicaciones y repeticiones con causa no determinada por defecto; enlazar al tratamiento, cita, implante o repetición de laboratorio.
- `attendance_punches`: calcular horas tras resolver eventos de corrección y emparejar entrada/salida; separar pausas y fichajes incompletos.
- `payments`: no atribuir `received_by` al doctor productor; atribución financiera por tratamiento ejecutado y desglose de presupuesto.
- `lab_reworks`: enlazar por `lab_rework_id` para no duplicar incidencias.
## Panel de Análisis
Filtros: clínica/sede, doctor, fecha inicio/fin, especialidad y categoría.
Tarjetas: pacientes únicos, visitas completadas, obturaciones, endodoncias, ortodoncia, implantes, ticket medio atribuible, cobertura de atribución, incidencias, repeticiones y horas fichadas.
Tabla por doctor con desglose por categoría y acceso a citas y tratamientos originales.
## Condiciones de aceptación pendientes
1. Completar una cita con tratamiento debe registrar una ejecución una sola vez; no inferir desde un plan.
2. El cierre de cita de implantes exige el resultado de cada implante planificado antes de pasar a COMPLETED.
3. El formulario de incidencias registra motivo, estado, doctor asociado, repetición y vínculos clínicos.
4. El panel consulta Supabase con RLS y permisos de analítica/finanzas existentes; las tasas nunca se calculan sin denominador comparable.
5. Horas de fichaje deben excluir pausas y eventos anulados/corregidos, sin inventar horas faltantes.
6. Ticket medio por doctor no es ingreso de caja: sólo se calcula cuando los importes están atribuidos; mostrar cobertura.
7. Añadir invalidación Realtime para las tablas nuevas y pruebas de permisos, persistencia, correcciones y duplicados.
