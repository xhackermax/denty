import { z } from "zod";

import type { ApiClient } from "../client";
import { paymentSchema, recordPaymentSchema, type RecordPayment } from "../contracts";
import {
  accountingExportQuerySchema,
  allocatePaymentSchema,
  billingSettingsSchema,
  budgetsSchema,
  createInvoiceDraftSchema,
  createInvoiceSeriesSchema,
  invoiceSchema,
  invoiceSeriesListSchema,
  invoiceSeriesSchema,
  invoicesSchema,
  paymentsSchema,
  paymentAllocationSchema,
  rectifyInvoiceSchema,
  updateBillingSettingsSchema,
  verifactuStatusSchema,
  verifactuSubmissionResultSchema,
} from "../schemas/billing";
import { encodeId, withQuery } from "./shared";

export function createBillingResource(client: ApiClient) {
  return {
    settings: {
      get: () => client.request("/api/admin/billing-settings", billingSettingsSchema),
      update: (payload: z.input<typeof updateBillingSettingsSchema>) =>
        client.mutation(
          "/api/admin/billing-settings",
          billingSettingsSchema,
          updateBillingSettingsSchema.parse(payload),
          { method: "PUT" },
        ),
    },
    verifactu: {
      status: () => client.request("/api/admin/verifactu/status", verifactuStatusSchema),
      submit: (invoiceId: string) =>
        client.mutation(
          `/api/invoices/${encodeId(invoiceId)}/verifactu/submit`,
          verifactuSubmissionResultSchema,
          {},
        ),
    },
    budgets: {
      list: () => client.request("/api/budgets", budgetsSchema),
      createInvoiceDraft: (budgetId: string, seriesId?: string) =>
        client.mutation(
          `/api/budgets/${encodeId(budgetId)}/invoice-draft`,
          invoiceSchema,
          seriesId ? { seriesId } : {},
        ),
    },
    invoiceSeries: {
      list: () => client.request("/api/invoice-series", invoiceSeriesListSchema),
      create: (payload: z.input<typeof createInvoiceSeriesSchema>) =>
        client.mutation(
          "/api/invoice-series",
          invoiceSeriesSchema,
          createInvoiceSeriesSchema.parse(payload),
        ),
    },
    invoices: {
      list: () => client.request("/api/invoices", invoicesSchema),
      create: (payload: z.input<typeof createInvoiceDraftSchema>) =>
        client.mutation("/api/invoices", invoiceSchema, createInvoiceDraftSchema.parse(payload)),
      issue: (id: string) =>
        client.mutation(`/api/invoices/${encodeId(id)}/issue`, invoiceSchema, {}),
      rectify: (id: string, payload: z.input<typeof rectifyInvoiceSchema>) =>
        client.mutation(
          `/api/invoices/${encodeId(id)}/rectify`,
          invoiceSchema,
          rectifyInvoiceSchema.parse(payload),
        ),
      pdf: (id: string) =>
        client.requestBlob(`/api/invoices/${encodeId(id)}/pdf`, {
          headers: { accept: "application/pdf" },
        }),
    },
    accounting: {
      exportCsv: (query: z.input<typeof accountingExportQuerySchema> = {}) => {
        const parsed = accountingExportQuerySchema.parse(query);
        return client.requestText(withQuery("/api/accounting/export.csv", parsed), {
          headers: { accept: "text/csv" },
        });
      },
    },
    payments: {
      list: () => client.request("/api/payments", paymentsSchema),
      record: (payload: RecordPayment) =>
        client.mutation("/api/payments", paymentSchema, recordPaymentSchema.parse(payload)),
      allocate: (paymentId: string, payload: z.input<typeof allocatePaymentSchema>) =>
        client.mutation(
          `/api/payments/${encodeId(paymentId)}/allocate`,
          paymentAllocationSchema,
          allocatePaymentSchema.parse(payload),
        ),
    },
  } as const;
}
