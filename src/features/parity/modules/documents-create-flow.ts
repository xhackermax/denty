import type { DocumentState } from "@/domain/state-machines";

export interface DocumentRow {
  id: string;
  patientId: string;
  patientName: string;
  patientRecordNumber: string;
  patientDni: string;
  title: string;
  type: string;
  state: DocumentState;
  createdAt: string;
  sourceUrl?: string;
  templateCode?: string;
  doctorId?: string;
  doctorName?: string;
  clinicSite?: string;
  patientSignerName?: string;
  patientSignedAt?: string;
  patientSignatureDataUrl?: string;
  doctorSignedAt?: string;
  doctorSignatureDataUrl?: string;
}

export interface CreateDocumentInput {
  id: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    recordNumber: string;
    dni: string;
  };
  template: {
    value: string;
    label: string;
    type: string;
    sourceUrl?: string;
  };
  title: string;
  doctor?: { id: string; displayName: string };
  clinicSite?: string;
  createdAt: string;
}

export type DocumentPostCreateAction =
  { kind: "sign"; documentId: string } | { kind: "preview"; documentId: string };

export function createDocumentRow(input: CreateDocumentInput): DocumentRow {
  return {
    id: input.id,
    patientId: input.patient.id,
    patientName: `${input.patient.firstName} ${input.patient.lastName}`,
    patientRecordNumber: input.patient.recordNumber,
    patientDni: input.patient.dni,
    title: input.title.trim(),
    type: input.template.type,
    state: input.template.type === "CONSENT" ? "FINALIZED" : "DRAFT",
    createdAt: input.createdAt,
    templateCode: input.template.value,
    ...(input.template.sourceUrl ? { sourceUrl: input.template.sourceUrl } : {}),
    ...(input.doctor ? { doctorId: input.doctor.id, doctorName: input.doctor.displayName } : {}),
    ...(input.clinicSite ? { clinicSite: input.clinicSite } : {}),
  };
}

export function postCreateAction(document: DocumentRow): DocumentPostCreateAction {
  return document.type === "CONSENT"
    ? { kind: "sign", documentId: document.id }
    : { kind: "preview", documentId: document.id };
}
