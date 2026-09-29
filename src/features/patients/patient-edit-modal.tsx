"use client";

import { Alert, Button, Group, Modal, Select, SimpleGrid, Stack, TextInput } from "@mantine/core";
import { useState, type FormEvent } from "react";

import type { Patient } from "@/shared/api/contracts";
import { DentyApiError } from "@/shared/api/errors";
import { useUpdatePatientMutation } from "@/shared/patients/patient-data";
import { buildPatientUpdate, patientEditDraft, type PatientEditDraft } from "./patient-edit";

const SOURCE_OPTIONS = [
  { value: "GOOGLE", label: "Google" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "FACEBOOK", label: "Facebook" },
  { value: "PATIENT_REFERRAL", label: "Recomendación de paciente" },
  { value: "PROFESSIONAL_REFERRAL", label: "Recomendación profesional" },
  { value: "WALK_IN", label: "Pasó por la clínica" },
  { value: "EXISTING_PATIENT", label: "Paciente existente" },
  { value: "OTHER", label: "Otro" },
];

function errorMessage(error: unknown): string {
  if (error instanceof DentyApiError) {
    if (error.status === 409 || error.status === 406)
      return "Otra persona ha modificado la ficha a la vez. Cierra y vuelve a abrir para ver los datos actuales.";
    return error.message;
  }
  return "No se pudieron guardar los cambios.";
}

export function PatientEditModal({
  patient,
  opened,
  onClose,
}: {
  patient: Patient;
  opened: boolean;
  onClose: () => void;
}) {
  return (
    <Modal opened={opened} onClose={onClose} title="Editar datos del paciente" size="lg">
      {/* Remount on open so the form always starts from the current record. */}
      {opened ? <PatientEditForm patient={patient} onClose={onClose} /> : null}
    </Modal>
  );
}

function PatientEditForm({ patient, onClose }: { patient: Patient; onClose: () => void }) {
  const update = useUpdatePatientMutation(patient.id);
  const [draft, setDraft] = useState<PatientEditDraft>(() => patientEditDraft(patient));
  const [validation, setValidation] = useState<string | null>(null);

  const field = (key: keyof PatientEditDraft) => (event: { currentTarget: { value: string } }) => {
    const value = event.currentTarget.value;
    setDraft((current) => ({ ...current, [key]: value }));
  };

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = buildPatientUpdate(patient, draft);
    if (!result.ok) {
      setValidation(result.error);
      return;
    }
    setValidation(null);
    if (!result.payload) {
      onClose();
      return;
    }
    update.mutate(result.payload, { onSuccess: onClose });
  }

  const failure = validation ?? (update.error ? errorMessage(update.error) : null);

  return (
    <form onSubmit={submit}>
      <Stack>
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <TextInput
            label="Nombre"
            required
            value={draft.firstName}
            onChange={field("firstName")}
          />
          <TextInput
            label="Apellidos"
            required
            value={draft.lastName}
            onChange={field("lastName")}
          />
          <TextInput
            label="DNI / NIE"
            description="También es la contraseña inicial del portal del paciente."
            value={draft.dni}
            onChange={field("dni")}
          />
          <TextInput
            label="Fecha de nacimiento"
            type="date"
            value={draft.birthDate}
            onChange={field("birthDate")}
          />
          <TextInput label="Teléfono" value={draft.phone} onChange={field("phone")} />
          <TextInput label="Email" type="email" value={draft.email} onChange={field("email")} />
          <Select
            label="¿Cómo nos conoció?"
            clearable
            data={SOURCE_OPTIONS}
            value={draft.declaredSource || null}
            onChange={(value) =>
              setDraft((current) => ({ ...current, declaredSource: value ?? "" }))
            }
          />
          <TextInput
            label="Detalle del origen"
            value={draft.declaredSourceDetail}
            onChange={field("declaredSourceDetail")}
          />
        </SimpleGrid>
        {failure ? <Alert color="red">{failure}</Alert> : null}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={update.isPending}>
            Guardar cambios
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
