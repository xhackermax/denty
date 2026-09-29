"use client";

import {
  Alert,
  Badge,
  Button,
  Group,
  Modal,
  PasswordInput,
  SegmentedControl,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";

import { initialPatientPassword } from "@/domain";
import type { Role } from "@/domain/permissions";
import { getBrowserApi } from "@/shared/api/browser";
import { DentyApiError } from "@/shared/api/errors";
import { dentyQueryKeys } from "@/shared/query";
import styles from "@/shared/ui/parity.module.css";

interface UserRow {
  id: string;
  displayName: string;
  role: Role;
  active?: boolean | undefined;
  email?: string | undefined;
  patientId?: string | undefined;
}

type StaffRole = Exclude<Role, "PATIENT">;

const STAFF_ROLE_OPTIONS: Array<{ value: StaffRole; label: string }> = [
  { value: "RECEPTION", label: "Recepción" },
  { value: "DENTIST", label: "Doctor/a" },
  { value: "ASSISTANT", label: "Auxiliar" },
  { value: "ADMIN", label: "Administrador" },
];

const ROLE_LABELS: Record<Role, string> = {
  RECEPTION: "Recepción",
  DENTIST: "Doctor/a",
  ASSISTANT: "Auxiliar",
  ADMIN: "Administrador",
  PATIENT: "Paciente",
};

const STAFF_MIN_PASSWORD = 12;
const RESET_MIN_PASSWORD = 8;

function messageFromError(error: unknown) {
  if (error instanceof DentyApiError) return error.message;
  return "No se pudo completar la operación.";
}

export function AdminUsersPanel() {
  const queryClient = useQueryClient();
  const users = useQuery({
    queryKey: dentyQueryKeys.security.users,
    queryFn: async () => (await getBrowserApi().admin.users.list()).items as UserRow[],
  });
  const [kind, setKind] = useState<"staff" | "patient">("staff");
  const [resetTarget, setResetTarget] = useState<UserRow | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const linkedPatientIds = useMemo(
    () => new Set((users.data ?? []).flatMap((user) => (user.patientId ? [user.patientId] : []))),
    [users.data],
  );

  const refresh = () => queryClient.invalidateQueries({ queryKey: dentyQueryKeys.security.users });

  return (
    <section className={styles.section}>
      <Stack>
        <SegmentedControl
          value={kind}
          onChange={(value) => {
            setKind(value as "staff" | "patient");
            setNotice(null);
          }}
          data={[
            { value: "staff", label: "Personal de la clínica" },
            { value: "patient", label: "Paciente (portal)" },
          ]}
        />
        {kind === "staff" ? (
          <StaffUserForm onCreated={refresh} />
        ) : (
          <PatientAccountForm
            linkedPatientIds={linkedPatientIds}
            onCreated={(message) => {
              setNotice(message);
              void refresh();
            }}
          />
        )}
        {notice ? (
          <Alert color="green" withCloseButton onClose={() => setNotice(null)}>
            {notice}
          </Alert>
        ) : null}
        {users.isError ? <Alert color="red">{messageFromError(users.error)}</Alert> : null}
      </Stack>

      <div className={styles.rowList}>
        {(users.data ?? []).map((user) => (
          <div className={styles.row} key={user.id}>
            <div className={styles.rowMain}>
              <span className={styles.rowTitle}>{user.displayName}</span>
              <span className={styles.rowMeta}>
                {user.email ? `${user.email} · ` : ""}
                {ROLE_LABELS[user.role] ?? user.role}
              </span>
            </div>
            <Group gap="xs">
              <Badge color={user.active === false ? "gray" : "green"}>
                {user.active === false ? "Inactivo" : "Activo"}
              </Badge>
              <Button size="xs" variant="light" onClick={() => setResetTarget(user)}>
                Restablecer contraseña
              </Button>
            </Group>
          </div>
        ))}
      </div>

      <ResetPasswordModal
        user={resetTarget}
        onClose={() => setResetTarget(null)}
        onDone={(message) => {
          setResetTarget(null);
          setNotice(message);
        }}
      />
    </section>
  );
}

function StaffUserForm({ onCreated }: { onCreated: () => unknown }) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<StaffRole>("RECEPTION");
  const [password, setPassword] = useState("");
  const create = useMutation({
    mutationFn: () => getBrowserApi().admin.users.create({ email, displayName, role, password }),
    onSuccess: () => {
      setEmail("");
      setDisplayName("");
      setPassword("");
      setRole("RECEPTION");
      void onCreated();
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    create.mutate();
  }

  return (
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
            data={STAFF_ROLE_OPTIONS}
            value={role}
            onChange={(value) => setRole((value as StaffRole | null) ?? "RECEPTION")}
            required
          />
          <PasswordInput
            label="Contraseña"
            description={`Mínimo ${STAFF_MIN_PASSWORD} caracteres.`}
            value={password}
            onChange={(event) => setPassword(event.currentTarget.value)}
            required
            minLength={STAFF_MIN_PASSWORD}
          />
        </Group>
        <Button type="submit" loading={create.isPending}>
          Crear usuario
        </Button>
        {create.isError ? <Alert color="red">{messageFromError(create.error)}</Alert> : null}
      </Stack>
    </form>
  );
}

function PatientAccountForm({
  linkedPatientIds,
  onCreated,
}: {
  linkedPatientIds: Set<string>;
  onCreated: (message: string) => void;
}) {
  const patients = useQuery({
    queryKey: dentyQueryKeys.patients.all,
    queryFn: () => getBrowserApi().patients.list(),
  });
  const [patientId, setPatientId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const options = useMemo(
    () =>
      (patients.data?.items ?? [])
        .filter((patient) => !linkedPatientIds.has(patient.id))
        .map((patient) => ({
          value: patient.id,
          label: `${patient.firstName} ${patient.lastName}${patient.dni ? ` · ${patient.dni}` : ""}`,
        })),
    [patients.data, linkedPatientIds],
  );
  const patient = (patients.data?.items ?? []).find((item) => item.id === patientId) ?? null;
  const dniPassword = initialPatientPassword(patient?.dni);
  const needsEmail = Boolean(patient) && !patient?.email;
  const needsPassword = Boolean(patient) && !dniPassword;

  const create = useMutation({
    mutationFn: () =>
      getBrowserApi().admin.users.create({
        role: "PATIENT",
        patientId: patientId ?? undefined,
        email: email.trim() || undefined,
        password: password || undefined,
      }),
    onSuccess: (created) => {
      const login = created.email ?? email;
      const secret = password ? "la contraseña que has indicado" : `su DNI/NIE (${dniPassword})`;
      onCreated(
        `Cuenta creada para ${created.displayName}. Usuario: ${login}. Contraseña inicial: ${secret}. El paciente puede cambiarla desde su portal.`,
      );
      setPatientId(null);
      setEmail("");
      setPassword("");
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    create.mutate();
  }

  return (
    <form onSubmit={submit}>
      <Stack>
        <Select
          label="Paciente"
          placeholder={patients.isLoading ? "Cargando pacientes…" : "Busca por nombre o DNI"}
          data={options}
          value={patientId}
          onChange={(value) => {
            setPatientId(value);
            setEmail("");
            setPassword("");
            create.reset();
          }}
          searchable
          nothingFoundMessage="Sin pacientes sin cuenta con ese nombre"
          required
        />
        {patient ? (
          <Group grow align="end">
            <TextInput
              label="Email de acceso"
              type="email"
              placeholder={patient.email ?? "paciente@correo.es"}
              description={
                needsEmail
                  ? "La ficha no tiene email: escribe uno para crear el acceso."
                  : "Vacío = el email de su ficha."
              }
              value={email}
              onChange={(event) => setEmail(event.currentTarget.value)}
              required={needsEmail}
            />
            <PasswordInput
              label="Contraseña inicial"
              placeholder={dniPassword ? "Su DNI/NIE" : undefined}
              description={
                needsPassword
                  ? "La ficha no tiene un DNI/NIE válido: indica una contraseña."
                  : `Vacío = su DNI/NIE (${dniPassword}).`
              }
              value={password}
              onChange={(event) => setPassword(event.currentTarget.value)}
              required={needsPassword}
              minLength={RESET_MIN_PASSWORD}
            />
          </Group>
        ) : (
          <Text size="sm" c="dimmed">
            La primera contraseña del paciente será su DNI/NIE. Después podrá cambiarla desde su
            portal, y tú podrás restablecerla cuando lo necesite.
          </Text>
        )}
        <Button type="submit" loading={create.isPending} disabled={!patientId}>
          Crear acceso al portal
        </Button>
        {create.isError ? <Alert color="red">{messageFromError(create.error)}</Alert> : null}
      </Stack>
    </form>
  );
}

function ResetPasswordModal({
  user,
  onClose,
  onDone,
}: {
  user: UserRow | null;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [password, setPassword] = useState("");
  const reset = useMutation({
    mutationFn: (payload: { password?: string; useDni?: boolean }) =>
      getBrowserApi().admin.users.resetPassword(user?.id ?? "", payload),
    onSuccess: (result) => {
      setPassword("");
      onDone(
        result.usedDni
          ? `La contraseña de ${user?.displayName} vuelve a ser su DNI/NIE.`
          : `Contraseña de ${user?.displayName} actualizada.`,
      );
    },
  });
  const isPatient = user?.role === "PATIENT";
  const minLength = isPatient ? RESET_MIN_PASSWORD : STAFF_MIN_PASSWORD;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    reset.mutate({ password });
  }

  function close() {
    setPassword("");
    reset.reset();
    onClose();
  }

  return (
    <Modal
      opened={user !== null}
      onClose={close}
      title={`Restablecer contraseña · ${user?.displayName ?? ""}`}
    >
      <form onSubmit={submit}>
        <Stack>
          {isPatient ? (
            <>
              <Button
                variant="light"
                loading={reset.isPending && reset.variables?.useDni === true}
                onClick={() => reset.mutate({ useDni: true })}
              >
                Volver a su DNI/NIE
              </Button>
              <Text size="xs" c="dimmed" ta="center">
                o elige una contraseña nueva
              </Text>
            </>
          ) : null}
          <PasswordInput
            label="Nueva contraseña"
            description={`Mínimo ${minLength} caracteres. Comunícasela en persona.`}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.currentTarget.value)}
            minLength={minLength}
            required
          />
          <Button type="submit" loading={reset.isPending && reset.variables?.useDni !== true}>
            Guardar contraseña
          </Button>
          {reset.isError ? <Alert color="red">{messageFromError(reset.error)}</Alert> : null}
        </Stack>
      </form>
    </Modal>
  );
}
