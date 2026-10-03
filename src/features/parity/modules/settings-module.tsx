"use client";

import {
  Alert,
  Badge,
  Button,
  Group,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { ChangePasswordForm } from "@/features/auth";
import { NavigationLayoutEditor } from "@/features/navigation/navigation-layout-editor";
import { getBrowserApi } from "@/shared/api/browser";
import { dentyQueryKeys } from "@/shared/query";
import styles from "@/shared/ui/parity.module.css";
import { ManagedBackupsPanel } from "./managed-backups-panel";
import { BillingSettingsSection } from "./billing-settings-section";

export function SettingsModule() {
  const queryClient = useQueryClient();
  const sessions = useQuery({
    queryKey: dentyQueryKeys.security.sessions,
    queryFn: () => getBrowserApi().security.sessions.list(),
  });
  const privacy = useQuery({
    queryKey: dentyQueryKeys.security.privacy,
    queryFn: () => getBrowserApi().security.privacy.list(),
  });
  const patients = useQuery({
    queryKey: dentyQueryKeys.patients.all,
    queryFn: () => getBrowserApi().patients.list(),
  });
  const agendaSettings = useQuery({
    queryKey: dentyQueryKeys.appointments.settings,
    queryFn: () => getBrowserApi().agenda.settings.get(),
  });
  const [visitGapDays, setVisitGapDays] = useState(7);
  const [privacyPatientId, setPrivacyPatientId] = useState("");
  const [privacyType, setPrivacyType] = useState<
    "ACCESS" | "EXPORT" | "RECTIFICATION" | "RESTRICTION" | "ERASURE"
  >("ACCESS");
  const [privacyNote, setPrivacyNote] = useState("");
  useEffect(() => {
    if (agendaSettings.data) setVisitGapDays(agendaSettings.data.clinicDefaultPlanVisitGapDays);
  }, [agendaSettings.data]);
  const saveAgendaSettings = useMutation({
    mutationFn: () =>
      getBrowserApi().agenda.settings.update({ defaultPlanVisitGapDays: visitGapDays }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dentyQueryKeys.appointments.root });
      void queryClient.invalidateQueries({ queryKey: dentyQueryKeys.appointments.settings });
    },
  });
  const createPrivacy = useMutation({
    mutationFn: () =>
      getBrowserApi().security.privacy.create({
        patientId: privacyPatientId,
        type: privacyType,
        note: privacyNote.trim() || undefined,
      }),
    onSuccess: () => {
      setPrivacyNote("");
      void queryClient.invalidateQueries({ queryKey: dentyQueryKeys.security.privacy });
    },
  });
  const updatePrivacy = useMutation({
    mutationFn: (input: { id: string; status: "IN_REVIEW" | "COMPLETED" | "REJECTED" }) =>
      getBrowserApi().security.privacy.update(input.id, { status: input.status }),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: dentyQueryKeys.security.privacy }),
  });
  const revoke = useMutation({
    mutationFn: (id: string) => getBrowserApi().security.sessions.revoke(id),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: dentyQueryKeys.security.sessions }),
  });
  const hasError =
    sessions.isError || privacy.isError || patients.isError || agendaSettings.isError;

  return (
    <Stack gap="md">
      {hasError ? (
        <Alert color="red">Parte de los ajustes de seguridad no está disponible.</Alert>
      ) : null}

      <section className={styles.section}>
        <Group justify="space-between" align="end">
          <div>
            <h3 className={styles.sectionTitle}>Agenda</h3>
            <p className={styles.sectionDescription}>
              Preferencias compartidas entre todos los dispositivos de la clínica.
            </p>
          </div>
          <Button
            size="xs"
            loading={saveAgendaSettings.isPending}
            onClick={() => saveAgendaSettings.mutate()}
          >
            Guardar
          </Button>
        </Group>
        <NumberInput
          mt="md"
          label="Separación entre visitas"
          description="Días por defecto entre citas creadas en serie."
          min={0}
          max={180}
          value={visitGapDays}
          onChange={(value) => setVisitGapDays(typeof value === "number" ? value : 7)}
          suffix=" días"
        />
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Tu menú</h3>
        <p className={styles.sectionDescription}>
          Ordena los apartados del menú lateral a tu gusto. Solo cambia para ti.
        </p>
        <NavigationLayoutEditor scope="me" />
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Tu contraseña</h3>
        <p className={styles.sectionDescription}>
          Cámbiala cuando quieras. Si la olvidas, un administrador puede restablecerla desde
          Usuarios.
        </p>
        <ChangePasswordForm />
      </section>

      <section className={styles.section}>
        <Group justify="space-between">
          <div>
            <h3 className={styles.sectionTitle}>Sesiones</h3>
            <p className={styles.sectionDescription}>Sesiones persistidas del usuario.</p>
          </div>
          <Badge>{sessions.data?.items.length ?? 0}</Badge>
        </Group>
        <div className={styles.rowList}>
          {(sessions.data?.items ?? []).map((session) => (
            <div className={styles.row} key={session.id}>
              <div className={styles.rowMain}>
                <span className={styles.rowTitle}>{session.deviceLabel ?? "Dispositivo"}</span>
                <span className={styles.rowMeta}>
                  Última actividad: {new Date(session.lastSeenAt).toLocaleString("es-ES")}
                </span>
              </div>
              <Button
                size="xs"
                variant="light"
                color="red"
                onClick={() => revoke.mutate(session.id)}
              >
                Revocar
              </Button>
            </div>
          ))}
        </div>
      </section>

      <ManagedBackupsPanel />

      <BillingSettingsSection />

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Privacidad</h3>
        <Text size="sm" c="dimmed">
          Las solicitudes quedan persistidas, auditadas y con vencimiento operativo de un mes.
        </Text>
        <Group mt="md" align="end" grow>
          <Select
            searchable
            label="Paciente"
            data={(patients.data?.items ?? []).map((patient) => ({
              value: patient.id,
              label: `${patient.firstName} ${patient.lastName} · ${patient.recordNumber}`,
            }))}
            value={privacyPatientId || null}
            onChange={(value) => setPrivacyPatientId(value ?? "")}
          />
          <Select
            label="Derecho"
            data={["ACCESS", "EXPORT", "RECTIFICATION", "RESTRICTION", "ERASURE"]}
            value={privacyType}
            onChange={(value) => setPrivacyType((value ?? "ACCESS") as typeof privacyType)}
          />
          <TextInput
            label="Nota"
            value={privacyNote}
            onChange={(event) => setPrivacyNote(event.currentTarget.value)}
          />
          <Button
            disabled={!privacyPatientId}
            loading={createPrivacy.isPending}
            onClick={() => createPrivacy.mutate()}
          >
            Registrar
          </Button>
        </Group>
        <div className={styles.rowList}>
          {(privacy.data?.items ?? []).map((request) => (
            <div className={styles.row} key={request.id}>
              <div className={styles.rowMain}>
                <span className={styles.rowTitle}>{request.type}</span>
                <span className={styles.rowMeta}>
                  {request.status}
                  {request.dueAt
                    ? ` · vence ${new Date(request.dueAt).toLocaleDateString("es-ES")}`
                    : ""}
                </span>
              </div>
              <Group gap="xs">
                {request.status === "PENDING" ? (
                  <Button
                    size="xs"
                    variant="light"
                    onClick={() => updatePrivacy.mutate({ id: request.id, status: "IN_REVIEW" })}
                  >
                    Revisar
                  </Button>
                ) : null}
                {request.status === "IN_REVIEW" ? (
                  <Button
                    size="xs"
                    variant="light"
                    color="green"
                    onClick={() => updatePrivacy.mutate({ id: request.id, status: "COMPLETED" })}
                  >
                    Completar
                  </Button>
                ) : null}
              </Group>
            </div>
          ))}
          {!privacy.isLoading && (privacy.data?.items.length ?? 0) === 0 ? (
            <Text c="dimmed">Sin solicitudes.</Text>
          ) : null}
        </div>
      </section>
    </Stack>
  );
}
