"use client";

import { Alert } from "@mantine/core";

interface ActionErrorAlertProps {
  errors: readonly unknown[];
}

// Acciones de botón que fallan sin aviso parecen "botones muertos"; esto hace visible el fallo.
export function ActionErrorAlert({ errors }: ActionErrorAlertProps) {
  const error = errors.find((candidate) => candidate !== null && candidate !== undefined);
  if (error === undefined) return null;
  const message =
    error instanceof Error && error.message ? error.message : "No se pudo completar la acción.";
  return <Alert color="red">{message}</Alert>;
}
