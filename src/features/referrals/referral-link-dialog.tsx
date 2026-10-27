"use client";

import { Alert, Button, Group, Modal, Select, Stack, Textarea, TextInput } from "@mantine/core";
import { useState } from "react";

import { madridLocalDateTime, todayMadrid } from "@/domain/dates";
import { REFERRAL_SOURCE_LABELS, REFERRAL_SOURCES, type ReferralSource } from "@/domain/referrals";

import { PatientSearchSelect, type PatientOption } from "./patient-search-select";
import {
  useCreateReferralMutation,
  useReferralProgramsQuery,
  useReferralSitesQuery,
} from "./referrals-data";

interface ReferralLinkDialogProps {
  onClose: () => void;
  /** Pre-fills the referred patient, e.g. when opened from a patient record. */
  referred?: PatientOption | null;
}

/** "Asociar paciente referido": records who recommended whom; never creates patients. */
export function ReferralLinkDialog({ onClose, referred = null }: ReferralLinkDialogProps) {
  const [referrer, setReferrer] = useState<PatientOption | null>(null);
  const [newPatient, setNewPatient] = useState<PatientOption | null>(referred);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [programId, setProgramId] = useState<string | null>(null);
  const [source, setSource] = useState<ReferralSource>("DECLARADO_EN_RECEPCION");
  const [reportedOn, setReportedOn] = useState(todayMadrid());
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"PENDING" | "CONFIRMED">("PENDING");
  const [submitted, setSubmitted] = useState(false);
  const create = useCreateReferralMutation();
  const programs = useReferralProgramsQuery();
  const sites = useReferralSitesQuery();

  const samePatient = referrer !== null && referrer.id === newPatient?.id;
  const missing = !referrer || !newPatient || !reportedOn;

  const submit = () => {
    setSubmitted(true);
    if (missing || samePatient || create.isPending) return;
    create.mutate(
      {
        referrerPatientId: referrer.id,
        referredPatientId: newPatient.id,
        siteId,
        programId,
        source,
        // Noon Madrid time keeps the chosen day whatever the browser's zone.
        reportedAt: madridLocalDateTime(reportedOn, "12:00").toISOString(),
        notes: notes.trim() || null,
        status,
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Modal opened onClose={onClose} title="Asociar paciente referido" size="lg">
      <Stack gap="sm">
        <PatientSearchSelect
          label="Paciente que recomienda"
          required
          value={referrer}
          onChange={setReferrer}
          excludeId={newPatient?.id}
          error={submitted && !referrer ? "Elige quién recomienda." : undefined}
        />
        <PatientSearchSelect
          label="Paciente que viene recomendado"
          required
          value={newPatient}
          onChange={setNewPatient}
          excludeId={referrer?.id}
          error={
            submitted && !newPatient
              ? "Elige al paciente recomendado."
              : samePatient
                ? "Un paciente no puede recomendarse a sí mismo."
                : undefined
          }
        />
        <Group grow align="flex-start">
          <Select
            label="Cómo se registró"
            allowDeselect={false}
            data={REFERRAL_SOURCES.map((value) => ({
              value,
              label: REFERRAL_SOURCE_LABELS[value],
            }))}
            value={source}
            onChange={(value) => value && setSource(value as ReferralSource)}
          />
          <TextInput
            type="date"
            label="Fecha de recomendación"
            required
            value={reportedOn}
            onChange={(event) => setReportedOn(event.currentTarget.value)}
          />
        </Group>
        <Group grow align="flex-start">
          <Select
            label="Sede de captación"
            clearable
            data={(sites.data ?? []).map((site) => ({ value: site.id, label: site.name }))}
            value={siteId}
            onChange={setSiteId}
          />
          <Select
            label="Programa de beneficios"
            clearable
            description="Solo un programa activo genera beneficios."
            data={(programs.data?.items ?? []).map((program) => ({
              value: program.id,
              label: program.active ? program.name : `${program.name} (inactivo)`,
            }))}
            value={programId}
            onChange={setProgramId}
          />
        </Group>
        <Select
          label="Estado inicial"
          allowDeselect={false}
          data={[
            { value: "PENDING", label: "Pendiente de confirmar" },
            { value: "CONFIRMED", label: "Confirmado" },
          ]}
          value={status}
          onChange={(value) => value && setStatus(value as "PENDING" | "CONFIRMED")}
        />
        <Textarea
          label="Observaciones internas"
          autosize
          minRows={2}
          maxLength={500}
          value={notes}
          onChange={(event) => setNotes(event.currentTarget.value)}
        />
        {create.error ? (
          <Alert color="red">
            {create.error instanceof Error ? create.error.message : "No se pudo asociar."}
          </Alert>
        ) : null}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} loading={create.isPending}>
            Asociar
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
