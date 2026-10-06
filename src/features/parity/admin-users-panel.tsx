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
import { useEffect, useMemo, useState, type FormEvent } from "react";

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
    queryFn: () => getBrowserApi().admin.users.list(),
  });
  const [kind, setKind] = useState<"staff" | "patient">("staff");
  const [resetTarget, setResetTarget] = useState<UserRow | null>(null);
  const [editTarget, setEditTarget] = useState<UserRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const linkedPatientIds = useMemo(
    () =>
      new Set(
        (users.data?.items ?? []).flatMap((user) => (user.patientId ? [user.patientId] : [])),
      ),
    [users.data],
  );

  const canManage = users.isSuccess && users.data.administration?.configured !== false;

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
        {users.data?.administration?.configured === false ? (
          <Alert color="yellow" title="Configuración de accesos pendiente">
            {users.data.administration.message}
            <Button
              mt="sm"
              size="xs"
              variant="light"
              onClick={() => void users.refetch()}
              loading={users.isFetching}
            >
              Comprobar configuración
            </Button>
          </Alert>
        ) : null}
        {kind === "staff" ? (
          <StaffUserForm onCreated={refresh} canManage={canManage} />
        ) : (
          <PatientAccountForm
            canManage={canManage}
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
        {(users.data?.items ?? []).map((user) => (
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
              <Button
                size="xs"
                variant="light"
                disabled={!canManage}
                onClick={() => setEditTarget(user)}
              >
                Editar acceso
              </Button>
              <Button
                size="xs"
                variant="light"
                disabled={!canManage}
                onClick={() => setResetTarget(user)}
              >
                Restablecer contraseña
              </Button>
              <Button
                size="xs"
                variant="subtle"
                color="red"
                disabled={!canManage}
                onClick={() => setDeleteTarget(user)}
              >
                Eliminar acceso
              </Button>
            </Group>
          </div>
        ))}
      </div>

      <EditUserModal
        user={editTarget}
        onClose={() => setEditTarget(null)}
        onDone={(message) => {
          setEditTarget(null);
          setNotice(message);
          void refresh();
        }}
      />
      <ResetPasswordModal
        user={resetTarget}
        onClose={() => setResetTarget(null)}
        onDone={(message) => {
          setResetTarget(null);
          setNotice(message);
        }}
      />
      <DeleteUserModal
        user={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDone={(message) => {
          setDeleteTarget(null);
          setNotice(message);
          void refresh();
        }}
      />
    </section>
  );
}

function EditUserModal({
  user,
  onClose,
  onDone,
}: {
  user: UserRow | null;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("RECEPTION");
  const [active, setActive] = useState("true");
  const update = useMutation({
    mutationFn: () =>
      getBrowserApi().admin.users.update(user?.id ?? "", {
        displayName: displayName.trim(),
        ...(email.trim() ? { email: email.trim() } : {}),
        role,
        active: active === "true",
      }),
    onSuccess: () => onDone(`Acceso de ${displayName} actualizado.`),
  });

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName);
    setEmail(user.email ?? "");
    setRole(user.role);
    setActive(user.active === false ? "false" : "true");
    update.reset();
  }, [user]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    update.mutate();
  }

  function close() {
    update.reset();
    onClose();
  }

  const isPatient = user?.role === "PATIENT";

  return (
    <Modal opened={user !== null} onClose={close} title={`Editar acceso · ${user?.displayName ?? ""}`}>
      <form onSubmit={submit}>
        <Stack>
          <TextInput
            label="Nombre de acceso"
            value={displayName}
            onChange={(event) => setDisplayName(event.currentTarget.value)}
            required
          />
          <TextInput
            label="Email de acceso"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.currentTarget.value)}
          />
          <Group grow>
            <Select
              label="Rol"
              data={isPatient ? [{ value: "PATIENT", label: "Paciente" }] : STAFF_ROLE_OPTIONS}
              value={role}
              onChange={(value) => setRole((value as Role | null) ?? user?.role ?? "RECEPTION")}
              allowDeselect={false}
              disabled={isPatient}
            />
            <Select
              label="Existencia"
              data={[
                { value: "true", label: "Activo" },
                { value: "false", label: "Inactivo" },
              ]}
              value={active}
              onChange={(value) => setActive(value ?? "true")}
              allowDeselect={false}
            />
          </Group>
          <Button type="submit" loading={update.isPending} disabled={!displayName.trim()}>
            Guardar acceso
          </Button>
          {update.isError ? <Alert color="red">{messageFromError(update.error)}</Alert> : null}
        </Stack>
      </form>
    </Modal>
  );
}

function StaffUserForm({ onCreated, canManage }: { onCreated: () => unknown; canManage: boolean }) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<StaffRole>("RECEPTION");
  const [password, setPassword] = useState("");
  const [staffId, setStaffId] = useState<string | null>(null);
  // Doctors created in «Sedes y doctores» have no login yet: link the new user to them
  // so the agenda, rota and appointments stay on the same professional.
  const overview = useQuery({
    queryKey: dentyQueryKeys.settings.sitesOverview,
    queryFn: () => getBrowserApi().admin.sites.overview(),
  });
  const unlinkedStaff = (overview.data?.staff ?? []).filter(
    (member) => !member.hasLogin && member.active,
  );
  const create = useMutation({
    mutationFn: () =>
      getBrowserApi().admin.users.create({
        email,
        displayName,
        role,
        password,
        ...(staffId ? { staffId } : {}),
      }),
    onSuccess: () => {
      setEmail("");
      setDisplayName("");
      setPassword("");
      setRole("RECEPTION");
      setStaffId(null);
      void overview.refetch();
      void onCreated();
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (canManage) create.mutate();
  }

  return (
    <form onSubmit={submit}>
      <Stack>
        {unlinkedStaff.length ? (
          <Select
            label="Profesional de la agenda (opcional)"
            description="Da acceso a un doctor ya creado en Sedes y doctores."
            placeholder="Usuario nuevo, sin vincular"
            data={unlinkedStaff.map((member) => ({ value: member.id, label: member.displayName }))}
            value={staffId}
            onChange={(value) => {
              setStaffId(value);
              const member = unlinkedStaff.find((candidate) => candidate.id === value);
              if (member) {
                setDisplayName(member.displayName);
                setRole(member.role);
              }
            }}
            clearable
          />
        ) : null}
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
        <Button type="submit" loading={create.isPending} disabled={!canManage}>
          Crear usuario
        </Button>
        {create.isError ? <Alert color="red">{messageFromError(create.error)}</Alert> : null}
      </Stack>
    </form>
  );
}

function PatientAccountForm({
  canManage,
  linkedPatientIds,
  onCreated,
}: {
  canManage: boolean;
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
      const recordNumber = patient?.recordNumber;
      const typedEmail = email.trim() || patient?.email;
      const login = [recordNumber ? `su nº de ficha ${recordNumber}` : null, typedEmail]
        .filter(Boolean)
        .join(" o ");
      const secret = password ? "la contraseña que has indicado" : `su DNI/NIE (${dniPassword})`;
      onCreated(
        `Cuenta creada para ${created.displayName}. Usuario: ${login || created.email}. Contraseña inicial: ${secret}. El paciente puede cambiarla desde su portal.`,
      );
      setPatientId(null);
      setEmail("");
      setPassword("");
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (canManage) create.mutate();
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
        {patients.isError ? (
          <Alert color="red">
            No se pudieron cargar los pacientes.{" "}
            <Button variant="subtle" onClick={() => void patients.refetch()}>
              Reintentar
            </Button>
          </Alert>
        ) : null}
        {patient ? (
          <Group grow align="end">
            <TextInput
              label="Email de acceso"
              type="email"
              placeholder={patient.email ?? "paciente@correo.es"}
              description={
                patient.email
                  ? "Opcional: vacío = el email de su ficha."
                  : "Opcional: la ficha no tiene email; podrá entrar con su nº de ficha."
              }
              value={email}
              onChange={(event) => setEmail(event.currentTarget.value)}
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
            El paciente entrará con su número de ficha (o su email) y, la primera vez, con su
            DNI/NIE como contraseña. Después podrá cambiarla desde su portal, y tú podrás
            restablecerla cuando lo necesite.
          </Text>
        )}
        <Button
          type="submit"
          loading={create.isPending}
          disabled={
            !patientId || !canManage || (needsPassword && password.length < RESET_MIN_PASSWORD)
          }
        >
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

function DeleteUserModal({
  user,
  onClose,
  onDone,
}: {
  user: UserRow | null;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const remove = useMutation({
    mutationFn: () => getBrowserApi().admin.users.delete(user?.id ?? ""),
    onSuccess: () => onDone(`Cuenta de ${user?.displayName} eliminada.`),
  });

  function close() {
    remove.reset();
    onClose();
  }

  return (
    <Modal opened={user !== null} onClose={close} title="Eliminar acceso">
      <Stack>
        <Text size="sm">
          Se eliminará la cuenta de acceso de {user?.displayName}. Si es paciente, su ficha clínica
          seguirá existiendo.
        </Text>
        <Button color="red" loading={remove.isPending} onClick={() => remove.mutate()}>
          Eliminar cuenta
        </Button>
        {remove.isError ? <Alert color="red">{messageFromError(remove.error)}</Alert> : null}
      </Stack>
    </Modal>
  );
}
