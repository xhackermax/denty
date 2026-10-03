"use client";

import { Alert, Button, Group, NativeSelect, Stack, Text } from "@mantine/core";
import { IconMoon, IconSun } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { ALLOWED_DURATIONS } from "@/domain/agenda";
import { DAY_PART_LABELS, type DayPart } from "@/domain/agenda/next-slot";
import { dateYMDMadrid, hhmm } from "@/domain/dates";
import { getBrowserApi } from "@/shared/api/browser";
import type { NextSlot } from "@/shared/api/schemas/agenda";
import { dentyQueryKeys } from "@/shared/query";

import styles from "./next-slot-finder.module.css";

export interface NextSlotQuery {
  part?: DayPart;
  durationMin: number;
  staffId?: string;
  siteId?: string;
  limit: number;
}

export interface NextSlotFinderApi {
  nextSlots(query: NextSlotQuery): Promise<{ slots: readonly NextSlot[] }>;
}

const browserApi: NextSlotFinderApi = {
  nextSlots: (query) => getBrowserApi().agenda.nextSlots(query),
};

const PAGE = 6;
const PART_ICONS = { AM: IconSun, PM: IconMoon } as const;

const dayLabel = new Intl.DateTimeFormat("es-ES", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "Europe/Madrid",
});

export interface NextSlotFinderProps {
  api?: NextSlotFinderApi;
  today: string;
  siteId?: string | null;
  doctors: readonly { id: string; name: string; hasRota: boolean }[];
  onPick: (slot: NextSlot, durationMin: number) => void;
}

export function NextSlotFinder({
  api = browserApi,
  today,
  siteId,
  doctors,
  onPick,
}: NextSlotFinderProps) {
  const [part, setPart] = useState<DayPart | null>(null);
  const [staffId, setStaffId] = useState("");
  const [durationMin, setDurationMin] = useState(30);
  const [limit, setLimit] = useState(PAGE);

  const query: NextSlotQuery = {
    ...(part ? { part } : {}),
    durationMin,
    ...(staffId ? { staffId } : {}),
    ...(siteId ? { siteId } : {}),
    limit,
  };
  const slots = useQuery({
    queryKey: dentyQueryKeys.appointments.nextSlots({ ...query }),
    queryFn: () => api.nextSlots(query),
  });

  const withoutRota = doctors.filter(
    (doctor) => !doctor.hasRota && (!staffId || doctor.id === staffId),
  );
  const label = (startsAt: string) => {
    const day = dateYMDMadrid(startsAt) === today ? "Hoy" : dayLabel.format(Date.parse(startsAt));
    const text = day.replace(",", "");
    return text.charAt(0).toLocaleUpperCase("es") + text.slice(1);
  };

  return (
    <Stack gap="sm">
      <div className={styles.parts} role="group" aria-label="¿Cuándo prefiere el paciente?">
        {(["AM", "PM"] as const).map((value) => {
          const Icon = PART_ICONS[value];
          const active = part === value;
          return (
            <Button
              key={value}
              size="sm"
              radius="md"
              variant={active ? "filled" : "default"}
              aria-pressed={active}
              leftSection={<Icon size={18} aria-hidden="true" />}
              onClick={() => {
                setPart(active ? null : value);
                setLimit(PAGE);
              }}
            >
              {value} · {DAY_PART_LABELS[value]}
            </Button>
          );
        })}
      </div>
      <Text size="xs" c="dimmed">
        Mañana: antes de las 14:00. Tarde: desde las 14:00. Sin elegir, el hueco más cercano.
      </Text>

      <Group grow gap="sm" align="end">
        <NativeSelect
          label="Doctor"
          value={staffId}
          onChange={(event) => {
            setStaffId(event.currentTarget.value);
            setLimit(PAGE);
          }}
          data={[
            { value: "", label: "Cualquier doctor" },
            ...doctors.map((d) => ({ value: d.id, label: d.name })),
          ]}
        />
        <NativeSelect
          label="Duración"
          value={String(durationMin)}
          onChange={(event) => {
            setDurationMin(Number(event.currentTarget.value));
            setLimit(PAGE);
          }}
          data={ALLOWED_DURATIONS.map((minutes) => ({
            value: String(minutes),
            label: `${minutes} min`,
          }))}
        />
      </Group>

      {slots.isLoading ? (
        <Text size="sm">Buscando huecos…</Text>
      ) : slots.isError ? (
        <Alert color="red" variant="light" role="alert">
          No se pudieron buscar huecos. Inténtalo de nuevo.
        </Alert>
      ) : (slots.data?.slots.length ?? 0) === 0 ? (
        <Text size="sm">No hay huecos libres en los próximos 60 días con esos filtros.</Text>
      ) : (
        <div className={styles.results} aria-live="polite">
          {slots.data?.slots.map((slot) => (
            <Button
              key={`${slot.staffId}-${slot.startsAt}`}
              variant="light"
              justify="space-between"
              className={styles.slot}
              onClick={() => onPick(slot, durationMin)}
              aria-label={`${label(slot.startsAt)} · ${hhmm(slot.startsAt)} · ${slot.staffName}`}
            >
              <span className={styles.day}>{label(slot.startsAt)}</span>
              <span className={styles.time}>{hhmm(slot.startsAt)}</span>
              <span className={styles.doctor}>{slot.staffName}</span>
            </Button>
          ))}
          {slots.data && slots.data.slots.length >= limit && limit < 12 ? (
            <Button variant="subtle" size="xs" onClick={() => setLimit(12)}>
              Ver más huecos
            </Button>
          ) : null}
        </div>
      )}

      {withoutRota.length > 0 ? (
        <Text size="xs" c="dimmed">
          {withoutRota.map((doctor) => doctor.name).join(", ")}{" "}
          {withoutRota.length === 1 ? "no tiene horario" : "no tienen horario"} en Administración →
          Sedes y doctores: se usa de lunes a viernes de 08:00 a 21:00.
        </Text>
      ) : null}
    </Stack>
  );
}
