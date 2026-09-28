# Denty Payments UX: mínimo tiempo humano

## Objetivo de producto
Cuando Denty conoce el saldo y el terminal está conectado, el personal debe poder pasar de paciente a cobro enviado al datáfono con **un clic**.

## Regla principal
`Cobrar {saldo}` usa automáticamente el método conectado preferido. `Otro importe` queda como acción secundaria para pagos parciales.

## Modelo comercial universal
Denty no obliga a una pasarela. Cada clínica puede activar simultáneamente:
- efectivo;
- transferencia;
- Bizum;
- datáfono bancario convencional/manual;
- datáfono bancario conectado cuando exista API/protocolo compatible;
- SumUp;
- Stripe Terminal;
- financiación u otros métodos.

Método, proveedor, modo de integración y terminal son conceptos separados. Esto permite incorporar futuros proveedores sin alterar el ledger.

## Modos
- `connected`: Denty envía importe y verifica el resultado. Objetivo: 1 clic del personal.
- `semi_connected`: Denty automatiza todo lo disponible y sólo solicita intervención inevitable.
- `manual`: Denty registra una operación realizada fuera de Denty.

## Capacidades
Cada método declara capacidades (`send_amount`, `automatic_confirmation`, `refund`, `cancel`, `receipt`, `reader_status`). La interfaz se adapta a capacidades reales, no al nombre del proveedor.

## Flujo conectado
1. Abrir paciente o finalizar visita.
2. Denty calcula saldo pendiente.
3. Pulsar `Cobrar X €`.
4. Denty crea intento idempotente y envía importe al terminal preferido.
5. Paciente paga en el terminal.
6. Denty verifica éxito en servidor.
7. Un único posting actualiza ledger, saldo, historial, caja/KPI y justificante.
8. Recepción ve `Pago realizado` sin confirmar una segunda vez.

## Fallback
Si un proveedor/terminal no permite conexión técnica, Denty conserva exactamente el mismo ledger y UX contable, pero solicita confirmación manual. La ausencia de integración nunca bloquea el uso de Denty.
