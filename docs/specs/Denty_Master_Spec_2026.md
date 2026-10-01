# Denty — Especificación Maestra 2026

Versión: `2026.09-master`. Documento de producto; los estados reales de implementación se consultan en el [inventario maestro](../../DENTY-INVENTARIO-MAESTRO-TOTAL-2026-09-28.md).

## Principios

- Interfaz minimalista, contextual y responsive; introducir datos una vez y reutilizarlos.
- Supabase/Postgres es la fuente canónica de identidad y datos; Realtime sincroniza dispositivos.
- Versionar y auditar acciones clínicas y económicas.
- Offline editable requiere outbox y reconciliación explícitos antes de considerarlo implementado.
- Voz/IA solicita acciones estructuradas al motor determinista, con permisos y confirmación para operaciones sensibles.
- No inventar diagnósticos, tratamientos, citas ni datos clínicos.

## Flujo clínico obligatorio

Paciente → anamnesis/exploración → odontograma/periodoncia → diagnóstico → plan → consentimientos → presupuesto → firma → citas → acto clínico → cobro → documentación → mantenimiento/recall.

## Funcionalidad

| Área                         | Requisitos                                                                                                                                                                                                                      |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pacientes                    | Ficha única, número conservable, datos administrativos, origen/atribución, búsqueda, timeline e importación CSV/TSV/JSON/XLSX; archivo según permisos y retención.                                                              |
| Odontograma                  | Multicapa por superficie, hallazgos y ciclo clínico, caries/restauración/endo/perno/corona/implante/ausencia/trauma; prótesis fija/removible e infantil, radiología, SVG, inspector, leyenda contextual, snapshots y undo/redo. |
| Periodoncia                  | Seis puntos por diente; sondaje, recesión, movilidad, furca, sangrado, supuración y placa; bolsas ≥4/5/6 mm; entrada rápida y futura entrada por voz.                                                                           |
| Plan                         | Árbol clínico A/B/C, alternativas económicas, dependencias, fases y subramas; derivar presupuesto/citas y vincular consentimientos, laboratorio, pagos y mantenimiento.                                                         |
| Presupuestos/consentimientos | Líneas por fase/diente/tratamiento, PDF, firma manuscrita, versiones inmutables; impedir avance si faltan consentimientos o firma.                                                                                              |
| Agenda                       | Doctor/hora, intervalos, crear en hueco vacío, copiar/pegar con pulsación larga, bloqueos/ausencias, duración y recursos, Realtime, disponibilidad, asistencia, reagendado y recalls.                                           |
| Recepción                    | Llegada → espera → gabinete → finalización/ausencia; timestamps y avisos en vivo al doctor; métricas de espera, gabinete, puntualidad y no-show.                                                                                |
| Portal                       | Citas/historial/reagendado, tratamientos, presupuestos, consentimientos y firmas, recetas, documentos autorizados, facturas, pagos fechados, saldo y notificaciones.                                                            |
| Reagendado                   | Paciente elige solo slots autorizados; ofrecer alternativas, revalidar y reservar atómicamente evitando doble reserva.                                                                                                          |
| Documentos                   | Repositorio por paciente, búsqueda, versiones y auditoría de odontogramas, planes, presupuestos, consentimientos, recetas, informes, facturas/recibos, imágenes/RX y laboratorio.                                               |
| Finanzas                     | Efectivo/tarjeta, pagos parciales, anticipos, deuda, facturas/recibos, devoluciones autorizadas, KPIs/objetivos, producción por doctor/tratamiento, laboratorio y futura conciliación.                                          |
| Laboratorio                  | Múltiples laboratorios, trabajos/estados por paciente, envío/recepción, saldo y vínculo a plan, cita y prótesis.                                                                                                                |
| Recetas                      | Nombre comercial, datos de paciente/clínica/odontólogo, borradores/historial, auditoría, impresión con firma y medicamentos de España; receta electrónica privada futura.                                                       |
| Personal                     | Roles/permisos, fichaje, correcciones auditadas, reinicio diario, horarios, turnos, vacaciones y ausencias.                                                                                                                     |
| Marketing/comunicaciones     | Origen declarado y UTM, campañas, captación, recordatorios/confirmaciones, portal, recalls y futura lista de espera automática.                                                                                                 |
| Análisis                     | Producción, conversión, cobrado/pendiente, no-show, espera/duración/puntualidad, objetivos y campañas; count-up al entrar en viewport.                                                                                          |
| Tareas                       | Crear paciente/cita/receta, cobrar y recibir laboratorio mediante flujos persistentes y contextuales.                                                                                                                           |
| Multiclínica                 | `clinic_id`, organización con varias sedes, agenda/caja/permisos/configuración separables y profesionales en uno o varios centros.                                                                                              |
| Datos                        | Migraciones, importación, fichas preservadas, sincronización, auditoría, backups e integridad/checksums.                                                                                                                        |

## Reglas clínicas y de datos

- Correcto azul; insatisfactorio azul con borde rojo; pendiente rojo; sano final verde.
- Separar odontograma restaurador y periodontograma; representar puentes/removibles con semántica protésica correcta.
- Mostrar superficies y detalles cuando aportan información, sin saturar la vista con etiquetas permanentes.
- La aprobación/firma no permite mutar documentos históricos; los cambios requieren versiones nuevas.
- Autorización en frontend, backend y RLS; aislar clínica y paciente.

## Roadmap de producto

Estas prioridades describen objetivos; no ordenan reimplementar trabajo ya cerrado.

| Prioridad       | Alcance                                                                                                                                                                              |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P0              | Fuente única, Auth/perfiles/membresías/RLS, sesiones y permisos; recepción Realtime, portal inicial, no-show/reagendado, reserva atómica y exportación PDF selectiva.                |
| P1 clínico      | Pipeline completo, historial odontograma, periodoncia, planes A/B/C, firma/versiones, registro por cita y vínculo imágenes/RX/CBCT.                                                  |
| P1 operativo    | Denty Payments, parciales/anticipos/devoluciones, producción/finanzas, laboratorios/saldos, fichaje/turnos/ausencias y recordatorios.                                                |
| P2 inteligencia | Wake word local, NLU contextual, dispatcher único, escucha ambiental opcional, memoria editable por profesional, propuestas sin ejecución automática y detección de datos faltantes. |
| P2 paciente     | Portal completo, formularios previos, firma remota autorizada, reserva online, multicanal, documentos/pagos y recalls.                                                               |
| P3              | Fiscalidad/VERI*FACTU vigente, receta electrónica privada, IA radiográfica separada y validada, check-in, integraciones, conciliación y automatización avanzada.                     |

## Quality gates

- Typecheck, lint, pruebas unitarias/integración y E2E de flujos críticos.
- Aislamiento paciente-paciente y clínica-clínica; permisos por rol y doble reserva.
- Versionado documental, integridad de exportación y responsive móvil/tablet/escritorio.
- Las acciones visibles persisten; sin botones que simulan éxito.
