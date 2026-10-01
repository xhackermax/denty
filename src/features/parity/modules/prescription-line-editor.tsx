"use client";

import { useState } from "react";
import {
  hasNsaidAllergy,
  isNsaidMedication,
  prescriptionAllergyConflicts,
} from "@/domain/prescriptions/nsaid-allergy";

import {
  Alert,
  ActionIcon,
  Autocomplete,
  Button,
  Group,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import { IconPlus, IconTrash } from "@tabler/icons-react";

import {
  DENTAL_MEDICATIONS,
  DURATIONS,
  FREQUENCIES,
  INSTRUCTIONS,
  PACKAGE_COUNTS,
  PHARMACEUTICAL_FORMS,
  PRESCRIPTION_PROTOCOLS,
  ROUTES,
  UNITS_PER_DOSE,
  emptyPrescriptionLine,
  findMedicationPreset,
  lineFromPreset,
  type PrescriptionLine,
} from "@/domain/prescriptions/dental-vademecum";
import styles from "@/shared/ui/parity.module.css";

const MEDICATION_OPTIONS = Object.entries(
  DENTAL_MEDICATIONS.reduce<Record<string, string[]>>((groups, medication) => {
    (groups[medication.group] ??= []).push(medication.name);
    return groups;
  }, {}),
).map(([group, items]) => ({ group, items }));

/**
 * Medicines of a prescription as dropdowns: choosing a medicine of the
 * vademécum fills the whole line (dose, form, route, regimen and duration), and
 * every field still accepts free text for anything that is not on the list.
 */
export function PrescriptionLinesEditor({
  lines,
  onChange,
  medicalProfile,
}: {
  medicalProfile?: unknown;
  lines: PrescriptionLine[];
  onChange: (lines: PrescriptionLine[]) => void;
}) {
  const [protocolError, setProtocolError] = useState<string | null>(null);
  const allergic = hasNsaidAllergy(medicalProfile);
  const conflicts = prescriptionAllergyConflicts(
    medicalProfile,
    lines.map((l) => l.activeIngredient),
  );
  const update = (index: number, patch: Partial<PrescriptionLine>) =>
    onChange(lines.map((line, position) => (position === index ? { ...line, ...patch } : line)));
  const remove = (index: number) => {
    const next = lines.filter((_, position) => position !== index);
    onChange(next.length ? next : [emptyPrescriptionLine()]);
  };
  const addProtocol = (medications: readonly string[]) => {
    setProtocolError(null);
    if (allergic && medications.some(isNsaidMedication)) return;
    const presets = medications
      .map((name) => findMedicationPreset(name))
      .filter((preset) => preset !== undefined)
      .map(lineFromPreset);
    const kept = lines.filter((line) => line.activeIngredient.trim());
    if (
      kept.some((line) => /paracetamol/i.test(line.activeIngredient)) &&
      presets.some(
        (line) =>
          /paracetamol/i.test(line.activeIngredient) &&
          !kept.some(
            (current) =>
              current.activeIngredient.toLowerCase() === line.activeIngredient.toLowerCase(),
          ),
      )
    ) {
      setProtocolError(
        "Elige una alternativa: ya hay un medicamento con paracetamol. Retira la otra línea antes de cambiar la pauta.",
      );
      return;
    }
    const names = new Set(kept.map((line) => line.activeIngredient.trim().toLowerCase()));
    onChange([
      ...kept,
      ...presets.filter((line) => !names.has(line.activeIngredient.toLowerCase())),
    ]);
  };

  return (
    <Stack gap="sm">
      {protocolError ? <Alert color="red">{protocolError}</Alert> : null}
      {conflicts.length ? (
        <Alert color="red">Alergia a AINEs: retira {conflicts.join(", ")} antes de guardar.</Alert>
      ) : null}
      <Group gap="xs">
        <Text size="sm" fw={600}>
          Pautas rápidas:
        </Text>
        {[...PRESCRIPTION_PROTOCOLS]
          .sort((a, b) =>
            allergic ? Number(b.label.includes("AINEs")) - Number(a.label.includes("AINEs")) : 0,
          )
          .map((protocol) => (
            <Button
              key={protocol.label}
              disabled={allergic && protocol.medications.some(isNsaidMedication)}
              size="compact-sm"
              variant="light"
              onClick={() => addProtocol(protocol.medications)}
            >
              {protocol.label}
            </Button>
          ))}
      </Group>

      {lines.map((line, index) => {
        const preset = findMedicationPreset(line.activeIngredient);
        return (
          <div className={styles.row} key={index}>
            <div className={styles.rowMain}>
              <Group gap="xs" align="end" wrap="nowrap">
                <Autocomplete
                  className={styles.flexField}
                  label={`${index + 1}. Medicamento`}
                  placeholder="Escribe o elige"
                  data={MEDICATION_OPTIONS.map((group) => ({
                    ...group,
                    items: group.items.filter((name) => !allergic || !isNsaidMedication(name)),
                  }))}
                  value={line.activeIngredient}
                  onChange={(value) => {
                    if (!allergic || !isNsaidMedication(value)) {
                      setProtocolError(null);
                      update(index, { activeIngredient: value });
                    } else
                      setProtocolError("Alergia a AINEs: este medicamento no se puede añadir.");
                  }}
                  onOptionSubmit={(value) => {
                    const chosen = findMedicationPreset(value);
                    if (chosen && (!allergic || !isNsaidMedication(value)))
                      update(index, lineFromPreset(chosen));
                  }}
                  limit={20}
                />
                <ActionIcon
                  variant="subtle"
                  color="red"
                  aria-label={`Quitar medicamento ${index + 1}`}
                  onClick={() => remove(index)}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
              <SimpleGrid cols={{ base: 2, md: 4 }} spacing="xs" mt={6}>
                <Autocomplete
                  label="Dosis"
                  data={[...(preset?.strengths ?? [])]}
                  value={line.strength}
                  onChange={(value) => update(index, { strength: value })}
                />
                <Autocomplete
                  label="Forma"
                  data={[...PHARMACEUTICAL_FORMS]}
                  value={line.pharmaceuticalForm}
                  onChange={(value) => update(index, { pharmaceuticalForm: value })}
                />
                <Autocomplete
                  label="Vía"
                  data={[...ROUTES]}
                  value={line.route}
                  onChange={(value) => update(index, { route: value })}
                />
                <Autocomplete
                  label="Toma"
                  data={[...UNITS_PER_DOSE]}
                  value={line.unitsPerDose}
                  onChange={(value) => update(index, { unitsPerDose: value })}
                />
                <Autocomplete
                  label="Posología"
                  data={[...FREQUENCIES]}
                  value={line.frequency}
                  onChange={(value) => update(index, { frequency: value })}
                />
                <Autocomplete
                  label="Duración"
                  data={[...DURATIONS]}
                  value={line.duration}
                  onChange={(value) => update(index, { duration: value })}
                />
                <Autocomplete
                  label="Nº de envases"
                  data={[...PACKAGE_COUNTS]}
                  value={line.packageCount}
                  onChange={(value) => update(index, { packageCount: value })}
                />
                <Autocomplete
                  className={styles.spanTwo}
                  label="Indicaciones"
                  data={[...INSTRUCTIONS]}
                  value={line.instructions}
                  onChange={(value) => update(index, { instructions: value })}
                />
              </SimpleGrid>
            </div>
          </div>
        );
      })}

      <Group>
        <Button
          size="xs"
          variant="subtle"
          leftSection={<IconPlus size={14} />}
          onClick={() => onChange([...lines, emptyPrescriptionLine()])}
        >
          Añadir medicamento
        </Button>
      </Group>
    </Stack>
  );
}
