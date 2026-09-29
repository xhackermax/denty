import { createDocumentSchema } from "@/shared/api";
import type { z } from "zod";

type CreateDocument = z.input<typeof createDocumentSchema>;

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
    createdAt: row.created_at,
  };
}
