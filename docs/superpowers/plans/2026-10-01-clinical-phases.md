# Implementación clínica secuencial

Fuente: `denty-plan-implementacion-2026-10-01.json`, solicitado para implementar por fases.
Base real: main 9545dd6. El documento suministrado incluye diseño y plan.

## Reglas

- Push directo a main por fase; la petición sustituye ramas/PR del documento.
- Mantener lo ya entregado; no introducir duplicación de paracetamol.
- Cada fase: pruebas afectadas, typecheck, lint, Prettier y pipeline vercel-build.
- Migraciones versionadas y pruebas SQL; aplicación remota requiere acceso disponible.
- Dominio puro, validación servidor, aislamiento por clínica y confirmación clínica.
- Margen = −recesión; orden de sondaje recomendado, configurable.
- Diagnóstico histórico por visita, vigente = último activo de cada categoría.

## Fase 0: urgencias

Verificar `export-file`, permisos y pipeline. Conservar XLSX real existente.
Consultar deploy remoto si hay acceso; registrar cualquier bloqueo sin inventar estado.
Commit/push del registro de ejecución y este plan.

## Fase 1: boca compartida

Crear `domain/odontogram/mouth-state.ts`: deriveMouthState, isProbeable,
isEndoCandidate, isSurgicalSite y teethForChart. Entidades activas y fecha nacimiento.
Crear contexto y mini mapa; proveedor sobre el editor, consumido por todos los paneles.
Periodonto: bloquear ausentes, marcar ausente con commit común y reconocer implantes.
Endodoncia/cirugía/ortodoncia: aplicar reglas compartidas y mostrar ausencias.
Validación servidor de sondaje y plan; SQL valida contra odontograma persistido.
Voz consulta el estado antes de guardar sondaje.
Pruebas: ausencias, extracción realizada, implante, puente, mixta; UI y REST rechazado.

## Fase 2: diagnósticos y plan

Dominio `diagnosis`: esquema y reglas periodontal/bruxismo; clasificación como sugerencia.
Tabla clinical_diagnoses con clínica/paciente/visita, historial, RLS y versión.
API GET/POST diagnoses y POST resolve, recurso tipado y manifiestos sincronizados.
Barra clínica común con justificación, detalle, vigente e historial.
Mapa de sugerencias con cuadrantes; selección clínica explícita, precio de catálogo,
diagnosisId y consentimientos existentes al insertar ítems en el plan.
Integrar frases de voz con el mismo contrato de validación.
Pruebas dominio, API permisos/aislamiento, UI y mapeo catálogo/consentimientos.

## Fase 3: periodontograma

Modelo PerioExam, cursor puro y comandos comunes para teclado/toque/voz.
Resumen y clasificación 2017 con criterios verificables, sin diagnóstico automático.
Cuadrícula por arcada, gráficos SVG, comparación, impresión y teclado accesible.
Parser local de tríos/margen/sangrado/placa/supuración/movilidad/furca y navegación.
Borrador autoguardado independiente del examen; finalización única, versiones y RLS.
Retirar entrada rápida y guardado directo sitio a sitio del flujo de dictado.
Conservar registros previos; adaptar recesión al mostrar margen sin reescribir historia.
Pruebas cursor, parser, rangos, resumen, gráfico, borrador y finalización.

## Fases 4–5: completar integración

Revalidar navegación/cirugía/recetas contra MouthState y cambios nuevos.
Revalidar tareas/contactos/copias; soporte táctil según respuesta de la clínica.
Push separado tras validación de cada fase, aunque principalmente sea integración.

## Revisión final

Una revisión independiente de todo el rango; corregir errores importantes con pruebas
RED→GREEN y suite completa. Publicar resultado y límites de verificación remota.
