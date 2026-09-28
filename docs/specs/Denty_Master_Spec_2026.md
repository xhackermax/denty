# Denty — Especificación Maestra 2026

**Versión:** 2026.09-master  
**Estado:** living_specification

## Visión
Sistema operativo dental integral, clínicamente orientado y con Supabase/Postgres como fuente canónica, capaz de acompañar el recorrido completo del paciente desde la entrada en clínica hasta diagnóstico, planificación, consentimiento, presupuesto, tratamiento, cobro, mantenimiento y seguimiento.

## Principios de producto
- Minimalista, rápido y clínicamente natural
- Menos botones y más flujos contextuales
- Mobile-first y responsive
- Una sola fuente de verdad por dominio
- Auditoría y versionado de acciones clínicas y económicas
- Datos clínicos/operativos server-authoritative con sincronización Realtime entre dispositivos; un modo offline editable solo se considerará implementado cuando exista outbox y reconciliación explícitos
- Preparado para Supabase como capa de identidad, sincronización, realtime y almacenamiento
- IA/voz como interfaz de acciones estructuradas, nunca como sustituto del motor clínico determinista
- Confirmación para acciones sensibles
- No inventar diagnósticos, tratamientos, citas ni datos clínicos

## Flujo clínico obligatorio
paciente → anamnesis_y_exploracion → odontograma_y_periodoncia → diagnostico → plan_de_tratamiento → consentimientos_informados → presupuesto → firma_presupuesto → citas → acto_clinico → cobro → documentacion → mantenimiento_y_recall

## Patients
**Estado:** `core`

- Ficha única de paciente
- Número de ficha
- Datos personales y administrativos
- Origen del paciente y atribución de campaña
- Timeline clínica y administrativa
- Búsqueda global
- Archivar/borrar según permisos y reglas de conservación
- Importación CSV/TSV/JSON/XLSX desde sistemas previos
- Acceso rápido a odontograma, documentos, agenda, plan y cobros

## Odontogram
**Estado:** `core_critical`

- Odontograma multicapa
- Superficies mesial, distal, vestibular, palatino/lingual y oclusal/incisal
- Hallazgos, diagnósticos, existente, planificado y completado
- Estados visuales: correcto azul, insatisfactorio azul con borde rojo, pendiente rojo, sano final verde
- Caries, restauraciones, endodoncia, pernos, coronas, implantes, ausencias, fracturas y trauma
- Prótesis fija, puentes dentosoportados, implantosoportados y mixtos
- Prótesis removible
- Odontograma infantil e interceptivo
- Radiología y pruebas diagnósticas asociables
- Snapshots históricos y versionado
- Undo/redo
- Inspector contextual
- Leyenda contextual/oculta
- Renderizado SVG
- Compatibilidad con datos legacy

**Reglas:**
- No mostrar letras de superficies permanentemente si entorpecen la interfaz.
- Odontograma restaurador separado del periodontograma.
- Puentes y removibles deben representarse gráficamente con semántica protésica correcta.

## Periodontal
**Estado:** `core`

- Seis puntos por diente
- Profundidad de sondaje
- Retracción/recesión
- Movilidad
- Furca
- Sangrado
- Supuración
- Placa
- Resumen de bolsas >=4, >=5 y >=6 mm
- Entrada rápida y futura entrada continua por voz

## Treatment Planning
**Estado:** `core_critical`

- Árbol clínico vivo
- Planes A/B/C y alternativas económicas
- Dependencias entre tratamientos
- Jerarquía de fases
- Subramas protésicas, quirúrgicas y de mantenimiento
- Crear presupuesto desde el plan
- Generar citas necesarias desde el plan
- Vincular consentimientos, laboratorio, pagos y mantenimiento

## Budgets And Consents
**Estado:** `core_critical`

- Presupuesto detallado por fase, diente/zona y tratamiento
- PDF profesional
- Firma manuscrita digital
- Versionado e inmutabilidad tras firma
- Consentimientos informados ligados a tratamientos
- Bloqueo del avance si faltan consentimientos obligatorios
- Flujo plan -> consentimientos -> presupuesto -> firma -> citas

## Agenda
**Estado:** `core_critical`

- Agenda por doctor y por horas
- Intervalo configurable
- Crear cita tocando/clicando hueco vacío
- Copiar/pegar mediante pulsación larga
- Bloqueos, vacaciones y ausencias
- Duración por tipo de tratamiento
- Recursos/gabinetes necesarios
- Sincronización realtime
- Estados de asistencia
- Motor de disponibilidad
- Reagendado automático
- Lista de espera futura
- Recalls y mantenimiento

## Reception And Waiting Room
**Estado:** `next_implementation`

- Sala de espera en vivo
- Recepción marca llegada, espera, paso a gabinete, finalización y ausencia
- Doctor recibe aviso realtime de paciente esperando
- Registro automático de timestamps
- Tiempo de espera y tiempo de gabinete
- Métricas de puntualidad, duración, asistencia y no-show

## Patient Portal
**Estado:** `next_implementation`

- Próximas citas
- Historial de citas
- Reagendar citas
- Tratamientos
- Presupuestos
- Consentimientos y firmas pendientes
- Recetas
- Documentos habilitados
- Facturas
- Historial de pagos con fecha
- Saldo pendiente
- Notificaciones

## No Show And Rescheduling
**Estado:** `next_implementation`


**Reglas:**
- El paciente nunca edita libremente la agenda.
- Solo puede elegir slots autorizados.
- Mostrar inicialmente varias alternativas.
- Revalidar antes de confirmar.
- Evitar dobles reservas mediante operación atómica.

## Documents
**Estado:** `next_implementation`

- Repositorio documental único por paciente
- Buscador global por paciente
- Odontogramas
- Periodontogramas
- Planes
- Presupuestos
- Consentimientos
- Recetas
- Informes
- Justificantes médicos
- Facturas
- Recibos
- Pagos y justificantes
- Fotografías
- Radiografías
- Laboratorio
- Documentos externos
- Versionado
- Auditoría

## Payments And Finance
**Estado:** `core_plus_next`

- Historial de pagos por paciente con fecha
- Efectivo y tarjeta
- Pagos parciales
- Anticipos
- Deuda pendiente
- Facturas y recibos
- Devoluciones según permisos
- KPIs financieros claros
- Producción por doctor
- Producción por tratamiento
- Objetivos de facturación
- Gráficos y tablas
- Balances de laboratorio
- Conciliación futura

## Laboratory
**Estado:** `core_plus`

- Múltiples laboratorios
- Trabajos por paciente
- Fecha envío/recepción
- Estados
- Tareas de recibir laboratorio
- Saldo por laboratorio
- Vinculación a plan, cita y prótesis

## Prescriptions
**Estado:** `core_plus`

- Crear receta desde tareas o ficha
- Nombre comercial
- Datos completos de paciente, clínica y odontólogo
- Historial y borradores
- Auditoría
- Impresión con espacio para firma
- Lista de medicamentos de España
- Preparación para receta electrónica privada futura

## Staff
**Estado:** `core_plus_next`

- Usuarios y roles
- Fichaje entrada/salida
- Correcciones auditadas
- Reinicio diario
- Horarios
- Turnos
- Vacaciones
- Bajas/ausencias
- Permisos configurables por administrador

## Marketing And Communications
**Estado:** `core_plus_future`

- Origen del paciente: declarado y atribución por campaña/UTM
- Campañas Instagram/Facebook/Google
- KPIs de captación
- Comunicaciones
- Recordatorios de cita
- Confirmación/no puedo asistir
- Notificaciones del portal
- Lista de espera automática futura
- Recalls automáticos

## Analytics
**Estado:** `core_plus`

- KPIs financieros
- Producción por doctor
- Producción por tratamiento
- Conversión de presupuestos
- Cobrado vs pendiente
- No-show rate
- Tiempo medio de espera
- Duración real de citas
- Puntualidad
- Objetivos
- Campañas
- Speeding/count-up text al entrar en viewport mediante scroll

## Tasks
**Estado:** `core`

- Crear paciente
- Cobrar
- Crear cita
- Recibir laboratorio
- Hacer receta
- Tareas clínicas y administrativas contextuales

## Voice And Ai
**Estado:** `strategic`


## Auth And Roles
**Estado:** `next_implementation`


## Supabase
**Estado:** `next_implementation`


## Multi Clinic
**Estado:** `architecture_required`

- clinic_id en entidades relevantes
- Una organización puede contener múltiples centros
- Agenda, caja, permisos y configuración separables por centro
- Profesionales pueden pertenecer a uno o varios centros

## Ui Ux
**Estado:** `continuous`


## Data And Backup
**Estado:** `core_architecture`

- Importación CSV/TSV/JSON/XLSX
- Número de ficha preservable
- Backups locales
- Sincronización
- Auditoría
- Migraciones versionadas
- Integridad y checksums donde proceda

# Roadmap

## P0_next

- Unificar modelo de datos y eliminar fuentes duplicadas
- Supabase foundation: Auth, profiles, clinics, memberships, RLS
- Login principal y sesiones
- Selector rápido de usuarios solo en desarrollo
- Roles Admin / Dentista / Secretaría / Paciente
- Permisos reales frontend + backend + RLS
- Sala de espera realtime y estados de cita
- Portal Mi Denty inicial
- No-show -> notificación -> reagendado
- Motor de disponibilidad con reserva atómica
- Centro documental y exportación selectiva PDF

## P1_clinical_completion

- Cerrar pipeline odontograma -> diagnóstico -> plan -> consentimientos -> presupuesto -> citas
- Historial/versiones de odontograma
- Periodontograma completo
- Árbol clínico A/B/C
- Firma y versionado robusto de presupuestos/consentimientos
- Registro clínico por cita
- Vinculación imágenes/RX/CBCT por diente y tratamiento

## P1_operations

- Datáfono integrado mediante Denty Payments
- Pagos parciales, anticipos y devoluciones
- Finanzas KPI y producción
- Laboratorios múltiples y saldos
- Fichaje, ausencias, turnos y vacaciones
- Recordatorios y confirmación de citas

## P2_intelligence

- Oye Denty con wake word local
- NLU contextual más inteligente
- Dispatcher único para acciones reales
- Escucha ambiental clínica opcional
- Memoria editable por profesional
- Propuestas de tratamientos/alternativas sin ejecución automática
- Detección de datos faltantes
- Agenda inteligente y lista de espera automática

## P2_patient_experience

- Portal completo
- Formularios previos a consulta
- Firma remota autorizada cuando proceda
- Reserva online
- Notificaciones multicanal
- Documentos y pagos
- Recalls/mantenimiento

## P3_future

- VERI*FACTU/fiscalidad según requisitos vigentes en el momento de implementación
- Receta electrónica privada conforme a proveedor/normativa aplicable
- IA radiográfica como módulo separado y validado
- Kiosco de recepción/check-in
- Integraciones externas
- Conciliación bancaria
- Automatización avanzada de campañas y recalls

# Quality gates

- Typecheck
- Lint
- Tests unitarios
- Tests de integración
- Tests end-to-end de flujos críticos
- Pruebas de aislamiento paciente-paciente
- Pruebas de aislamiento clínica-clínica
- Pruebas de permisos por rol
- Pruebas de doble reserva
- Pruebas de versionado documental
- Pruebas de integridad de exportación
- Responsive móvil/tablet/escritorio
- Sin botones falsos o acciones que no persisten

# Qué debe ser Denty

Denty no debe ser una colección de pantallas. Debe ser un sistema clínico-operativo continuo donde cada acción relevante conoce al paciente, profesional, centro, cita, tratamiento, documento, estado económico y siguiente paso.

- Un dentista puede completar gran parte de una visita sin abandonar el flujo clínico.
- Recepción conoce en tiempo real dónde está cada paciente.
- El paciente puede resolver citas, documentos y pagos desde su cuenta.
- La clínica puede auditar quién hizo qué y cuándo.
- La información se introduce una vez y se reutiliza en todo el sistema.
- La voz puede ejecutar acciones reales verificables.
- La aplicación sigue siendo rápida y comprensible aunque crezca.