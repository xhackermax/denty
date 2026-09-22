# F0 · Auditoría y línea base de Denty 2.3.7

Fecha: 2026-09-21  
Fuente funcional auditada: `DENTY-237-ODONTOGRAM-DOUBLE-CLICK-STATES-COMPLETE-SOURCE.zip` y su `deploy/vercel-preview`.

## Resultado ejecutivo

La línea base conserva una gran cantidad de funcionalidad, pero el frontend desplegable sigue mezclando UI, reglas, fallback local y legacy. La suite histórica `node tests/run-verification.mjs` pasa **149/149**, pero son verificadores de regresión propios y **no sustituyen** lint, TypeScript estricto, tests unitarios/componentes/e2e, axe ni build reproducible.

## Métricas observadas en `deploy/vercel-preview`

| Métrica | Línea base |
|---|---:|
| Archivos totales | 109 |
| Archivos fuente auditados | 87 |
| Líneas de fuente aproximadas | 11,228 |
| Apariciones de `any` | 621 |
| `style={{...}}` | 119 |
| `!important` | 151 |
| `prompt()` | 47 |
| `confirm()` | 12 |
| `localStorage` | 13 |
| `sessionStorage` | 8 |
| navegación por `location.href` | 10 |
| módulos `use client` | 41 |

### Peso de deuda/legacy

| Recurso | Tamaño |
|---|---:|
| `public/denty-app.bundle.js` | 578,271 B |
| `public/styles` | 143,703 B |
| `src/lib/local-api.ts` | 96,570 B |
| `src/lib/legacy-shell.ts` | 12,910 B |

## Rutas Next actuales detectadas

| Ruta | Archivo |
|---|---|
| `/` | `src/app/page.tsx` |
| `/app` | `src/app/app/page.tsx` |
| `/app/admin` | `src/app/app/admin/page.tsx` |
| `/app/admin/catalog` | `src/app/app/admin/catalog/page.tsx` |
| `/app/admin/users` | `src/app/app/admin/users/page.tsx` |
| `/app/agenda` | `src/app/app/agenda/page.tsx` |
| `/app/alerts` | `src/app/app/alerts/page.tsx` |
| `/app/analysis` | `src/app/app/analysis/page.tsx` |
| `/app/attendance` | `src/app/app/attendance/page.tsx` |
| `/app/campaigns` | `src/app/app/campaigns/page.tsx` |
| `/app/communications` | `src/app/app/communications/page.tsx` |
| `/app/documents` | `src/app/app/documents/page.tsx` |
| `/app/finance` | `src/app/app/finance/page.tsx` |
| `/app/laboratory` | `src/app/app/laboratory/page.tsx` |
| `/app/patients` | `src/app/app/patients/page.tsx` |
| `/app/patients/[id]` | `src/app/app/patients/[id]/page.tsx` |
| `/app/patients/[id]/odontogram` | `src/app/app/patients/[id]/odontogram/page.tsx` |
| `/app/prescriptions` | `src/app/app/prescriptions/page.tsx` |
| `/app/settings` | `src/app/app/settings/page.tsx` |
| `/app/tasks` | `src/app/app/tasks/page.tsx` |
| `/demo/juan-perez` | `src/app/demo/juan-perez/page.tsx` |
| `/legacy` | `src/app/legacy/page.tsx` |
| `/login` | `src/app/login/page.tsx` |
| `/patient/[patientId]` | `src/app/patient/[patientId]/page.tsx` |
| `/patient/[patientId]/games` | `src/app/patient/[patientId]/games/page.tsx` |

## Verificación ejecutada

- `node tests/run-verification.mjs`: **149/149 archivos/verificadores pasaron**.
- No se declara `build` de línea base como verificado en este entorno: el contenedor no puede resolver `registry.npmjs.org` (`EAI_AGAIN`) y no hay `node_modules` montado.
- Tampoco se pudieron generar capturas Playwright de las rutas Next actuales sin un runtime ejecutable o URL de despliegue accesible. Este punto queda como **bloqueo F0-01**, no se maquilla como completado.

## Hallazgos críticos

1. `src/lib/local-api.ts` almacena datos clínicos en navegador y actúa como fallback silencioso.
2. El fallback puede dar una experiencia aparentemente funcional sin backend real, lo que oculta fallos de integración.
3. Persisten legacy bundle/styles y rutas/activos duplicados.
4. Tipado real muy por debajo de la meta pese a `strict`: gran cantidad de `any` y componentes cliente gigantes.
5. `prompt/confirm`, estilos inline y CSS global hacen muy costosa la evolución segura.
6. La suite histórica protege numerosos comportamientos, pero no prueba el producto en navegador de extremo a extremo.
7. La versión actual ha evolucionado por encima del ZIP 2.0 auditado en el prompt; **2.3.7 manda para paridad funcional**, mientras el prompt manda para arquitectura/calidad.

## Riesgos de migración

- **Pérdida de lógica clínica del odontograma**: se mitiga con `legacy-spec/odontogram.md`, dominio puro y pruebas de estados/puentes/snapshots.
- **Ruptura del contrato con backend externo**: adaptadores `shared/api`, zod y `API_CONTRACT.md` separan UI y transporte.
- **Falsa sensación de funcionamiento por demo/localStorage**: se elimina fallback silencioso; demo futuro será MSW en memoria y explícito.
- **Regresiones táctiles en agenda/odontograma**: Playwright en tablet/móvil + dnd-kit + navegación teclado.
- **Migración demasiado grande para revisar**: fases cerradas, matriz de paridad y ADR por dependencia/decisión.
