# Arquitectura del pipeline Denty V3

Fecha: 2026-09-21

## Objetivo

Tener una sola definición de orden, entorno, timeout y política de fallo para local, CI y Vercel.
`package.json`, Vercel y GitHub pueden exponer entradas distintas, pero delegan en `scripts/pipeline`.

## Flujo real

```text
source ZIP / checkout
        |
        v
history -> pipeline-self-check -> deployable -> domain-smoke
                                             |
                                             v
                                      lock-bootstrap -> install -> capture-lock
                                                            |
                 +-----------------+--------------------------+------------------+
                 |                 |                 |        |                  |
                 v                 v                 v        v                  v
           architecture          format             lint    styles            typecheck
                 \                 |                 |        |                  /
                  \                |                 |        |                 /
                   +---------------+-----------------+--------+----------------+
                                           |
                                           v
                                          unit
                                           |
                             +-------------+-------------+
                             |                           |
                             v                           v
                         coverage                      build
                                                         |
                                               playwright-browsers
                                                         |
                                                         v
                                                        e2e
                                                         |
                                                         v
                                              prepare-package
                                                         |
                                              verify-package
                                                         |
                                                         v
                                                       package
```

El grafo expresa dependencias. El runner lo ejecuta secuencialmente por defecto porque Vercel usa una
máquina de 2 cores y paralelizar `tsc`, ESLint y Vitest compite por CPU/memoria. El DAG deja abierta una
paralelización posterior si las métricas la justifican, sin obligarnos a implementarla ahora.

## Decisiones de patrones

| Patrón | Aplica | Problema concreto | Coste | Veredicto |
|---|---|---|---|---|
| Pipeline/stages | Sí | Había cadenas `&&` duplicadas y difíciles de diagnosticar | Catálogo + runner | Adoptado |
| DAG | Sí | Calidad, build, cobertura, E2E y packaging comparten dependencias no lineales | Grafo explícito | Adoptado, ejecución secuencial |
| Chaining/fluent | No | No mejora lectura sobre objetos de stage | Indirección | Rechazado |
| Streams | Parcial | Necesitamos evidencia incremental de una ejecución larga | Archivo NDJSON | Solo stream de eventos |
| Middleware genérico | No | Logging/timeout/retry caben en el executor | Cadena abstracta | Rechazado |
| Hooks before/after | No | Captura de lock y packaging son stages reales, no hooks ocultos | Orden implícito | Rechazado |
| Plugins | No | No hay terceros extendiendo el pipeline | API pública innecesaria | Rechazado |
| Decorators | No | No existe repetición que justifique wrappers declarativos | Magia | Rechazado |
| Chain of Responsibility | No | No hay handlers alternativos de una misma petición | Más objetos | Rechazado |
| Strategy | Parcial | Retry cambia según tipo de stage | Config simple en stage | Sin clases Strategy |
| Módulos/capas | Sí | Grafo, ejecución y reporting estaban mezclados | 4 módulos pequeños | Adoptado |
| DI/interfaces | Parcial | El grafo es puro y testeable sin procesos | Pasar datos/funciones | Sin interfaces de una implementación |
| Builder | No | Los stages son objetos pequeños y legibles | Boilerplate | Rechazado |
| Scaffold/template | Parcial | Añadir un stage debe seguir contrato estable | Documentación | Sin generador |
| Jobs/tasks | Sí | CI/Vercel necesitan orden, timeout y retry acotado | Runner | Adoptado |
| ETL/ELT | No | El pipeline no mueve datasets | Modelo incorrecto | Rechazado |
| CI/CD gates | Sí | Fallos llegaban tarde a Vercel | Tiempo de CI | Adoptado |
| Event-driven/observer | Parcial | Consola + NDJSON + resumen consumen los mismos eventos | Emisor local | Sin bus externo |
| Pub-sub externo | No | No hay consumidores distribuidos | Infraestructura | Rechazado |
| Reactivo | No | No hay flujo continuo de señales de negocio | Complejidad | Rechazado |

## Contrato de stage

Un stage declara datos, no callbacks arbitrarios:

```js
{
  description: "Run strict TypeScript checks",
  needs: ["install"],
  command: { kind: "bin", name: "tsc", args: ["--noEmit"] },
  env: {},
  timeoutMs: 120000,
  retry?: {
    attempts: 2,
    delayMs: 2000,
    outputIncludes: ["ECONNRESET"]
  }
}
```

Los reintentos solo existen para errores transitorios de red de npm. Lint, tipos, tests y build nunca se
reintentan automáticamente porque un segundo intento ocultaría un fallo determinista.

## Errores

- **Dominio/calidad**: abortan inmediatamente, sin retry.
- **Dependencias incompatibles (ERESOLVE)**: abortan, sin `--force` ni `--legacy-peer-deps`.
- **Red npm transitoria**: un único reintento si la salida contiene un error de red conocido.
- **Timeout**: SIGTERM y, tras 5 s, SIGKILL. El stage falla.
- **Playwright**: el runner no reintenta el stage; Playwright conserva su política por test.
- **Packaging**: solo ocurre después de E2E verde.

## Observabilidad

Cada ejecución tiene `DENTY_PIPELINE_RUN_ID` y emite:

- consola: `pipeline:start`, `stage:start`, `stage:success`, `stage:retry`, `stage:failure`;
- `.artifacts/pipeline/*.ndjson`: stream de eventos inmutables;
- `.artifacts/pipeline/*.json`: informe completo;
- `.artifacts/pipeline/*.md`: resumen humano.

No se registran variables de entorno ni datos clínicos.

## Configuración

- Nada de rutas de backend hardcodeadas.
- `NODE_ENV=test` se fija en el stage `unit/coverage/e2e`.
- `NODE_ENV=production` se fija únicamente para `build`.
- Los targets Vercel son `vercel-install` y `vercel-build`.
- El artefacto final generado por CI incluye `package-lock.json` y cambia `installCommand` a `npm ci` sin
  modificar el source checkout.

## Añadir una etapa

1. Añadir un objeto en `scripts/pipeline/catalog.mjs`.
2. Declarar `needs`, `timeoutMs` y comando.
3. Añadirla a un target solo si debe ejecutarse en ese flujo.
4. Añadir un caso en `graph.test.mjs` si introduce una nueva invariantes de orden/entorno.
5. Ejecutar `node scripts/pipeline/self-check.mjs` y `node scripts/pipeline/run.mjs preflight`.

No hace falta crear una clase, plugin, middleware ni interfaz nueva.
