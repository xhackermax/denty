"use client";

import { ActionIcon, Tooltip } from "@mantine/core";
import { IconLogout } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { getBrowserApi } from "@/shared/api/browser";

interface LogoutButtonProps {
  label: string;
}

export function LogoutButton({ label }: LogoutButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function logout() {
    setPending(true);
    setError(null);
    try {
      await getBrowserApi().auth.logout();
      router.replace("/login");
      router.refresh();
    } catch {
      setError("No se pudo cerrar la sesión.");
      setPending(false);
    }
  }

  return (
    <Tooltip label={error ?? label} position="right">
      <ActionIcon
        variant="subtle"
        color={error ? "red" : "gray"}
        size="lg"
        aria-label={label}
        loading={pending}
        onClick={logout}
      >
        <IconLogout size={20} />
      </ActionIcon>
    </Tooltip>
  );
}
