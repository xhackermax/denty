import { OdontogramWorkspace } from "@/features/odontogram/odontogram-workspace";

interface OdontogramPageProps {
  params: Promise<{ id: string }>;
}

export default async function OdontogramPage({ params }: OdontogramPageProps) {
  const { id } = await params;
  return <OdontogramWorkspace patientId={id} />;
}
