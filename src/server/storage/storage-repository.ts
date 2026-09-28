import { createHash } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const PATIENT_PHOTOS_BUCKET = "patient-photos";
export const CLINICAL_DOCUMENTS_BUCKET = "clinical-documents";

const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const DOCUMENT_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

export interface StoredObject {
  path: string;
  checksum: string;
  mimeType: string;
  sizeBytes: number;
}

function extensionFor(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg": return "jpg";
    case "image/png": return "png";
    case "image/webp": return "webp";
    case "application/pdf": return "pdf";
    default: return "bin";
  }
}

function digest(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export class StorageRepository {
  private readonly client: SupabaseClient;

  constructor(input: { url: string; key: string; accessToken: string }) {
    this.client = createClient(input.url, input.key, {
      global: { headers: { Authorization: `Bearer ${input.accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }

  async uploadPatientPhoto(clinicId: string, patientId: string, file: File): Promise<StoredObject> {
    if (!PHOTO_TYPES.has(file.type)) throw new Error("Formato de foto no permitido.");
    if (file.size <= 0 || file.size > 5 * 1024 * 1024) throw new Error("La foto debe ocupar entre 1 byte y 5 MB.");
    return this.upload(PATIENT_PHOTOS_BUCKET, clinicId, patientId, file);
  }

  async uploadClinicalDocument(clinicId: string, patientId: string, file: File): Promise<StoredObject> {
    if (!DOCUMENT_TYPES.has(file.type)) throw new Error("Formato de documento no permitido.");
    if (file.size <= 0 || file.size > 25 * 1024 * 1024) throw new Error("El documento debe ocupar entre 1 byte y 25 MB.");
    return this.upload(CLINICAL_DOCUMENTS_BUCKET, clinicId, patientId, file);
  }

  async download(bucket: string, path: string): Promise<Blob> {
    const { data, error } = await this.client.storage.from(bucket).download(path);
    if (error || !data) throw new Error(error?.message ?? "No se pudo descargar el archivo.");
    return data;
  }

  async remove(bucket: string, path: string): Promise<void> {
    const { error } = await this.client.storage.from(bucket).remove([path]);
    if (error) throw new Error(error.message);
  }

  private async upload(bucket: string, clinicId: string, patientId: string, file: File): Promise<StoredObject> {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const path = `${clinicId}/${patientId}/${crypto.randomUUID()}.${extensionFor(file.type)}`;
    const { error } = await this.client.storage.from(bucket).upload(path, bytes, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });
    if (error) throw new Error(error.message);
    return { path, checksum: digest(bytes), mimeType: file.type, sizeBytes: bytes.byteLength };
  }
}
