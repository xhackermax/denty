import { Button, Paper, Stack, Text, Title } from "@mantine/core";
import { IconLockAccess } from "@tabler/icons-react";

import { CenteredPage } from "@/shared/ui";

export default function ForbiddenPage() {
  return (
    <CenteredPage>
      <Paper withBorder radius="xl" p="xl" maw={460} w="100%">
        <Stack align="flex-start">
          <IconLockAccess size={34} aria-hidden={true} />
          <Title order={1}>Acceso restringido</Title>
          <Text c="dimmed">
            Tu sesión es válida, pero no tienes permiso para abrir este módulo.
          </Text>
          <Button component="a" href="/app">
            Volver a Denty
          </Button>
        </Stack>
      </Paper>
    </CenteredPage>
  );
}
