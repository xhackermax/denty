# Denty V3 R5 — auditoría completa de 38 regresiones históricas

Fecha: 2026-09-22

Leyenda: ✅ verificado en el artefacto; ⚠️ requiere ejecución con dependencias/entorno real; ❌ deuda abierta; 🟡 funcionalmente presente pero conviene validar UX/equivalencia.

| # | Regresión histórica | R5 | Evidencia / acción |
|---|---|---|---|
| 1 | Mezclar monorepo + ZIP plano | ✅ | No existen `apps/`, `packages/`, Prisma, turbo ni workspace roots. |
| 2 | Root Directory incorrecto | ✅/⚠️ | ZIP plano con `package.json` y Next en `/`; falta comprobar que el Project Setting de Vercel siga en Auto/raíz. |
| 3 | Output `out` | ✅/⚠️ | `vercel.json` no declara `outputDirectory`; revisar Project Setting externo. |
| 4 | Output `public` | ✅/⚠️ | Igual que #3. |
| 5 | Output `.next` | ✅/⚠️ | Igual que #3. |
| 6 | `ERR_PNPM_OUTDATED_LOCKFILE` | ✅ | No hay pnpm lock ni workspace pnpm. |
| 7 | Mezclar npm/pnpm | ✅ | Scripts de entrega usan npm; no hay pnpm/yarn/bun. |
| 8 | Prisma en frontend | ✅ | Prisma ausente del ZIP. |
| 9 | Prisma Client sin generar | ✅ | No aplica al frontend plano. |
| 10 | tsconfig heredado | ✅ | Sin `extends ../../tsconfig.base.json`, `workspace:` ni refs monorepo. |
| 11 | `vitest/globals` residual | ✅ | No existe; Vitest está configurado de forma explícita. |
| 12 | implicit any en Agenda | ⚠️ | Estado/callbacks actuales están tipados por inferencia fuerte; el gate real `tsc --noEmit` sigue siendo la prueba definitiva. |
| 13 | `resizePreview` nullable | ✅ | `resizePreview` ya no existe en la Agenda V3 actual. |
| 14 | React ↔ Mantine ERESOLVE | ✅ | Vercel ya ha instalado el árbol actual sin ERESOLVE; React/ReactDOM/Mantine están fijados exactamente. |
| 15 | Prettier bloqueando deploy | ✅ R5 | Prettier queda fuera del target `vercel-build`; sigue disponible para CI/desarrollo. |
| 16 | `public/f1-package-lock.json` | ✅ | No existe y el gate lo prohíbe. |
| 17 | Sin `package-lock.json` raíz | ❌ | Sigue abierto. Vercel genera lock temporal y luego usa `npm ci`; no es el bloqueo actual, pero falta reproducibilidad final. |
| 18 | `prettier --write` dentro de Vercel | ✅ R5 | Eliminados `vercel-format-bootstrap` y `vercel-format-check`; self-check revisa el plan alcanzable. |
| 19 | Exports anónimos bloqueando ESLint | ✅ | ESLint y Stylelint exportan objetos con nombre. |
| 20 | Stylelint bloqueando CSS | ✅/⚠️ | R4 corrigió los 18 conocidos; auditoría estática R5 no detecta duplicados, descenso de especificidad en mismo media context ni reglas sin separación. Confirmación definitiva: Stylelint real tras `npm ci`. |
| 21 | 18 errores Stylelint R3 | ✅ | `parity.module.css` y `app-shell.module.css` ya no contienen los patrones que causaron esa ronda. |
| 22 | Confundir gate interno con Vercel | ✅ R5 | Pipeline conserva stages nombrados y añade `vercel-regression-matrix` antes de instalar/build. |
| 23 | `.vercel` generado tratado como contaminación | ✅ | Historical gate permite `.vercel` runtime; packaging sigue eliminándolo del artefacto. |
| 24 | Vitest recoge Playwright | ✅ | `e2e/**` está excluido de Vitest. |
| 25 | `esbuild.jsx` incompatible | ✅ | No existe; se usa `@vitejs/plugin-react`. |
| 26 | Gran lote TypeScript strict | ⚠️ | Mantiene strict/exactOptional/noUnchecked; requiere `tsc --noEmit` con node_modules para certificación final. |
| 27 | Unit tests no verdes | ⚠️ | Vitest está en el gate, pero no puede ejecutarse en este sandbox sin dependencias instaladas. |
| 28 | Next build Server/Client/prerender | ⚠️ | Correcciones históricas siguen presentes; certificación final requiere `next build` real. |
| 29 | Regex inválida en `next.config` | ✅ | No existe `/:path((?!...)`; headers global + override `/games/:path*`. |
| 30 | Prettier modifica Games | ✅ | `public/games/**` ignorado + 20 hashes SHA-256 verificados. |
| 31 | Agenda por doctores/horas | 🟡 | Existe vista Doctores y horas por cita + selector de profesional. No es una rejilla horaria completa por doctor; validar que cubra la UX requerida. |
| 32 | Odontograma abre Juegos/no aparece | ✅ | Ruta profesional `/app/patients/[id]/odontogram`; Games está separado en portal paciente. |
| 33 | Leyenda/superficies/estados odontograma | ✅ | Odontograma actual conserva 5 superficies, estados y leyenda anatómica. |
| 34 | Odontograma → Plan → Presupuesto | ✅ | Flujo y sincronización versionada presentes en `shared/clinical` y dominio. |
| 35 | Pérdida de funciones legacy | ✅/🟡 | API parity 193/193 + historical gate; equivalencia UX total debe seguir validándose por módulo. |
| 36 | Voz sin resolver entidad/versiones | ✅/🟡 | Paciente requerido y odontograma usa `expectedVersion`; acciones no soportadas lanzan error. Flujo multiacción no es transaccional, por lo que acciones anteriores pueden haberse aplicado antes de un fallo posterior. |
| 37 | Fichaje Entrada/Salida incompleto | 🟡 | Máquina IN/OUT presente, ausencias presentes. El módulo visual actual mantiene estado local/demo; conectar/validar persistencia real sigue siendo trabajo funcional. |
| 38 | Zonas históricas de regresión | 🟡 | Receta, usuarios/roles, fichaje, responsive, dark, campañas, demo e historial existen, pero necesitan acceptance/E2E para equivalencia funcional. |

## Conclusión de despliegue

R5 elimina una regresión real todavía presente en R4: el build de Vercel ya no muta el source con Prettier. La única deuda histórica de packaging claramente abierta es el `package-lock.json` raíz.

Los tres gates que todavía necesitan certificación en un entorno con las dependencias instaladas son `typecheck`, `unit` y `next build`. Si cualquiera falla, el log debe tratarse como un fallo de código/gate, no como un fallo de la plataforma Vercel.
