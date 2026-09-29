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

type AccessMode = "login" | "request";

interface LoginFormProps {
  nextPath: string;
}

function errorMessage(error: unknown): string {
  if (error instanceof DentyApiError) return error.message;
  return "No se pudo completar la operación.";
}

export function LoginForm({ nextPath }: LoginFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<AccessMode>("login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
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
          // The login contract caps deviceLabel at 120 chars; modern user agents exceed it.
          deviceLabel: (navigator.userAgent || "Navegador").slice(0, 120),
        });
        router.replace(nextPath);
        router.refresh();
        return;
      }

      await api.auth.requestPasswordReset({ identifier });
      setMessage("Si la cuenta existe, Supabase Auth ha enviado un enlace seguro de recuperación.");
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

        <TextInput
          label={mode === "login" ? "Email o teléfono" : "Email"}
          type={mode === "request" ? "email" : "text"}
          value={identifier}
          onChange={(event) => setIdentifier(event.currentTarget.value)}
          autoComplete="username"
          required
        />

        {mode === "login" ? (
          <PasswordInput
            label="Contraseña"
            value={password}
            onChange={(event) => setPassword(event.currentTarget.value)}
            autoComplete="current-password"
            required
          />
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
          {mode === "login" ? "Entrar" : "Enviar enlace de recuperación"}
        </Button>

        <Text size="xs" c="dimmed">
          El acceso real usa Supabase Auth. El número de ficha y el DNI no funcionan como
          credenciales.
        </Text>
      </Stack>
    </form>
  );
}
