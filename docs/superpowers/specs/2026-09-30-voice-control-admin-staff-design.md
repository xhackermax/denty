# Denty Voice Control for Staff and Admin

Fecha: 2026-09-30

## Objetivo

Convertir la barra de voz de Denty en una capa transversal de control para usuarios internos de la clinica, sin exponerla al portal del paciente. La voz debe permitir navegar, buscar, crear y modificar datos operativos de Denty con validacion de permisos, contexto activo y confirmacion cuando la accion pueda tener impacto clinico, financiero, legal o administrativo.

## Alcance

La primera entrega integra la barra de voz existente con la arquitectura del asistente ya presente en el repositorio:

- `AssistantProvider` y `AssistantContext`.
- `assistant-tool-registry`.
- `assistant-policy`.
- `local-voice-adapter`.
- `assistant-tool-executor`.
- `VoiceCommandBar`.

El resultado debe evitar dos problemas actuales:

- comandos de voz que se ejecutan por caminos paralelos sin politica central;
- comandos visibles o accionables para cuentas de paciente.

## Roles

La barra de voz solo esta disponible para roles internos:

- `ADMIN`
- `DENTIST`
- `ASSISTANT`
- `RECEPTION`

El rol `PATIENT` no debe ver ni usar la barra de voz. Si una ruta de paciente monta por error algun componente compartido, la politica debe bloquear igualmente cualquier accion.

## Modelo De Riesgo

Cada herramienta del asistente tiene un riesgo:

- `GREEN`: navegacion, abrir modulos, seleccionar contexto. Se puede ejecutar directamente.
- `YELLOW`: cambios clinicos u operativos reversibles o trazables, como notas, odontograma o periodoncia. Se puede ejecutar si el contexto es claro.
- `RED`: acciones sensibles, como pagos, crear pacientes, reprogramar citas, ausencias, exportar documentos o cambios administrativos. Requieren confirmacion explicita.

La politica central es la unica fuente para decidir:

- si la herramienta existe;
- si necesita paciente activo;
- si el rol puede ejecutarla;
- si requiere confirmacion.

## Flujo De Voz

1. El usuario interno pulsa la barra de voz.
2. Denty transcribe la frase con reconocimiento del navegador o respaldo de servidor.
3. El NLU local intenta convertir la frase en `LocalVoicePlan`.
4. Si el NLU local no entiende, se consulta el interpretador IA.
5. El plan se adapta a `AssistantToolCall[]`.
6. La politica evalua cada llamada.
7. Las acciones `GREEN` permitidas se ejecutan directamente.
8. Las acciones `YELLOW` permitidas se ejecutan automaticamente cuando no hay ambiguedades y hay contexto activo.
9. Las acciones `RED` muestran confirmacion antes de ejecutar.
10. Al ejecutar, se invalida la cache de datos y se navega al modulo relevante.

## Contexto

El asistente debe consumir el contexto activo antes de pedir datos al usuario:

- ruta actual;
- paciente activo;
- diente seleccionado;
- cita seleccionada;
- sitio/clinica activa;
- rol y permisos del usuario.

Ejemplos:

- En `/app/patients/:id/odontogram`, "apunta caries distal del 14" usa automaticamente el paciente abierto.
- En agenda, "marca llegada de Maria Garcia" resuelve el paciente y cambia la cita si la herramienta esta soportada.
- En cualquier pantalla, "abre finanzas" navega directamente.
- En portal de paciente, la barra no aparece.

## Herramientas Iniciales

La primera integracion debe cubrir las herramientas ya modeladas:

- `navigation.open`
- `navigation.patient`
- `patient.create`
- `odontogram.set_state`
- `odontogram.bridge`
- `odontogram.removable`
- `periodontal.update`
- `clinical.note`
- `budget.sync`
- `payment.record`

Tambien debe dejar preparadas, aunque no todas se ejecuten en la primera fase:

- `appointment.schedule`
- `appointment.reschedule`
- `appointment.mark_no_show`
- `lab.transition`
- `documents.export`
- `recall.create`

## UX

La barra de voz debe:

- ocultarse para pacientes;
- mostrar el texto entendido;
- mostrar la accion prevista cuando haga falta confirmar;
- explicar bloqueos con lenguaje claro, por ejemplo "Esta accion requiere confirmacion" o "Tu rol no permite modificar ajustes";
- no mostrar detalles tecnicos de API o stack al usuario final.

## Seguridad

La seguridad no depende del frontend:

- el frontend oculta la barra a pacientes;
- la politica bloquea roles no permitidos;
- las rutas del servidor mantienen sus propias comprobaciones de rol/permisos;
- ninguna accion sensible se ejecuta solo porque la IA la proponga.

## Pruebas

La implementacion debe incluir pruebas para:

- ocultar/desactivar voz en rol `PATIENT`;
- permitir voz en roles internos;
- convertir planes locales a herramientas del asistente;
- bloquear herramientas desconocidas;
- bloquear herramientas con paciente requerido cuando no hay paciente;
- exigir confirmacion para acciones `RED`;
- mantener autoejecucion de odontograma con paciente activo.

## Fuera De Alcance De Esta Fase

- Wake word continuo en segundo plano para todos los modulos.
- Edicion completa de agenda por voz con drag/resize simulado.
- Acciones administrativas destructivas por voz.
- Dictado medico largo con resumen IA persistente.

Estas piezas podran agregarse despues sobre el mismo registro de herramientas y politica.
