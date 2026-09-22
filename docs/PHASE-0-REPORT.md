# Informe F0 · Auditoría y línea base

## 1. Resumen
1. Se auditó la versión funcional más reciente disponible: Denty 2.3.7.
2. La suite histórica pasa 149/149, pero se clasifica correctamente como verificación heredada, no como CI moderno.
3. Se midió la deuda actual: 621 `any`, 119 estilos inline, 151 `!important`, 59 diálogos nativos y 13 referencias a `localStorage`.
4. Se extrajo a documentación la lógica legacy crítica de odontograma, agenda, voz, portal y consentimientos.
5. Se generó un contrato API desde el source de backend con 193 declaraciones de rutas observadas.
6. Se creó la matriz de paridad, registro de riesgos, gaps de backend y supuestos.
7. F0 **no se declara cerrada** porque faltan las capturas baseline ejecutadas sobre la app Next.
8. El bloqueo es de entorno/runtime, no de requisitos de producto.

## 2. Archivos
- `docs/BASELINE_AUDIT.md`
- `docs/API_CONTRACT.md`
- `docs/BACKEND_GAPS.md`
- `docs/ASSUMPTIONS.md`
- `docs/MIGRATION_MATRIX.md`
- `docs/RISK_REGISTER.md`
- `docs/baseline/SCREENSHOT_MANIFEST.md`
- `docs/legacy-spec/odontogram.md`
- `docs/legacy-spec/agenda.md`
- `docs/legacy-spec/voice.md`
- `docs/legacy-spec/portal.md`
- `docs/legacy-spec/consents.md`

## 3. Decisiones y supuestos
- Se usa 2.3.7 como fuente funcional de paridad porque es posterior al 2.0.0 auditado por el prompt.
- La arquitectura/calidad del prompt maestro prevalece sobre la arquitectura actual.
- No se ejecutan fases opcionales O1/O2/O3.
- No se asume que `apps/api` sea idéntico al backend desplegado.

## 4. Métricas
- Suite histórica: 149/149.
- Fuente frontend: 11,228 LOC aproximadas.
- Build: no disponible; npm DNS bloqueado en este contenedor.
- Axe/Lighthouse: no ejecutados, requieren runtime.
- Capturas: bloqueadas por ausencia de runtime/URL.

## 5. Matriz de paridad
- 0 filas pasan a ☑ en F0: esta fase crea la línea base, no concede paridad a la v3.
- Evidencia base almacenada en `MIGRATION_MATRIX.md` y `legacy-spec/*`.

## 6. Riesgos y bloqueos; siguiente fase
- Bloqueo F0-01: no se puede arrancar la app actual para capturas baseline en este entorno.
- Según la puerta de fase del prompt, **no debe iniciarse F1 hasta resolver F0-01**.
- Siguiente fase una vez resuelto: F1 Cimientos.

## Excepción posterior autorizada
El 2026-09-21 el usuario indicó que no pudo desplegar la versión anterior en Vercel y autorizó explícitamente continuar con F1. Se mantiene F0-01 abierto y no se falsifican capturas baseline. La excepción queda registrada como A-008.
