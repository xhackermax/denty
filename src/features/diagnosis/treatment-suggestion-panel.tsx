"use client";
import { Alert, Button, Checkbox, Group, Stack, Text } from "@mantine/core";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { treatmentSuggestions, suggestedQuadrants } from "@/domain/diagnosis/treatment-suggestions";
import type { ClinicalDiagnosis } from "@/shared/api/schemas/diagnoses";
import type { PeriodontalReading } from "@/domain/periodontal";
import { getBrowserApi } from "@/shared/api/browser";
import { dentyQueryKeys } from "@/shared/query";
export function TreatmentSuggestionPanel({
  diagnosis,
  readings = [],
  readOnly = false,
}: {
  diagnosis: ClinicalDiagnosis;
  readings?: readonly PeriodontalReading[];
  readOnly?: boolean;
}) {
  const options = treatmentSuggestions(diagnosis.value);
  const [selected, setSelected] = useState<string[]>(
    options.filter((o) => !o.optional).map((o) => o.id),
  );
  const [quadrants, setQuadrants] = useState<number[]>(suggestedQuadrants(readings));
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: () =>
      getBrowserApi().diagnoses.addToPlan(diagnosis.patientId, diagnosis.id, {
        selections: selected.map((id) => (id === "root-planing" ? { id, quadrants } : { id })),
      }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: dentyQueryKeys.clinical.plan(diagnosis.patientId) }),
        qc.invalidateQueries({ queryKey: dentyQueryKeys.clinical.sync(diagnosis.patientId) }),
        qc.invalidateQueries({ queryKey: dentyQueryKeys.clinical.consents(diagnosis.patientId) }),
      ]);
    },
  });
  if (!options.length) return null;
  const blocked = !selected.length || (selected.includes("root-planing") && !quadrants.length);
  return (
    <Stack gap="xs">
      <Text fw={600}>Plan sugerido · confirma los tratamientos</Text>
      {options.map((o) => (
        <Checkbox
          key={o.id}
          label={o.label}
          checked={selected.includes(o.id)}
          disabled={readOnly || mutation.isPending}
          onChange={(event) => {
            const checked = event.currentTarget.checked;
            setSelected((current) =>
              checked ? [...current, o.id] : current.filter((id) => id !== o.id),
            );
          }}
        />
      ))}
      {selected.includes("root-planing") ? (
        <Group>
          {[1, 2, 3, 4].map((q) => (
            <Checkbox
              key={q}
              label={`Cuadrante ${q}`}
              checked={quadrants.includes(q)}
              disabled={readOnly || mutation.isPending}
              onChange={(event) => {
                const checked = event.currentTarget.checked;
                setQuadrants((current) =>
                  checked ? [...current, q] : current.filter((v) => v !== q),
                );
              }}
            />
          ))}
          <Button
            size="compact-xs"
            variant="subtle"
            disabled={readOnly}
            onClick={() => setQuadrants([1, 2, 3, 4])}
          >
            Los 4
          </Button>
        </Group>
      ) : null}
      {mutation.isError ? <Alert color="red">{mutation.error.message}</Alert> : null}
      {mutation.isSuccess ? (
        <Alert color="green">
          {mutation.data.added} tratamientos añadidos al plan con precios del catálogo.
        </Alert>
      ) : null}
      <Button
        size="xs"
        disabled={readOnly || blocked}
        loading={mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        Añadir al plan
      </Button>
    </Stack>
  );
}
