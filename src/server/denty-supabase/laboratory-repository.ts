import type { SupabaseRestClient } from "../supabase/rest-client";

interface LaboratoryRow {
  id: string;
  clinic_id: string;
  name: string;
  tax_id: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  default_turnaround_days: number;
  active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

interface LabWorkRow {
  id: string;
  clinic_id: string;
  patient_id: string;
  laboratory_id: string | null;
  clinical_plan_item_id: string | null;
  appointment_id: string | null;
  dental_entity_id: string | null;
  site_id: string | null;
  title: string;
  category: string | null;
  tooth_or_zone: string | null;
  status: string;
  notes: string | null;
  sent_at: string | null;
  eta_at: string | null;
  received_at: string | null;
  placed_at: string | null;
  cost_cents: number;
  version: number;
  created_at: string;
  updated_at: string;
}

interface PatientRow {
  id: string;
  first_name: string;
  last_name: string;
}
interface AttachmentRow {
  id: string;
  lab_work_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  sha256: string;
  created_at: string;
}
interface LabWorkStatusEventRow {
  id: string;
  lab_work_id: string;
  from_status: string | null;
  to_status: string;
  note: string | null;
  changed_at: string;
}
interface LabReworkRow {
  id: string;
  parent_lab_work_id: string;
  reason: string;
  cost_cents: number;
  eta_at: string | null;
  created_at: string;
}
interface SupplierInvoiceRow {
  id: string;
  clinic_id: string;
  laboratory_id: string;
  site_id: string | null;
  invoice_number: string;
  issued_at: string;
  total_cents: number;
  status: string;
  document_path: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}
interface SupplierPaymentRow {
  id: string;
  clinic_id: string;
  laboratory_id: string;
  amount_cents: number;
  method: string;
  paid_at: string;
  note: string | null;
  idempotency_key: string;
  created_at: string;
}
interface LaboratoryPriceListRow {
  id: string;
  clinic_id: string;
  laboratory_id: string;
  work_type_id: string;
  work_type_name: string;
  work_type_code: string | null;
  price_cents: number;
  turnaround_days: number;
  active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}
interface AppointmentRow {
  id: string;
  patient_id: string;
  starts_at: string;
  status: string;
}

export interface CreateLaboratoryInput {
  name: string;
  taxId?: string;
  phone?: string;
  email?: string;
  address?: string;
  defaultTurnaroundDays?: number;
}
export interface UpdateLaboratoryInput extends Partial<CreateLaboratoryInput> {
  expectedVersion: number;
  active?: boolean;
}
export interface CreateLabWorkInput {
  patientId: string;
  laboratoryId?: string;
  clinicalPlanItemId?: string;
  appointmentId?: string;
  dentalEntityId?: string;
  siteId?: string;
  title: string;
  category?: string;
  toothOrZone?: string;
  etaAt?: string;
  costCents?: number;
  notes?: string;
}
export interface SupplierInvoiceInput {
  laboratoryId: string;
  invoiceNumber: string;
  issuedAt: string;
  totalCents: number;
  siteId?: string;
  documentPath?: string;
  items?: Array<{
    labWorkId?: string;
    category: string;
    productCode?: string;
    description: string;
    quantity: number;
    unitCostCents: number;
    totalCents?: number;
  }>;
}
export interface SupplierPaymentInput {
  laboratoryId: string;
  amountCents: number;
  method: "BANK_TRANSFER" | "CARD" | "CASH" | "DIRECT_DEBIT" | "OTHER";
  paidAt?: string;
  note?: string;
  idempotencyKey: string;
}
export interface UpsertLaboratoryPriceInput {
  laboratoryId: string;
  workTypeName: string;
  workTypeCode?: string;
  priceCents: number;
  turnaroundDays: number;
  active?: boolean;
  expectedVersion?: number;
}

const laboratory = (r: LaboratoryRow) => ({
  id: r.id,
  name: r.name,
  taxId: r.tax_id ?? null,
  phone: r.phone ?? null,
  email: r.email ?? null,
  address: r.address ?? null,
  defaultTurnaroundDays: r.default_turnaround_days,
  active: r.active,
  version: r.version,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const supplierInvoice = (r: SupplierInvoiceRow) => ({
  id: r.id,
  laboratoryId: r.laboratory_id,
  siteId: r.site_id ?? null,
  invoiceNumber: r.invoice_number,
  issuedAt: r.issued_at,
  totalCents: Number(r.total_cents),
  status: r.status,
  documentPath: r.document_path ?? null,
  version: r.version,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const supplierPayment = (r: SupplierPaymentRow) => ({
  id: r.id,
  laboratoryId: r.laboratory_id,
  amountCents: Number(r.amount_cents),
  method: r.method,
  paidAt: r.paid_at,
  note: r.note ?? null,
  idempotencyKey: r.idempotency_key,
  createdAt: r.created_at,
});

const laboratoryPriceListItem = (r: LaboratoryPriceListRow) => ({
  id: r.id,
  laboratoryId: r.laboratory_id,
  workTypeId: r.work_type_id,
  workTypeName: r.work_type_name,
  workTypeCode: r.work_type_code ?? null,
  priceCents: Number(r.price_cents),
  turnaroundDays: r.turnaround_days,
  active: r.active,
  version: r.version,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export class LaboratoryRepository {
  constructor(
    private readonly client: SupabaseRestClient,
    private readonly clinicId: string,
  ) {}

  async listLaboratories() {
    const rows = await this.client.select<LaboratoryRow>("laboratories", {
      select: "*",
      clinic_id: `eq.${this.clinicId}`,
      order: "active.desc,name.asc",
    });
    return { items: rows.map(laboratory) };
  }

  async createLaboratory(input: CreateLaboratoryInput) {
    return laboratory(
      await this.client.rpc<LaboratoryRow>("create_laboratory", {
        p_clinic_id: this.clinicId,
        p_name: input.name,
        p_tax_id: input.taxId ?? null,
        p_phone: input.phone ?? null,
        p_email: input.email ?? null,
        p_address: input.address ?? null,
        p_default_turnaround_days: input.defaultTurnaroundDays ?? 7,
      }),
    );
  }

  async updateLaboratory(id: string, input: UpdateLaboratoryInput) {
    return laboratory(
      await this.client.rpc<LaboratoryRow>("update_laboratory", {
        p_laboratory_id: id,
        p_expected_version: input.expectedVersion,
        p_name: input.name ?? null,
        p_tax_id: input.taxId ?? null,
        p_phone: input.phone ?? null,
        p_email: input.email ?? null,
        p_address: input.address ?? null,
        p_default_turnaround_days: input.defaultTurnaroundDays ?? null,
        p_active: input.active ?? null,
      }),
    );
  }

  async listPriceList() {
    const rows = await this.client.select<LaboratoryPriceListRow>("laboratory_price_list_view", {
      select: "*",
      clinic_id: `eq.${this.clinicId}`,
      order: "work_type_name.asc",
    });
    return { items: rows.map(laboratoryPriceListItem) };
  }

  async upsertPriceListItem(input: UpsertLaboratoryPriceInput) {
    return laboratoryPriceListItem(
      await this.client.rpc<LaboratoryPriceListRow>("upsert_laboratory_price_list_item", {
        p_clinic_id: this.clinicId,
        p_laboratory_id: input.laboratoryId,
        p_work_type_name: input.workTypeName,
        p_work_type_code: input.workTypeCode ?? null,
        p_price_cents: input.priceCents,
        p_turnaround_days: input.turnaroundDays,
        p_active: input.active ?? true,
        p_expected_version: input.expectedVersion ?? null,
      }),
    );
  }

  async listWorks() {
    const [rows, patients, labs, attachments, events, reworks] = await Promise.all([
      this.client.select<LabWorkRow>("lab_works", {
        select: "*",
        clinic_id: `eq.${this.clinicId}`,
        order: "created_at.desc",
      }),
      this.client.select<PatientRow>("patients", {
        select: "id,first_name,last_name",
        clinic_id: `eq.${this.clinicId}`,
      }),
      this.client.select<LaboratoryRow>("laboratories", {
        select: "*",
        clinic_id: `eq.${this.clinicId}`,
      }),
      this.client.select<AttachmentRow>("lab_attachments", {
        select: "*",
        clinic_id: `eq.${this.clinicId}`,
        order: "created_at.asc",
      }),
      this.client.select<LabWorkStatusEventRow>("lab_work_status_events", {
        select: "*",
        clinic_id: `eq.${this.clinicId}`,
        order: "changed_at.asc",
      }),
      this.client.select<LabReworkRow>("lab_reworks", {
        select: "*",
        clinic_id: `eq.${this.clinicId}`,
        order: "created_at.asc",
      }),
    ]);
    const patientMap = new Map(patients.map((x) => [x.id, x]));
    const labMap = new Map(labs.map((x) => [x.id, x]));
    const byWork = new Map<string, AttachmentRow[]>();
    const eventsByWork = new Map<string, LabWorkStatusEventRow[]>();
    const reworksByWork = new Map<string, LabReworkRow[]>();
    for (const item of attachments)
      byWork.set(item.lab_work_id, [...(byWork.get(item.lab_work_id) ?? []), item]);
    for (const item of events)
      eventsByWork.set(item.lab_work_id, [...(eventsByWork.get(item.lab_work_id) ?? []), item]);
    for (const item of reworks)
      reworksByWork.set(item.parent_lab_work_id, [
        ...(reworksByWork.get(item.parent_lab_work_id) ?? []),
        item,
      ]);
    return {
      items: rows.map((row) =>
        this.mapWork(
          row,
          patientMap.get(row.patient_id),
          row.laboratory_id ? labMap.get(row.laboratory_id) : undefined,
          byWork.get(row.id) ?? [],
          eventsByWork.get(row.id) ?? [],
          reworksByWork.get(row.id) ?? [],
        ),
      ),
    };
  }

  async getWork(id: string) {
    const rows = await this.client.select<LabWorkRow>("lab_works", {
      select: "*",
      id: `eq.${id}`,
      clinic_id: `eq.${this.clinicId}`,
      limit: 1,
    });
    const row = rows[0];
    if (!row) return null;
    const [patients, labs, attachments, events, reworks] = await Promise.all([
      this.client.select<PatientRow>("patients", {
        select: "id,first_name,last_name",
        id: `eq.${row.patient_id}`,
        clinic_id: `eq.${this.clinicId}`,
        limit: 1,
      }),
      row.laboratory_id
        ? this.client.select<LaboratoryRow>("laboratories", {
            select: "*",
            id: `eq.${row.laboratory_id}`,
            clinic_id: `eq.${this.clinicId}`,
            limit: 1,
          })
        : Promise.resolve([]),
      this.client.select<AttachmentRow>("lab_attachments", {
        select: "*",
        lab_work_id: `eq.${id}`,
        clinic_id: `eq.${this.clinicId}`,
        order: "created_at.asc",
      }),
      this.client.select<LabWorkStatusEventRow>("lab_work_status_events", {
        select: "*",
        lab_work_id: `eq.${id}`,
        clinic_id: `eq.${this.clinicId}`,
        order: "changed_at.asc",
      }),
      this.client.select<LabReworkRow>("lab_reworks", {
        select: "*",
        parent_lab_work_id: `eq.${id}`,
        clinic_id: `eq.${this.clinicId}`,
        order: "created_at.asc",
      }),
    ]);
    return this.mapWork(row, patients[0], labs[0], attachments, events, reworks);
  }

  async createWork(input: CreateLabWorkInput) {
    const row = await this.client.rpc<LabWorkRow>("create_lab_work", {
      p_clinic_id: this.clinicId,
      p_patient_id: input.patientId,
      p_title: input.title,
      p_laboratory_id: input.laboratoryId ?? null,
      p_clinical_plan_item_id: input.clinicalPlanItemId ?? null,
      p_appointment_id: input.appointmentId ?? null,
      p_dental_entity_id: input.dentalEntityId ?? null,
      p_site_id: input.siteId ?? null,
      p_category: input.category ?? null,
      p_tooth_or_zone: input.toothOrZone ?? null,
      p_eta_at: input.etaAt ?? null,
      p_cost_cents: input.costCents ?? 0,
      p_notes: input.notes ?? null,
    });
    return (await this.getWork(row.id)) ?? this.mapWork(row);
  }

  async transitionWork(id: string, expectedVersion: number, status: string, note?: string) {
    const row = await this.client.rpc<LabWorkRow>("transition_lab_work", {
      p_lab_work_id: id,
      p_expected_version: expectedVersion,
      p_status: status,
      p_note: note ?? null,
    });
    return (await this.getWork(row.id)) ?? this.mapWork(row);
  }

  async createRework(id: string, input: { reason: string; costCents?: number; etaAt?: string }) {
    await this.client.rpc<Record<string, unknown>>("create_lab_rework", {
      p_lab_work_id: id,
      p_reason: input.reason,
      p_cost_cents: input.costCents ?? 0,
      p_eta_at: input.etaAt ?? null,
    });
    const work = await this.getWork(id);
    if (!work)
      throw new Error("Trabajo de laboratorio no encontrado tras registrar la repetición.");
    return work;
  }

  async agendaWarning(id: string) {
    const work = await this.getWork(id);
    if (!work || !work.etaAt || ["RECEIVED", "PLACED", "CANCELLED"].includes(work.status))
      return { warning: false, appointments: [] };
    const rows = await this.client.select<AppointmentRow>("appointments", {
      select: "id,patient_id,starts_at,status",
      clinic_id: `eq.${this.clinicId}`,
      patient_id: `eq.${work.patientId}`,
      starts_at: `lt.${work.etaAt}`,
      status: "in.(PLANNED,CONFIRMED,ARRIVED,WAITING,IN_CHAIR)",
      order: "starts_at.asc",
    });
    const future = rows.filter((row) => new Date(row.starts_at).getTime() > Date.now());
    return {
      warning: future.length > 0,
      appointments: future.map((row) => ({ id: row.id, startsAt: row.starts_at })),
    };
  }

  async registerAttachment(
    id: string,
    stored: { path: string; checksum: string; mimeType: string; sizeBytes: number },
    fileName: string,
  ) {
    const row = await this.client.rpc<AttachmentRow>("register_lab_attachment", {
      p_lab_work_id: id,
      p_storage_path: stored.path,
      p_file_name: fileName,
      p_mime_type: stored.mimeType,
      p_size_bytes: stored.sizeBytes,
      p_sha256: stored.checksum,
    });
    return {
      id: row.id,
      fileName: row.file_name,
      mimeType: row.mime_type,
      sizeBytes: Number(row.size_bytes),
      sha256: row.sha256,
      createdAt: row.created_at,
    };
  }

  async attachment(id: string, attachmentId: string) {
    const rows = await this.client.select<AttachmentRow>("lab_attachments", {
      select: "*",
      id: `eq.${attachmentId}`,
      lab_work_id: `eq.${id}`,
      clinic_id: `eq.${this.clinicId}`,
      limit: 1,
    });
    return rows[0] ?? null;
  }

  listBalances() {
    return this.client.rpc<{ items: Array<Record<string, unknown>> }>("laboratory_balances", {
      p_clinic_id: this.clinicId,
    });
  }

  async recordSupplierInvoice(input: SupplierInvoiceInput) {
    return supplierInvoice(
      await this.client.rpc<SupplierInvoiceRow>("record_supplier_invoice", {
        p_clinic_id: this.clinicId,
        p_laboratory_id: input.laboratoryId,
        p_invoice_number: input.invoiceNumber,
        p_issued_at: input.issuedAt,
        p_total_cents: input.totalCents,
        p_site_id: input.siteId ?? null,
        p_document_path: input.documentPath ?? null,
        p_items: input.items ?? [],
      }),
    );
  }

  async listSupplierInvoices() {
    const rows = await this.client.select<SupplierInvoiceRow>("supplier_invoices", {
      select: "*",
      clinic_id: `eq.${this.clinicId}`,
      order: "issued_at.desc",
    });
    return { items: rows.map(supplierInvoice) };
  }

  async recordSupplierPayment(input: SupplierPaymentInput) {
    return supplierPayment(
      await this.client.rpc<SupplierPaymentRow>("record_supplier_payment", {
        p_clinic_id: this.clinicId,
        p_laboratory_id: input.laboratoryId,
        p_amount_cents: input.amountCents,
        p_method: input.method,
        p_paid_at: input.paidAt ?? new Date().toISOString(),
        p_note: input.note ?? null,
        p_idempotency_key: input.idempotencyKey,
      }),
    );
  }

  async listSupplierPayments() {
    const rows = await this.client.select<SupplierPaymentRow>("supplier_payments", {
      select: "*",
      clinic_id: `eq.${this.clinicId}`,
      order: "paid_at.desc",
    });
    return { items: rows.map(supplierPayment) };
  }

  allocateSupplierPayment(paymentId: string, invoiceId: string, amountCents: number) {
    return this.client.rpc<Record<string, unknown>>("allocate_supplier_payment", {
      p_supplier_payment_id: paymentId,
      p_supplier_invoice_id: invoiceId,
      p_amount_cents: amountCents,
    });
  }

  suppliersAnalytics() {
    return this.client.rpc<Record<string, unknown>>("analytics_suppliers", {
      p_clinic_id: this.clinicId,
    });
  }
  purchasesAnalytics(start?: string, end?: string, siteId?: string) {
    return this.client.rpc<Record<string, unknown>>("analytics_purchases", {
      p_clinic_id: this.clinicId,
      p_start: start ?? null,
      p_end: end ?? null,
      p_site_id: siteId ?? null,
    });
  }

  private mapWork(
    row: LabWorkRow,
    patient?: PatientRow,
    lab?: LaboratoryRow,
    attachments: AttachmentRow[] = [],
    statusEvents: LabWorkStatusEventRow[] = [],
    reworks: LabReworkRow[] = [],
  ) {
    return {
      id: row.id,
      patientId: row.patient_id,
      laboratoryId: row.laboratory_id ?? null,
      clinicalPlanItemId: row.clinical_plan_item_id ?? null,
      appointmentId: row.appointment_id ?? null,
      dentalEntityId: row.dental_entity_id ?? null,
      siteId: row.site_id ?? null,
      title: row.title,
      status: row.status,
      category: row.category ?? null,
      toothOrZone: row.tooth_or_zone ?? null,
      etaAt: row.eta_at ?? null,
      sentAt: row.sent_at ?? null,
      receivedAt: row.received_at ?? null,
      placedAt: row.placed_at ?? null,
      notes: row.notes ?? null,
      costCents: Number(row.cost_cents ?? 0),
      version: row.version,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      ...(patient
        ? {
            patient: { id: patient.id, firstName: patient.first_name, lastName: patient.last_name },
          }
        : {}),
      lab: lab ? { id: lab.id, name: lab.name } : null,
      attachments: attachments.map((a) => ({
        id: a.id,
        fileName: a.file_name,
        mimeType: a.mime_type,
        sizeBytes: Number(a.size_bytes),
        sha256: a.sha256,
        createdAt: a.created_at,
      })),
      statusEvents: statusEvents.map((event) => ({
        id: event.id,
        fromStatus: event.from_status ?? null,
        toStatus: event.to_status,
        note: event.note ?? null,
        changedAt: event.changed_at,
      })),
      reworks: reworks.map((rework) => ({
        id: rework.id,
        reason: rework.reason,
        costCents: Number(rework.cost_cents),
        etaAt: rework.eta_at ?? null,
        createdAt: rework.created_at,
      })),
    };
  }
}
