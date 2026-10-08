import { PatientBudgetComparisonPage } from "@/shared/clinical/patient-budget-comparison-page";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ids?: string }>;
}

export default async function ComparePatientBudgetsPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { ids } = await searchParams;
  const selected = (ids ?? "").split(",").filter(Boolean).slice(0, 8);
  return <PatientBudgetComparisonPage patientId={id} initialSelectedIds={selected} />;
}
