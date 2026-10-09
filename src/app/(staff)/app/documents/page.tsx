import { redirect } from "next/navigation";

import { DocumentCards } from "@/features/documents/documents-navigation";
import { PageHeader } from "@/shared/ui";

interface DocumentsHomeProps {
  searchParams: Promise<{ patientId?: string; workflow?: string }>;
}

export default async function DocumentsHome({ searchParams }: DocumentsHomeProps) {
  const query = await searchParams;
  // Preserve old patient links and the odontogram → consent → budget workflow.
  if (query.patientId) {
    const destination = query.workflow === "consents" ? "consentimientos" : "archivo";
    const params = new URLSearchParams({ patientId: query.patientId });
    if (query.workflow === "consents") params.set("workflow", "consents");
    redirect("/app/documents/" + destination + "?" + params.toString());
  }
  return (
    <>
      <PageHeader title="Documentos" description="Toda la documentación de la clínica, organizada por categorías." />
      <DocumentCards />
    </>
  );
}
