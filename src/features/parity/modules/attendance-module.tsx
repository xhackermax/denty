"use client";

import { Alert, Badge, Button, Group, Select, Stack, Text, TextInput } from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { madridLocalDateTime, todayMadrid, toMadridISO } from "@/domain/dates";
import { getBrowserApi } from "@/shared/api/browser";
import { dentyQueryKeys } from "@/shared/query";
import styles from "@/shared/ui/parity.module.css";

const ABSENCE_TYPES = [
  { value: "VACATION", label: "Vacaciones" },
  { value: "SICK_LEAVE", label: "Baja" },
  { value: "PERMISSION", label: "Permiso" },
  { value: "PERSONAL", label: "Personal" },
  { value: "OTHER", label: "Otra" },
] as const;

export function AttendanceModule() {
  const day = todayMadrid();
  const queryClient = useQueryClient();
  const [staffId, setStaffId] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [absenceType, setAbsenceType] = useState("VACATION");
  const [reason, setReason] = useState("");

  const me = useQuery({
    queryKey: dentyQueryKeys.staff.attendance(day),
    queryFn: () => getBrowserApi().attendance.me(day),
  });
  const daily = useQuery({
    queryKey: dentyQueryKeys.staff.all,
    queryFn: () => getBrowserApi().attendance.daily(day),
  });
  const context = useQuery({
    queryKey: dentyQueryKeys.appointments.context,
    queryFn: () => getBrowserApi().agenda.context(),
  });
  const absences = useQuery({
    queryKey: dentyQueryKeys.staff.absences,
    queryFn: () => getBrowserApi().attendance.listAbsences(),
  });
  const effectiveStaffId = staffId || context.data?.staff[0]?.id || "";
  const staffNames = useMemo(
    () => new Map((context.data?.staff ?? []).map((member) => [member.id, member.displayName])),
    [context.data],
  );

  const punch = useMutation({
    mutationFn: () => getBrowserApi().attendance.punch(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dentyQueryKeys.staff.root });
    },
  });
  const createAbsence = useMutation({
    mutationFn: () =>
      getBrowserApi().attendance.createAbsence({
        staffId: effectiveStaffId,
        startsAt: toMadridISO(madridLocalDateTime(day, startTime)),
        endsAt: toMadridISO(madridLocalDateTime(day, endTime)),
        type: absenceType as "VACATION" | "SICK_LEAVE" | "PERMISSION" | "PERSONAL" | "OTHER",
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dentyQueryKeys.staff.root });
      void queryClient.invalidateQueries({ queryKey: dentyQueryKeys.appointments.root });
    },
  });
  const cancelAbsence = useMutation({
    mutationFn: (id: string) => getBrowserApi().attendance.deleteAbsence(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dentyQueryKeys.staff.root });
      void queryClient.invalidateQueries({ queryKey: dentyQueryKeys.appointments.root });
    },
  });

  if (me.isError || daily.isError || context.isError || absences.isError)
    return <Alert color="red">No se pudo cargar el fichaje o las ausencias.</Alert>;

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <div>
          <Text fw={700}>Mi jornada</Text>
          <Text c="dimmed" size="sm">
            {day}
          </Text>
        </div>
        <Button onClick={() => punch.mutate()} loading={punch.isPending}>
          {me.data?.nextAction === "OUT" ? "Fichar salida" : "Fichar entrada"}
        </Button>
      </Group>
      <div className={styles.rowList}>
        {(me.data?.punches ?? []).map((entry) => (
          <div className={styles.row} key={entry.id}>
            <span className={styles.rowTitle}>{entry.id}</span>
            <Badge variant="light">Registrado</Badge>
          </div>
        ))}
      </div>
      <Text size="sm" c="dimmed">
        Personal con actividad hoy: {daily.data?.rows.length ?? 0}
      </Text>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Ausencias</h3>
        <Text size="sm" c="dimmed">
          Una ausencia aprobada bloquea disponibilidad de agenda inmediatamente.
        </Text>
        <Group mt="md" align="end" grow>
          <Select
            label="Profesional"
            data={(context.data?.staff ?? []).map((member) => ({
              value: member.id,
              label: member.displayName,
            }))}
            value={effectiveStaffId || null}
            onChange={(value) => setStaffId(value ?? "")}
          />
          <Select
            label="Tipo"
            data={[...ABSENCE_TYPES]}
            value={absenceType}
            onChange={(value) => setAbsenceType(value ?? "VACATION")}
          />
          <TextInput
            label="Desde"
            type="time"
            value={startTime}
            onChange={(event) => setStartTime(event.currentTarget.value)}
          />
          <TextInput
            label="Hasta"
            type="time"
            value={endTime}
            onChange={(event) => setEndTime(event.currentTarget.value)}
          />
        </Group>
        <Group mt="sm" align="end">
          <TextInput
            className={styles.flexField}
            label="Motivo"
            value={reason}
            onChange={(event) => setReason(event.currentTarget.value)}
          />
          <Button
            disabled={!effectiveStaffId || endTime <= startTime}
            loading={createAbsence.isPending}
            onClick={() => createAbsence.mutate()}
          >
            Crear ausencia
          </Button>
        </Group>
        <div className={styles.rowList}>
          {(absences.data?.items ?? []).map((absence) => (
            <div className={styles.row} key={absence.id}>
              <div className={styles.rowMain}>
                <span className={styles.rowTitle}>
                  {absence.staffId
                    ? (staffNames.get(absence.staffId) ?? "Profesional")
                    : "Profesional"}{" "}
                  · {absence.type ?? "Ausencia"}
                </span>
                <span className={styles.rowMeta}>
                  {absence.startsAt ? new Date(absence.startsAt).toLocaleString("es-ES") : ""}
                  {absence.endsAt ? ` → ${new Date(absence.endsAt).toLocaleString("es-ES")}` : ""}
                </span>
              </div>
              <Button
                size="xs"
                variant="subtle"
                color="red"
                onClick={() => cancelAbsence.mutate(absence.id)}
              >
                Cancelar
              </Button>
            </div>
          ))}
        </div>
      </section>
    </Stack>
  );
}
