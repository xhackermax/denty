import { toMadridISO } from "./dates";
export interface ExportableDocument {
  id: string;
  title: string;
  createdAt: string;
  status: string;
  checksum: string;
  kind?: string;
}
export function buildDocumentExportManifest(
  patientId: string,
  documents: readonly ExportableDocument[],
  selectedIds: readonly string[],
) {
  const selected = new Set(selectedIds);
  const included = documents
    .filter((d) => selected.has(d.id) && d.kind !== "export_bundle")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  const canonical = included.map((d) => `${d.id}:${d.checksum}`).join("|");
  return {
    patientId,
    documentIds: included.map((d) => d.id),
    generatedAt: toMadridISO(Date.now()),
    fingerprint: `${patientId}:${canonical}`,
  };
}
