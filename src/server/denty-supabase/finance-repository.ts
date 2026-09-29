import type { z } from "zod";
import type { RecordPayment } from "@/shared/api/contracts";
import type {
  createInvoiceDraftSchema,
  createInvoiceSeriesSchema,
  rectifyInvoiceSchema,
  updateBillingSettingsSchema,
} from "@/shared/api/schemas/billing";
import type { PaymentAttempt, PaymentAttemptStore } from "@/server/payments/payment-attempts";
import type { PaymentProvider } from "@/domain/payment-providers";
import { SupabaseRestError, type SupabaseRestClient } from "../supabase/rest-client";
type CreateInvoiceDraft = z.input<typeof createInvoiceDraftSchema>;
type CreateInvoiceSeries = z.input<typeof createInvoiceSeriesSchema>;
type RectifyInvoice = z.input<typeof rectifyInvoiceSchema>;
type UpdateBillingSettings = z.input<typeof updateBillingSettingsSchema>;
type J = Record<string, unknown>;
interface BudgetListRow {
  id: string;
  patient_id: string;
  total_cents: number | string;
  status: string;
  created_at: string;
}

interface FiscalRecordListRow {
  id: string;
  invoice_id: string | null;
  record_type: string;
  provider_status: string;
  previous_hash: string | null;
  record_hash: string;
  [column: string]: unknown;
}

interface InvoiceRow {
  id: string;
  clinic_id: string;
  patient_id: string;
  budget_id?: string | null;
  appointment_id?: string | null;
  series_id: string;
  original_invoice_id?: string | null;
  status: "DRAFT" | "ISSUED" | "RECTIFIED";
  type: string;
  customer_name: string;
  customer_tax_id?: string | null;
  customer_address?: string | null;
  issuer_tax_id?: string | null;
  issuer_legal_name?: string | null;
  issuer_address?: string | null;
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  full_number?: string | null;
  sequence_number?: number | null;
  issued_at?: string | null;
  due_at?: string | null;
  rectification_reason?: string | null;
  aeat_rectification_type?: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  lines?: InvoiceLineRow[];
}
interface InvoiceLineRow {
  id: string;
  invoice_id: string;
  clinical_plan_item_id?: string | null;
  description: string;
  quantity: number;
  unit_price_cents: number;
  tax_rate_bps: number;
  exemption_code?: string | null;
  line_subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
}
interface SeriesRow {
  id: string;
  clinic_id: string;
  code: string;
  name: string;
  prefix: string;
  next_number: number;
  active: boolean;
}
interface SettingsRow {
  clinic_id: string;
  fiscal_mode: "VERIFACTU" | "NO_VERIFACTU";
  default_due_days: number;
  auto_submit_verifactu: boolean;
  fiscal_tax_id?: string | null;
  fiscal_legal_name?: string | null;
  fiscal_address?: string | null;
  verifactu_environment: "test" | "production";
}
interface PaymentRow {
  id: string;
  clinic_id: string;
  patient_id: string;
  budget_id?: string | null;
  amount_cents: number;
  method: RecordPayment["method"];
  status: string;
  provider?: string | null;
  provider_transaction_id?: string | null;
  idempotency_key?: string | null;
  provider_metadata?: J | null;
  paid_at: string;
  created_at: string;
}
interface AllocationRow {
  id: string;
  payment_id: string;
  invoice_id?: string | null;
  budget_id?: string | null;
  amount_cents: number;
  created_at?: string;
}
interface AttemptRow {
  id: string;
  clinic_id: string;
  patient_id: string;
  provider: PaymentProvider;
  provider_status: PaymentAttempt["providerStatus"];
  idempotency_key: string;
  amount_cents: number;
  currency: string;
  budget_id?: string | null;
  invoice_id?: string | null;
  payment_method?: PaymentAttempt["paymentMethod"] | null;
  provider_transaction_id?: string | null;
  provider_checkout_id?: string | null;
  reader_id?: string | null;
  ledger_payment_id?: string | null;
  error_code?: string | null;
  error_message?: string | null;
}
const invoice = (r: InvoiceRow) => ({
  id: r.id,
  patientId: r.patient_id,
  budgetId: r.budget_id ?? null,
  appointmentId: r.appointment_id ?? null,
  seriesId: r.series_id,
  originalInvoiceId: r.original_invoice_id ?? null,
  status: r.status,
  type: r.type,
  customerName: r.customer_name,
  customerTaxId: r.customer_tax_id ?? null,
  customerAddress: r.customer_address ?? null,
  issuerTaxId: r.issuer_tax_id ?? null,
  issuerLegalName: r.issuer_legal_name ?? null,
  issuerAddress: r.issuer_address ?? null,
  subtotalCents: Number(r.subtotal_cents ?? 0),
  taxCents: Number(r.tax_cents ?? 0),
  totalCents: Number(r.total_cents ?? 0),
  fullNumber: r.full_number ?? null,
  sequenceNumber: r.sequence_number ?? null,
  issuedAt: r.issued_at ?? null,
  dueAt: r.due_at ?? null,
  rectificationReason: r.rectification_reason ?? null,
  aeatRectificationType: r.aeat_rectification_type ?? null,
  version: r.version,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  lines: (r.lines ?? []).map((l) => ({
    id: l.id,
    invoiceId: l.invoice_id,
    clinicalPlanItemId: l.clinical_plan_item_id ?? null,
    description: l.description,
    quantity: l.quantity,
    unitPriceCents: Number(l.unit_price_cents),
    taxRateBps: l.tax_rate_bps,
    exemptionCode: l.exemption_code ?? null,
    lineSubtotalCents: Number(l.line_subtotal_cents),
    taxCents: Number(l.tax_cents),
    totalCents: Number(l.total_cents),
  })),
});
const series = (r: SeriesRow) => ({
  id: r.id,
  code: r.code,
  name: r.name,
  prefix: r.prefix,
  nextNumber: r.next_number,
  active: r.active,
});
const settings = (r?: SettingsRow | null) => ({
  fiscalMode: r?.fiscal_mode ?? "NO_VERIFACTU",
  defaultDueDays: r?.default_due_days ?? 0,
  autoSubmitVerifactu: r?.auto_submit_verifactu ?? false,
  fiscalTaxId: r?.fiscal_tax_id ?? null,
  fiscalLegalName: r?.fiscal_legal_name ?? null,
  fiscalAddress: r?.fiscal_address ?? null,
  verifactuEnvironment: r?.verifactu_environment ?? "test",
});
const payment = (r: PaymentRow) => ({
  id: r.id,
  patientId: r.patient_id,
  budgetId: r.budget_id ?? null,
  amountCents: Number(r.amount_cents),
  method: r.method,
  status: r.status,
  provider: r.provider ?? null,
  providerTransactionId: r.provider_transaction_id ?? null,
  idempotencyKey: r.idempotency_key ?? null,
  reference:
    typeof r.provider_metadata?.reference === "string"
      ? r.provider_metadata.reference
      : (r.provider_transaction_id ?? null),
  receivedAt: r.paid_at,
  createdAt: r.created_at,
});
const attempt = (r: AttemptRow): PaymentAttempt => ({
  id: r.id,
  clinicId: r.clinic_id,
  patientId: r.patient_id,
  provider: r.provider,
  providerStatus: r.provider_status,
  idempotencyKey: r.idempotency_key,
  amountCents: Number(r.amount_cents),
  currency: r.currency,
  ...(r.budget_id ? { budgetId: r.budget_id } : {}),
  ...(r.invoice_id ? { invoiceId: r.invoice_id } : {}),
  ...(r.payment_method ? { paymentMethod: r.payment_method } : {}),
  ...(r.provider_transaction_id ? { providerTransactionId: r.provider_transaction_id } : {}),
  ...(r.provider_checkout_id ? { providerCheckoutId: r.provider_checkout_id } : {}),
  ...(r.reader_id ? { readerId: r.reader_id } : {}),
  ...(r.ledger_payment_id ? { ledgerPaymentId: r.ledger_payment_id } : {}),
  ...(r.error_code ? { errorCode: r.error_code } : {}),
  ...(r.error_message ? { errorMessage: r.error_message } : {}),
});
export class FinanceRepository {
  constructor(
    private readonly client: SupabaseRestClient,
    private readonly clinicId: string,
  ) {}
  async listBudgets() {
    const rows = await this.client.select<BudgetListRow>("budgets", {
      select: "id,patient_id,total_cents,status,created_at",
      clinic_id: `eq.${this.clinicId}`,
      order: "created_at.desc",
    });
    return {
      items: rows.map((r) => ({
        id: r.id,
        patientId: r.patient_id,
        totalCents: Number(r.total_cents),
        status: r.status,
        createdAt: r.created_at,
      })),
    };
  }
  async listInvoiceSeries() {
    return {
      items: (
        await this.client.select<SeriesRow>("invoice_series", {
          select: "*",
          clinic_id: `eq.${this.clinicId}`,
          order: "code.asc",
        })
      ).map(series),
    };
  }
  async createInvoiceSeries(p: CreateInvoiceSeries) {
    return series(
      await this.client.rpc<SeriesRow>("create_invoice_series", {
        p_clinic_id: this.clinicId,
        p_code: p.code,
        p_name: p.name,
        p_prefix: p.prefix ?? null,
      }),
    );
  }
  async listInvoices() {
    return {
      items: (
        await this.client.select<InvoiceRow>("invoices", {
          select: "*",
          clinic_id: `eq.${this.clinicId}`,
          order: "created_at.desc",
        })
      ).map(invoice),
    };
  }
  async getInvoice(id: string) {
    const rows = await this.client.select<InvoiceRow>("invoices", {
      select: "*",
      id: `eq.${id}`,
      clinic_id: `eq.${this.clinicId}`,
      limit: 1,
    });
    if (!rows[0]) return null;
    const lines = await this.client.select<InvoiceLineRow>("invoice_lines", {
      select: "*",
      invoice_id: `eq.${id}`,
      order: "created_at.asc",
    });
    return invoice({ ...rows[0], lines });
  }
  async createInvoice(p: CreateInvoiceDraft) {
    return invoice(
      await this.client.rpc<InvoiceRow>("create_invoice_draft", {
        p_patient_id: p.patientId,
        p_budget_id: p.budgetId ?? null,
        p_appointment_id: p.appointmentId ?? null,
        p_series_id: p.seriesId,
        p_type: p.type,
        p_customer_name: p.customerName,
        p_customer_tax_id: p.customerTaxId ?? null,
        p_customer_address: p.customerAddress ?? null,
        p_lines: p.lines,
      }),
    );
  }
  async createInvoiceFromBudget(budgetId: string, seriesId: string) {
    return invoice(
      await this.client.rpc<InvoiceRow>("create_invoice_from_budget", {
        p_budget_id: budgetId,
        p_series_id: seriesId,
      }),
    );
  }
  async issueInvoice(id: string) {
    return invoice(await this.client.rpc<InvoiceRow>("issue_invoice", { p_invoice_id: id }));
  }
  async rectifyInvoice(id: string, p: RectifyInvoice) {
    return invoice(
      await this.client.rpc<InvoiceRow>("rectify_invoice", {
        p_invoice_id: id,
        p_reason: p.reason,
        p_lines: p.lines ?? null,
        p_aeat_rectification_type: p.aeatRectificationType ?? null,
      }),
    );
  }
  async getBillingSettings() {
    return settings(
      (
        await this.client.select<SettingsRow>("billing_settings", {
          select: "*",
          clinic_id: `eq.${this.clinicId}`,
          limit: 1,
        })
      )[0],
    );
  }
  async updateBillingSettings(p: UpdateBillingSettings) {
    return settings(
      await this.client.rpc<SettingsRow>("update_billing_settings", {
        p_clinic_id: this.clinicId,
        p_fiscal_mode: p.fiscalMode,
        p_default_due_days: p.defaultDueDays,
        p_auto_submit_verifactu: p.autoSubmitVerifactu,
        p_fiscal_tax_id: p.fiscalTaxId ?? null,
        p_fiscal_legal_name: p.fiscalLegalName ?? null,
        p_fiscal_address: p.fiscalAddress ?? null,
        p_verifactu_environment: p.verifactuEnvironment ?? "test",
      }),
    );
  }
  async listPayments() {
    return {
      items: (
        await this.client.select<PaymentRow>("payments", {
          select: "*",
          clinic_id: `eq.${this.clinicId}`,
          order: "paid_at.desc",
        })
      ).map(payment),
    };
  }
  async recordPayment(p: RecordPayment) {
    return payment(
      await this.client.rpc<PaymentRow>("record_invoice_payment", {
        p_patient_id: p.patientId,
        p_invoice_id: p.invoiceId ?? null,
        p_budget_id: p.budgetId ?? null,
        p_amount_cents: p.amountCents,
        p_method: p.method,
        p_provider: p.provider ?? "manual",
        p_provider_transaction_id: p.providerTransactionId ?? null,
        p_idempotency_key: p.idempotencyKey ?? null,
        p_reference: p.reference ?? null,
      }),
    );
  }
  async allocatePayment(paymentId: string, invoiceId: string, amountCents: number) {
    const r = await this.client.rpc<AllocationRow>("allocate_payment_to_invoice", {
      p_payment_id: paymentId,
      p_invoice_id: invoiceId,
      p_amount_cents: amountCents,
    });
    return {
      id: r.id,
      paymentId: r.payment_id,
      invoiceId: r.invoice_id ?? null,
      budgetId: r.budget_id ?? null,
      amountCents: Number(r.amount_cents),
      createdAt: r.created_at,
    };
  }
  async getVerifactuStatus() {
    const [s, records, issued] = await Promise.all([
      this.getBillingSettings(),
      this.client.select<FiscalRecordListRow>("fiscal_records", {
        select: "*",
        clinic_id: `eq.${this.clinicId}`,
        order: "created_at.desc",
        limit: 100,
      }),
      this.client.select<{ id: string }>("invoices", {
        select: "id",
        clinic_id: `eq.${this.clinicId}`,
        status: "neq.DRAFT",
      }),
    ]);
    const counts = { pending: 0, accepted: 0, rejected: 0, error: 0, missingRecord: 0 };
    for (const r of records) {
      const x = String(r.provider_status).toLowerCase();
      if (x === "accepted") counts.accepted++;
      else if (x === "rejected") counts.rejected++;
      else if (x === "error") counts.error++;
      else if (x === "pending" || x === "queued") counts.pending++;
    }
    const ids = new Set(records.map((r) => r.invoice_id).filter(Boolean));
    counts.missingRecord = issued.filter((r) => !ids.has(r.id)).length;
    return {
      settings: s,
      provider: {
        certificateConfigured: Boolean(
          process.env.VERIFACTU_CERTIFICATE_PEM || process.env.VERIFACTU_CERTIFICATE_PATH,
        ),
        environment: s.verifactuEnvironment,
      },
      counts,
      items: records.map((r) => ({
        id: r.id,
        invoiceId: r.invoice_id ?? null,
        recordType: r.record_type,
        providerStatus: r.provider_status,
        previousHash: r.previous_hash ?? null,
        recordHash: r.record_hash,
        fiscalMode: r.fiscal_mode ?? null,
        createdAt: r.created_at,
      })),
    };
  }
  queueVerifactu(invoiceId: string) {
    return this.client.rpc<J>("queue_verifactu_submission", { p_invoice_id: invoiceId });
  }
  async accountingCsv(start?: string, end?: string) {
    const iq: Record<string, string> = {
      select: "*",
      clinic_id: `eq.${this.clinicId}`,
      status: "neq.DRAFT",
      order: "issued_at.asc",
    };
    const pq: Record<string, string> = {
      select: "*",
      clinic_id: `eq.${this.clinicId}`,
      order: "paid_at.asc",
    };
    const range = (column: string) =>
      [start ? `${column}.gte.${start}` : null, end ? `${column}.lt.${end}` : null]
        .filter(Boolean)
        .join(",");
    if (start || end) {
      iq.and = `(${range("issued_at")})`;
      pq.and = `(${range("paid_at")})`;
    }
    const [ii, pp] = await Promise.all([
      this.client.select<InvoiceRow>("invoices", iq),
      this.client.select<PaymentRow>("payments", pq),
    ]);
    const q = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;
    const rows = [
      "tipo,fecha,documento,paciente,base_cents,impuesto_cents,total_cents,metodo,referencia",
    ];
    for (const i of ii)
      rows.push(
        [
          "FACTURA",
          i.issued_at,
          i.full_number,
          i.patient_id,
          i.subtotal_cents,
          i.tax_cents,
          i.total_cents,
          "",
          "",
        ]
          .map(q)
          .join(","),
      );
    for (const p of pp)
      rows.push(
        [
          "COBRO",
          p.paid_at,
          p.id,
          p.patient_id,
          "",
          "",
          p.amount_cents,
          p.method,
          p.provider_transaction_id ?? "",
        ]
          .map(q)
          .join(","),
      );
    return rows.join("\n") + "\n";
  }
  async findPaymentAttempt(provider: PaymentProvider, key: string) {
    const rows = await this.client.select<AttemptRow>("payment_attempts", {
      select: "*",
      clinic_id: `eq.${this.clinicId}`,
      provider: `eq.${provider}`,
      idempotency_key: `eq.${key}`,
      limit: 1,
    });
    return rows[0] ? attempt(rows[0]) : null;
  }
  async loadPaymentAttempt(id: string) {
    const rows = await this.client.select<AttemptRow>("payment_attempts", {
      select: "*",
      id: `eq.${id}`,
      clinic_id: `eq.${this.clinicId}`,
      limit: 1,
    });
    if (!rows[0]) throw new SupabaseRestError("Intento de pago no encontrado.", 404, { id });
    return attempt(rows[0]);
  }
  async createPaymentAttempt(v: Omit<PaymentAttempt, "id">) {
    return attempt(
      await this.client.rpc<AttemptRow>("create_or_get_payment_attempt", {
        p_patient_id: v.patientId,
        p_provider: v.provider,
        p_amount_cents: v.amountCents,
        p_currency: v.currency,
        p_idempotency_key: v.idempotencyKey,
        p_budget_id: v.budgetId ?? null,
        p_invoice_id: v.invoiceId ?? null,
        p_method: v.paymentMethod ?? (v.provider === "manual" ? "OTHER" : "CARD"),
      }),
    );
  }
  async updatePaymentAttempt(id: string, p: Partial<PaymentAttempt>) {
    const current = await this.loadPaymentAttempt(id);
    return attempt(
      await this.client.rpc<AttemptRow>("update_payment_attempt", {
        p_attempt_id: id,
        p_status: p.providerStatus ?? current.providerStatus,
        p_provider_transaction_id: p.providerTransactionId ?? null,
        p_provider_checkout_id: p.providerCheckoutId ?? null,
        p_reader_id: p.readerId ?? null,
        p_error_code: p.errorCode ?? null,
        p_error_message: p.errorMessage ?? null,
      }),
    );
  }
  paymentAttemptStore(): PaymentAttemptStore {
    return {
      find: (_c, p, k) => this.findPaymentAttempt(p, k),
      create: (v) => this.createPaymentAttempt(v),
      update: (id, p) => this.updatePaymentAttempt(id, p),
    };
  }
  async postSucceededPaymentAttempt(id: string) {
    return payment(
      await this.client.rpc<PaymentRow>("post_succeeded_payment_attempt", { p_attempt_id: id }),
    );
  }
}
