# Auditoría adversarial de Denty y del odontograma — 4 de octubre de 2026

**La matriz no está aprobada.** Hay fallos reproducidos de borradores, guardado, carga de familias clínicas, validación y persistencia. Esta rama añade pruebas y propuestas de solución; no modifica el código de producción.

Código evaluado: `main` en `2b54811a1f88fd8fe4939051266a88bc07a2dc64`. Node 24.19, Chromium 153 y Next en compilación de producción. Se usa la aplicación real con un sustituto de Supabase. Los tests SQL ejecutan funciones originales y restricciones pertinentes de migraciones en PGlite, con autenticación simulada y tablas de presupuesto simplificadas.

## Resultados confirmados

| Grupo | Resultado |
|---|---|
| Dominio adversarial | 114 casos: 68 pasan, 46 fallan. |
| Persistencia SQL adversarial | 15 casos: 4 pasan, 11 fallan. |
| Navegador determinista | 42 casos × escritorio/tableta = 84 ejecuciones: 42 pasan, 42 fallan. |
| Monkey final, semilla 1000 | 1.000 acciones en 522.360 ms; una violación en la acción 121. |
| Playwright original | 66/66 pasan; 172.973 ms. |
| Typecheck y lint | Pasan para los cambios de código comprobados. |
| Tortura de 30 minutos | Final sin verificar. Última observación recuperada: al menos 20 min 10 s y una violación. |
| Sesión prolongada de 120 minutos | Final sin verificar. Último heartbeat recuperado: 58 min 45 s, 4.980 acciones, cero violaciones del oráculo de estabilidad. |

La tableta inicial tuvo tres fallos del ejecutor: reloj pausado en el pasado y acción bloqueada por ARIA. Se corrigieron y repitieron el caso histórico y las cuatro especialidades en ambos proyectos: diez fallos funcionales confirmados. Los totales consolidados sustituyen esas ejecuciones iniciales, sin contarlas dos veces. Un fallo de test no equivale a un defecto independiente: varias familias y tamaños comprueban una misma causa.

**Interrupción del entorno:** después de estas verificaciones el ejecutor local dejó de responder, incluso a `date -u`. No fue posible recuperar la terminación de las pruebas largas ni de la repetición completa de Vitest. La falta de respuesta del ejecutor no se atribuye a un crash de Denty. Las suites y este informe se conservaron mediante GitHub. Las duraciones solicitadas de 30 y 120 minutos siguen pendientes de verificación.

La primera ejecución ordinaria de Vitest produjo 1.573 aprobados y un timeout de cinco segundos bajo carga paralela; el archivo aislado aprobó sus tres casos. La repetición completa quedó sin resultado recuperable. No se afirma que la suite ordinaria completa esté aprobada.

## Fallos y soluciones propuestas

| ID | Prioridad | Evidencia reproducida | Causa y solución propuesta |
|---|---|---|---|
| F01 | P1 | Ocho familias persistidas impiden abrir el editor: SURGERY, BONE_GRAFT, MEMBRANE, SINUS_LIFT, SURGICAL_LESION, IMPLANT_COMPONENT, PROSTHETIC_STRUCTURE, PERIODONTAL_FINDING. | El adaptador de intercambio reconoce 18 familias frente a 26 del dominio. Completar un registro compartido y probar ida/vuelta sin pérdida. Hay TypeError y pantalla de error controlada; no crash del proceso del navegador. |
| F02 | P1 | ENDO/diagnosis se convierte en realizado; IMPLANT/implant_lost en completado; extracción completada en indicada. | Validar estados por familia. Traducir solo alias heredados reconocidos, sin reducir todo a TOOTH_STATES. |
| F03 | P1 | Seleccionar una instantánea antes del debounce elimina el borrador: cero escrituras. | El remount cancela el guardado pendiente. Mantener borrador por paciente o esperar su guardado antes de cambiar de vista; extender coordinación al periodonto. |
| F04 | P1 | Edición durante guardado y doble/triple clic generan conflicto propio. Variante triple: versiones esperadas [1,1,2], respuestas 200/409/200. | La cola excluye peticiones concurrentes, pero reutiliza un callback con versión anterior. Avanzar sincrónicamente una referencia de revisión confirmada por las propias escrituras. Conservar los conflictos auténticos entre pestañas; no tomar cualquier versión ajena del caché. |
| F05 | P1 | Deshacer el único hallazgo guardado produce Error al guardar; al recargar reaparece. Caso específico y acción 121 de monkey/tortura reproducen la causa. | Permitir un reemplazo vacío válido. La API exige una entidad; modificar solo esa restricción es insuficiente sin F06. |
| F06 | P1 | SQL de lote inactivo devuelve versión 3, pero historial conserva máximo 2 y lectura activa devuelve 1; la siguiente escritura entra en conflicto. | Introducir revisión durable por odontograma, bloquearla antes de comparar y avanzar también al vaciar. Lectura, historial y sincronización deben usarla. |
| F07 | P1 | Cinco peticiones a API real aceptan diente 99, espacios, cara X, tipo UNKNOWN y estado imposible: 200 y persistencia. SQL confirma ausencia de restricciones relevantes. | Compartir validación FDI, caras, familias y estados en DTO/servicio/RPC. Distinguir entidades de diente, arcada y boca completa. |
| F08 | P1 | DTO admite profundidad 16 o 10⁹, recesión −6 o 16 y movilidad/furcación 4; dominio las rechaza. SQL persiste cuatro valores fuera de rango. | Reutilizar límites actuales del programa: profundidad 0–15, recesión −5–15, movilidad/furcación 0–3. Añadir restricciones de base de datos. Son contratos del programa, no recomendaciones médicas. |
| F09 | P1 | SQL pierde parent_id del componente de implante. | Reconstruir relaciones mediante mapa de identidad lógica a nuevos UUID. Regenerar UUID está documentado y no es un fallo por sí solo; perder la relación sí. La prueba compara contra el implante devuelto, no contra el UUID enviado. |
| F10 | P1 | SQL crea presupuesto desde plan fuente versión 2 con dibujo en versión 3. | Comprobar revisión fuente o sincronizar plan/presupuesto atómicamente; conservar inmutabilidad de documentos firmados. |
| F11 | P2 | Implante tras endodoncia se rechaza, orden inverso se admite; lote permite caries e implante incompatibles. | Centralizar invariantes por diente y validar el estado final del lote. |
| F12 | P2 | Lote omite contexto obligatorio de implante realizado; endodoncia tras extracción realizada se admite; implante perdido cuenta como presente/sondable. | Compartir validadores y predicado canónico de presencia que contemple pérdida y ciclo de vida. |
| F13 | P2 | Diente retenido bloquea extracción quirúrgica; prótesis removible inferior puede sustituir la superior. | Predicado específico para extracción quirúrgica; incluir arcada/rango en identidad de entidades sin diente. |
| F14 | P1 | ORTHODONTIC guarda notas, overjet y bracket; al recargar el panel vuelve vacío. SP-001 en ambos proyectos. | Hidratar desde entidad persistida, no solo Map en memoria. Separar borrador y valor confirmado para evitar sobrescritura posterior. |
| F15 | P1 | Crear snapshot con cambios pendientes informa éxito pero captura versión 1 sin el hallazgo visible. SP-002 en ambos proyectos. | Esperar descarga de borradores clínicos antes de crear la instantánea y bloquear si falla. El RPC captura correctamente lo comprometido; falla la coordinación cliente. |
| F16 | P2 | Caries y obturación realizada persisten en la misma cara; la UI sigue mostrando caries. SP-003 en ambos proyectos. | surfaceEntity toma primera coincidencia. Definir precedencia visual del estado actual y separar antecedentes. El test asume precedencia de restauración reciente; no exige borrar caries histórica. |
| F17 | P2 | Corona en capa oculta muestra advertencia y aria-disabled, pero clic de puntero persiste una corona invisible. SP-004 en ambos proyectos. | ARIA no bloquea eventos. Comprobar visibilidad/solo lectura en handlers y comandos. El test usa force solo para superar el filtro ARIA de Playwright, enviando eventos reales de puntero. |

Identificadores duplicados contradictorios también se aceptan en DTO: brecha de política de validación comprobada unitariamente, sin efecto concreto de producción demostrado. La posible carrera multiconexión SQL y dos hipótesis adicionales sobre recarga concurrente/deshacer del periodontograma requieren reproducción; no se cuentan como defectos confirmados.

## Correspondencia con la matriz original

“Pasa” delimita el caso probado, sin certificar todo Denty. Los IDs de dominio son propios y no sustituyen automáticamente los IDs de la matriz.

| ID | Cobertura y resultado |
|---|---|
| ST-001 | Pasa: 100 recargas con entidades, identidad, versión, plan y presupuesto; una escritura, escritorio/tableta. |
| ST-002 | Parcial: 100 ciclos de menú móvil y diálogo, sin overlays retenidos; no todos los dropdowns/sidebars. |
| ST-003 | Falla F04 con edición intermedia. Triple clic sin nueva edición sí produce una petición. |
| ST-004 | Falla F04 al editar durante carga de escritura; otras interrupciones de lectura recuperan estado. |
| ST-005 | Pendiente de verificar final 120 min; último checkpoint 58 min 45 s. Heap JS y respuesta solamente. |
| RG-001 | Parcial: navegación y sesión de aplicación; no login/logout real ni CRUD de todos los módulos. |
| RG-002 | Falla último deshacer/revisión vacía F05/F06; CRUD/recreación del dominio cubiertos. |
| RG-003 | Parcial: formularios seleccionados, cancelación y guardado; no todos. |
| RG-004 | Pasa en rutas principales y órdenes evaluados. |
| RG-005 | Falla en conversiones/reglas/casos específicos de guardado reproducibles. |
| BD-001 | Parcial: mínimos de etiqueta, FDI y medidas; no todos los campos. |
| BD-002 | Parcial: etiqueta 120 caracteres y máximos FDI/periodonto del programa. |
| BD-003 | Falla validación fuera de rango API/SQL F07/F08. |
| BD-004 | Falla espacios en diente aceptados; reemplazo vacío válido se rechaza F05. |
| BD-005 | Falla DTO con profundidad 10⁹; otros límites/Unicode/texto largo en dominio, sin extrapolar a formularios. |
| SQ-001 | Pasa secuencia A-B-C en comandos del dominio. |
| SQ-002 | Pasa A-C-B en comandos del dominio. |
| SQ-003 | Pasa B-A-C con rechazo controlado de entidad inexistente y sin mutación. |
| SQ-004 | Pasa abrir/cerrar/abrir menú/diálogo. |
| SQ-005 | Parcial: crear/editar/eliminar/crear en dominio, no todos los CRUD persistentes. |
| SQ-006 | Parcial: cancelación de diálogo y undo/redo de borrador. |
| SQ-007 | Parcial: guardado/navegación/retorno, no todas las variantes. |
| SQ-008 | Parcial: cancelación antes de entregar escritura al servidor, sin probar rollback de escritura aceptada. |
| SQ-009 | Falla repetición de guardado con edición durante petición F04. |
| NV-001 | Pasa orden de rutas principales. |
| NV-002 | Pasa permutación de rutas principales. |
| NV-003 | Pasa atrás/reentrada. |
| NV-004 | Pasa atrás/adelante. |
| NV-005 | Pasa acceso directo con sesión de aplicación. |
| NV-006 | Pasa 404 controlado. |
| NV-007 | Parcial: escritura no entregada cancelada y retorno; selección histórica falla F03. |
| NV-008 | Pasa conflicto entre dos pestañas, recarga/reintento; no Realtime real. |
| MONKEY | Falla: 1.000 acciones, una violación en acción 121. Acciones no disponibles registradas no cuentan como clics exitosos. |
| ES-001 | Pasa acceso protegido sin cookies con redirección controlada. |
| ES-002 | Pasa caducidad app_sessions conservando cookies; no caducidad JWT del proveedor. |
| ES-003 | Pasa offline: guardado pausado y borrador retenido. |
| ES-004 | Pasa recuperación: una escritura reanudada. |
| ES-005 | Pasa respuesta lenta y triple clic sin cambios nuevos: una petición. |
| ES-006 | Pasa manejo de 400/401/403/404/409/429/500/502/503/504 con borrador/reintento; endpoint de guardado solamente. |
| TORTURE | Final 30 min sin verificar por indisponibilidad del ejecutor; ya reproduce F05. |

## Controles ordinarios y límites

gate:stage13 se corta en stage3: prohíbe localStorage fuera de una lista que omite el adaptador browser-storage. Los consumidores observados del odontograma almacenan preferencias de vista; el fallo estático no demuestra persistencia clínica local. Se ejecutaron los 19 grupos posteriores por separado: inicialmente 14 pasaron y cinco fallaron. vercel:regressions aprobó al retirar tsconfig.tsbuildinfo generado e ignorado. Quedan cuatro grupos posteriores fallidos:

- storage:stage5-check busca PITR/Supabase en un componente que extrae el panel de copias. Revisar contrato, no atribuir pérdida de backups.
- clinical:stage6-check busca literalmente PeriodontogramPanel con readings en JSX antiguo. Revisar contra estructura actual y tests funcionales.
- agenda:stage7-check exige regex/orden concretos de rutas locallyHandled. Revisar contrato actual.
- regressions:legacy lee motion-parallax.tsx inexistente. Actualizar el caso o recuperar el requisito pertinente.

Un grupo con && corta en su primer subcaso; no equivale a ejecutar todas sus comprobaciones internas. Los checks de Auth/seguridad previos al corte pasaron, sin probar que el despliegue real tenga RLS correcto.

No se evaluaron credenciales/JWT reales, RLS, bloqueos multiconexión ni todos los servicios/formularios de Denty. La fixture Realtime local ws: es bloqueada por CSP; no se atribuye ese resultado al Realtime de producción. Cancelar antes de enviar no prueba reversión de escritura aceptada.

Memoria: CDP post-GC, presupuesto 256 MiB. Monkey final registró aproximadamente 10,1–17,8 MiB. El soak mantuvo muestras por debajo del presupuesto en lo observado, pero recargas cambian renderers; faltan memoria nativa/GPU/servidor. Su oráculo de estabilidad no valida todas las invariantes de datos. No afirmar ausencia de fugas ni aprobación global por estos resultados.

## Reproducción y prioridades

Véase [odontogram-torture.md](./odontogram-torture.md) y scripts test:torture:* para preparación, comandos, semillas y duraciones. Pruebas conocidas en rojo se activan explícitamente con DENTY_TORTURE=1. Los casos deterministas conservan trazas/capturas; los aleatorios guardan secuencia, UTC, URL, errores, muestras y checkpoints. Evitar demasiados Chromium simultáneos: la presión del ejecutor produjo diagnósticos descartados.

Orden propuesto: registro de familias/estados; coordinación de borradores/snapshots y revisión de cola; reemplazo vacío con versión durable; validación API/RPC y relaciones; coherencia plan/presupuesto; reglas y especialidades. Después de cada corrección repetir el caso original, variante de tableta y suite ordinaria. No esconder conflictos ajenos mediante reintentos indiscriminados.

Pendiente para completar la auditoría temporal: recuperar o repetir la tortura real de 30 min, soak de 120 min y Vitest ordinario completo. Las correcciones propuestas todavía no están implementadas.
