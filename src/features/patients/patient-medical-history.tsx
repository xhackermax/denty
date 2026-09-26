"use client";

import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Modal,
  SimpleGrid,
  Stack,
  TagsInput,
  Text,
  Textarea,
  Title,
} from "@mantine/core";
import { IconEdit, IconHeartbeat, IconPill, IconShieldExclamation } from "@tabler/icons-react";
import { useState } from "react";

import {
  dentalMedicalAdmissionOptions,
  optionLabels,
  type PatientMedicalProfile,
} from "./patient-admission";

type MedicalGroup = "allergies" | "medications" | "conditions" | "dentalRisks";

interface PatientMedicalHistoryProps {
  profile: PatientMedicalProfile;
  saving?: boolean;
  onSave: (profile: PatientMedicalProfile) => Promise<void> | void;
}

const GROUP_META: Record<
  MedicalGroup,
  { label: string; empty: string; color: string; icon: typeof IconHeartbeat }
> = {
  allergies: {
    label: "Alergias",
    empty: "Sin alergias registradas",
    color: "red",
    icon: IconShieldExclamation,
  },
  medications: {
    label: "Medicación habitual",
    empty: "Sin medicación registrada",
    color: "blue",
    icon: IconPill,
  },
  conditions: {
    label: "Enfermedades y condiciones",
    empty: "Sin condiciones registradas",
    color: "yellow",
    icon: IconHeartbeat,
  },
  dentalRisks: {
    label: "Riesgos odontológicos",
    empty: "Sin riesgos odontológicos registrados",
    color: "violet",
    icon: IconHeartbeat,
  },
};

function normalizeValues(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function displayValues(group: MedicalGroup, values: readonly string[]): string[] {
  return optionLabels(group, values);
}

function catalogLabels(group: MedicalGroup): string[] {
  return dentalMedicalAdmissionOptions[group].map((option) => option.label);
}


function storageValues(group: MedicalGroup, values: readonly string[]): string[] {
  const valueByLabel = new Map(
    dentalMedicalAdmissionOptions[group].map((option) => [option.label, option.value]),
  );
  const normalized = normalizeValues(values).map((value) => valueByLabel.get(value) ?? value);
  const negativeByGroup: Partial<Record<MedicalGroup, string>> = {
    allergies: "no_known_allergies",
    medications: "no_medication",
    conditions: "none_relevant",
  };
  const negative = negativeByGroup[group];
  if (negative && normalized.length > 1) return normalized.filter((value) => value !== negative);
  return normalized;
}

function editableProfile(profile: PatientMedicalProfile): PatientMedicalProfile {
  return {
    ...profile,
    allergies: displayValues("allergies", profile.allergies),
    medications: displayValues("medications", profile.medications),
    conditions: displayValues("conditions", profile.conditions),
    dentalRisks: displayValues("dentalRisks", profile.dentalRisks),
  };
}

export function PatientMedicalHistory({
  profile,
  saving = false,
  onSave,
}: PatientMedicalHistoryProps) {
  const [opened, setOpened] = useState(false);
  const [draft, setDraft] = useState<PatientMedicalProfile>(() => editableProfile(profile));
  const [error, setError] = useState<string | null>(null);

  const openEditor = () => {
    setDraft(editableProfile(profile));
    setError(null);
    setOpened(true);
  };

  const updateGroup = (group: MedicalGroup, values: string[]) => {
    setDraft((current) => ({ ...current, [group]: values }));
  };

  const save = async () => {
    const next: PatientMedicalProfile = {
      ...draft,
      allergies: storageValues("allergies", draft.allergies),
      medications: storageValues("medications", draft.medications),
      conditions: storageValues("conditions", draft.conditions),
      dentalRisks: storageValues("dentalRisks", draft.dentalRisks),
      notes: draft.notes.trim(),
    };
    try {
      await onSave(next);
      setOpened(false);
    } catch {
      setError(
        "No se pudo guardar la historia médica. Revisa la conexión y vuelve a intentarlo.",
      );
    }
  };

  return (
    <Card withBorder radius="lg" padding="lg">
      <Group justify="space-between" align="flex-start" mb="md">
        <div>
          <Title order={3}>Historia médica</Title>
          <Text size="sm" c="dimmed">
            Antecedentes, alergias, medicación y condiciones relevantes antes del tratamiento.
          </Text>
        </div>
        <Button variant="light" leftSection={<IconEdit size={16} />} onClick={openEditor}>
          Editar historia médica
        </Button>
      </Group>

      <SimpleGrid cols={{ base: 1, md: 2 }}>
        {(Object.keys(GROUP_META) as MedicalGroup[]).map((group) => {
          const meta = GROUP_META[group];
          const values = displayValues(group, profile[group]);
          const Icon = meta.icon;
          return (
            <Stack key={group} gap="xs">
              <Group gap="xs">
                <Icon size={17} />
                <Text fw={800} size="sm">
                  {meta.label}
                </Text>
              </Group>
              {values.length ? (
                <Group gap="xs">
                  {values.map((value) => (
                    <Badge key={value} color={meta.color} variant="light">
                      {value}
                    </Badge>
                  ))}
                </Group>
              ) : (
                <Text size="sm" c="dimmed">
                  {meta.empty}
                </Text>
              )}
            </Stack>
          );
        })}
      </SimpleGrid>

      {profile.notes ? (
        <Alert mt="md" variant="light" title="Observaciones médicas">
          {profile.notes}
        </Alert>
      ) : null}

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title="Editar historia médica"
        size="xl"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Selecciona opciones frecuentes en España o escribe cualquier medicamento, alergia o
            condición que no aparezca en la lista.
          </Text>

          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TagsInput
              label="Alergias"
              description="Incluye alergias medicamentosas, látex, clorhexidina u otras."
              data={catalogLabels("allergies")}
              value={[...draft.allergies]}
              onChange={(values) => updateGroup("allergies", values)}
              clearable
            />
            <TagsInput
              label="Medicación habitual"
              description="Escribe también dosis si es clínicamente relevante."
              data={catalogLabels("medications")}
              value={[...draft.medications]}
              onChange={(values) => updateGroup("medications", values)}
              clearable
            />
            <TagsInput
              label="Enfermedades y condiciones"
              description="Diabetes, embarazo, cardiopatías, enfermedad tiroidea y otras."
              data={catalogLabels("conditions")}
              value={[...draft.conditions]}
              onChange={(values) => updateGroup("conditions", values)}
              clearable
            />
            <TagsInput
              label="Riesgos odontológicos"
              description="Factores que pueden modificar prevención, cirugía o seguimiento."
              data={catalogLabels("dentalRisks")}
              value={[...draft.dentalRisks]}
              onChange={(values) => updateGroup("dentalRisks", values)}
              clearable
            />
          </SimpleGrid>

          <Textarea
            label="Observaciones médicas"
            description={
              "Detalles, controles, antecedentes o información que no encaje en las listas."
            }
            minRows={4}
            autosize
            value={draft.notes}
            onChange={(event) =>
              setDraft((current) => ({ ...current, notes: event.currentTarget.value }))
            }
          />

          {error ? <Alert color="red">{error}</Alert> : null}

          <Group justify="flex-end">
            <Button variant="default" onClick={() => setOpened(false)}>
              Cancelar
            </Button>
            <Button loading={saving} onClick={() => void save()}>
              Guardar historia médica
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Card>
  );
}
