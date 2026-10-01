# Denty: cambios del roadmap del 1 de octubre

Base revisada: `main`, commit `1939b60`. El JSON adjunto parte de una versión anterior.

## Objetivo y entrega

Completar los seis bloques del roadmap, conservando la interfaz sencilla y los datos ya guardados.
Trabajar por bloques verificables y hacer push a `main`; Vercel despliega con su integración de GitHub.
No afirmar que el despliegue terminó sin consultar su estado.
La exportación CSV/XLSX ya está implementada y verificada: conservarla.

## 1. Volver y cambios sin guardar

- Añadir flecha accesible en el encabezado compartido, con destino alternativo según la página.
- Usar historial interno de la aplicación; una entrada directa vuelve al destino alternativo.
- Registrar un guard compartido para la flecha, pestañas y enlaces internos.
- Mostrar Guardar / Descartar / Cancelar cuando haya cambios locales pendientes.
- Guardar espera la respuesta del servidor; un error conserva el editor y cancela la navegación.
- Descartar restaura las entidades inicialmente cargadas y limpia deshacer/rehacer.
- Recarga y cierre usan el aviso nativo de `beforeunload` mientras haya cambios.
- Volver entre pasos de tratamiento conserva los datos; la flecha principal vuelve al odontograma.
- No borrar ni revertir planes, presupuestos o snapshots ya guardados en el servidor.

## 2. Cirugía

Añadir Gingivectomía, Regularización ósea, Férula quirúrgica guiada y Malla de titanio.
Conservar Alveoloplastia y sus entidades históricas; no convertir registros anteriores.
Regularización ósea usa un código explícito y mantiene su equivalencia descriptiva con alveoloplastia.
La férula guiada afecta a una arcada y se relaciona con los implantes planificados de esa arcada.
La malla se representa como membrana; gingivectomía y regularización como cirugía.
Actualizar selección, glifos, leyenda, opciones de agenda, voz y sincronización del plan.
Distinguir férula quirúrgica de férula oclusal.
El presupuesto toma el precio configurado en el catálogo de la clínica; no inventar precios.
Añadir una migración compatible para los mapeos SQL; comprobarla sin modificar registros clínicos existentes.

## 3. Tareas

Permitir arrastrar en inbox y agenda respetando las tareas ocultas por filtros.
Añadir botones subir/bajar utilizables con teclado y pantallas táctiles, sin introducir dnd-kit.
Mantener el arrastre existente de citas y tareas.
Conservar la actualización optimista y restaurar el orden anterior si el servidor falla.
Bloquear cambios de orden simultáneos mientras se guarda.

## 4. Contactos especiales

Tarjetas adaptables agrupadas por categoría, con iniciales e iconos suaves del sistema existente.
Mantener búsqueda, filtro, creación, edición y eliminación.
Acciones accesibles para llamar, WhatsApp, email y copiar, solo cuando existan datos válidos.
Usar tokens Mantine y estilos compartidos; estado vacío con Añadir contacto.
Conservar los permisos y la API actual.

## 5. Recetas y alergia a AINEs

Añadir los cinco grupos de pautas solicitados y priorizarlos cuando la ficha indique alergia a AINEs.
Usar el perfil médico completo del paciente seleccionado, también al editar una receta.
Bloquear AINEs conocidos en selección, entrada manual y guardado/emisión; mostrar el motivo.
Añadir comprobaciones en servidor para que el bloqueo no dependa únicamente de la interfaz.
No incluir metamizol por defecto ni modificar dosis del vademécum existente.
Evitar duplicar paracetamol: para dolor intenso, presentar paracetamol y tramadol/paracetamol como alternativas.
Mantener la revisión y validación del prescriptor antes de emitir una receta.
Las nuevas pautas son ayudas editables, no sustituyen la evaluación clínica individual.

## 6. Copias locales de Supabase

Añadir `npm run backup:db` como herramienta local, sin endpoint HTTP en Vercel.
Usar CLI Supabase para roles, esquema y datos; incluir los objetos de Storage y un manifiesto verificable.
Comprimir y cifrar con age antes de conservar la copia definitiva; destinatario público por configuración.
Secretos mediante variables locales: conexión Postgres, URL Supabase y clave de servicio; no registrarlos.
Usar un directorio temporal privado y limpiar los archivos sin cifrar incluso al fallar.
Guardar las copias cifradas fuera del repositorio y excluir `backups/` en Git.
Retención configurable aplicada solamente tras generar una copia completa correctamente.
Documentar restauración en un proyecto de prueba, SQL y Storage, y las exclusiones de la CLI.
No anunciar una copia real o una restauración real sin haberlas ejecutado con credenciales autorizadas.

## Validación

TDD por bloque con pruebas de comportamiento, permisos, aislamiento y errores.
Verificar formatos clínicos, procedimientos por arcada, rutas internas y restauración de estado.
Probar copias con procesos/Storage simulados: cifrado, limpieza, errores y retención.
Ejecutar suite completa, TypeScript, lint, formato y pipeline `vercel-build` antes del push.
Documentación nueva por debajo de 200 líneas por archivo.
La aplicación de SQL en Supabase y una restauración real quedan condicionadas al acceso disponible.
