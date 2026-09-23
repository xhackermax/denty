"use client";

import { Alert, Button, Stack, Text } from "@mantine/core";
import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Denty route error", error);
  }, [error]);

  return (
    <Stack p="xl" maw={720} mx="auto">
      <Alert color="red" title="No se pudo cargar">
        <Text size="sm">{error.message || "Ha ocurrido un error."}</Text>
      </Alert>
      <Button onClick={reset}>Reintentar</Button>
    </Stack>
  );
}
