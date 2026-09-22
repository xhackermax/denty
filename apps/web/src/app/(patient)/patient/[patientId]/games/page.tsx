import { Button, Text, Title } from "@mantine/core";

import styles from "@/features/portal/portal.module.css";

interface GamesPageProps {
  params: Promise<{ patientId: string }>;
}

export default async function GamesPage({ params }: GamesPageProps) {
  const { patientId } = await params;
  return (
    <div className={styles.root}>
      <div>
        <Title order={1}>Denty Games</Title>
        <Text c="dimmed">13 juegos recuperados del Denty original · paciente {patientId}</Text>
        <Button component="a" href={`/patient/${patientId}`} mt="md" variant="light">
          Volver al portal
        </Button>
      </div>
      <iframe
        className={styles.iframe}
        title="Denty Games"
        src={`/games/index.html?patientId=${encodeURIComponent(patientId)}&demo=legacy-preview`}
        sandbox="allow-scripts allow-same-origin"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}
