"use client";

import { Alert, Button, PasswordInput, Stack, Text } from "@mantine/core";
import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

import { getBrowserApi } from "@/shared/api/browser";
import { DentyApiError } from "@/shared/api/errors";

const MIN_LENGTH = 8;

export interface ChangePasswordFormProps {
  /** Extra guidance shown above the form, e.g. the first-access DNI hint for patients. */
  hint?: string | undefined;
}

export function ChangePasswordForm({ hint }: ChangePasswordFormProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [validation, setValidation] = useState<string | null>(null);
  const change = useMutation({
    mutationFn: () => getBrowserApi().auth.changePassword({ currentPassword, newPassword }),
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    change.reset();
    if (newPassword.length < MIN_LENGTH) {
      setValidation(`La nueva contraseña debe tener al menos ${MIN_LENGTH} caracteres.`);
      return;
    }
    if (newPassword !== confirmation) {
      setValidation("Las dos contraseñas nuevas no coinciden.");
      return;
    }
    if (newPassword === currentPassword) {
      setValidation("La nueva contraseña debe ser distinta de la actual.");
      return;
    }
    setValidation(null);
    change.mutate();
  }

  const failure =
    validation ??
    (change.error
      ? change.error instanceof DentyApiError
        ? change.error.message
        : "No se pudo cambiar la contraseña."
      : null);

  return (
    <form onSubmit={submit}>
      <Stack gap="sm" maw={420}>
        {hint ? (
          <Text size="sm" c="dimmed">
            {hint}
          </Text>
        ) : null}
        <PasswordInput
          label="Contraseña actual"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.currentTarget.value)}
          required
        />
        <PasswordInput
          label="Nueva contraseña"
          description={`Mínimo ${MIN_LENGTH} caracteres.`}
          autoComplete="new-password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.currentTarget.value)}
          required
        />
        <PasswordInput
          label="Repite la nueva contraseña"
          autoComplete="new-password"
          value={confirmation}
          onChange={(event) => setConfirmation(event.currentTarget.value)}
          required
        />
        <Button type="submit" loading={change.isPending}>
          Cambiar contraseña
        </Button>
        {failure ? <Alert color="red">{failure}</Alert> : null}
        {change.isSuccess ? (
          <Alert color="green">Contraseña actualizada. Úsala en tu próximo acceso.</Alert>
        ) : null}
      </Stack>
    </form>
  );
}
