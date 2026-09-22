import { PatientPortal } from "@/features/portal/patient-portal";

interface PatientPortalPageProps {
  params: Promise<{ patientId: string }>;
}

export default async function PatientPortalPage({ params }: PatientPortalPageProps) {
  const { patientId } = await params;
  return <PatientPortal patientId={patientId} />;
}
