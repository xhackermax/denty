# Roadmap Denty Nueva Arquitectura

Este documento consolida las mejoras pendientes tras fusionar la nueva arquitectura de Denty en `main`.

## Fase Agenda Operativa

- Arrastrar citas siempre con raton.
- Redimensionar la duracion de cada cita desde la agenda.
- Copiar y pegar citas.
- Menu de tres puntos por cita para acciones rapidas.
- Ausencias seleccionando doctores registrados.

## Fase Documentos, Recetas Y Legal

- Consentimientos informados del Colegio de Dentistas de Aragon.
- Recetas firmables.
- Quitar el campo de principio activo en recetas.
- Convertir la forma de administracion en desplegable.
- Verifactu visible y accionable donde corresponda.

## Fase CRM Operativo

- Cambiar el estado de trabajos de laboratorio.
- Boton rapido de tareas en la barra superior.
- Selector demo entre cuenta administrador y cuenta paciente.
- Pacientes en carrusel vertical infinito estilo iPod.
- Permisos reales de microfono y camara.
- Pagos conectados al flujo de datafono como en versiones anteriores.

## Criterio De Fusion

La rama `vercel-supabase-r6-deploy` es la base de la nueva arquitectura. `main` debe avanzar hacia esta estructura y conservar:

- `apps/web` como aplicacion principal.
- `docs` como fuente de decisiones, auditorias, planes y roadmap.
- `packages` como espacio reservado para modulos compartidos.
- `.superpowers/sdd` como registro reutilizable de fases y agentes.
- Pipeline de pruebas y despliegue Vercel ya validado.
