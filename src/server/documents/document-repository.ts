import { createDocumentSchema } from "@/shared/api";
import { createDebtAcknowledgementSchema } from "@/shared/api/contracts";
import type { z } from "zod";

type CreateDocument = z.input<typeof createDocumentSchema>;
type CreateDebtAcknowledgement = z.infer<typeof createDebtAcknowledgementSchema>;

import type { SupabaseRestClient } from "../supabase/rest-client";
import { CLINICAL_DOCUMENTS_BUCKET, type StorageRepository } from "../storage/storage-repository";

interface DocumentRow {
  id: string;
  clinic_id: string;
  patient_id: string;
  template_id: string | null;
  type: string;
  title: string;
  status: string;
  data_json: Record<string, unknown>;
  file_name: string | null;
  mime_type: string | null;
  storage_path: string | null;
  checksum: string | null;
  version: number;
  version_series_id: string;
  previous_version_id: string | null;
  file_size_bytes: number | null;
  signer_name?: string | null;
  signed_at?: string | null;
  metadata_json?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentView {
  id: string;
  patientId: string;
  type: string;
  title: string;
  status: string;
  fileName: string | null;
  mimeType: string | null;
  checksum: string | null;
  version: number;
  previousVersionId: string | null;
  fileSizeBytes: number | null;
  templateId: string | null;
  signerName: string | null;
  signedAt: string | null;
  data: Record<string, unknown>;
  createdAt: string;
}

export class DocumentRepository {
  constructor(
    private readonly rest: SupabaseRestClient,
    private readonly storage: StorageRepository,
    private readonly clinicId: string,
  ) {}

  async list(patientId?: string): Promise<{ items: DocumentView[] }> {
    const query: Record<string, string | number | undefined> = {
      select: "*",
      clinic_id: `eq.${this.clinicId}`,
      order: "created_at.desc",
    };
    if (patientId) query.patient_id = `eq.${patientId}`;
    const rows = await this.rest.select<DocumentRow>("documents", query);
    return { items: rows.map(toView) };
  }

  async get(id: string): Promise<DocumentRow | null> {
    const rows = await this.rest.select<DocumentRow>("documents", {
      select: "*",
      id: `eq.${id}`,
      clinic_id: `eq.${this.clinicId}`,
      limit: 1,
    });
    return rows[0] ?? null;
  }

  async create(payload: CreateDocument): Promise<DocumentView> {
    if (payload.type === "DEBT_ACKNOWLEDGEMENT")
      throw new Error("Utiliza el formulario de reconocimiento de deuda para verificar los datos.");
    const patients = await this.rest.select<{ id: string }>("patients", {
      select: "id",
      clinic_id: `eq.${this.clinicId}`,
      id: `eq.${payload.patientId}`,
      limit: 1,
    });
    if (!patients[0]) throw new Error("El paciente no pertenece a la clínica activa.");
    const row = await this.rest.insert<DocumentRow>("documents", {
      clinic_id: this.clinicId,
      patient_id: payload.patientId,
      template_id: payload.templateId ?? null,
      type: payload.type,
      title: payload.title,
      data_json: payload.data,
      status: "DRAFT",
    });
    return toView(row);
  }

  /**
   * Financial acknowledgement. Resolve all personal/site/doctor fields from the
   * authenticated clinic on the server, never from client-provided names.
   */
  async createDebtAcknowledgement(input: CreateDebtAcknowledgement): Promise<DocumentView> {
    const [patientRows, siteRows, doctorRows, clinicRows, templates, fiscalRows] = await Promise.all([
      this.rest.select<{ id: string; first_name: string; last_name: string; dni: string | null }>(
        "patients", { select: "id,first_name,last_name,dni", clinic_id: `eq.${this.clinicId}`, id: `eq.${input.patientId}`, limit: 1 },
      ),
      this.rest.select<{ id: string; name: string; address: string | null; city: string | null }>(
        "sites", { select: "id,name,address,city", clinic_id: `eq.${this.clinicId}`, id: `eq.${input.siteId}`, limit: 1 },
      ),
      this.rest.select<{ id: string; display_name: string; role: string; active: boolean }>(
        "staff_members", { select: "id,display_name,role,active", clinic_id: `eq.${this.clinicId}`, id: `eq.${input.doctorId}`, limit: 1 },
      ),
      this.rest.select<{ name: string }>("clinics", {
        select: "name", id: `eq.${this.clinicId}`, limit: 1,
      }),
      this.rest.select<{ id: string; body: string; version: number }>(
        "document_templates", {
          select: "id,body,version", clinic_id: `eq.${this.clinicId}`,
          code: "eq.DEBT_ACKNOWLEDGEMENT", active: "eq.true",
          order: "version.desc", limit: 1,
        },
      ),
      this.rest.select<{ fiscal_legal_name: string | null; fiscal_tax_id: string | null }>(
        "billing_settings", { select: "fiscal_legal_name,fiscal_tax_id",
          clinic_id: `eq.${this.clinicId}`, limit: 1 },
      ),
    ]);
    const patient = patientRows[0];
    const site = siteRows[0];
    const doctor = doctorRows[0];
    const clinic = clinicRows[0];
    const template = templates[0];
    const fiscal = fiscalRows[0];
    if (!fiscal?.fiscal_legal_name?.trim() || !fiscal.fiscal_tax_id?.trim())
      throw new Error("Configura la razón social y el NIF/CIF del emisor en Ajustes de facturación.");
    if (!patient || !patient.dni?.trim())
      throw new Error("El paciente debe tener DNI/NIE registrado antes de firmar.");
    if (!site || !doctor || !doctor.active || doctor.role !== "DENTIST" || !clinic || !template)
      throw new Error("No hay sede, doctor activo o plantilla de deuda válida en esta clínica.");

    const euro = (cents: number) =>
      (cents / 100).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    let amountCents = input.amountCents ?? 0;
    let totalCents = amountCents;
    let paidCents = 0;
    let reference = "Importe pendiente confirmado con el paciente";
    if (input.budgetId) {
      const budgets = await this.rest.select<{
        id: string; code: string; status: string; total_cents: number; title: string | null;
      }>("budgets", {
        select: "id,code,status,total_cents,title", clinic_id: `eq.${this.clinicId}`,
        patient_id: `eq.${input.patientId}`, id: `eq.${input.budgetId}`, limit: 1,
      });
      const budget = budgets[0];
      if (!budget || budget.status !== "SIGNED" || budget.total_cents <= 0)
        throw new Error("Selecciona un presupuesto firmado de este paciente.");
      const [payments, allocations] = await Promise.all([
        this.rest.select<{
          id: string; amount_cents: number; status: string; budget_id: string | null;
        }>("payments", {
          select: "id,amount_cents,status,budget_id",
          clinic_id: `eq.${this.clinicId}`, patient_id: `eq.${input.patientId}`,
          limit: 10000,
        }),
        this.rest.select<{ payment_id: string; amount_cents: number }>(
          "payment_allocations", {
            select: "payment_id,amount_cents", budget_id: `eq.${budget.id}`,
            limit: 10000,
          },
        ),
      ]);
      const validPayments = new Map(payments
        .filter(payment => payment.status === "COMPLETED")
        .map(payment => [payment.id, payment]));
      if (payments.some(payment => payment.budget_id === budget.id &&
            payment.status === "PARTIALLY_REFUNDED"))
        throw new Error("Existen abonos parcialmente devueltos. Verifica el saldo en Finanzas.");
      const allocated = allocations.reduce((sum, a) =>
        sum + (validPayments.has(a.payment_id) ? Number(a.amount_cents) : 0), 0);
      const allocatedPaymentIds = new Set(allocations.map(a => a.payment_id));
      const direct = payments.reduce((sum, p) =>
        sum + (p.status === "COMPLETED" && p.budget_id === budget.id &&
          !allocatedPaymentIds.has(p.id) ? Number(p.amount_cents) : 0), 0);
      paidCents = allocated + direct;
      totalCents = budget.total_cents;
      amountCents = totalCents - paidCents;
      reference = `Presupuesto ${budget.code}${budget.title ? ` · ${budget.title}` : ""}`;
    }
    if (!Number.isSafeInteger(amountCents) || amountCents <= 0 || amountCents > 100_000_000)
      throw new Error("No existe saldo pendiente positivo o el importe no es válido.");
    const date = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Madrid" });
    if (input.dueMode === "FIXED_DATE" &&
        (!input.dueDate || input.dueDate < date))
      throw new Error("La fecha de pago debe ser hoy o posterior.");
    const dueText = input.dueMode === "END_OF_TREATMENT"
      ? "al finalizar el tratamiento odontológico descrito, cuando se comunique su finalización"
      : `como máximo el ${input.dueDate!.slice(8,10)}/${input.dueDate!.slice(5,7)}/${input.dueDate!.slice(0,4)}`;
    const snapshot = {
      documentKind: "DEBT_ACKNOWLEDGEMENT",
      fecha: date,
      doctorId: doctor.id,
      doctor: doctor.display_name,
      siteId: site.id,
      sede: site.name,
      direccion_sede: [site.address,site.city].filter(Boolean).join(", "),
      ciudad: site.city ?? "",
      clinica: clinic.name,
      acreedor: fiscal.fiscal_legal_name.trim(),
      nif_acreedor: fiscal.fiscal_tax_id.trim(),
      paciente: [patient.first_name,patient.last_name].join(" ").trim(),
      dni: patient.dni.trim(),
      concepto: input.concept,
      referencia: reference,
      importe_deuda: euro(amountCents),
      importe_total: euro(totalCents),
      importe_pagado: input.budgetId ? euro(paidCents) : "",
      desglose: input.budgetId
        ? `Total del presupuesto: ${euro(totalCents)} euros; pagos contabilizados: ${euro(paidCents)} euros; saldo pendiente: ${euro(amountCents)} euros.`
        : "Saldo comunicado y comprobado manualmente con el paciente; compruebe los abonos previos en el sistema de cobros.",
      importe_deuda_centimos: amountCents,
      vencimiento: dueText,
      dueMode: input.dueMode,
      dueDate: input.dueDate ?? null,
      budgetId: input.budgetId ?? null,
    };
    const result = await this.rest.insert<DocumentRow>("documents", {
      clinic_id: this.clinicId,
      patient_id: patient.id,
      template_id: template.id,
      type: "DEBT_ACKNOWLEDGEMENT",
      title: "Reconocimiento de deuda",
      data_json: snapshot,
      status: "DRAFT",
    });
    return toView(result);
  }

  async finalize(id: string): Promise<DocumentView> {
    const row = await this.rest.patch<DocumentRow>(
      "documents",
      { id: `eq.${id}`, clinic_id: `eq.${this.clinicId}` },
      { status: "FINAL" },
    );
    return toView(row);
  }

  async uploadFile(id: string, file: File): Promise<DocumentView> {
    const current = await this.get(id);
    if (!current) throw new Error("Documento no encontrado.");
    const stored = await this.storage.uploadClinicalDocument(
      this.clinicId,
      current.patient_id,
      file,
    );
    try {
      if (!current.storage_path) {
        const updated = await this.rest.patch<DocumentRow>(
          "documents",
          { id: `eq.${id}`, clinic_id: `eq.${this.clinicId}` },
          {
            file_name: file.name || `documento-v${current.version}`,
            mime_type: stored.mimeType,
            storage_path: stored.path,
            checksum: stored.checksum,
            file_size_bytes: stored.sizeBytes,
          },
        );
        return toView(updated);
      }

      const next = await this.rest.insert<DocumentRow>("documents", {
        clinic_id: current.clinic_id,
        patient_id: current.patient_id,
        template_id: current.template_id,
        type: current.type,
        title: current.title,
        status: "DRAFT",
        data_json: current.data_json ?? {},
        file_name: file.name || `documento-v${current.version + 1}`,
        mime_type: stored.mimeType,
        storage_path: stored.path,
        checksum: stored.checksum,
        file_size_bytes: stored.sizeBytes,
        version: current.version + 1,
        version_series_id: current.version_series_id,
        previous_version_id: current.id,
      });
      return toView(next);
    } catch (error) {
      await this.storage.remove(CLINICAL_DOCUMENTS_BUCKET, stored.path).catch(() => undefined);
      throw error;
    }
  }

  /**
   * Stage 13: canonical consent/document signature. The signature image is stored
   * in the private clinical-documents bucket and the RPC marks the document SIGNED,
   * which satisfies the Stage 6 consent requirements in the same transaction.
   */
  async sign(id: string, input: { signerName: string; file: File }): Promise<DocumentView> {
    const current = await this.get(id);
    if (!current) throw new Error("Documento no encontrado.");
    if (current.type === "DEBT_ACKNOWLEDGEMENT" &&
      (typeof current.data_json.paciente !== "string" ||
        input.signerName.trim().toLocaleLowerCase("es-ES") !==
        current.data_json.paciente.trim().toLocaleLowerCase("es-ES"))) {
      throw new Error("La firma debe corresponder al titular de la deuda registrado en el documento.");
    }
    if (input.file.type !== "image/png" && input.file.type !== "image/jpeg")
      throw new Error("La firma debe ser PNG o JPEG.");
    const stored = await this.storage.uploadClinicalDocument(
      this.clinicId,
      current.patient_id,
      input.file,
    );
    try {
      const row = await this.rest.rpc<DocumentRow>("sign_clinical_document", {
        p_document_id: id,
        p_signer_name: input.signerName,
        p_signature_path: stored.path,
        p_signature_checksum: stored.checksum,
        p_signature_mime: stored.mimeType,
      });
      return toView(row);
    } catch (error) {
      await this.storage.remove(CLINICAL_DOCUMENTS_BUCKET, stored.path).catch(() => undefined);
      throw error;
    }
  }

  async signatureImage(id: string): Promise<{ blob: Blob; mimeType: string }> {
    const doc = await this.get(id);
    if (!doc || doc.status !== "SIGNED")
      throw new Error("No existe un reconocimiento firmado.");
    const signature = doc.metadata_json?.signature;
    if (!signature || typeof signature !== "object" || Array.isArray(signature))
      throw new Error("La firma original no está disponible.");
    const record = signature as Record<string, unknown>;
    const path = record.path;
    if (typeof path !== "string" ||
        !path.startsWith(`${this.clinicId}/${doc.patient_id}/`))
      throw new Error("No se encuentra la firma en la clínica.");
    const blob = await this.storage.download(CLINICAL_DOCUMENTS_BUCKET, path);
    if (blob.type !== "image/png" && blob.type !== "image/jpeg")
      throw new Error("Formato de firma no reconocido.");
    return { blob, mimeType: blob.type };
  }

  async downloadFile(id: string): Promise<{ blob: Blob; fileName: string; mimeType: string }> {
    const row = await this.get(id);
    if (!row?.storage_path) throw new Error("Este documento todavía no tiene archivo asociado.");
    const blob = await this.storage.download(CLINICAL_DOCUMENTS_BUCKET, row.storage_path);
    return {
      blob,
      fileName: row.file_name ?? `${row.title}.pdf`,
      mimeType: row.mime_type ?? blob.type ?? "application/octet-stream",
    };
  }
}

function toView(row: DocumentRow): DocumentView {
  return {
    id: row.id,
    patientId: row.patient_id,
    type: row.type,
    title: row.title,
    status: row.status,
    fileName: row.file_name,
    mimeType: row.mime_type,
    checksum: row.checksum,
    version: row.version,
    previousVersionId: row.previous_version_id,
    fileSizeBytes: row.file_size_bytes,
    templateId: row.template_id,
    signerName: row.signer_name ?? null,
    signedAt: row.signed_at ?? null,
    data: row.data_json ?? {},
    createdAt: row.created_at,
  };
}
