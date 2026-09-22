# ASSUMPTIONS

## 2026-09-21 · A-001 · Fuente funcional
El prompt fue redactado contra Denty 2.0.0, pero la conversación ha evolucionado Denty hasta **2.3.7**. Para evitar regresiones, 2.3.7 manda sobre comportamiento funcional; el prompt maestro manda sobre arquitectura, calidad, seguridad y Definition of Done.

## 2026-09-21 · A-002 · Backend
El ZIP desplegable no incluye backend. Existe source de `apps/api`, pero se trata como referencia hasta validar el `DENTY_API_URL` de producción.

## 2026-09-21 · A-003 · Multi-sede
Se mantienen `siteId`/`cabinetId`, varias sedes/gabinetes y horario por sede.

## 2026-09-21 · A-004 · Zona horaria
Todas las reglas de negocio usarán `Europe/Madrid`.

## 2026-09-21 · A-005 · Datos de prueba
El modo demo debe ser explícito, aislado y solo en memoria. Juan Pérez · Ficha 000001 seguirá como fixture, nunca como paciente hardcodeado de producción.

## 2026-09-21 · A-006 · Fases opcionales
O1 offline cifrado, O2 quiosco y O3 backend de referencia **no se ejecutan** sin aprobación expresa del usuario.

## 2026-09-21 · A-007 · Capturas F0
El entorno actual no puede instalar dependencias desde npm y no dispone de URL Vercel del despliegue. Las capturas baseline de rutas Next quedan bloqueadas hasta disponer de runtime o URL accesible. No impide generar la documentación de auditoría, pero **sí impide declarar F0 cerrada** según el prompt.

## 2026-09-21 · A-008 · Excepción para iniciar F1
El usuario autorizó expresamente iniciar F1 aunque F0 siga sin capturas visuales por imposibilidad de desplegar/arrancar la versión anterior. F0 permanece marcada como incompleta; esta excepción **no** relaja la puerta de salida de F1 ni autoriza iniciar F2 sin `lint`, `typecheck`, `test` y `build` verdes.

## 2026-09-21 · A-009 · Consulta de versiones npm bloqueada en shell
`npm view` contra el registro agotó el tiempo de red en este entorno. Para no inventar versiones, se conservaron las versiones auditadas de Next/React/TypeScript y se verificaron las nuevas herramientas contra sus páginas actuales de npm accesibles por búsqueda web. La instalación/lockfile sigue pendiente de una ejecución con acceso al registro.


## A-010 · Bootstrap temporal de lockfile en Vercel
- Fecha: 2026-09-21.
- Motivo: el entorno local no resuelve registry.npmjs.org, mientras que Vercel sí tiene acceso al registro.
- Decisión: un único despliegue de F1 genera el lock antes de `npm ci` y lo publica como artefacto estático. El estado final vuelve a `npm ci` puro.

## 2026-09-21 · A-011 · Avance autorizado a F2 tras Vercel verde
El usuario confirmó que la versión F1 con separación Vitest/Playwright ya funciona en Vercel y pidió continuar modernizando la arquitectura. Se inicia F2 con esa autorización. El `package-lock.json` raíz sigue pendiente porque el artefacto de Vercel no está accesible desde este entorno; el bootstrap temporal no se considera arquitectura final.

## A-012 · Continuación autorizada pese al gate local incompleto de F2 · 2026-09-21
El usuario indicó explícitamente que la versión desplegada ya funciona y pidió continuar modernizando Denty y recuperar funciones/pipeline del historial. Se avanza en F3 sin declarar F2 formalmente cerrada hasta disponer del log completo de calidad de esa fase.

## A-013 · Historial como especificación, no como arquitectura · 2026-09-21
Las funciones recuperadas de Denty 2.x se portan como reglas puras o contratos. No se copian `localStorage` clínico, login local ADMIN, prompts, CSS legacy, monorepo ni otros mecanismos contrarios al prompt maestro.

## A-014 · Transiciones de plan y receta aún inferidas · 2026-09-21
El prompt fija los estados y parte de las transiciones, pero no define todas las rutas de cancelación/reactivación. Hasta confirmar el backend, se usa una política conservadora en `domain/state-machines`: los ítems `COMPLETED/CANCELLED` son terminales; `DEFERRED` puede volver a `PLANNED/ACTIVE`; una receta puede anularse desde `DRAFT/READY/ISSUED`. Estas transiciones son **INFERIDAS** y el backend sigue siendo la autoridad.

## A-015 · Kennedy es sugerencia, no diagnóstico automático · 2026-09-21
Se recupera el clasificador conservador de Denty 2.3.x como `suggestKennedyClass`. Solo devuelve una sugerencia para dentición permanente de una única arcada; casos ambiguos devuelven `UNCLASSIFIED`. La clasificación definitiva requiere confirmación explícita del profesional antes de aprobar la alternativa removible.

## 2026-09-21 — Normalización de formato en despliegue ZIP manual

- **Contexto:** los ZIP generados durante la migración F2/F3 no disponen de un entorno npm local capaz de ejecutar Prettier antes de entregarse, mientras Vercel sí instala las dependencias correctamente.
- **Decisión temporal:** el `buildCommand` de Vercel ejecuta `npm run format` antes de `npm run verify`. El script `verify` permanece estricto y sigue ejecutando `prettier --check .`.
- **Alcance:** solo adapta el flujo de ZIP manual a Vercel; el CI de repositorio no autoformatea antes de verificar.
- **Salida:** retirar esta normalización del `buildCommand` cuando el artefacto verificado por CI sea la fuente habitual de despliegue y lleve el código ya formateado.
