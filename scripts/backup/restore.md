# Copias locales de Supabase

Requisitos: Node 24, CLI Supabase, `psql` compatible con el servidor, `tar`, `age`
y Docker cuando lo requiera la CLI Supabase. La copia no se ejecuta en Vercel.

## Crear una copia

Configurar en el equipo local, mediante variables de entorno:

- `SUPABASE_DB_URL`: conexión Postgres con permisos de lectura y volcado de roles.
- `SUPABASE_URL`: URL HTTPS del mismo proyecto.
- `SUPABASE_SECRET_KEY` o `SUPABASE_SERVICE_ROLE_KEY`: lectura administrativa de Storage.
- `BACKUP_AGE_RECIPIENT`: destinatario público de age; conservar su clave privada aparte.
- `BACKUP_OUTPUT_DIR`: opcional; por defecto `~/denty-backups`, fuera del repositorio.
- `BACKUP_RETENTION`: número de copias completas que conservar; por defecto 7.

Ejecutar `npm run backup:db`. Solo queda el archivo `.tar.gz.age` y los archivos
anteriores dentro de la retención; los temporales sin cifrar se limpian al finalizar.
Un bloqueo evita copias concurrentes. Si el proceso termina abruptamente, comprobar
que no está activo antes de eliminar `.denty-backup.lock` y sus temporales privados.

Se enumeran todos los esquemas SQL no internos, incluidos auth y storage, para
pasarlos explícitamente a la CLI. El manifiesto contiene hashes, tamaños y las rutas
originales de los objetos. Los archivos locales usan nombres hash y no rutas remotas.

La CLI conserva sus exclusiones de objetos administrados: esta copia lógica no
incluye WAL, configuración del proyecto, claves, proveedores OAuth, Edge Functions
ni infraestructura del servicio. Conservar esas configuraciones por separado.
El esquema y los datos de Storage no sustituyen sus archivos: ambos se incluyen.
Evitar cambios mientras se copia: SQL y Storage no comparten una transacción global.

## Restaurar en un entorno de prueba

1. Usar un proyecto aislado, nunca producción. Verificar versión Postgres y extensiones.
2. Descifrar en un directorio local privado:

```sh
mkdir -m 700 restore-denty
age -d -i /ruta/clave-privada.age -o restore-denty/copia.tar.gz /ruta/copia.tar.gz.age
tar -xzf restore-denty/copia.tar.gz -C restore-denty
```

3. Comprobar los hashes SHA-256 del manifiesto para SQL y todos los objetos.
4. Revisar roles y objetos administrados existentes en el proyecto destino; adaptar
   solo conflictos conocidos en una copia del SQL. No sobrescribir roles gestionados.
5. Importar primero roles, luego esquema y finalmente datos en la base aislada:

```sh
psql "$RESTORE_DB_URL" -v ON_ERROR_STOP=1 -f restore-denty/roles.sql
psql "$RESTORE_DB_URL" -v ON_ERROR_STOP=1 -f restore-denty/schema.sql
psql "$RESTORE_DB_URL" -v ON_ERROR_STOP=1 -f restore-denty/data.sql
```

6. Verificar los buckets del manifiesto y crearlos mediante Storage API cuando falten.
   Subir cada `objects[].file` a su `bucket` y `path`, codificando cada segmento de URL,
   con el `contentType` registrado y credenciales del proyecto destino.
7. Comprobar recuentos, aislamiento por clínica, acceso a documentos, fotos y adjuntos.
   Registrar fecha, versión de herramientas y resultado de la restauración periódica.
8. Eliminar archivos descifrados cuando termine la validación.

Las pruebas automatizadas simulan procesos y Storage para comprobar errores,
limpieza y retención. No sustituyen una restauración real del proyecto.
