export interface AccountingInvoice {
  issued_at?: string | null;
  full_number?: string | null;
  customer_name?: string | null;
  patient_id: string;
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  status: string;
}

export interface AccountingPayment {
  paid_at: string;
  id: string;
  patient_id: string;
  amount_cents: number;
  method: string;
  status?: string | null;
  provider_transaction_id?: string | null;
}

const HEADERS = [
  "Fecha",
  "Tipo",
  "Documento",
  "Paciente",
  "Base (€)",
  "Impuesto (€)",
  "Total (€)",
  "Método",
  "Referencia",
  "Estado",
];

const MADRID_DATE = new Intl.DateTimeFormat("es-ES", {
  timeZone: "Europe/Madrid",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const euros = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

const formatDate = (iso?: string | null) => {
  const time = iso ? Date.parse(iso) : NaN;
  return Number.isNaN(time) ? "" : MADRID_DATE.format(time);
};

// Same spreadsheet-formula neutralisation as the other exports.
const cell = (value: string) => {
  const safe = /^[\s\u0000-\u001f]*[=+@-]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
};

/**
 * One row per invoice/payment in chronological order, with readable names, euro amounts and
 * a semicolon delimiter so Spanish-locale Excel splits the columns instead of showing one blob.
 */
export function buildAccountingCsv(
  invoices: readonly AccountingInvoice[],
  payments: readonly AccountingPayment[],
  patientNames: ReadonlyMap<string, string>,
): string {
  const entries = [
    ...invoices.map((i) => ({
      at: i.issued_at ?? "",
      order: 0,
      cells: [
        formatDate(i.issued_at),
        "Factura",
        i.full_number ?? "",
        i.customer_name || patientNames.get(i.patient_id) || "",
        euros(i.subtotal_cents),
        euros(i.tax_cents),
        euros(i.total_cents),
        "",
        "",
        i.status,
      ],
    })),
    ...payments.map((p) => ({
      at: p.paid_at,
      order: 1,
      cells: [
        formatDate(p.paid_at),
        "Cobro",
        p.id,
        patientNames.get(p.patient_id) ?? "",
        "",
        "",
        euros(p.amount_cents),
        p.method,
        p.provider_transaction_id ?? "",
        p.status ?? "",
      ],
    })),
  ].sort((a, b) => Date.parse(a.at) - Date.parse(b.at) || a.order - b.order);

  return (
    "\uFEFF" +
    [HEADERS, ...entries.map((e) => e.cells)].map((row) => row.map(cell).join(";")).join("\r\n") +
    "\r\n"
  );
}
