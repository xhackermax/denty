"use client";

import {
  Alert,
  Badge,
  Button,
  Group,
  PasswordInput,
  Select,
  Stack,
  TextInput,
} from "@mantine/core";
import { useEffect, useState, type FormEvent } from "react";

import type { Role } from "@/domain/permissions";
import { DentyApiError } from "@/shared/api/errors";
import { getBrowserApi } from "@/shared/api/browser";
import styles from "@/shared/ui/parity.module.css";

interface UserRow {
  id: string;
  displayName: string;
  role: Role;
  active?: boolean | undefined;
  email?: string | undefined;
}

const ROLE_OPTIONS: Array<{ value: Role; label: string }> = [
  { value: "RECEPTION", label: "Recepción" },
  { value: "DENTIST", label: "Doctor/a" },
  { value: "ASSISTANT", label: "Auxiliar" },
  { value: "ADMIN", label: "Administrador" },
];

function messageFromError(error: unknown) {
  if (error instanceof DentyApiError) return error.message;
  return "No se pudo completar la operación.";
}

export function AdminUsersPanel() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<Role>("RECEPTION");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadUsers() {
    const response = await getBrowserApi().admin.users.list();
    setUsers(response.items as UserRow[]);
  }

  useEffect(() => {
    loadUsers().catch((caught: unknown) => setError(messageFromError(caught)));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const created = await getBrowserApi().admin.users.create({
        email,
        displayName,
        role,
        password,
      });
      setUsers((current) =>
        [...current, created as UserRow].sort((a, b) => a.displayName.localeCompare(b.displayName)),
      );
      setEmail("");
      setDisplayName("");
      setPassword("");
      setRole("RECEPTION");
    } catch (caught) {
      setError(messageFromError(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <section className={styles.section}>
      <form onSubmit={submit}>
        <Stack>
          <Group grow align="end">
            <TextInput
              label="Email"
              type="email"
              placeholder="recepcion@clinica.es"
              value={email}
              onChange={(event) => setEmail(event.currentTarget.value)}
              required
            />
            <TextInput
              label="Nombre visible"
              placeholder="Recepción"
              value={displayName}
              onChange={(event) => setDisplayName(event.currentTarget.value)}
              required
            />
          </Group>
          <Group grow align="end">
            <Select
              label="Rol"
              data={ROLE_OPTIONS}
              value={role}
              onChange={(value) => setRole((value as Role | null) ?? "RECEPTION")}
              required
            />
            <PasswordInput
              label="Contraseña"
              value={password}
              onChange={(event) => setPassword(event.currentTarget.value)}
              required
              minLength={8}
            />
          </Group>
          <Button type="submit" loading={pending}>
            Crear usuario
          </Button>
          {error ? <Alert color="red">{error}</Alert> : null}
        </Stack>
      </form>

      <div className={styles.rowList}>
        {users.map((user) => (
          <div className={styles.row} key={user.id}>
            <div className={styles.rowMain}>
              <span className={styles.rowTitle}>{user.displayName}</span>
              <span className={styles.rowMeta}>
                {user.email ? `${user.email} · ` : ""}
                {user.role}
              </span>
            </div>
            <Badge color={user.active === false ? "gray" : "green"}>
              {user.active === false ? "Inactivo" : "Activo"}
            </Badge>
          </div>
        ))}
      </div>
    </section>
  );
}
