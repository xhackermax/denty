"use client";

import { Group, Stack, Text } from "@mantine/core";

import { computeBudgetTotals, formatPercent } from "@/domain/budget-discounts";
import { formatEUR } from "@/domain/money";

export interface BudgetMoneyView {
  totalCents: number;
  subtotalCents?: number | undefined;
  discountLabel?: string | null | undefined;
  discountPercent?: number | undefined;
  discountAmountCents?: number | undefined;
  earlyPaymentPercent?: number | null | undefined;
  earlyPaymentApplied?: boolean | undefined;
}

/** Totals of a budget as stored, falling back to "no discount" for budgets read before it. */
export function budgetTotals(budget: BudgetMoneyView, fallbackEarlyPaymentPercent?: number | null) {
  return computeBudgetTotals({
    subtotalCents: budget.subtotalCents ?? budget.totalCents,
    discountPercent: budget.discountPercent,
    discountAmountCents: budget.discountAmountCents,
    earlyPaymentPercent: budget.earlyPaymentPercent ?? fallbackEarlyPaymentPercent ?? null,
    earlyPaymentApplied: budget.earlyPaymentApplied,
  });
}

export function discountDescription(budget: BudgetMoneyView): string {
  const parts = [
    budget.discountLabel?.trim(),
    budget.discountPercent ? formatPercent(budget.discountPercent) : null,
  ].filter(Boolean);
  return parts.length ? `Descuento (${parts.join(" · ")})` : "Descuento";
}

/**
 * Subtotal, applied discounts and total; the early-payment offer is shown as an option when
 * the patient has not chosen it, so the paper copy explains both amounts.
 */
export function BudgetTotalsSummary({
  budget,
  fallbackEarlyPaymentPercent,
}: {
  budget: BudgetMoneyView;
  fallbackEarlyPaymentPercent?: number | null | undefined;
}) {
  const totals = budgetTotals(budget, fallbackEarlyPaymentPercent);
  const earlyPercent = budget.earlyPaymentPercent ?? fallbackEarlyPaymentPercent ?? null;
  const hasDeductions = totals.discountCents > 0 || totals.earlyPaymentCents > 0;
  return (
    <Stack gap={2} align="stretch" data-testid="budget-totals">
      {hasDeductions ? (
        <>
          <Group justify="space-between">
            <Text size="sm">Subtotal</Text>
            <Text size="sm">{formatEUR(totals.subtotalCents)}</Text>
          </Group>
          {totals.discountCents > 0 ? (
            <Group justify="space-between">
              <Text size="sm">{discountDescription(budget)}</Text>
              <Text size="sm" c="teal">
                −{formatEUR(totals.discountCents)}
              </Text>
            </Group>
          ) : null}
          {totals.earlyPaymentCents > 0 && earlyPercent !== null ? (
            <Group justify="space-between">
              <Text size="sm">Pronto pago ({formatPercent(earlyPercent)})</Text>
              <Text size="sm" c="teal">
                −{formatEUR(totals.earlyPaymentCents)}
              </Text>
            </Group>
          ) : null}
        </>
      ) : null}
      <Group justify="flex-end">
        <Text fw={800}>Total {formatEUR(totals.totalCents)}</Text>
      </Group>
      {!budget.earlyPaymentApplied &&
      earlyPercent !== null &&
      totals.earlyPaymentTotalCents !== null ? (
        <Text size="xs" c="dimmed" ta="right">
          Con pronto pago (−{formatPercent(earlyPercent)}):{" "}
          {formatEUR(totals.earlyPaymentTotalCents)}
        </Text>
      ) : null}
    </Stack>
  );
}
