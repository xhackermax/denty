# Denty — Storage clínico y política de backups

## Estado

Etapa 5 cerrada en código. Este documento define la arquitectura que las etapas posteriores deben **extender, no duplicar**.

## 1. Principios obligatorios

1. **Postgres conserva metadata; Supabase Storage conserva bytes.** Fotos y documentos clínicos no se guardan como base64 dentro de JSON o columnas de negocio.
2. **Los buckets clínicos son privados.** El acceso normal usa la publishable key + JWT del usuario y queda sujeto a Storage RLS. El service role no se usa para CRUD clínico ordinario.
3. **La ruta de cada objeto incluye tenant y paciente:** `<clinic_id>/<patient_id>/<uuid>.<ext>`.
4. **Los documentos clínicos son inmutables.** Una nueva versión crea un nuevo objeto y una nueva fila de versión; nunca sobrescribe el objeto previo.
5. **Las fotos de paciente se sustituyen mediante comando dedicado.** `photo_url` es una proyección de lectura estable (`/api/patients/:id/photo`), no un campo arbitrario editable por el cliente.
6. **Toda carga binaria usa multipart/form-data.** No se aceptan adjuntos grandes serializados como base64.
7. **La aplicación no simula backups.** Si el estado de Supabase Managed Backups no puede consultarse, la UI muestra `no conectado` en lugar de inventar copias.

## 2. Buckets

### `patient-photos`

- Privado.
- Límite: 5 MiB.
- MIME admitidos: JPEG, PNG, WebP.
- INSERT: staff autorizado de la clínica y paciente perteneciente a esa misma clínica.
- SELECT: usuario que pueda acceder al paciente mediante la política canónica.
- UPDATE: no permitido desde la aplicación.
- DELETE: solo para objetos huérfanos que ya no estén referenciados por `patients.photo_storage_path`. Esto permite compensar una subida fallida sin borrar una foto clínica activa.

### `clinical-documents`

- Privado.
- Límite: 25 MiB.
- MIME admitidos: PDF, JPEG, PNG, WebP.
- INSERT: staff autorizado de la clínica y paciente de esa clínica.
- SELECT: usuario con acceso al paciente.
- UPDATE: no permitido.
- DELETE: solo objetos huérfanos no referenciados por `documents.storage_path`.

## 3. Foto de paciente

Flujo canónico:

1. El usuario pulsa explícitamente **Abrir cámara** o selecciona un archivo.
2. En cámara, el navegador solicita permiso solo en ese momento.
3. La captura se previsualiza y se comprime en cliente (JPEG, lado máximo 1280 px).
4. El paciente debe existir antes de subir la foto.
5. `POST /api/patients/:id/patient-photo` recibe multipart, valida tamaño/MIME y sube a `patient-photos` con JWT del usuario.
6. El servidor calcula SHA-256 y guarda en `patients`: `photo_storage_path`, `photo_mime_type`, `photo_checksum` y la URL lógica `/api/patients/:id/photo`.
7. `GET /api/patients/:id/photo` descarga desde el bucket privado y responde con `Cache-Control: private, no-store`.
8. Solo después de persistir la nueva referencia se intenta retirar la foto anterior, y únicamente si ya quedó huérfana.

No añadir `photoUrl` a los schemas de create/update de paciente. Toda mutación de foto debe pasar por el comando dedicado.

## 4. Documentos y versionado

- La primera fila documental se crea con metadata clínica y versión 1.
- Al adjuntar el primer archivo se completa esa versión con `storage_path`, `file_name`, `mime_type`, `checksum`, `file_size_bytes` y metadata.
- Si ya existe un archivo, una nueva carga crea **otra fila** con:
  - mismo `version_series_id`,
  - `version = anterior + 1`,
  - `previous_version_id = anterior.id`,
  - nuevo objeto Storage inmutable.
- El índice `(version_series_id, version)` impide duplicar números de versión.
- `storage_path` es único.
- El checksum SHA-256 se calcula del lado servidor sobre los bytes recibidos.
- Si Storage acepta el objeto pero falla la escritura de Postgres, el servidor intenta borrar únicamente ese objeto huérfano.

Las etapas posteriores de firma/consentimientos/recetas deben reutilizar esta estrategia o una especialización compatible; no crear un segundo almacén binario.

## 5. Backups

La pantalla de Ajustes consulta el estado real de Supabase Managed Backups mediante la Management API cuando están configurados:

- `SUPABASE_URL` (el proyecto se obtiene automáticamente) o `SUPABASE_PROJECT_REF` para dominios propios
- `SUPABASE_MANAGEMENT_ACCESS_TOKEN`

El token se configura solo en el servidor de Vercel; después hay que desplegar. Si faltan variables, se muestra configuración pendiente. `connected` confirma una respuesta válida de Supabase; una credencial presente pero rechazada nunca se muestra como conexión correcta.

Ajustes permite actualizar el estado y abrir la configuración real del proyecto. La programación, retención y PITR se ajustan en Supabase según su plan; Denty no almacena preferencias que el proveedor no vaya a ejecutar. Las fechas se muestran en Europe/Madrid.

**Importante:** el backup de base de datos de Supabase cubre Postgres/metadata, pero no restaura los objetos borrados de Storage. Por eso Denty evita sobrescribir/borrar documentos clínicos referenciados y requiere una política operativa adicional para resiliencia de objetos (retención/off-site/export según el despliegue de cada clínica).

La aplicación no debe reintroducir botones ficticios de “crear copia” ni una tabla local de backups que pretenda representar las copias administradas por Supabase.

## 6. Pruebas que protegen esta arquitectura

- `scripts/stage5-storage-documents-contract.test.mjs`
- `scripts/stage5-backup-status-runtime.test.mjs`
- Gates de arquitectura/API parity/BFF existentes.

## 7. Validaciones LIVE pendientes

Las tareas `S5-LIVE-*` del `DENTY-SHOPPING-LIST` (archivada en `docs/archive/inventories/`) son validaciones contra Supabase/Node 24 reales. No autorizan a reimplementar Etapa 5 salvo que una de ellas reproduzca un fallo concreto atribuible a este código.
