"use client";

import {
  Alert,
  Button,
  Group,
  Modal,
  SegmentedControl,
  Stack,
  Text,
  Textarea,
} from "@mantine/core";
import { IconCalendarPlus } from "@tabler/icons-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { dateDMY, dateYMDMadrid, todayMadrid } from "@/domain/dates";
import {
  REVIEW_INTERVAL_OPTIONS,
  isReviewIntervalMonths,
  nextMaintenanceDueDate,
  reviewIntervalLabel,
  type ReviewIntervalMonths,
} from "@/domain/patient-discharge";
import {
  useDischargePatientMutation,
  useDischargeSuggestionQuery,
} from "@/shared/patients/patient-data";

/** Agenda opens on the review day with the new-appointment form for this patient. */
export function reviewAppointmentHref(patientId: string, dueDate: string): string {
  const query = new URLSearchParams({ patientId, date: dueDate, action: "review" });
  return `/app/agenda?${query.toString()}`;
}

function ScheduleReviewButton({ patientId, dueDate }: { patientId: string; dueDate: string }) {
  return (
    <Button
      component={Link}
      href={reviewAppointmentHref(patientId, dueDate)}
      size="xs"
      leftSection={<IconCalendarPlus size={14} />}
    >
      Dar cita de revisión
    </Button>
  );
}

export function PatientDischargeModal({
  patientId,
  expectedVersion,
  opened,
  onClose,
}: {
  patientId: string;
  expectedVersion: number;
  opened: boolean;
  onClose: () => void;
}) {
  const suggestion = useDischargeSuggestionQuery(patientId, opened);
  const discharge = useDischargePatientMutation();
  const [months, setMonths] = useState<ReviewIntervalMonths | null>(null);
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState<string | null>(null);

  useEffect(() => {
    if (!opened) {
      setMonths(null);
      setNotes("");
      setDueDate(null);
      discharge.reset();
    }
    // discharge.reset is stable; only the open state matters here.
  }, [opened]);

  const selected = months ?? suggestion.data?.months ?? null;

  const submit = async () => {
    if (!selected) return;
    const result = await discharge.mutateAsync({
      patientId,
      expectedVersion,
      reviewMonths: selected,
      notes,
    });
    setDueDate(result.reviewDueDate);
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Dar de alta" size="md">
      {dueDate ? (
        <Stack gap="sm">
          <Alert color="yellow" title="Dale cita de revisión en la agenda">
            Paciente dado de alta. Próxima revisión de mantenimiento hacia el {dateDMY(dueDate)} (
            {reviewIntervalLabel(selected ?? 6).toLowerCase()}).
          </Alert>
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Más tarde
            </Button>
            <ScheduleReviewButton patientId={patientId} dueDate={dueDate} />
          </Group>
        </Stack>
      ) : (
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            El paciente termina el tratamiento y pasa a revisiones de mantenimiento.
          </Text>
          {suggestion.isError ? (
            <Text size="sm" c="red">
              No se pudo calcular la revisión propuesta; elige el intervalo.
            </Text>
          ) : null}
          <SegmentedControl
            aria-label="Intervalo de revisión"
            fullWidth
            disabled={suggestion.isLoading}
            value={selected ? String(selected) : ""}
            onChange={(value) => {
              const parsed = Number(value);
              if (isReviewIntervalMonths(parsed)) setMonths(parsed);
            }}
            data={REVIEW_INTERVAL_OPTIONS.map((option) => ({
              value: String(option),
              label: reviewIntervalLabel(option),
            }))}
          />
          {suggestion.data ? (
            <Text size="xs" c="dimmed">
              {suggestion.data.basedOn
                ? `Propuesto por su tratamiento: ${suggestion.data.basedOn}.`
                : "Propuesta habitual: ningún tratamiento del paciente define intervalo."}
            </Text>
          ) : null}
          <Textarea
            label="Nota (opcional)"
            autosize
            minRows={1}
            maxLength={500}
            value={notes}
            onChange={(event) => setNotes(event.currentTarget.value)}
          />
          {discharge.isError ? (
            <Alert color="red">
              {discharge.error instanceof Error
                ? discharge.error.message
                : "No se pudo dar de alta al paciente."}
            </Alert>
          ) : null}
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={() => void submit().catch(() => undefined)}
              loading={discharge.isPending}
              disabled={!selected}
            >
              Dar de alta
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}

/**
 * Shown on a discharged patient's record. Without an upcoming appointment it
 * stays as a warning until reception books the maintenance review.
 */
export function PatientDischargeBanner({
  patientId,
  dischargedAt,
  reviewMonths,
  hasUpcomingAppointment,
  now,
}: {
  patientId: string;
  dischargedAt: string;
  reviewMonths: number | null | undefined;
  hasUpcomingAppointment: boolean;
  /** Clinic "today" is computed from this instant (the record keeps one per render). */
  now: number;
}) {
  const months = isReviewIntervalMonths(reviewMonths) ? reviewMonths : null;
  const summary = `Alta el ${dateDMY(dischargedAt)}${
    months ? ` · ${reviewIntervalLabel(months).toLowerCase()}` : ""
  }`;
  if (hasUpcomingAppointment || !months) {
    return (
      <Alert color="teal" variant="light" title="Paciente de alta">
        {summary}. {hasUpcomingAppointment ? "Tiene cita programada." : ""}
      </Alert>
    );
  }
  const dueDate = nextMaintenanceDueDate(dateYMDMadrid(dischargedAt), months, todayMadrid(now));
  return (
    <Alert color="yellow" variant="light" title="Falta dar cita de revisión">
      <Stack gap="xs">
        <Text size="sm">
          {summary}. Revisión de mantenimiento hacia el {dateDMY(dueDate)} y sin cita en la agenda.
        </Text>
        <Group>
          <ScheduleReviewButton patientId={patientId} dueDate={dueDate} />
        </Group>
      </Stack>
    </Alert>
  );
}
