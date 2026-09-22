# Recuperación selectiva del historial de Denty

Fecha: 2026-09-21

## Principio

El historial se usa como especificación de comportamiento, no como fuente para copiar deuda técnica.
Cada capacidad recuperada debe aterrizar en la capa objetivo de Denty V3 y pasar sus gates de fase.

## Recuperado ahora en dominio puro

| Capacidad histórica útil | Evidencia histórica | Aterrizaje V3 |
|---|---|---|
| Ciclo odontograma por doble clic/toque | 2.3.7: realizado → insatisfactorio → pendiente → realizado | `domain/odontogram.cycleClinicalState` |
| Puente por extremos, en ambas direcciones | `verify_bridge_range_selection` | `bridgeTeethFromEndpoints` |
| Puente cruzando línea media | Bug conocido del nativo + criterio V3 | orden real de arcada 18→28 / 48→38 |
| Implante → pilar → corona | entidad V3 histórica | `createImplantStack` con `parentId` |
| Endodoncia → perno → corona | flujo clínico histórico | `createEndoPostCrown` |
| Implante incompatible con caries activa | regla visual/clínica 2.3.x | `assertNoImplantCariesConflict` |
| Odontograma → plan → presupuesto | pipeline clínico 2.3.6 | `clinicalPipelineState` por versiones |
| Presupuesto presentado no se pisa | pipeline 2.3.6 | `budgetRevisionRequired` |
| Agenda 08:30 y altura proporcional | deuda/aceptación V3 | `layoutDay` por minutos reales |
| Solapes doctor/gabinete y bloqueos | motor agenda v12 | `findConflicts` / `canMove` |
| Espera: amarillo, rojo >15, verde gabinete, azul NPA | agenda aprobada | `waitingVisualState` |
| Plan con dependencias sin ciclos | motor plan histórico | `validateGraph` / `orderedPlan` |
| Categorías del presupuesto | `BudgetFromPlanSelector` | regex portados a `budgetCategoryForTreatment` |
| Bono cada 3 partidas, máx. 5 € | juegos/agenda históricos | `rewardCents` |
| Ranking anonimizado | juegos históricos | `patientLabel` |
| Agenda own/all | política histórica | `can`, `canAccessAppointment` |
| Fichaje IN/OUT | control horario histórico | `nextAttendanceAction` |
| Comparación de snapshots odontograma | motor 2.3.x | `compareOdontogramSnapshots` sin falsos cambios por orden de claves |
| Fase clínica sugerida | motor de plan 2.3.x | `clinicalPhaseForTreatment` en dominio, no en UI |
| Kennedy conservador | alternativas removibles 2.3.x | `suggestKennedyClass`, siempre sujeto a confirmación profesional |
| Máquinas de estado transversales | servicios clínicos/operativos | factura, receta, plan, alternativa, documento y bono en `domain/state-machines` |
| Permiso por subruta | navegación/guards históricos | `requiredPermissionForRoute` con prefijo más específico |

## Recuperar en fases posteriores

### F4 · Datos y autenticación
- `preview → planToken → execute` de voz se preserva como patrón de seguridad, pero su implementación queda en F12.
- `expectedVersion` + 409 con recarga/reintento.
- Una única conexión SSE por sesión con invalidación fina.
- Sesión y RBAC sin fallback local silencioso.

### F5/F6 · Flujo clínico
- Inicio orientado a “qué toca ahora”, no a una pared de KPIs.
- Ficha profesional con odontograma visible y ramas progresivas para historia, plan, documentos y administración.
- Hallazgo ≠ diagnóstico ≠ tratamiento.
- Múltiples tratamientos simultáneos por diente.
- Snapshots que no borran historia; cambios posteriores invalidan plan/presupuesto por versión.
- Ruta clínica hasta terminar solo con pasos reales y orden clínico.

### F7 · Agenda
- Vista principal de pipeline: Llegarán → En sala → En gabinete → Finalizadas.
- Mantener vista exacta por doctores/horas para tocar huecos, mover y redimensionar.
- Pulsación larga / menú accesible: copiar, extender, cancelar y pegar con validación de colisiones.
- Lista de espera, bloqueos, reprogramación y sugerencias en cascada.

### F8/F9 · Operativa
- Tareas rápidas: crear paciente, cobrar, dar cita, recibir laboratorio.
- Fichaje, turnos, vacaciones, bajas y permisos integrados.
- Documentos/consentimientos con firma y auditoría.
- Importación XLSX con número de ficha, validación por fila y resumen de errores.

### F12 · Voz
- Router transversal para paciente, agenda, odontograma, plan, presupuesto, cobro, laboratorio y navegación.
- Una orden puede ejecutar varias herramientas enlazadas cuando sea seguro.
- Acciones sensibles requieren preview/confirmación y token firmado; nunca replantear texto durante `execute`.
- Parser local primero; modelo externo solo para lenguaje no entendido.

## Funciones que NO se recuperan
- `localStorage` clínico/local-first inseguro.
- Login local que concede ADMIN.
- `prompt`/`confirm` del navegador.
- CSS global/minificado, estilos inline y runtime visual legacy.
- Iframe de juegos con `allow-scripts allow-same-origin`.
- Monorepo/Prisma dentro del ZIP frontend de Vercel.
