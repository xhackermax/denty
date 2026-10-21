"use client";

import { Alert, Button, Group, Text, TextInput } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { useState } from "react";

import { dateDMY, epochMillis, hhmm } from "@/domain/dates";
import styles from "./patient-upcoming-appointments.module.css";

export interface UpcomingAppointment {
  id: string;
  startsAt: string;
  status: string;
  title: string;
  reason?: string | null | undefined;
  version: number;
}

const INACTIVE_STATUSES = new Set(["CANCELLED", "NO_SHOW", "COMPLETED"]);
const DEFAULT_REASON = "Cancelada desde la ficha del paciente";

export function upcomingAppointments<T extends UpcomingAppointment>(
  appointments: readonly T[],
  now: number,
): T[] {
  return appointments
    .filter(
      (appointment) =>
        !INACTIVE_STATUSES.has(appointment.status) && epochMillis(appointment.startsAt) >= now,
    )
    .sort((left, right) => epochMillis(left.startsAt) - epochMillis(right.startsAt));
}

interface PatientUpcomingAppointmentsProps {
  appointments: readonly UpcomingAppointment[];
  onCancel: (appointment: UpcomingAppointment, reason: string) => Promise<void> | void;
  cancelling?: boolean;
  error?: string;
}

export function PatientUpcomingAppointments({
  appointments,
  onCancel,
  cancelling = false,
  error,
}: PatientUpcomingAppointmentsProps) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [reason, setReason] = useState(DEFAULT_REASON);

  if (!appointments.length) return null;

  const close = () => {
    setConfirmingId(null);
    setReason(DEFAULT_REASON);
  };

  return (
    <>
      <ul className={styles.list} aria-label="Próximas citas">
        {appointments.map((appointment) => {
          const when = `${dateDMY(appointment.startsAt)} · ${hhmm(appointment.startsAt)}`;
          const confirming = confirmingId === appointment.id;
          return (
            <li key={appointment.id} className={styles.item}>
              <div className={styles.row}>
                <span className={styles.copy}>
                  <strong>{when}</strong>
                  <Text span size="xs" c="dimmed">
                    {appointment.reason ?? appointment.title}
                  </Text>
                </span>
                {!confirming ? (
                  <Button
                    size="compact-xs"
                    variant="subtle"
                    color="red"
                    leftSection={<IconX size={12} />}
                    aria-label={`Cancelar cita del ${when}`}
                    onClick={() => {
                      setReason(DEFAULT_REASON);
                      setConfirmingId(appointment.id);
                    }}
                  >
                    Cancelar
                  </Button>
                ) : null}
              </div>
              {confirming ? (
                <div className={styles.confirm}>
                  <TextInput
                    size="xs"
                    label="Motivo de cancelación"
                    value={reason}
                    onChange={(event) => setReason(event.currentTarget.value)}
                  />
                  <Group gap="xs" justify="flex-end">
                    <Button size="compact-xs" variant="default" onClick={close}>
                      Mantener cita
                    </Button>
                    <Button
                      size="compact-xs"
                      color="red"
                      loading={cancelling}
                      disabled={!reason.trim()}
                      onClick={() => {
                        void Promise.resolve(onCancel(appointment, reason.trim())).then(
                          close,
                          () => {
                            // El error lo muestra el padre; dejamos el formulario abierto para reintentar.
                          },
                        );
                      }}
                    >
                      Confirmar cancelación
                    </Button>
                  </Group>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      {error ? (
        <Alert color="red" role="alert" p="xs">
          {error}
        </Alert>
      ) : null}
    </>
  );
}
