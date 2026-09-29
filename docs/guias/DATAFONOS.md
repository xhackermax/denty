# Guía: configurar el datáfono (Stripe, SumUp o banco)

Denty registra **todos** los cobros en el mismo libro (`payment_attempts` → `payments`),
con clave de idempotencia: aunque se pulse dos veces o se corte la red, el cobro queda
**una sola vez**. Dónde se cobra: *Finanzas* con `?patientId=…` (ficha del paciente →
**Pagos**) → panel **Cobrar**.

| Opción en Denty | Cuándo usarla | Integración |
|---|---|---|
| Tarjeta · datáfono del banco (manual) | Ya tienes TPV de Santander, CaixaBank, BBVA, Sabadell… | Manual: cobras en el TPV y registras en Denty |
| Tarjeta · SumUp (conectado) | Lector **SumUp Solo** | Denty envía el importe al lector |
| Tarjeta · Stripe Terminal (conectado) | Lector **Stripe S700 / BBPOS WisePOS E** | Denty envía el importe al lector |
| Efectivo / Transferencia / Bizum / Financiación | Otros cobros | Manual |

---

## A. Datáfono de un banco (ej. Santander) — sin integración

Los TPV bancarios estándar no ofrecen una API pública para que una web les envíe el
importe, así que el flujo es **semiautomático**:

1. En la ficha del paciente → **Pagos** → panel **Cobrar**.
2. Escribe el importe y elige **Tarjeta · datáfono del banco (manual)**.
3. Teclea el mismo importe en el TPV del banco y pasa la tarjeta.
4. Cuando el ticket salga **APROBADO**, pulsa **Registrar cobro** en Denty.
5. (Recomendado) Anota el nº de operación del ticket en la factura o en la nota del cobro.
6. Al cierre del día compara el **cierre del TPV** con Finanzas → Pagos (método *CARD*,
   proveedor *manual*).

No hace falta ninguna variable de entorno. Si el banco ofrece "TPV cloud" o "Paygold"
con API, se puede integrar después como un proveedor más (ver `docs/PAYMENTS-PROVIDER-ARCHITECTURE.md`).

## B. SumUp (lector Solo) — conectado

1. Cuenta SumUp de empresa verificada y lector **Solo** actualizado.
2. En <https://me.sumup.com/developers> crea una **API key** y copia tu **merchant code**
   (aparece en el perfil, empieza por `M…`). Pide también el **affiliate key** para
   Cloud API.
3. Empareja el lector: en el Solo ve a *Conexiones → API → Conectar*; aparece un código.
   Regístralo con la Cloud API (`POST /v0.1/merchants/{merchant_code}/readers` con el
   código) y guarda el **reader id** que devuelve.
4. Variables en Vercel (Production):
   - `SUMUP_API_KEY`, `SUMUP_MERCHANT_CODE`, `SUMUP_AFFILIATE_KEY`
   - `SUMUP_READER_ID` (lector por defecto) y, si lo usas, `SUMUP_APP_ID`
   - `SUMUP_RETURN_URL` = `https://TU-DOMINIO/api/denty/payments/sumup/status` (opcional)
5. Redeploy. En **Cobrar** elige *SumUp*: el desplegable muestra los lectores. Pulsa
   **Enviar al datáfono**; el paciente paga en el lector y Denty marca el cobro al recibir
   la confirmación (consulta cada 1,5 s, máximo 90 s).

## C. Stripe Terminal (S700 o WisePOS E) — conectado

1. Cuenta Stripe activada en España. Compra el lector desde el Dashboard (*Terminal →
   Hardware*).
2. Crea una **Location** (dirección de la clínica) en *Terminal → Locations*.
3. En el lector: *Ajustes → Generate pairing code*. En el Dashboard *Terminal → Readers →
   Register reader*, introduce el código y la Location. Copia el **reader id** (`tmr_…`).
4. Variables en Vercel (Production):
   - `STRIPE_SECRET_KEY` = clave secreta (`sk_live_…`; usa `sk_test_…` para pruebas con el
     lector simulado)
   - `STRIPE_DEFAULT_CONNECTED_ACCOUNT_ID` solo si cobras en nombre de otra cuenta (Connect).
5. Redeploy. En **Cobrar** elige *Stripe*, pega el `tmr_…` y pulsa **Enviar al datáfono**.

## Comprobaciones antes de usarlo con pacientes

- Haz un cobro de 1 € y devuélvelo desde el panel del proveedor.
- Repite el mismo cobro con conexión cortada a mitad: debe quedar **un único** pago.
- Revisa *Finanzas → Pagos* y el cierre del proveedor al final del día.
- Las devoluciones se hacen en el proveedor (o en el TPV del banco) y se reflejan con una
  factura rectificativa en Denty.
