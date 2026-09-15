# Denty Web Preview 1.7.2 · Documentación funcional y técnica

> Documento de referencia para futuras actualizaciones. La interfaz visible se define principalmente en `index.html` y `app.js`; la lógica de dominio vive en `logic.js`; el NLU/voz vive en `voice-router.js`. `denty-app.bundle.js` es **generado** y no debe editarse a mano.

## 1. Objetivo de la preview

Denty 1.7.2 es una preview web autónoma para probar navegación, flujos, formularios, odontograma, agenda, administración, voz y cobros en modo de simulación desde una sola página. Debe seguir siendo utilizable aunque no exista backend. Las integraciones reales que requieren secretos, como SumUp, una LLM remota o sincronización clínica, deben conectarse después mediante un backend seguro; su ausencia nunca debe impedir abrir o recorrer la aplicación.

### Arranque canónico

- Archivo de entrada: `index.html`.
- Script ejecutado por la página: `denty-app.bundle.js`.
- Fuentes que generan el bundle: `logic.js` + `voice-router.js` + `app.js`.
- Regeneración: `node build-static-bundle.mjs`.
- Estilos: `styles.css`, `phase1.css`, `phase2.css`, `phase3.css`, `phase4.css`, `visual-polish.css`, `cinematic-motion.css`.
- Animación opcional: `cinematic-motion.js`. Si GSAP no está disponible, la interfaz sigue funcionando sin animaciones avanzadas.

## 2. Arquitectura de la página

La página tiene cuatro capas:

1. **Puerta de acceso** (`#accountGateway`): selecciona Administrador, Usuario o Paciente.
2. **Shell principal** (`#appShell`): cabecera, menú lateral, contenido, navegación inferior y modales.
3. **Renderizador de vistas** (`render()` en `app.js`): decide qué pantalla dibujar según `state.view`.
4. **Base local** (`db`): estructura persistida por `logic.js`. Si el navegador no permite almacenamiento local, se usa almacenamiento temporal en memoria para que la preview no se bloquee.

El estado de navegación no debe mezclarse con la identidad futura del usuario. `selectedPortal` indica el tipo de portal; `db.currentUser` representa el usuario clínico activo de la preview.

## 3. Puerta de acceso

### Elementos

- `#accountChooser`: selector de portal.
- `[data-account-type="admin"]`: Cuenta Administrador.
- `[data-account-type="user"]`: Cuenta Usuario.
- `[data-account-type="patient"]`: Cuenta Paciente.
- `#accountAccessStage`: segunda pantalla de la puerta.
- `#accountBack`: volver al selector.
- `#accountContinue`: continuar al shell clínico para Administrador/Usuario.

### Estado actual

- Administrador: entra a la aplicación clínica de preview.
- Usuario: entra a la aplicación clínica de preview.
- Paciente: muestra su antesala pero no entra al área clínica. El portal paciente está pendiente.
- Usuario/contraseña: pendiente de implementar.
- Fichaje ligado a identidad autenticada: pendiente de implementar.

### Regla de actualización

Nunca hacer que los tres botones dependan de un backend. La selección debe responder con JavaScript local aunque una integración externa esté caída.

## 4. Shell principal

### 4.1 Cabecera `.topbar`

Controles:

- `#drawerOpen`: abre menú lateral.
- `#searchToggle`: abre Pacientes.
- `#undoBtn`: deshace la última mutación con snapshot local.
- `#globalVoiceBtn`: inicia reconocimiento de voz si el navegador lo soporta.
- `#quickAddBtn`: alta rápida; en Agenda abre cita, en el resto crea paciente.

### 4.2 Menú lateral `#drawer`

Accesos de administración: Doctores, Sedes, Tarifas, Laboratorios, Plantillas, Consentimientos, Denty Local AI, Sync, Asistente, MCP, Fichaje, Usuarios, Servidores, Documentación, Copias, Apariencia y Clínica.

Accesos de flujo: Hoy, Tareas, Trabajos/Laboratorio, Finanzas, Fichaje y Próximas mejoras.

Los botones usan `data-go` para cambiar `state.view` y, cuando procede, `data-panel` para seleccionar una subsección de Ajustes.

### 4.3 Navegación inferior `.bottom-nav`

- Hoy → `today`
- Pacientes → `patients`
- Agenda → `agenda`
- Pendientes → `tasks`
- Más → `settings`

### 4.4 Modales

- `#patientModal`: alta/edición de paciente y múltiples formularios clínicos.
- `#appointmentModal`: citas.
- `#quickTaskModal`: acciones rápidas.
- `#consentModal`: documentos, formularios y vistas imprimibles.
- `#signatureModal`: firma manuscrita sobre canvas.

## 5. Vistas operativas

### 5.1 Hoy (`state.view = today`)

Función: `renderToday()`.

Muestra resumen de agenda, citas confirmadas, espera, solapes, número de pacientes y acciones que necesitan atención. El botón `+ Tarea` abre acciones rápidas.

Datos principales: `appointments`, `patients`, configuración de agenda.

### 5.2 Pacientes (`patients`)

Funciones principales: `renderPatients()`, alta mediante `openPatientModal()`.

Responsabilidades:

- listar pacientes activos;
- buscar/abrir ficha;
- crear paciente;
- acceder a papelera/archivados cuando corresponda;
- importar pacientes mediante la vista Importar.

Entidad principal: `db.patients`.

### 5.3 Ficha del paciente (`patientDetail`)

Función: `renderPatientDetail()`.

Cabecera de paciente, próxima cita, trabajos activos, deuda pendiente, documentos firmados y acciones principales.

Pestañas actuales:

- Resumen.
- Planificación.
- Agenda.
- Trabajos.
- Presupuestos.
- Documentos.
- Alertas.
- Comentarios.
- Archivos.

Acciones destacadas: nueva cita, plan, trabajo, presupuesto, pago y odontograma.

### 5.4 Odontograma (`odontogram`)

Funciones principales: `renderOdontogram()`, `renderRestorativeMode()`, `renderPeriodontalMode()` y utilidades de `logic.js`.

Modos:

- Restaurador: caries, obturación, corona, endodoncia, perno, implante, prótesis fija, removible, sano, ausente y extracción.
- Periodontal: seis puntos, sangrado, supuración, placa, furcación, movilidad y resumen por sextantes.

Reglas importantes:

- FDI permanente 18–28 y 48–38.
- Estados correctos, insatisfactorios y pendientes son diferentes.
- Las superficies son V/M/O-I/D/P-L según anatomía.
- El odontograma se almacena por `patient_id` en `db.odontograms`.

### 5.5 Agenda (`agenda`)

Funciones: `renderAgenda()`, `renderAgendaByDoctors()`, `renderAgendaByHours()`.

Vistas por doctor y por horas. Usa empleados, turnos, ausencias, sedes, gabinetes y configuración de intervalo/duración. Debe advertir solapes y conflictos de gabinete/disponibilidad.

Entidad: `db.appointments`.

### 5.6 Tareas (`tasks`)

Función: `renderTasks()`.

Incluye cuatro acciones rápidas:

- Crear paciente.
- Cobrar.
- Dar cita.
- Recibir laboratorio.

Además lista tareas pendientes y completadas. Entidad: `db.tasks`.

### 5.7 Asistente / Denty Local (`assistant`)

Función: `renderAssistant()`.

Permite escribir órdenes y ejecutar NLU local. La voz reutiliza el mismo `Voice Router`. Si no existe IA externa, las reglas locales deben seguir funcionando.

### 5.8 Plantillas (`templates`)

Función: `renderTemplates()`.

CRUD básico de plantillas clínicas/textos. Entidad: `db.templates`.

### 5.9 Fichaje (`staff`)

Función actual: `renderStaff()`.

Estado actual: administra empleados, turnos y ausencias, pero **todavía no es el sistema de fichaje por sesión solicitado**.

Próxima arquitectura prevista:

- login real identifica persona;
- sesión mantiene `authenticatedUserId`;
- fichaje registra entrada, pausa, reanudación y salida vinculadas a ese usuario;
- administrador consulta/rectifica con auditoría.

### 5.10 Trabajos / laboratorio (`jobs`)

Función: `renderJobsDashboard()`.

Gestiona trabajos protésicos, laboratorio, paciente, pieza/trabajo, fechas y estados. Entidades: `db.works`, `db.labs`.

### 5.11 Finanzas (`finances`)

Funciones: `renderFinancesDashboard()`, `renderPaymentHistory()`, modal de cobro.

Distingue pagos manuales de pagos con tarjeta. Entidades: `db.budgets`, `db.payments`.

En preview, si no existe backend de pagos, `paymentApi()` usa un **datáfono virtual de navegador**. Esto sirve solo para probar el flujo; no equivale a un cobro real.

### 5.12 Importar (`import`)

Función: `renderImport()`.

Admite CSV/TSV, detecta cabeceras, previsualiza, marca duplicados/incompletos y permite importar filas válidas. XLSX queda reservado para una fase con lector específico/backend.

## 6. Ajustes

Función raíz: `renderSettings()`. Navegación: `SETTINGS_ADMIN_ITEMS`. Cada apartado se dibuja en el panel principal y debe persistir cambios en `db`.

### 6.1 Clínica

Función: `renderClinicSettingsEditor()`.

Campos: nombre comercial, razón social, NIF/CIF, teléfono, email, web, dirección, sede predeterminada, intervalo de agenda, inicio/fin de jornada, duración por defecto y borrado seguro.

Datos: `db.settings.clinicProfile`, `db.settings.agenda`, `db.settings.slotMinutes`, `db.settings.safeDelete`.

### 6.2 Doctores y horarios

Función: `renderDoctorsSettingsEditor()`.

CRUD de doctores, activación, rol, sede, teléfono, email, color y turnos. Datos: `db.employees`, `db.shifts`, espejo `db.doctors`.

### 6.3 Sedes y gabinetes

Función: `renderSitesSettingsEditor()`.

CRUD de sedes y gabinetes con relación `cabinet.site_id`. Datos: `db.sites`, `db.cabinets`.

### 6.4 Tarifas y tratamientos

Función: `renderTariffsSettingsEditor()`.

CRUD de procedimientos: nombre, categoría, precio, duración, unidad, consentimiento, color, icono y estado. Datos: `db.procedures`.

### 6.5 Laboratorios

Función: `renderLabsSettingsEditor()`.

CRUD de laboratorio: nombre, contacto, teléfono, email, notas y activo. Datos: `db.labs`.

### 6.6 Consentimientos

Función: `renderConsentsSettingsEditor()`.

CRUD: título, versión, firmantes, texto y estado. Datos: `db.consents`. Los documentos firmados se guardan en `db.documents` y el historial en `db.consent_history`.

### 6.7 Documentación

Función: `renderDocsSettingsEditor()`.

Administra plantillas entregables y textos clínicos. Entidad principal: `db.templates`.

### 6.8 Usuarios y acceso

Función: `renderUsersSettingsEditor()`.

Estado actual: usuarios locales, roles, usuario activo, PIN requerido y permisos por rol. No es todavía autenticación con contraseña.

Datos: `db.users`, `db.currentUser`, `db.rolePermissions`, `db.security`.

### 6.9 Apariencia

Función: `renderAppearanceSettingsEditor()` + `applyAppearance()`.

Opciones: claro/oscuro/sistema y densidad. Datos: `db.settings.appearance`, `db.settings.density`.

### 6.10 Pagos y datáfonos

Función: `renderPaymentsSettingsEditor()`.

Configura moneda, lector predeterminado y lector por sede. En preview web autónoma hay lector virtual. Para terminal real las credenciales nunca deben introducirse en el navegador.

Datos: `db.settings.payments`, `paymentRuntime`.

### 6.11 Servidor local

Función: `renderServerSettingsEditor()`.

Se conserva como configuración futura/opcional, pero **no es requisito para abrir la preview**. Datos: `db.settings.server`.

### 6.12 Denty Sync

Función: `renderSyncSettingsEditor()`.

Configura activación, modo e intervalo. Sin backend la prueba de conexión debe informar “no disponible” sin romper la aplicación.

### 6.13 Denty Local AI

Panel `localai`.

Reglas NLU locales están disponibles sin backend. LLM/MCP son escalados opcionales.

### 6.14 MCP / IA externa

Función: `renderMcpSettingsEditor()`.

Solo guarda si el escalado está permitido y la ruta proxy. Nunca guardar tokens en la base del navegador.

### 6.15 Copias y seguridad

Función: `renderBackupSettingsEditor()`.

Configura retención de snapshots y muestra salud de almacenamiento. Datos: `db.settings.backup`, `auditLog` y snapshots de recuperación.

## 7. Voz y comandos

Archivo: `voice-router.js`.

Intenciones actuales:

- `patient.select`
- `patient.create`
- `odontogram.set`
- `odontogram.batch`
- `periodontal.update`
- `appointment.create`
- `comment.add`
- `alert.add`
- `budget.create`
- `payment.record`
- `lab.receive`
- `task.create`
- `navigation.open`

Flujo: texto/voz → `parseVoiceCommand()` → `validateStructuredCommand()` → `executeVoiceCommand()` → persistencia/render. Una IA externa, cuando se añada, debe producir exactamente el mismo tipo de orden estructurada y pasar la misma validación.

## 8. Modelo de datos

Colecciones principales de `db`:

- `patients`: pacientes.
- `users`: usuarios de la aplicación.
- `rolePermissions`: permisos por rol.
- `currentUser`: usuario activo de preview.
- `cabinets`: gabinetes.
- `odontograms`: odontograma por paciente.
- `appointments`: citas.
- `treatmentPlans`: planes jerárquicos.
- `employees`: profesionales/personal.
- `doctors`: proyección de odontólogos.
- `sites`: sedes.
- `shifts`: horarios.
- `absences`: ausencias.
- `works`: trabajos de laboratorio.
- `labs`: laboratorios.
- `budgets`: presupuestos.
- `payments`: cobros/intentos.
- `documents`: documentos de paciente.
- `consent_history`: histórico de firma.
- `consents`: plantillas de consentimiento.
- `procedures`: catálogo de tratamientos/tarifas.
- `clinicalAlerts`: alertas.
- `comments`: comentarios.
- `files`: referencias a archivos.
- `tasks`: tareas.
- `auditLog`: auditoría local.
- `templates`: plantillas de texto.
- `settings`: configuración de clínica, agenda, apariencia, servidor, sync, MCP, copias, pagos y voz.

## 9. Persistencia y migración

Clave actual: `DB_KEY` en `logic.js`. `PREVIOUS_KEYS` permite recuperar previews anteriores. `migrateDb()` completa campos nuevos sin borrar colecciones existentes.

Regla: toda nueva colección o configuración debe añadirse tanto a `defaultDb()` como a `migrateDb()`.

## 10. Integraciones externas

### Pago real

`server.py` contiene integración de backend para pagos. En la preview 1.7.2 el navegador usa automáticamente un gateway virtual cuando no encuentra backend. Nunca colocar API keys de SumUp u otro adquirente dentro de `app.js`, `index.html`, `localStorage` o el bundle.

### IA / MCP

Las reglas locales funcionan sin red. Cualquier clave de IA debe permanecer fuera del navegador.

### Sync

La interfaz está preparada, pero la sincronización clínica real exige backend, control de concurrencia, cifrado y autenticación.

## 11. Archivos del proyecto

- `index.html`: shell y puerta de acceso.
- `app.js`: estado de UI, renderizadores, bindings y flujos de aplicación.
- `logic.js`: modelo, migración y lógica de dominio.
- `voice-router.js`: parser/validador/ejecutor de órdenes de voz.
- `denty-app.bundle.js`: archivo generado para preview autónoma.
- `build-static-bundle.mjs`: generador del bundle.
- `server.py`: integraciones opcionales de backend.
- `styles.css` + `phase*.css` + `visual-polish.css`: estilos.
- `cinematic-motion.js/css`: mejora visual opcional.
- `verify_*.mjs` / `verify_*.py`: regresiones.
- `docs/UI-MAP.json`: mapa estructurado para automatización y futuras ediciones.

## 12. Procedimiento obligatorio para futuras actualizaciones

1. Modificar **fuentes**, nunca `denty-app.bundle.js` a mano.
2. Si cambia comportamiento, añadir/actualizar una prueba `verify_*.mjs` o `verify_*.py`.
3. Ejecutar la prueba y comprobar que falla por la causa esperada antes del cambio cuando sea una función nueva/bug.
4. Implementar en `logic.js`, `voice-router.js`, `app.js`, HTML/CSS según responsabilidad.
5. Ejecutar `node build-static-bundle.mjs`.
6. Ejecutar `node verify_static_page.mjs` y las regresiones relevantes.
7. Actualizar `docs/DOCUMENTACION-DENTY.md` y `docs/UI-MAP.json` si cambian pantallas, datos, botones o dependencias.
8. Empaquetar solo después de verificar el ZIP descomprimido.

## 13. Deuda funcional conocida

- Login real con usuario/contraseña: pendiente.
- Cuenta Paciente: pendiente.
- Fichaje por sesión autenticada: pendiente.
- Persistencia multiusuario segura: pendiente.
- Sync clínico real: pendiente.
- TPV físico real: backend disponible como integración, pero la página autónoma solo simula el lector.
- LLM/MCP real: opcional, requiere backend seguro.
- Archivos clínicos reales: la preview maneja referencias, no un repositorio documental robusto.

Mantener esta lista explícita evita confundir una pantalla preparada con una función terminada.
