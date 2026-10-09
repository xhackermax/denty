import { notFound } from "next/navigation";

import { CurriculumCards, DocumentsBreadcrumb } from "@/features/documents/documents-navigation";
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
          ? "Currículums de empleados y archivo de candidaturas en PDF."
          : "Contratos de todos los integrantes del equipo, vinculados a su ficha de personal."}
      />
      {isCV ? <CurriculumCards /> : <StaffDocuments kind="CONTRACT" />}
    </>
  );
}
