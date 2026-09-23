import { PatientGames } from "@/features/games/patient-games";

interface PatientGamesPageProps {
  params: Promise<{ id: string }>;
}

export default async function PatientGamesPage({ params }: PatientGamesPageProps) {
  const { id } = await params;
  return (
    <PatientGames patientId={id} backHref={`/app/patients/${id}`} backLabel="Volver a la ficha" />
  );
}
