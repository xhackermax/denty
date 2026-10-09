import { IncidentsPage } from "@/features/quality/incidents-page";

interface PageProps {
  searchParams: Promise<{ patientId?: string; doctorId?: string }>;
}

export default async function IncidentsRoute({ searchParams }: PageProps) {
  const { patientId, doctorId } = await searchParams;
  return <IncidentsPage initialPatientId={patientId} initialDoctorId={doctorId} />;
}
