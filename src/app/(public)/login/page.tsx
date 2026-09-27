import { Paper, Text, Title } from "@mantine/core";
import Image from "next/image";

import { LoginForm } from "@/features/auth";
import { publicEnv } from "@/shared/config/env";
import { CenteredPage } from "@/shared/ui";

interface LoginPageProps {
  searchParams: Promise<{ next?: string | string[] }>;
}

function safeNextPath(value: string | string[] | undefined): string {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate?.startsWith("/app")) return "/app";
  if (candidate.startsWith("//")) return "/app";
  return candidate;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <CenteredPage>
      <Paper withBorder radius="xl" p="xl" maw={460} w="100%">
        <Image src="/assets/denty-logo.png" alt="Denty" width={72} height={72} />
        <Title order={1} mt="md">
          Acceso a Denty
        </Title>
        <Text c="dimmed" mt="xs">
          En una instalación limpia entra con admin/admin para crear el administrador. Los
          pacientes acceden con su número de ficha y su DNI.
        </Text>
        <LoginForm
          demoMode={publicEnv.NEXT_PUBLIC_DEMO_MODE === "true"}
          nextPath={safeNextPath(params.next)}
        />
      </Paper>
    </CenteredPage>
  );
}
