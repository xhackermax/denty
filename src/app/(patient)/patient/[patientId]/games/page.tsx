import { PatientGames } from "@/features/games/patient-games";

interface GamesPageProps {
  params: Promise<{ patientId: string }>;
}

export default async function GamesPage({ params }: GamesPageProps) {
  const { patientId } = await params;
  return (
    <PatientGames
      patientId={patientId}
      backHref={`/patient/${patientId}`}
      backLabel="Volver al portal"
    />
  );
}
