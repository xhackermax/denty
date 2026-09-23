export interface LaboratoryAccount {
  id: string;
  name: string;
  taxId?: string;
  phone?: string;
  email?: string;
  active: boolean;
}

export interface LaboratoryWorkCost {
  id: string;
  labId?: string;
  costCents: number;
  reworkCostCents?: number;
}

export interface LaboratoryPayment {
  id: string;
  labId: string;
  amountCents: number;
  paidAt?: string;
  note?: string;
}

export interface LaboratoryBalance {
  labId: string;
  name: string;
  active: boolean;
  accruedCents: number;
  paidCents: number;
  outstandingCents: number;
  workCount: number;
}

function cents(value: unknown): number {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.round(numeric)) : 0;
}

export function laboratoryBalances(
  accounts: readonly LaboratoryAccount[],
  works: readonly LaboratoryWorkCost[],
  payments: readonly LaboratoryPayment[],
): LaboratoryBalance[] {
  return accounts.map((account) => {
    const labWorks = works.filter((work) => work.labId === account.id);
    const accruedCents = labWorks.reduce(
      (sum, work) => sum + cents(work.costCents) + cents(work.reworkCostCents),
      0,
    );
    const paidCents = payments
      .filter((payment) => payment.labId === account.id)
      .reduce((sum, payment) => sum + cents(payment.amountCents), 0);
    return {
      labId: account.id,
      name: account.name,
      active: account.active,
      accruedCents,
      paidCents,
      outstandingCents: Math.max(0, accruedCents - paidCents),
      workCount: labWorks.length,
    };
  });
}

export function activeLaboratoryOptions(accounts: readonly LaboratoryAccount[]) {
  return accounts
    .filter((account) => account.active)
    .map((account) => ({ value: account.id, label: account.name }));
}
