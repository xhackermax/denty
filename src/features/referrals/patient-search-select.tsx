"use client";

import { Select } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { useState } from "react";

import { usePatientsQuery } from "@/shared/patients/patient-data";

export interface PatientOption {
  id: string;
  name: string;
}

interface PatientSearchSelectProps {
  label: string;
  value: PatientOption | null;
  onChange: (patient: PatientOption | null) => void;
  /** A patient that may not be chosen here (the other side of the relation). */
  excludeId?: string | null | undefined;
  required?: boolean;
  error?: string | undefined;
}

/** Searchable patient selector: archived patients are never offered. */
export function PatientSearchSelect({
  label,
  value,
  onChange,
  excludeId,
  required = false,
  error,
}: PatientSearchSelectProps) {
  const [search, setSearch] = useState("");
  const [debounced] = useDebouncedValue(search.trim(), 300);
  const patients = usePatientsQuery(debounced.length >= 2, false, debounced);
  const found = (patients.data?.items ?? [])
    .filter((patient) => patient.id !== excludeId)
    .slice(0, 20)
    .map((patient) => ({
      value: patient.id,
      label: `${patient.firstName} ${patient.lastName} · NHC ${patient.recordNumber}`,
    }));
  // The chosen patient stays selectable even when the current search no longer matches it.
  const data =
    value && !found.some((option) => option.value === value.id)
      ? [{ value: value.id, label: value.name }, ...found]
      : found;

  return (
    <Select
      label={label}
      required={required}
      searchable
      clearable
      placeholder="Escribe nombre, apellidos o NHC"
      nothingFoundMessage={
        debounced.length >= 2 ? "Ningún paciente coincide" : "Escribe al menos 2 letras"
      }
      filter={({ options }) => options}
      data={data}
      value={value?.id ?? null}
      searchValue={search}
      onSearchChange={setSearch}
      error={error ?? (patients.isError ? "No se pudo buscar pacientes." : undefined)}
      onChange={(id, option) =>
        onChange(id && option ? { id, name: option.label.split(" · ")[0] ?? option.label } : null)
      }
    />
  );
}
