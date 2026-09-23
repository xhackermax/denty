"use client";

import {
  Alert,
  Button,
  PasswordInput,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconAlertCircle, IconCheck } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { DentyApiError } from "@/shared/api/errors";
import { getBrowserApi } from "@/shared/api/browser";

type AccessMode = "login" | "request" | "reset";

interface LoginFormProps {
  demoMode: boolean;
  nextPath: string;
}

function errorMessage(error: unknown): string {
  if (error instanceof DentyApiError) return error.message;
  return "No se pudo completar la operación.";
}

export function LoginForm({ demoMode, nextPath }: LoginFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<AccessMode>("login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setPending(true);

    try {
      const api = getBrowserApi();
      if (mode === "login") {
        await api.auth.login({
          identifier,
          password,
          deviceLabel: navigator.platform || "Navegador",
        });
        router.replace(nextPath);
        router.refresh();
        return;
      }

      if (mode === "request") {
        await api.auth.requestPasswordReset({ identifier });
        setMessage("Si la cuenta existe, se han generado instrucciones de recuperación.");
        setMode("reset");
        return;
      }

      await api.auth.resetPassword({ token, newPassword });
      setMessage("Contraseña actualizada. Ya puedes iniciar sesión.");
      setToken("");
      setNewPassword("");
      setMode("login");
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <Stack mt="xl">
        <SegmentedControl
          value={mode}
          onChange={(value) => setMode(value as AccessMode)}
          data={[
            { label: "Acceder", value: "login" },
            { label: "Recuperar", value: "request" },
          ]}
        />

        {mode !== "reset" ? (
          <TextInput
            label="Usuario o email"
            value={identifier}
            onChange={(event) => setIdentifier(event.currentTarget.value)}
            autoComplete="username"
            required
          />
        ) : null}

        {mode === "login" ? (
          <PasswordInput
            label="Contraseña"
            value={password}
            onChange={(event) => setPassword(event.currentTarget.value)}
            autoComplete="current-password"
            required
          />
        ) : null}

        {mode === "reset" ? (
          <>
            <TextInput
              label="Token de recuperación"
              value={token}
              onChange={(event) => setToken(event.currentTarget.value)}
              required
            />
            <PasswordInput
              label="Nueva contraseña"
              value={newPassword}
              onChange={(event) => setNewPassword(event.currentTarget.value)}
              autoComplete="new-password"
              required
            />
          </>
        ) : null}

        {error ? (
          <Alert icon={<IconAlertCircle size={18} />} color="red">
            {error}
          </Alert>
        ) : null}
        {message ? (
          <Alert icon={<IconCheck size={18} />} color="green">
            {message}
          </Alert>
        ) : null}

        <Button type="submit" loading={pending}>
          {mode === "login"
            ? "Entrar"
            : mode === "request"
              ? "Solicitar recuperación"
              : "Cambiar contraseña"}
        </Button>

        {mode === "reset" ? (
          <Button variant="subtle" onClick={() => setMode("login")}>
            Volver al acceso
          </Button>
        ) : null}

        {demoMode ? (
          <Button
            variant="light"
            onClick={() => {
              router.replace("/app");
              router.refresh();
            }}
          >
            Entrar en modo demo
          </Button>
        ) : null}

        <Text size="xs" c="dimmed">
          La sesión profesional se mantiene mediante cookie httpOnly del servidor.
        </Text>
      </Stack>
    </form>
  );
}
