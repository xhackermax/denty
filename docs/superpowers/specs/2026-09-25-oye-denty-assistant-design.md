# Oye Denty — Asistente dental virtual

Fecha: 2026-09-25
Estado: aprobado el 2026-09-25
Proyecto base: Denty v3 (Next.js 16.3.5)

## 1. Objetivo

Convertir Denty en un asistente dental virtual interactivo, reactivo y proactivo que permita al dentista trabajar por voz y conversación contextual sin perder control sobre las acciones clínicas, económicas o irreversibles.

La experiencia objetivo es:

1. El dentista activa manualmente `Asistente activo`.
2. Mientras Denty esté visible, el navegador espera localmente la frase `Oye Denty`.
3. Al detectar la frase, se abre una sesión conversacional temporal.
4. Las órdenes simples se resuelven con NLU local.
5. Las órdenes complejas o contextuales se envían a OpenAI Realtime.
6. La IA no manipula la interfaz libremente. Solo puede solicitar herramientas tipadas de Denty.
7. Denty valida permisos, contexto, riesgo y datos antes de ejecutar.
8. Las acciones seguras y reversibles se ejecutan directamente.
9. Las acciones clínicas sensibles, económicas o irreversibles exigen confirmación.
10. La proactividad se muestra por notificaciones silenciosas, no por voz espontánea.
11. Denty aprende preferencias operativas por dentista después de 3 patrones equivalentes correctos, de forma silenciosa y reversible.

## 2. Decisiones ya aprobadas

- Denty será interactivo, reactivo y proactivo.
- Autonomía: nivel B, proactivo asistido.
- La proactividad usa notificaciones visuales por defecto.
- El asistente se activa con un interruptor explícito `Asistente activo`.
- La escucha de `Oye Denty` solo funciona cuando Denty está visible.
- `Oye Denty` abre un modo conversación temporal.
- Durante la conversación no hace falta repetir `Oye Denty`.
- Ventana inicial de conversación: 45 segundos de inactividad, reiniciada en cada turno.
- El dentista puede cerrar la conversación con una orden como `gracias Denty`, `terminar` o mediante la UI.
- Aprendizaje estrictamente por dentista.
- Un patrón pasa a memoria personal tras 3 usos equivalentes correctos y no corregidos.
- El aprendizaje ocurre en silencio, sin mensajes de “he aprendido esto”.
- Las reglas aprendidas deben poder revisarse, editarse o borrarse en `Ajustes > Denty AI > Mi aprendizaje`.
- La historia clínica de un paciente no se usa como entrenamiento general.
- El conocimiento médico general no se modifica automáticamente a partir de hábitos del dentista.

## 3. Situación actual del repositorio

El proyecto ya contiene una base de voz reutilizable:

- `src/features/voice/local-nlu.ts`
  - NLU local basado en reglas.
  - Produce acciones estructuradas como `odontogram.set_state`, `periodontal.update`, `clinical.note`, `budget.sync`, `payment.record`, etc.
- `src/features/voice/voice-router.ts`
  - Convierte comandos en planes y rutas de navegación.
- `src/features/voice/voice-executor.ts`
  - Ejecuta acciones a través de la API de Denty.
- `src/features/voice/voice-patient-resolver.ts`
  - Resuelve pacientes por nombre o número de ficha.
- `src/features/voice/voice-command-bar.tsx`
  - Usa Web Speech cuando está disponible y MediaRecorder + `/api/voice/transcribe` como fallback.

Esta base no debe eliminarse. Se reutilizará como “cerebro rápido” y como adaptador hacia el nuevo motor de acciones.

## 4. Enfoques considerados

### Opción A — Web Speech + NLU local + IA puntual de texto

Ventajas:
- Implementación más corta.
- Menor coste de audio.
- Reutiliza casi todo el sistema actual.

Inconvenientes:
- Wake word poco fiable.
- Conversación poco natural.
- Compatibilidad irregular de `SpeechRecognition`.
- Más latencia en frases encadenadas.

### Opción B — Wake word local + OpenAI Realtime + motor de herramientas Denty

Ventajas:
- Conversación natural y contextual.
- Baja latencia.
- Function calling / tool calling real.
- Mantiene NLU local para comandos simples y ahorro de coste.
- La IA nunca obtiene acceso libre a la UI ni a la base de datos.
- Encaja con el nivel B de autonomía.

Inconvenientes:
- Mayor complejidad arquitectónica.
- Requiere endpoint seguro para credenciales efímeras.
- Requiere estado de conversación y auditoría de herramientas.

### Opción C — Sesión Realtime siempre activa mientras el asistente esté encendido

Ventajas:
- Experiencia más parecida a un asistente de sistema.
- Menos transiciones entre espera y conversación.

Inconvenientes:
- Mayor consumo de batería.
- Mayor consumo de tokens/audio.
- Menor privacidad percibida.
- No respeta la preferencia acordada de wake word local y sesión IA solo al activarse.

### Decisión

Implementar Opción B.

## 5. Arquitectura objetivo

```text
Asistente activo
      |
      v
Visibility gate (document visible?)
      |
      v
Wake word local: "Oye Denty"
      |
      v
Conversation Session Manager
      |
      +---------------------------+
      |                           |
      v                           v
NLU local                    OpenAI Realtime
(comando claro)              (complejo/contextual)
      |                           |
      +-------------+-------------+
                    v
             Denty Action Plan
                    |
                    v
        Risk + Permission Validator
                    |
          +---------+---------+
          |                   |
          v                   v
 Ejecutar directo       Pedir confirmación
          |                   |
          +---------+---------+
                    v
             Denty Tool Engine
                    |
                    v
      API / Estado / Navegación / UI
                    |
                    v
       Auditoría + aprendizaje personal
```

## 6. Componentes nuevos

### 6.1 AssistantProvider

Responsabilidad:
- Estado global del asistente.
- `enabled`, `visible`, `wakeListening`, `conversationActive`, `processing`, `executing`, `confirming`, `error`.
- Proporciona contexto a toda la aplicación.

Ubicación propuesta:
- `src/features/assistant/assistant-provider.tsx`

### 6.2 VisibilityGate

Usará `document.visibilityState` y eventos `visibilitychange`.

Reglas:
- Si Denty deja de estar visible, detener wake word y cerrar audio activo.
- No iniciar una sesión Realtime en segundo plano.
- Al volver visible, reactivar wake word únicamente si `Asistente activo` sigue encendido.

### 6.3 WakeWordEngine

Interfaz abstracta:

```ts
interface WakeWordEngine {
  start(): Promise<void>;
  stop(): Promise<void>;
  onWake(callback: () => void): () => void;
}
```

Requisitos:
- Procesamiento local en cliente.
- No enviar audio a OpenAI mientras espera `Oye Denty`.
- Debe liberarse inmediatamente al ocultar la página o apagar el asistente.

La implementación concreta se elegirá en el plan técnico tras verificar compatibilidad web, licencia, peso y soporte móvil. El sistema no debe acoplar la app a un proveedor específico de wake word.

### 6.4 ConversationSessionManager

Gestiona:
- Inicio tras wake word.
- Realtime WebRTC.
- Temporizador de 45 segundos de inactividad.
- Reinicio del temporizador en cada turno.
- Cierre manual o mediante frases de terminación.
- Estado contextual: paciente, pantalla, diente, último tratamiento, última herramienta ejecutada y objetos relevantes.

### 6.5 RealtimeSessionGateway

Dos partes:

Servidor:
- Endpoint autenticado de Denty para crear credenciales efímeras de OpenAI.
- Usa `OPENAI_API_KEY` exclusivamente en servidor.
- Asocia el `userId`/`staffId` de Denty a un identificador de seguridad no reversible.
- Nunca devuelve la API key estándar al navegador.

Cliente:
- Crea la conexión WebRTC usando la credencial efímera.
- Expone eventos de audio, texto y function calls.
- No ejecuta herramientas directamente sin pasar por el validador de Denty.

Referencia API actual verificada:
- `POST /v1/realtime/client_secrets`
- WebRTC para navegador.
- Tools de tipo function cuando Denty controla negocio, permisos y acceso privado.

### 6.6 ContextBroker

Construye un contexto mínimo y explícito para cada turno:

```ts
interface AssistantContext {
  userId: string;
  staffId?: string;
  pathname: string;
  patientId?: string;
  patientName?: string;
  selectedTooth?: string;
  selectedAppointmentId?: string;
  activeBudgetId?: string;
  activePlanVersion?: number;
  lastTool?: string;
  lastEntities?: string[];
}
```

Principio de minimización:
- No mandar la historia completa del paciente por defecto.
- Cada herramienta consulta solo los datos que necesita.
- El modelo recibe resúmenes o referencias, no volcados de base de datos.

### 6.7 Denty Tool Registry

Catálogo cerrado de acciones.

Primera versión propuesta:

#### Navegación y contexto
- `navigation.open`
- `navigation.patient`
- `patient.search`
- `patient.summary`
- `odontogram.select_tooth`

#### Odontograma
- `odontogram.set_state`
- `odontogram.set_surfaces`
- `odontogram.bridge`
- `odontogram.removable`

#### Periodoncia
- `periodontal.update`

#### Plan clínico
- `clinical.add_item`
- `clinical.complete_item`
- `clinical.mark_unsatisfactory`
- `clinical.add_dependency`
- `clinical.note`

#### Agenda
- `appointment.schedule`
- `appointment.reschedule`
- `appointment.arrive`
- `appointment.no_show`

#### Presupuestos
- `budget.sync`
- `budget.open`
- `budget.prepare_signature`

#### Finanzas
- `payment.prepare`
- `payment.record`

#### Laboratorio
- `lab.transition`

Cada herramienta debe tener:
- esquema Zod;
- nivel de riesgo;
- permisos requeridos;
- callback de ejecución;
- mensaje de auditoría;
- estrategia de deshacer si aplica.

### 6.8 ActionPolicyEngine

Tres niveles:

#### Verde — ejecutar directamente

Ejemplos:
- navegar;
- seleccionar diente;
- abrir paciente;
- preparar un borrador;
- consultar información;
- mostrar una pantalla.

#### Amarillo — ejecutar y permitir deshacer

Ejemplos:
- marcar caries;
- añadir tratamiento al plan;
- actualizar periodoncia;
- crear una nota clínica borrador/entrada reversible según dominio.

Requisitos:
- toast/feedback visible;
- botón `Deshacer` cuando la acción tenga reversión segura;
- registro de auditoría.

#### Rojo — confirmación obligatoria

Ejemplos:
- registrar un pago;
- marcar un tratamiento como realizado cuando implique cierre clínico irreversible;
- borrar información;
- aceptar presupuesto;
- firmar documento;
- acciones económicas;
- acciones que cambien evidencia firmada.

La IA nunca puede saltarse este motor.

### 6.9 AssistantLearningStore

Memoria personal por dentista.

Clave primaria lógica:
- `clinicId + staffId` o `clinicId + userId` si no existe staff vinculado.

Tipos de aprendizaje:
- alias de tratamientos;
- vocabulario personal;
- abreviaturas;
- duraciones habituales;
- preferencias de flujo;
- asociaciones repetitivas;
- correcciones.

No incluye:
- reglas médicas universales;
- diagnósticos derivados de un caso individual;
- información identificable de otros pacientes usada como preferencia.

### 6.10 PatternLearner

Regla aprobada:
- Aprender después de 3 evidencias equivalentes correctas.

Una evidencia cuenta si:
- pertenece al mismo dentista;
- la interpretación fue ejecutada con éxito;
- no fue corregida inmediatamente;
- no contradice una regla clínica o de seguridad;
- representa una preferencia operativa permitida.

Ejemplo:

```text
reconstrucción -> treatmentCode: reconstruction
observations: 3
confidence: high
active: true
```

Comportamiento:
- Al llegar a 3, activar en silencio.
- No mostrar toast ni voz.
- Registrar la regla en ajustes.
- Si el dentista corrige repetidamente la regla, reducir confianza.
- Desactivar automáticamente una regla cuando deje de alcanzar el umbral mínimo de confianza definido en el plan de implementación.

### 6.11 AssistantLearningSettings

Ruta propuesta:
- `Ajustes > Denty AI > Mi aprendizaje`

Funciones:
- listar reglas activas;
- mostrar tipo, valor, evidencias y confianza;
- editar;
- desactivar;
- borrar;
- restablecer aprendizaje personal;
- mostrar fecha de última actualización.

No se muestran interrupciones cuando una regla nueva se aprende.

### 6.12 ProactiveEngine

Diseño event-driven, no “IA pensando constantemente”.

Fuentes:
- cambios de estado de Denty;
- eventos ya existentes;
- reglas locales;
- tareas programadas del backend cuando aplique.

Ejemplos locales:
- presupuesto sin firmar;
- historia médica incompleta;
- paciente esperando demasiado;
- tratamiento pendiente tras una acción relacionada;
- cita sin datos necesarios;
- documento que requiere firma.

Solo enviar a IA cuando haga falta interpretación semántica compleja.

Salida:
- notificación silenciosa en el centro de notificaciones de Denty.
- acciones rápidas: `Ver`, `Preparar`, `Descartar`.

Nunca reproducir voz espontáneamente por defecto.

## 7. Máquina de estados del asistente

```text
OFF
  -> ARMED
  -> WAKE_DETECTED
  -> CONNECTING
  -> LISTENING
  -> THINKING
  -> EXECUTING
  -> LISTENING
  -> IDLE_TIMEOUT
  -> ARMED
```

Estados adicionales:
- `CONFIRMING`
- `ERROR`
- `PAUSED_HIDDEN`

Reglas:
- `OFF`: sin micrófono.
- `ARMED`: solo wake word local.
- `PAUSED_HIDDEN`: página no visible, cero escucha.
- `LISTENING`: Realtime abierto y conversación activa.
- `CONFIRMING`: una acción roja espera aprobación explícita.
- `IDLE_TIMEOUT`: cerrar Realtime y volver a `ARMED`.

## 8. Conversación contextual

Denty conservará referencias explícitas dentro de una sesión:

Ejemplo:

1. `Oye Denty, abre el 16.`
2. `Caries distal y oclusal.`
3. `Añade reconstrucción.`
4. `Ahora el 17.`
5. `Lo mismo.`

La resolución de `lo mismo` usa:
- `selectedTooth = 17`;
- última acción odontológica aplicable;
- última intención confirmada;
- reglas de seguridad.

El modelo no debe inventar contexto perdido. Si hay dos interpretaciones razonables, Denty pregunta.

## 9. NLU híbrido

### Fast path local

Usar `planLocalVoiceCommand` cuando:
- la confianza supera el umbral;
- no hay ambigüedades;
- todas las acciones tienen esquema conocido;
- la frase no depende de referencias contextuales complejas.

Beneficios:
- menor latencia;
- cero tokens de interpretación;
- comportamiento determinista.

### AI path

Usar Realtime cuando:
- el NLU local no alcanza confianza;
- hay lenguaje conversacional;
- hay referencia a contexto anterior;
- la orden contiene múltiples pasos;
- requiere consulta contextual;
- el dentista hace una pregunta abierta sobre Denty.

La salida de IA siempre debe convertirse en tool calls, no en mutaciones de estado arbitrarias.

## 10. Respuestas de Denty

Durante conversación activa:
- permitir audio de respuesta para mensajes breves y útiles;
- mostrar transcripción/estado visual;
- evitar leer listas largas por voz;
- preferir interfaz visual para resultados extensos.

Proactividad fuera de conversación:
- solo notificaciones visuales.

Mensajes de ejecución:
- `Caries OD registrada en 16.`
- `He preparado la cita para el jueves a las 16:00.`
- `Necesito tu confirmación para registrar el cobro.`

## 11. Seguridad y privacidad

### Clave de OpenAI

- Solo servidor.
- Nunca `NEXT_PUBLIC_OPENAI_API_KEY`.
- El navegador recibe credencial efímera.

### Autenticación

El endpoint de sesión Realtime debe verificar la sesión actual de Denty.

Debe usar:
- `actor.userId`;
- `actor.clinicId`;
- `actor.staffId` si existe;
- permisos reales de la sesión.

### Autorización

Cada tool ejecuta la misma capa de permisos que la acción manual equivalente.

La IA no recibe privilegios adicionales.

### Datos clínicos

- minimizar contexto;
- evitar enviar campos que no hacen falta;
- no usar datos de pacientes para memoria personal del dentista;
- separar auditoría clínica de telemetría técnica.

### Auditoría

Registrar por tool call:
- actor;
- clinicId;
- paciente si aplica;
- timestamp;
- tool;
- argumentos normalizados;
- origen: `local-nlu` / `realtime` / `proactive`;
- nivel de riesgo;
- confirmación si existió;
- resultado;
- error si existe.

## 12. Coste y batería

Principios:
- wake word local;
- Realtime solo tras activación;
- cerrar a 45 s de inactividad;
- fast path NLU local;
- proactividad local basada en eventos;
- no enviar contexto completo del paciente;
- no generar voz en notificaciones proactivas;
- suspender micrófono al ocultar Denty.

Métricas internas recomendadas:
- sesiones Realtime por dentista;
- minutos de audio;
- ratio local NLU / IA;
- tool calls por sesión;
- porcentaje de acciones que requieren confirmación;
- coste estimado por clínica/día.

## 13. Nuevas rutas API propuestas

Estas rutas son contratos de Denty, no llamadas directas desde cliente a OpenAI con una clave privada.

```text
POST /api/assistant/realtime/session
GET  /api/assistant/preferences
PUT  /api/assistant/preferences
GET  /api/assistant/learning
PATCH /api/assistant/learning/:id
DELETE /api/assistant/learning/:id
POST /api/assistant/learning/reset
POST /api/assistant/tool/execute
POST /api/assistant/tool/confirm
POST /api/assistant/feedback/correction
```

El backend real externo deberá implementar persistencia multi-tenant. En demo se permite almacenamiento en memoria de sesión, nunca fingir persistencia clínica real.

## 14. Modelos de datos propuestos

### AssistantPreference

```ts
interface AssistantPreference {
  userId: string;
  clinicId: string;
  staffId?: string;
  assistantEnabled: boolean;
  wakeWordEnabled: boolean;
  conversationTimeoutSec: number;
  voiceReplies: boolean;
}
```

### LearnedPattern

```ts
interface LearnedPattern {
  id: string;
  clinicId: string;
  userId: string;
  staffId?: string;
  kind: "ALIAS" | "DURATION" | "WORKFLOW" | "VOCABULARY";
  trigger: string;
  value: unknown;
  evidenceCount: number;
  correctionCount: number;
  confidence: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### AssistantAuditEvent

```ts
interface AssistantAuditEvent {
  id: string;
  clinicId: string;
  userId: string;
  staffId?: string;
  patientId?: string;
  sessionId?: string;
  source: "LOCAL_NLU" | "REALTIME" | "PROACTIVE";
  tool: string;
  risk: "GREEN" | "YELLOW" | "RED";
  arguments: unknown;
  confirmed: boolean;
  status: "SUCCESS" | "FAILED" | "CANCELLED";
  createdAt: string;
}
```

## 15. Integración con el NLU actual

No reemplazar `LocalVoiceAction` inmediatamente.

Primera migración:
- crear un tipo común `AssistantToolCall`;
- adaptar `LocalVoicePlan.actions` a ese contrato;
- mantener `planLocalVoiceCommand`;
- reemplazar gradualmente el `voice-executor` por `assistant-tool-executor`;
- mantener compatibilidad con los tests actuales.

Esto reduce riesgo y conserva todo el trabajo clínico existente.

## 16. UX propuesta

### Barra superior

Estados:
- `Asistente apagado`
- `Denty activo`
- `Escuchando`
- `Entendiendo`
- `Ejecutando`
- `Esperando confirmación`

Controles:
- interruptor `Asistente activo`;
- icono de micrófono;
- cerrar conversación;
- abrir historial breve de la sesión.

### Feedback de acciones

Acción verde:
- confirmación breve.

Acción amarilla:
- confirmación + `Deshacer`.

Acción roja:
- panel de confirmación antes de ejecutar.

### Ajustes

Nueva sección `Denty AI`:
- Asistente activo por defecto: no, salvo preferencia explícita futura.
- Tiempo de conversación.
- Respuestas por voz.
- Mi aprendizaje.
- Privacidad / uso de IA.

## 17. Proactividad inicial

La primera versión debe ser pequeña y determinista.

Reglas iniciales sugeridas:

1. Presupuesto generado pero no firmado.
2. Historia médica incompleta antes de procedimiento clínico.
3. Paciente en sala de espera por encima de umbral configurable.
4. Tratamiento marcado como realizado pero siguiente paso planificado sigue pendiente.
5. Caries/diagnóstico sin tratamiento asociado en el plan.
6. Documento pendiente de firma.

No empezar con un agente que revise toda la clínica continuamente.

## 18. Fases de implementación

### Fase 1 — Foundation

- AssistantProvider.
- Máquina de estados.
- `Asistente activo`.
- visibility gate.
- abstraction del wake word.
- migración del ejecutor actual a Tool Registry.
- risk policy.
- auditoría en demo.

### Fase 2 — Realtime

- endpoint de credencial efímera.
- conexión WebRTC.
- contexto de pantalla.
- function calling.
- conversación de 45 s.
- cierre por inactividad y órdenes de terminación.

### Fase 3 — Aprendizaje por dentista

- evidence collector.
- regla de 3 evidencias.
- LearnedPattern.
- correcciones y decaimiento de confianza.
- `Ajustes > Denty AI > Mi aprendizaje`.

### Fase 4 — Proactividad

- motor local de reglas.
- integración con notificaciones.
- acciones rápidas.
- cero voz espontánea.

### Fase 5 — Hardening

- permisos completos por tool.
- auditoría backend.
- métricas de coste.
- límites por clínica.
- pruebas de concurrencia y sesiones.
- manejo de caída de OpenAI / red.

## 19. Fallbacks

Si OpenAI no está disponible:
- mantener NLU local;
- permitir comandos deterministas;
- mostrar `Denty inteligente no está disponible ahora` solo cuando una frase necesite IA;
- no bloquear odontograma, agenda ni resto de Denty.

Si el wake word falla:
- botón manual de micrófono sigue disponible.

Si el navegador no permite micrófono:
- entrada de texto usa el mismo motor de acciones.

## 20. Pruebas obligatorias

### Unitarias
- máquina de estados;
- clasificación de riesgo;
- conversión LocalVoiceAction -> AssistantToolCall;
- aprendizaje tras exactamente 3 evidencias;
- una corrección impide aprendizaje incorrecto;
- memoria aislada entre dentistas;
- timeout conversacional;
- visibility gate.

### Integración
- sesión autenticada -> credencial efímera;
- tool call -> permiso -> ejecución;
- tool roja -> confirmación -> ejecución;
- rechazo de confirmación -> sin mutación;
- navegación contextual;
- pérdida de red -> fallback local.

### Regresión
- comandos existentes de `local-nlu.ts` siguen funcionando;
- resolver pacientes sigue funcionando;
- acciones actuales de odontograma/periodoncia siguen usando API real;
- no se introduce almacenamiento clínico inseguro en navegador.

### E2E
- activar asistente;
- ocultar pestaña y comprobar que escucha se pausa;
- volver y rearmar;
- despertar;
- ejecutar una orden verde;
- ejecutar una amarilla y deshacer;
- intentar roja y confirmar;
- cerrar por inactividad.

## 21. Criterios de aceptación

La primera versión de Oye Denty se considera funcional cuando:

1. `Asistente activo` controla todo el ciclo de escucha.
2. El sistema no escucha cuando la página está oculta.
3. La activación local puede abrir una sesión inteligente sin exponer la API key.
4. El modo conversación mantiene contexto durante varios turnos.
5. Comandos simples siguen usando NLU local.
6. Comandos complejos producen tool calls validados.
7. Ninguna acción roja se ejecuta sin confirmación.
8. La IA no puede mutar Denty fuera del Tool Registry.
9. El aprendizaje de un dentista no afecta a otro.
10. Un patrón necesita 3 evidencias válidas antes de activarse.
11. El aprendizaje es silencioso pero visible en ajustes.
12. La proactividad usa notificaciones y no abre audio por sí sola.
13. Si OpenAI falla, Denty sigue funcionando y conserva el NLU local.

## 22. Fuera de alcance de la primera versión

- Wake word cuando Denty está minimizado o en segundo plano.
- Escucha con pantalla bloqueada.
- Aplicación nativa de escritorio.
- Agente autónomo que modifique tratamientos sin política de riesgo.
- Aprendizaje global compartido entre dentistas.
- Entrenamiento/fine-tuning automático con historias clínicas.
- Diagnóstico médico autónomo.
- Prescripción autónoma.

## 23. Referencias técnicas verificadas

OpenAI Realtime API, documentación actual consultada el 2026-09-25:

- https://developers.openai.com/api/docs/guides/realtime
- https://developers.openai.com/api/docs/guides/realtime-mcp
- https://developers.openai.com/api/docs/guides/realtime-conversations
- https://developers.openai.com/api/docs/guides/voice-webrtc

Puntos relevantes verificados:
- navegador: credencial efímera creada por servidor;
- transporte recomendado para navegador: WebRTC;
- las sesiones Realtime mantienen estado conversacional;
- Realtime soporta function calling;
- las function tools son apropiadas cuando la aplicación controla lógica de negocio, permisos y datos privados.
