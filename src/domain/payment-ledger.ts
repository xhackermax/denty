export interface PaymentBalance {
  totalCents: number;
  paidCents: number;
}
export function applyPayment(balance: PaymentBalance, amountCents: number) {
  if (!Number.isInteger(amountCents) || amountCents <= 0)
    throw new RangeError("El importe debe ser positivo");
  const paidCents = balance.paidCents + amountCents;
  if (paidCents > balance.totalCents) throw new RangeError("El pago supera el saldo pendiente");
  const outstandingCents = balance.totalCents - paidCents;
  return {
    totalCents: balance.totalCents,
    paidCents,
    outstandingCents,
    settled: outstandingCents === 0,
  };
}
