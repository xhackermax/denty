/**
 * Revenue is linked to an EXECUTED plan item through posted invoice lines.
 * A budget price or a payment received without an invoice-line attribution is
 * not production for a doctor. This is *billed*, not *collected*, revenue.
 */
export interface PostedInvoice {
  id: string;
  status: string;
  type: string;
}
export interface TreatmentInvoiceLine {
  invoiceId: string;
  planItemId: string | null;
  subtotalCents: number | null;
}

export function attributedInvoicedCents(
  invoices: readonly PostedInvoice[],
  lines: readonly TreatmentInvoiceLine[],
): ReadonlyMap<string, number> {
  const eligible = new Map(invoices.map(invoice => [invoice.id, invoice]));
  const amounts = new Map<string, number>();
  const unreliable = new Set<string>();
  for (const line of lines) {
    if (!line.planItemId) continue;
    const invoice = eligible.get(line.invoiceId);
    if (!invoice || !["ISSUED", "RECTIFIED"].includes(invoice.status)) continue;
    const value = line.subtotalCents;
    // Some rectifying documents store unsigned amounts. Never guess a sign.
    if (value === null || !Number.isSafeInteger(value) ||
        (invoice.type === "RECTIFYING" && value > 0)) {
      unreliable.add(line.planItemId);
      continue;
    }
    amounts.set(line.planItemId, (amounts.get(line.planItemId) ?? 0) + value);
  }
  for (const key of unreliable) amounts.delete(key);
  return amounts;
}
