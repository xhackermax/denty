# Denty Payments Multiprovider — Release checkpoint

## Implementado

- Contrato normalizado de proveedores y estados de pago.
- Máquina de estados con transiciones terminales protegidas.
- `payment_attempts` con idempotencia por clínica/proveedor, RLS y referencias de proveedor.
- Comprobación server-side de `clinicId` contra la sesión financiera.
- Stripe Connected Account deja de ser controlable por payload/query del navegador.
- Abstracción cliente para iniciar/consultar Manual, SumUp y Stripe.
- Gate de ledger: sólo intentos `succeeded` pueden postear y un intento ya posteado no duplica.
- Reconciliación idempotente para interrupciones tras éxito externo.
- Gates de seguridad y contratos de pagos.
- Node objetivo permanece en 24.x.

## Verificación ejecutada en este entorno

PASS:

- `npm run payments:release`
- `npm run architecture:check`
- `npm run roadmap:p3`
- `npm run roadmap:p4`
- `npm run deploy:check`
- `npm run history:check`
- `npm run vercel:regressions` (0 warnings)
- `npm run pipeline:self-check`

## Limitación del entorno

El runtime disponible durante esta sesión es Node 22.16.0 y `npm ci` no pudo completarse dentro del límite de ejecución. Por ello no se certifican aquí `typecheck`, `lint`, suite Vitest completa ni `next build` bajo Node 24. El paquete conserva `engines.node=24.x`, `.nvmrc=24` y `.node-version=24`.

## Gate final recomendado al subir

```bash
node -v
npm ci
npm run node24:check
npm run payments:release
npm run typecheck
npm run lint
npm test
npm run build
```
