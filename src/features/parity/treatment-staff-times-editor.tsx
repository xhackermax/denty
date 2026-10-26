"use client";

import { Alert, Button, Group, NumberInput, Select, Stack, Text } from "@mantine/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { getBrowserApi } from "@/shared/api/browser";
import { DentyApiError } from "@/shared/api/errors";
import type { TreatmentStaffTime } from "@/shared/api/schemas/admin";
import { dentyQueryKeys } from "@/shared/query";
import styles from "@/shared/ui/parity.module.css";

function optionalNumber(value: number | string): number | null {
  const parsed = Number(value);
  return value === "" || !Number.isFinite(parsed) || parsed <= 0 ? null : Math.round(parsed);
}

function timesText(row: TreatmentStaffTime): string {
  const parts = [
    row.durationMin ? `${row.durationMin} min por cita` : null,
    row.appointmentsMin || row.appointmentsMax
      ? `${row.appointmentsMin ?? "?"}–${row.appointmentsMax ?? "?"} citas`
      : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Igual que el catálogo";
}

/**
 * A doctor's own minutes per visit and number of visits for one treatment. Empty fields keep
 * the catalog value, so only what differs needs to be filled in.
 */
export function TreatmentStaffTimesEditor({
  treatmentId,
  treatmentCode,
}: {
  treatmentId: string;
  treatmentCode: string;
}) {
  const queryClient = useQueryClient();
  const staffTimes = useQuery({
    queryKey: dentyQueryKeys.treatmentCatalog.staffTimes,
    queryFn: () => getBrowserApi().admin.treatmentCatalog.staffTimes.list(),
  });
  const overview = useQuery({
    queryKey: dentyQueryKeys.settings.sitesOverview,
    queryFn: () => getBrowserApi().admin.sites.overview(),
  });
  const [staffId, setStaffId] = useState<string | null>(null);
  const [durationMin, setDurationMin] = useState<number | string>("");
  const [appointmentsMin, setAppointmentsMin] = useState<number | string>("");
  const [appointmentsMax, setAppointmentsMax] = useState<number | string>("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rows = (staffTimes.data?.items ?? []).filter(
    (row) => row.treatmentCatalogId === treatmentId,
  );
  const doctors = (overview.data?.staff ?? []).filter(
    (member) => member.active && member.role === "DENTIST",
  );

  const pick = (id: string | null) => {
    setStaffId(id);
    const existing = rows.find((row) => row.staffMemberId === id);
    setDurationMin(existing?.durationMin ?? "");
    setAppointmentsMin(existing?.appointmentsMin ?? "");
    setAppointmentsMax(existing?.appointmentsMax ?? "");
  };

  async function run(action: () => Promise<unknown>) {
    setPending(true);
    setError(null);
    try {
      await action();
      await queryClient.invalidateQueries({ queryKey: dentyQueryKeys.treatmentCatalog.staffTimes });
    } catch (caught) {
      setError(
        caught instanceof DentyApiError
          ? caught.message
          : "No se pudo guardar el tiempo del doctor.",
      );
    } finally {
      setPending(false);
    }
  }

  const save = () =>
    staffId
      ? run(async () => {
          await getBrowserApi().admin.treatmentCatalog.staffTimes.save(treatmentId, staffId, {
            durationMin: optionalNumber(durationMin),
            appointmentsMin: optionalNumber(appointmentsMin),
            appointmentsMax: optionalNumber(appointmentsMax),
          });
          pick(null);
        })
      : undefined;

  return (
    <Stack gap="xs" aria-label={`Tiempos por doctor ${treatmentCode}`} role="group">
      <Text size="sm" fw={700}>
        Tiempos por doctor
      </Text>
      <Text size="xs" c="dimmed">
        Si un doctor tarda más o necesita más citas, regístralo aquí. Lo que se deje vacío usa el
        valor del catálogo.
      </Text>
      {rows.map((row) => (
        <Group key={row.id} justify="space-between" gap="xs" className={styles.rowMeta}>
          <span>
            {row.staffName ?? "Doctor"} · {timesText(row)}
          </span>
          <Group gap={4}>
            <Button size="compact-xs" variant="subtle" onClick={() => pick(row.staffMemberId)}>
              Cambiar
            </Button>
            <Button
              size="compact-xs"
              variant="subtle"
              color="red"
              disabled={pending}
              aria-label={`Quitar tiempos de ${row.staffName ?? "doctor"}`}
              onClick={() =>
                void run(() =>
                  getBrowserApi().admin.treatmentCatalog.staffTimes.remove(
                    treatmentId,
                    row.staffMemberId,
                  ),
                )
              }
            >
              Quitar
            </Button>
          </Group>
        </Group>
      ))}
      <Group grow align="end">
        <Select
          label="Doctor"
          placeholder="Elige doctor"
          data={doctors.map((member) => ({ value: member.id, label: member.displayName }))}
          value={staffId}
          onChange={pick}
          aria-label={`Doctor ${treatmentCode}`}
        />
        <NumberInput
          label="Min por cita"
          min={1}
          max={600}
          value={durationMin}
          onChange={setDurationMin}
          aria-label={`Minutos del doctor ${treatmentCode}`}
        />
        <NumberInput
          label="Citas mín."
          min={1}
          max={60}
          value={appointmentsMin}
          onChange={setAppointmentsMin}
          aria-label={`Citas mínimas del doctor ${treatmentCode}`}
        />
        <NumberInput
          label="Citas máx."
          min={1}
          max={60}
          value={appointmentsMax}
          onChange={setAppointmentsMax}
          aria-label={`Citas máximas del doctor ${treatmentCode}`}
        />
        <Button size="xs" disabled={!staffId} loading={pending} onClick={() => void save()}>
          Guardar doctor
        </Button>
      </Group>
      {error ? <Alert color="red">{error}</Alert> : null}
    </Stack>
  );
}
