export type Tx = { id: string; amountCents: number; occurredAt: string; reference?: string | null };
export function reconcileTransactions(payments: Tx[], bank: Tx[], toleranceMinutes = 10) {
  const unused = new Set(bank.map((x) => x.id));
  const matches: { paymentId: string; bankId: string }[] = [];
  const unmatchedPayments: Tx[] = [];
  for (const p of payments) {
    const best = bank.find(
      (b) =>
        unused.has(b.id) &&
        b.amountCents === p.amountCents &&
        Math.abs(Date.parse(b.occurredAt) - Date.parse(p.occurredAt)) <= toleranceMinutes * 60000 &&
        (!p.reference || !b.reference || p.reference === b.reference),
    );
    if (best) {
      matches.push({ paymentId: p.id, bankId: best.id });
      unused.delete(best.id);
    } else unmatchedPayments.push(p);
  }
  return { matches, unmatchedPayments, unmatchedBank: bank.filter((b) => unused.has(b.id)) };
}
