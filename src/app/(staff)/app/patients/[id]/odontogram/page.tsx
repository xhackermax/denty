import { OdontogramWorkspace } from "@/features/odontogram/odontogram-workspace";
import { PatientPipelineFrame } from "@/shared/patients/patient-pipeline-nav";

interface OdontogramPageProps {
  params: Promise<{ id: string }>;
}

export default async function OdontogramPage({ params }: OdontogramPageProps) {
  const { id } = await params;
  return (
    <PatientPipelineFrame patientId={id} current="odontogram">
      <OdontogramWorkspace patientId={id} />
    </PatientPipelineFrame>
  );
}
