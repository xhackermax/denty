"use client";

import {
  Alert,
  Badge,
  Button,
  CloseButton,
  Group,
  NumberInput,
  SegmentedControl,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { useState } from "react";

import type { RecallCandidateFilters } from "@/shared/api";
import { usePatientsQuery } from "@/shared/patients/patient-data";

import { fetchRecallCandidates, useRecallStaffAndSitesQuery } from "./recalls-data";

export type AssignmentMode = "NINGUNO" | "MANUAL" | "FILTRO" | "AUTOMATICA";

export interface PickedPatient {
  id: string;
  name: string;
  recordNumber: string | null;
  /** Own date for this patient (YYYY-MM-DD); empty uses the template period. */
  dueDate: string;
}

export const MAX_ASSIGNMENT = 500;

interface RecallPatientPickerProps {
  mode: AssignmentMode;
  onModeChange: (mode: AssignmentMode) => void;
  picked: PickedPatient[];
  onPickedChange: (picked: PickedPatient[]) => void;
  /** Hide patients already enrolled in this template from filter results. */
  excludeTemplateId?: string | undefined;
  allowAutomatic?: boolean;
}

const MODE_OPTIONS: { value: AssignmentMode; label: string }[] = [
  { value: "NINGUNO", label: "Ninguno" },
  { value: "MANUAL", label: "Manual" },
  { value: "FILTRO", label: "Por filtro" },
  { value: "AUTOMATICA", label: "Automática" },
];

/** Step 3 of the wizard and the "Asignar pacientes" dialog: never creates patient records. */
export function RecallPatientPicker({
  mode,
  onModeChange,
  picked,
  onPickedChange,
  excludeTemplateId,
  allowAutomatic = true,
}: RecallPatientPickerProps) {
  const pickedIds = new Set(picked.map((patient) => patient.id));
  const add = (patient: Omit<PickedPatient, "dueDate">) => {
    if (pickedIds.has(patient.id) || picked.length >= MAX_ASSIGNMENT) return;
    onPickedChange([...picked, { ...patient, dueDate: "" }]);
  };

  return (
    <Stack gap="sm">
      <SegmentedControl
        aria-label="Cómo asignar pacientes"
        fullWidth
        value={mode}
        onChange={(value) => onModeChange(value as AssignmentMode)}
        data={MODE_OPTIONS.filter((option) => allowAutomatic || option.value !== "AUTOMATICA")}
      />
      {mode === "NINGUNO" ? (
        <Text c="dimmed" size="sm">
          Se crea el tipo sin pacientes. Podrás asignarlos más tarde desde la lista de tipos.
        </Text>
      ) : null}
      {mode === "AUTOMATICA" ? (
        <Alert color="blue">
          La inscripción automática queda guardada en el tipo, pero todavía no crea recalls: se
          activará cuando haya un evento clínico fiable que la dispare. Mientras tanto asigna los
          pacientes de forma manual o por filtro.
        </Alert>
      ) : null}
      {mode === "MANUAL" ? <ManualSearch pickedIds={pickedIds} onAdd={add} /> : null}
      {mode === "FILTRO" ? (
        <FilterSearch
          excludeTemplateId={excludeTemplateId}
          onAddAll={(patients) => {
            const fresh = patients.filter((patient) => !pickedIds.has(patient.id));
            onPickedChange(
              [...picked, ...fresh.map((patient) => ({ ...patient, dueDate: "" }))].slice(
                0,
                MAX_ASSIGNMENT,
              ),
            );
          }}
        />
      ) : null}
      {(mode === "MANUAL" || mode === "FILTRO") && picked.length > 0 ? (
        <Stack gap={6} aria-label="Pacientes seleccionados">
          <Group justify="space-between">
            <Text fw={600} size="sm">
              {picked.length} paciente{picked.length === 1 ? "" : "s"} seleccionado
              {picked.length === 1 ? "" : "s"}
            </Text>
            <Button size="compact-xs" variant="subtle" onClick={() => onPickedChange([])}>
              Quitar todos
            </Button>
          </Group>
          {picked.slice(0, 50).map((patient) => (
            <Group key={patient.id} gap="xs" wrap="nowrap" justify="space-between">
              <Text size="sm" truncate>
                {patient.name}
                {patient.recordNumber ? ` · NHC ${patient.recordNumber}` : ""}
              </Text>
              <Group gap={4} wrap="nowrap">
                <TextInput
                  type="date"
                  size="xs"
                  aria-label={`Fecha propia para ${patient.name}`}
                  value={patient.dueDate}
                  onChange={(event) =>
                    onPickedChange(
                      picked.map((item) =>
                        item.id === patient.id
                          ? { ...item, dueDate: event.currentTarget.value }
                          : item,
                      ),
                    )
                  }
                />
                <CloseButton
                  size="sm"
                  aria-label={`Quitar a ${patient.name}`}
                  onClick={() => onPickedChange(picked.filter((item) => item.id !== patient.id))}
                />
              </Group>
            </Group>
          ))}
          {picked.length > 50 ? (
            <Text size="xs" c="dimmed">
              y {picked.length - 50} más.
            </Text>
          ) : null}
        </Stack>
      ) : null}
    </Stack>
  );
}

function ManualSearch({
  pickedIds,
  onAdd,
}: {
  pickedIds: ReadonlySet<string>;
  onAdd: (patient: Omit<PickedPatient, "dueDate">) => void;
}) {
  const [search, setSearch] = useState("");
  const [debounced] = useDebouncedValue(search.trim(), 300);
  const patients = usePatientsQuery(debounced.length >= 2, false, debounced);
  return (
    <Stack gap={6}>
      <TextInput
        label="Buscar paciente"
        placeholder="Nombre, apellidos, NHC o teléfono"
        value={search}
        onChange={(event) => setSearch(event.currentTarget.value)}
      />
      {debounced.length >= 2 && patients.data ? (
        patients.data.items.length === 0 ? (
          <Text size="sm" c="dimmed">
            Ningún paciente coincide con la búsqueda.
          </Text>
        ) : (
          patients.data.items.slice(0, 8).map((patient) => {
            const name = `${patient.firstName} ${patient.lastName}`;
            return (
              <Group key={patient.id} justify="space-between" wrap="nowrap">
                <Text size="sm" truncate>
                  {name} · NHC {patient.recordNumber}
                </Text>
                <Button
                  size="compact-xs"
                  variant="light"
                  disabled={pickedIds.has(patient.id)}
                  onClick={() =>
                    onAdd({ id: patient.id, name, recordNumber: patient.recordNumber })
                  }
                >
                  {pickedIds.has(patient.id) ? "Añadido" : "Añadir"}
                </Button>
              </Group>
            );
          })
        )
      ) : null}
      {patients.isError ? <Alert color="red">No se pudo buscar pacientes.</Alert> : null}
    </Stack>
  );
}

function FilterSearch({
  excludeTemplateId,
  onAddAll,
}: {
  excludeTemplateId?: string | undefined;
  onAddAll: (patients: Omit<PickedPatient, "dueDate">[]) => void;
}) {
  const options = useRecallStaffAndSitesQuery();
  const [filters, setFilters] = useState<RecallCandidateFilters>({});
  const [result, setResult] = useState<{
    total: number;
    items: Omit<PickedPatient, "dueDate">[];
  } | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const set = (patch: RecallCandidateFilters) => {
    setFilters((current) => {
      const next = { ...current, ...patch };
      for (const key of Object.keys(next) as (keyof RecallCandidateFilters)[]) {
        if (next[key] === undefined || next[key] === "") delete next[key];
      }
      return next;
    });
    setResult(null);
  };

  const search = async () => {
    setState("loading");
    try {
      const found = await fetchRecallCandidates({
        ...filters,
        ...(excludeTemplateId ? { excludeTemplateId } : {}),
      });
      setResult({
        total: found.total,
        items: found.items.map((item) => ({
          id: item.patientId,
          name: item.patientName,
          recordNumber: item.recordNumber,
        })),
      });
      setState("idle");
    } catch {
      setState("error");
    }
  };

  return (
    <Stack gap={6}>
      <Group grow wrap="wrap" align="flex-end">
        <Select
          label="Sede de la última visita"
          clearable
          data={(options.data?.sites ?? []).map((site) => ({ value: site.id, label: site.name }))}
          value={filters.siteId ?? null}
          onChange={(value) => set({ siteId: value ?? undefined })}
        />
        <Select
          label="Doctor de la última visita"
          clearable
          data={(options.data?.staff ?? []).map((member) => ({
            value: member.id,
            label: member.displayName,
          }))}
          value={filters.staffId ?? null}
          onChange={(value) => set({ staffId: value ?? undefined })}
        />
      </Group>
      <Group grow wrap="wrap" align="flex-end">
        <TextInput
          type="date"
          label="Última visita desde"
          value={filters.lastVisitFrom ?? ""}
          onChange={(event) => set({ lastVisitFrom: event.currentTarget.value || undefined })}
        />
        <TextInput
          type="date"
          label="Última visita hasta"
          value={filters.lastVisitTo ?? ""}
          onChange={(event) => set({ lastVisitTo: event.currentTarget.value || undefined })}
        />
      </Group>
      <Group grow wrap="wrap" align="flex-end">
        <NumberInput
          label="Edad mínima"
          min={0}
          max={120}
          value={filters.minAge ?? ""}
          onChange={(value) => set({ minAge: typeof value === "number" ? value : undefined })}
        />
        <NumberInput
          label="Edad máxima"
          min={0}
          max={120}
          value={filters.maxAge ?? ""}
          onChange={(value) => set({ maxAge: typeof value === "number" ? value : undefined })}
        />
      </Group>
      <Group>
        <Button variant="light" onClick={search} loading={state === "loading"}>
          Ver pacientes que cumplen
        </Button>
      </Group>
      {state === "error" ? <Alert color="red">No se pudo calcular la lista.</Alert> : null}
      {result ? (
        <Alert color={result.total === 0 ? "gray" : "teal"}>
          <Group justify="space-between" wrap="wrap">
            <Text size="sm">
              {result.total} paciente{result.total === 1 ? "" : "s"} activo
              {result.total === 1 ? "" : "s"} cumple{result.total === 1 ? "" : "n"} los filtros
              {result.total > result.items.length
                ? `. Se pueden asignar ${result.items.length} a la vez.`
                : "."}
            </Text>
            {result.items.length > 0 ? (
              <Button size="compact-sm" onClick={() => onAddAll(result.items)}>
                Añadir{" "}
                <Badge ml={4} size="xs">
                  {result.items.length}
                </Badge>
              </Button>
            ) : null}
          </Group>
        </Alert>
      ) : null}
    </Stack>
  );
}
