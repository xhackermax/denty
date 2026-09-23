"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { getBrowserApi } from "@/shared/api/browser";
import {
  allocatePaymentSchema,
  createInvoiceDraftSchema,
  createInvoiceSeriesSchema,
  rectifyInvoiceSchema,
} from "@/shared/api/schemas/billing";
import { recordPaymentSchema } from "@/shared/api/contracts";
import { dentyQueryKeys } from "@/shared/query";

function invalidateFinance(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ["finance"] });
}

export function useFinanceQueries(enabled: boolean) {
  const invoices = useQuery({
    queryKey: dentyQueryKeys.finance.invoices,
    queryFn: () => getBrowserApi().billing.invoices.list(),
    enabled,
  });
  const payments = useQuery({
    queryKey: dentyQueryKeys.finance.payments,
    queryFn: () => getBrowserApi().billing.payments.list(),
    enabled,
  });
  const budgets = useQuery({
    queryKey: dentyQueryKeys.finance.budgets,
    queryFn: () => getBrowserApi().billing.budgets.list(),
    enabled,
  });
  const series = useQuery({
    queryKey: dentyQueryKeys.finance.series,
    queryFn: () => getBrowserApi().billing.invoiceSeries.list(),
    enabled,
  });
  const verifactu = useQuery({
    queryKey: dentyQueryKeys.finance.verifactu,
    queryFn: () => getBrowserApi().billing.verifactu.status(),
    enabled,
  });
  const treatments = useQuery({
    queryKey: ["finance", "analytics", "treatments"],
    queryFn: () => getBrowserApi().analytics.treatments(),
    enabled,
  });
  const doctors = useQuery({
    queryKey: ["finance", "analytics", "doctors"],
    queryFn: () => getBrowserApi().analytics.doctors(),
    enabled,
  });
  const monthly = useQuery({
    queryKey: ["finance", "analytics", "monthly"],
    queryFn: () => getBrowserApi().analytics.monthly(),
    enabled,
  });
  const profitability = useQuery({
    queryKey: ["finance", "analytics", "profitability"],
    queryFn: () => getBrowserApi().analytics.profitability(),
    enabled,
  });
  return {
    invoices,
    payments,
    budgets,
    series,
    verifactu,
    treatments,
    doctors,
    monthly,
    profitability,
  };
}

export function useCreateInvoiceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: z.input<typeof createInvoiceDraftSchema>) =>
      getBrowserApi().billing.invoices.create(payload),
    onSuccess: () => invalidateFinance(queryClient),
  });
}

export function useIssueInvoiceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId: string) => getBrowserApi().billing.invoices.issue(invoiceId),
    onSuccess: () => invalidateFinance(queryClient),
  });
}

export function useRectifyInvoiceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { invoiceId: string; payload: z.input<typeof rectifyInvoiceSchema> }) =>
      getBrowserApi().billing.invoices.rectify(input.invoiceId, input.payload),
    onSuccess: () => invalidateFinance(queryClient),
  });
}

export function useRecordPaymentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: z.input<typeof recordPaymentSchema>) =>
      getBrowserApi().billing.payments.record(recordPaymentSchema.parse(payload)),
    onSuccess: () => invalidateFinance(queryClient),
  });
}

export function useAllocatePaymentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { paymentId: string; payload: z.input<typeof allocatePaymentSchema> }) =>
      getBrowserApi().billing.payments.allocate(input.paymentId, input.payload),
    onSuccess: () => invalidateFinance(queryClient),
  });
}

export function useSubmitVerifactuMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId: string) => getBrowserApi().billing.verifactu.submit(invoiceId),
    onSuccess: () => invalidateFinance(queryClient),
  });
}

export function useCreateInvoiceSeriesMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: z.input<typeof createInvoiceSeriesSchema>) =>
      getBrowserApi().billing.invoiceSeries.create(payload),
    onSuccess: () => invalidateFinance(queryClient),
  });
}

export async function openInvoicePdf(invoiceId: string) {
  const blob = await getBrowserApi().billing.invoices.pdf(invoiceId);
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function downloadAccountingCsv() {
  const csv = await getBrowserApi().billing.accounting.exportCsv();
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "denty-contabilidad.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}
