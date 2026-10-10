import { notFound } from "next/navigation";

import { DocumentsBreadcrumb, DocumentCards } from "@/features/documents/documents-navigation";
import { BudgetDocuments, InvoiceDocuments } from "@/features/documents/financial-documents";
import { DocumentsModule } from "@/features/parity/modules/documents-module";
import { PrescriptionsModule } from "@/features/parity/modules/prescriptions-module";
import { PageHeader } from "@/shared/ui";

const CATEGORIES = {
  facturas: ["Facturas", "Archivo de facturas de la clínica."],
  consentimientos: ["Consentimientos", "Consentimientos firmados y pendientes por paciente."],
  "proteccion-datos": ["Protección de datos", "Información RGPD, entregas y acuses firmados por los pacientes."],
  presupuestos: ["Presupuestos", "Presupuestos con su estado y enlace al plan del paciente."],
  recetas: ["Recetas", "Emisión y archivo de recetas."],
  personal: ["Personal", "Expedientes laborales: currículums y contratos."],
  archivo: ["Archivo clínico", "Justificantes de asistencia y otros documentos clínicos."],
} as const;

interface PageProps { params: Promise<{ category: string }> }

export default async function DocumentsCategoryPage({ params }: PageProps) {
  const { category } = await params;
  if (!(category in CATEGORIES)) notFound();
  const key = category as keyof typeof CATEGORIES;
  const [title, description] = CATEGORIES[key];
  return (
    <>
      <DocumentsBreadcrumb />
      <PageHeader title={title} description={description} />
      {key === "facturas" ? <InvoiceDocuments /> : null}
      {key === "consentimientos" ? <DocumentsModule mode="consents" /> : null}
      {key === "proteccion-datos" ? <DocumentsModule mode="privacy" /> : null}
      {key === "presupuestos" ? <BudgetDocuments /> : null}
      {key === "recetas" ? <PrescriptionsModule /> : null}
      {key === "personal" ? <DocumentCards personnelOnly /> : null}
      {key === "archivo" ? <DocumentsModule mode="archive" /> : null}
    </>
  );
}
