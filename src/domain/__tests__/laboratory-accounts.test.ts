import { describe, expect, it } from "vitest";
import { activeLaboratoryOptions, laboratoryBalances } from "../laboratory-accounts";

describe("laboratory accounts", () => {
  const accounts = [
    { id: "lab-a", name: "A", active: true },
    { id: "lab-b", name: "B", active: true },
    { id: "inactive", name: "I", active: false },
  ];
  it("separates balances by laboratory including rework", () => {
    const balances = laboratoryBalances(
      accounts,
      [
        { id: "w1", labId: "lab-a", costCents: 100000, reworkCostCents: 50000 },
        { id: "w2", labId: "lab-b", costCents: 30000 },
      ],
      [{ id: "p1", labId: "lab-a", amountCents: 50000 }],
    );
    expect(balances.find((item) => item.labId === "lab-a")).toMatchObject({
      accruedCents: 150000,
      paidCents: 50000,
      outstandingCents: 100000,
    });
    expect(balances.find((item) => item.labId === "lab-b")?.outstandingCents).toBe(30000);
  });
  it("never reports a negative debt", () => {
    const [balance] = laboratoryBalances(
      accounts.slice(0, 1),
      [{ id: "w1", labId: "lab-a", costCents: 1000 }],
      [{ id: "p1", labId: "lab-a", amountCents: 5000 }],
    );
    expect(balance?.outstandingCents).toBe(0);
  });
  it("keeps inactive labs out of new assignments", () => {
    expect(activeLaboratoryOptions(accounts).some((item) => item.value === "inactive")).toBe(false);
  });
});
