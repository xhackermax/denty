import { notFound } from "next/navigation";

import { DocumentsBreadcrumb } from "@/features/documents/documents-navigation";
import { StaffDocuments } from "@/features/documents/staff-documents";
import { PageHeader } from "@/shared/ui";

interface PageProps { params: Promise<{ kind: string }> }

export default async function StaffDocumentPage({ params }: PageProps) {
  const { kind } = await params;
  if (kind !== "curriculums" && kind !== "contratos") notFound();
  const isCV = kind === "curriculums";
  return (
    <>
      <DocumentsBreadcrumb personnel />
      <PageHeader
        title={isCV ? "Currículums" : "Contratos"}
        description={isCV
          ? "CV del personal, conservados en un archivo privado de la clínica."
          : "Contratos de todos los integrantes del equipo, vinculados a su ficha de personal."}
      />
      <StaffDocuments kind={isCV ? "CV" : "CONTRACT"} />
    </>
  );
}
