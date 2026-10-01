# Denty — Mejoras futuras (después de la Etapa 13)

Prioridad sugerida: 🔴 alta · 🟠 media · 🟢 baja. Cada punto indica **qué**, **por qué** y
**cómo** encaja con la arquitectura actual (Supabase como fuente única, RPC canónicas,
Storage privado por clínica).

---

## 🔴 1. Copias de seguridad en local (descarga cifrada)

**Qué:** botón en *Ajustes → Copias de seguridad* → "Descargar copia local" que genera un
fichero cifrado con los datos de la clínica, más una restauración guiada.

**Por qué:** los backups de Supabase (diarios / PITR) protegen la base de datos, pero la
clínica quiere una copia propia (disco externo/NAS) por obligación de custodia de la
historia clínica y por independencia del proveedor. Los objetos de Storage (fotos,
consentimientos firmados, recetas) **no** están en esos backups.

**Cómo:**
1. RPC `export_clinic_snapshot(p_clinic_id)` (solo ADMIN, `security definer` con
   comprobación de rol) que devuelve JSON por tabla filtrado por `clinic_id`, con versión
   de esquema (último `schema_migrations.version`).
2. Ruta `/api/admin/backups/export` (servidor): une el JSON + los objetos de Storage de la
   clínica en un **ZIP** con `manifest.json` (SHA-256 de cada fichero).
3. **Cifrado en el navegador** con una contraseña que elige el administrador
   (Web Crypto: PBKDF2 → AES‑GCM). Denty nunca ve la contraseña: si se pierde, la copia
   no se puede abrir.
4. Registro en `audit_log` (`backup.exported`, quién, cuándo, tamaño, hash) — es una
   exportación masiva de datos de salud.
5. Programable: tarea semanal que recuerda "Descarga tu copia" (tabla `tasks`).
6. Restauración: solo a una clínica **nueva/vacía** (nunca sobrescribir), validando
   versión de esquema y hashes; ejecutada como RPC transaccional.
7. Opcional escritorio: pequeña app/servicio (Windows) que descarga la copia cada noche a
   una carpeta local o NAS usando un token de solo exportación.

## 🔴 2. Optimizar la foto de perfil del paciente (ahorro de datos)

**Qué:** redimensionar y comprimir en el navegador antes de subir.

**Cómo:**
1. En `patient-photo-capture.tsx`, tras capturar/seleccionar: dibujar en `canvas` a
   **512×512** (recorte cuadrado centrado) y exportar **WebP calidad 0,8** (fallback JPEG
   0,82 en Safari antiguo). Resultado típico: 3–5 MB → **30–60 KB**.
2. Generar además una miniatura **96×96** para listas y carrusel (`photo_thumb_path`).
3. Eliminar metadatos EXIF (geolocalización) — el re-dibujado en canvas ya los quita.
4. Servir con URL firmada corta + `cache-control` largo e invalidar por `photo_checksum`.
5. En listas usar la miniatura y `loading="lazy"`; en móvil con "ahorro de datos"
   (`navigator.connection.saveData`) no cargar fotos hasta abrir la ficha.
6. Migración: script que recomprime fotos existentes y conserva la original 30 días.

## 🔴 3. Gestión documental completa

Base hecha en la Etapa 13: plantillas por clínica, consentimientos con **firma
manuscrita** (evidencia en Storage + SHA‑256) que desbloquean el presupuesto.

Pendiente:

| Tipo | Qué falta |
|---|---|
| **Consentimientos informatizados** | Editor de plantillas con variables (`{{paciente}}`, `{{tratamiento}}`, `{{pieza}}`, `{{fecha}}`); **PDF final** con texto + firma + sello de tiempo + hash; firma en tablet/iPad en modo kiosco; firma del profesional; revocación del consentimiento; versión de plantilla congelada en el documento. |
| **Recetas** | (Etapa 12 hecha) Integración con receta electrónica privada homologada (p. ej. Receta Médica Privada del Consejo de Dentistas / proveedor acreditado), CSV y código de verificación. |
| **Justificantes** | Endpoint `/api/documents/attendance-certificate` (el contrato ya existe en el cliente) que genera PDF con hora de llegada/salida reales de recepción (`appointments.arrived_at/completed_at`) y firma de la clínica. |
| **Otros** | Presupuesto firmado en PDF, informe clínico, documentos del laboratorio, envío al portal del paciente y por email con enlace caducable, retención/archivo según LOPDGDD (mínimo 5 años de historia clínica). |

## 🟠 4. IA y voz
- Ruta `/api/voice/interpret` con salida estructurada (ver `docs/guias/IA-VOZ-NLU.md`).
- Tratamientos, citas y laboratorio ejecutables por voz.

## 🟠 5. VERI\*FACTU — conector AEAT
- Firma XAdES del registro, envío SOAP a la AEAT, almacenamiento del CSV de respuesta,
  reintentos desde `integration_events`, QR tributario en el PDF de factura
  (ver `docs/guias/VERIFACTU.md`).

## 🔴 6b. Contactos especiales de la clínica (proveedores y servicios)

**Qué:** una libreta de contactos de la clínica, separada de los pacientes, para apuntar
teléfonos y datos de fontanero, electricista, empresa de reparto, mantenimiento,
laboratorios de urgencia, gestoría, etc. Nueva categoría con sus propias fichas
(nombre, empresa, categoría, teléfono(s), email, notas, horario) y búsqueda rápida.

**Por qué:** Denty gestiona la clínica entera, no solo pacientes. Hoy esos datos viven en
papeles o en móviles personales y se pierden al cambiar de personal.

**Cómo (a diseñar):**
- Tabla `clinic_contacts` por clínica con RLS de personal, categorías configurables y
  auditoría como el resto de tablas.
- Desde una tarea o por voz ("apunta el teléfono del fontanero: …") crear/consultar un
  contacto, y enlazar un contacto a una tarea ("llamar al fontanero").
- Llamar/escribir con un toque desde móvil (`tel:` / `mailto:`).
- No mezclar con `laboratories` ni `suppliers` (ya tienen su ciclo financiero): decidir
  si se enlazan o si los contactos los referencian.

## 🟠 6. Calidad
- Subir la cobertura de dominio del 78 % actual hacia el 90 % (umbral en `vitest.config.ts`
  como *ratchet*: solo puede subir).
- Unificar selectores CSS duplicados (113 avisos de Stylelint).
- Tests E2E (Playwright) del flujo completo: alta → odontograma → plan → consentimiento
  firmado → presupuesto firmado → cita → cobro → factura.

## 🟢 7. Operación
- Dominio propio en Vercel y desactivar la protección de despliegue para producción.
- Activar *Leaked password protection* en Supabase Auth.
- Plantillas de email de Supabase Auth en español (invitación, recuperación).
