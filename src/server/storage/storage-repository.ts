import { createHash } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const PATIENT_PHOTOS_BUCKET = "patient-photos";
export const CLINICAL_DOCUMENTS_BUCKET = "clinical-documents";
export const LAB_ATTACHMENTS_BUCKET = "lab-attachments";
export const PRESCRIPTION_EVIDENCE_BUCKET = "prescription-evidence";

const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const DOCUMENT_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const PRESCRIPTION_SIGNATURE_TYPES = new Set(["image/jpeg", "image/png"]);
const LAB_ATTACHMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/zip",
  "application/vnd.ms-pki.stl",
  "model/stl",
  "application/octet-stream",
]);

export interface StoredObject {
  path: string;
  checksum: string;
  mimeType: string;
  sizeBytes: number;
}

function extensionFor(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "application/pdf":
      return "pdf";
    case "application/zip":
      return "zip";
    case "application/vnd.ms-pki.stl":
    case "model/stl":
      return "stl";
    default:
      return "bin";
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
    // The app compresses photos to a few dozen KB before upload; 1 MB is a backstop.
    if (file.size <= 0 || file.size > 1024 * 1024)
      throw new Error("La foto debe ocupar como máximo 1 MB.");
    return this.upload(PATIENT_PHOTOS_BUCKET, clinicId, patientId, file);
  }

  async uploadClinicalDocument(
    clinicId: string,
    patientId: string,
    file: File,
  ): Promise<StoredObject> {
    if (!DOCUMENT_TYPES.has(file.type)) throw new Error("Formato de documento no permitido.");
    if (file.size <= 0 || file.size > 25 * 1024 * 1024)
      throw new Error("El documento debe ocupar entre 1 byte y 25 MB.");
    return this.upload(CLINICAL_DOCUMENTS_BUCKET, clinicId, patientId, file);
  }

  async uploadPrescriptionSignature(
    clinicId: string,
    prescriptionId: string,
    file: File,
  ): Promise<StoredObject> {
    if (!PRESCRIPTION_SIGNATURE_TYPES.has(file.type))
      throw new Error("Formato de firma no permitido.");
    if (file.size <= 0 || file.size > 5 * 1024 * 1024)
      throw new Error("La firma debe ocupar entre 1 byte y 5 MB.");
    return this.upload(PRESCRIPTION_EVIDENCE_BUCKET, clinicId, prescriptionId, file);
  }

  async uploadLabAttachment(
    clinicId: string,
    labWorkId: string,
    file: File,
  ): Promise<StoredObject> {
    const mimeType = file.type || "application/octet-stream";
    const lowerName = file.name.toLowerCase();
    if (!LAB_ATTACHMENT_TYPES.has(mimeType))
      throw new Error("Formato de archivo de laboratorio no permitido.");
    if (mimeType === "application/octet-stream" && !lowerName.endsWith(".stl")) {
      throw new Error("Los archivos binarios genéricos solo se admiten para STL.");
    }
    if (file.size <= 0 || file.size > 50 * 1024 * 1024)
      throw new Error("El archivo debe ocupar entre 1 byte y 50 MB.");
    return this.upload(LAB_ATTACHMENTS_BUCKET, clinicId, labWorkId, file, mimeType);
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

  private async upload(
    bucket: string,
    clinicId: string,
    entityId: string,
    file: File,
    overrideMimeType?: string,
  ): Promise<StoredObject> {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const mimeType = overrideMimeType ?? file.type;
    const path = `${clinicId}/${entityId}/${crypto.randomUUID()}.${extensionFor(mimeType)}`;
    const { error } = await this.client.storage.from(bucket).upload(path, bytes, {
      contentType: mimeType,
      cacheControl: "3600",
      upsert: false,
    });
    if (error) throw new Error(error.message);
    return { path, checksum: digest(bytes), mimeType, sizeBytes: bytes.byteLength };
  }
}
