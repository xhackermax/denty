"use client";

import {
  ColorSwatch,
  Group,
  Paper,
  Progress,
  SimpleGrid,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";

import { TREATMENT_SPECIALTIES, type TreatmentSpecialty } from "@/domain/treatment-specialty";

// One fixed colour per specialty so the totals and the per-doctor bars read the same.
const SPECIALTY_COLORS: Record<TreatmentSpecialty, string> = {
  conservative: "blue",
  endodontics: "red",
  periodontics: "grape",
  surgery: "orange",
  implants: "teal",
  prosthesis: "violet",
  orthodontics: "cyan",
  pediatrics: "pink",
  aesthetics: "yellow",
  prevention: "green",
  other: "gray",
};

type SpecialtyCounts = Partial<Record<TreatmentSpecialty, number>>;
export interface DoctorSpecialtyRow {
  doctorId: string;
  doctorName: string;
  specialtyCounts: SpecialtyCounts;
}

const totalOf = (counts: SpecialtyCounts) =>
  Object.values(counts).reduce((sum, value) => sum + (value ?? 0), 0);

function present(counts: SpecialtyCounts) {
  return TREATMENT_SPECIALTIES.filter(({ key }) => (counts[key] ?? 0) > 0)
    .map(({ key, label }) => ({ key, label, count: counts[key] ?? 0 }))
    .sort((a, b) => b.count - a.count);
}

export function sumSpecialtyCounts(rows: readonly DoctorSpecialtyRow[]): SpecialtyCounts {
  const sum: SpecialtyCounts = {};
  for (const row of rows) {
    for (const [key, value] of Object.entries(row.specialtyCounts) as [
      TreatmentSpecialty,
      number,
    ][]) {
      sum[key] = (sum[key] ?? 0) + value;
    }
  }
  return sum;
}

export function TreatmentSpecialtyCharts({ doctors }: { doctors: readonly DoctorSpecialtyRow[] }) {
  const totals = sumSpecialtyCounts(doctors);
  const total = totalOf(totals);
  const rows = present(totals);
  const max = Math.max(1, ...rows.map((row) => row.count));
  const ranked = doctors
    .filter((d) => totalOf(d.specialtyCounts) > 0)
    .sort((a, b) => totalOf(b.specialtyCounts) - totalOf(a.specialtyCounts));

  return (
    <Paper withBorder p="md" radius="md" aria-label="Tratamientos realizados por especialidad">
      <Group justify="space-between" mb="sm">
        <Text fw={700}>Tratamientos realizados por especialidad</Text>
        <Text size="sm" c="dimmed">
          {total} en total
        </Text>
      </Group>
      {!total ? (
        <Text size="sm" c="dimmed">
          Sin tratamientos realizados en el periodo.
        </Text>
      ) : (
        <SimpleGrid cols={{ base: 1, md: ranked.length > 1 ? 2 : 1 }} spacing="xl">
          <Stack gap={6} role="list" aria-label="Totales por especialidad">
            {rows.map((row) => (
              <div key={row.key} role="listitem">
                <Group justify="space-between" gap="xs">
                  <Text size="sm">{row.label}</Text>
                  <Text size="sm" fw={700}>
                    {row.count}{" "}
                    <Text span size="xs" c="dimmed">
                      ({Math.round((row.count / total) * 100)}%)
                    </Text>
                  </Text>
                </Group>
                <Progress
                  size="sm"
                  value={(row.count / max) * 100}
                  color={SPECIALTY_COLORS[row.key]}
                  aria-label={`${row.label}: ${row.count}`}
                />
              </div>
            ))}
          </Stack>
          {ranked.length > 1 && (
            <Stack gap={8} aria-label="Reparto por doctor">
              {ranked.map((doctor) => {
                const doctorTotal = totalOf(doctor.specialtyCounts);
                return (
                  <div key={doctor.doctorId}>
                    <Group justify="space-between" gap="xs">
                      <Text size="sm" truncate>
                        {doctor.doctorName}
                      </Text>
                      <Text size="sm" fw={700}>
                        {doctorTotal}
                      </Text>
                    </Group>
                    <Progress.Root size="lg">
                      {present(doctor.specialtyCounts).map((row) => (
                        <Tooltip key={row.key} label={`${row.label}: ${row.count}`} withArrow>
                          <Progress.Section
                            value={(row.count / doctorTotal) * 100}
                            color={SPECIALTY_COLORS[row.key]}
                            aria-label={`${doctor.doctorName}, ${row.label}: ${row.count}`}
                          />
                        </Tooltip>
                      ))}
                    </Progress.Root>
                  </div>
                );
              })}
              <Group gap="sm" mt={4}>
                {rows.map((row) => (
                  <Group key={row.key} gap={4}>
                    <ColorSwatch
                      size={10}
                      color={`var(--mantine-color-${SPECIALTY_COLORS[row.key]}-filled)`}
                    />
                    <Text size="xs" c="dimmed">
                      {row.label}
                    </Text>
                  </Group>
                ))}
              </Group>
            </Stack>
          )}
        </SimpleGrid>
      )}
    </Paper>
  );
}
