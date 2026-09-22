import { PatientProfile } from "@/features/patients/patient-profile";

interface PatientPageProps {
  params: Promise<{ id: string }>;
}

export default async function PatientPage({ params }: PatientPageProps) {
  const { id } = await params;
  return <PatientProfile patientId={id} />;
}
