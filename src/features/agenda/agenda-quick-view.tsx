"use client";

import {
  Alert,
  Badge,
  Button,
  Divider,
  Drawer,
  Group,
  Menu,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconArrowRight,
  IconBan,
  IconCalendarRepeat,
  IconCash,
  IconChevronDown,
  IconExternalLink,
  IconPencil,
  IconUserOff,
} from "@tabler/icons-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { epochMillis, hhmm, todayMadrid } from "@/domain/dates";
import type { Patient } from "@/shared/api";
import { ClinicalGlyph, describeClinicalGlyph } from "@/shared/odontogram/clinical-glyph";
import type { AgendaAppointmentView } from "./agenda-projection";
import { AGENDA_STATUS_META, AgendaStatusIcon } from "./agenda-status";
import styles from "./agenda.module.css";

const ANTICOAGULANT_PATTERN =
  /sintrom|acenocumarol|warfarin|apixab|rivaroxab|dabigatr|edoxab|heparin|anticoag/i;
const DURATION_OPTIONS = [10, 15, 20, 30, 45, 60, 75, 90, 120].map((minutes) => ({
  value: String(minutes),
  label: `${minutes} min`,
}));

function ageFrom(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;
  const [year, month, day] = birthDate.split("-").map(Number);
  const [nowYear, nowMonth, nowDay] = todayMadrid().split("-").map(Number);
  if (!year || !month || !day || !nowYear || !nowMonth || !nowDay) return null;
  const hadBirthday = nowMonth > month || (nowMonth === month && nowDay >= day);
  return nowYear - year - (hadBirthday ? 0 : 1);
}

/** Only high-value alerts; the full medical history stays in the patient record. */
export function patientAlerts(patient: Patient | undefined): string[] {
  const profile = patient?.medicalProfile;
  if (!profile) return [];
  const alerts: string[] = [];
  if (profile.allergies.length) alerts.push(`Alergias: ${profile.allergies.join(", ")}`);
  const anticoagulants = profile.medications.filter((drug) => ANTICOAGULANT_PATTERN.test(drug));
  if (anticoagulants.length) alerts.push(`Anticoagulación: ${anticoagulants.join(", ")}`);
  alerts.push(...profile.dentalRisks);
  return alerts;
}

export interface QuickViewEdit {
  time: string;
  durationMinutes: number;
  staffId: string;
}

export interface AgendaQuickViewProps {
  appointment: AgendaAppointmentView | null;
  patient: Patient | undefined;
  staffName: string | undefined;
  cabinetName: string | undefined;
  siteName: string | undefined;
  staffOptions: ReadonlyArray<{ value: string; label: string }>;
  busy: boolean;
  onClose: () => void;
  onAdvance: (appointment: AgendaAppointmentView) => void;
  onNoShow: (appointment: AgendaAppointmentView) => void;
  onReschedule: (appointment: AgendaAppointmentView) => void;
  onCancel: (appointment: AgendaAppointmentView, reason: string) => void;
  onEdit: (appointment: AgendaAppointmentView, edit: QuickViewEdit) => void;
}

export function AgendaQuickView({
  appointment,
  patient,
  staffName,
  cabinetName,
  siteName,
  staffOptions,
  busy,
  onClose,
  onAdvance,
  onNoShow,
  onReschedule,
  onCancel,
  onEdit,
}: AgendaQuickViewProps) {
  const [editing, setEditing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [edit, setEdit] = useState<QuickViewEdit>({ time: "", durationMinutes: 30, staffId: "" });

  useEffect(() => {
    setEditing(false);
    setCancelling(false);
    setCancelReason("");
    if (appointment) {
      setEdit({
        time: hhmm(appointment.startsAt),
        durationMinutes: Math.round(
          (epochMillis(appointment.endsAt) - epochMillis(appointment.startsAt)) / 60_000,
        ),
        staffId: appointment.staffId,
      });
    }
  }, [appointment]);

  const status = appointment ? AGENDA_STATUS_META[appointment.status] : null;
  const active =
    appointment !== null &&
    appointment.status !== "COMPLETED" &&
    appointment.status !== "NO_SHOW" &&
    appointment.status !== "CANCELLED";
  const alerts = patientAlerts(patient);
  const age = ageFrom(patient?.birthDate);

  return (
    <Drawer
      opened={appointment !== null}
      onClose={onClose}
      position="right"
      size="sm"
      title={appointment?.patientName ?? ""}
      closeButtonProps={{ "aria-label": "Cerrar detalle de la cita" }}
    >
      {appointment && status ? (
        <Stack gap="md">
          <Group gap="xs">
            <Badge
              variant="light"
              leftSection={<AgendaStatusIcon status={appointment.status} size={12} />}
              className={styles.statusBadge}
              data-status={appointment.status}
            >
              {status.label}
            </Badge>
            {appointment.glyphs.map((glyph, index) => (
              <Group key={`${glyph.family}-${index}`} gap={6} wrap="nowrap">
                <ClinicalGlyph glyph={glyph} />
                <Text size="xs" c="dimmed">
                  {describeClinicalGlyph(glyph)}
                </Text>
              </Group>
            ))}
          </Group>

          <Group gap="xs">
            <Button
              component={Link}
              href={`/app/patients/${appointment.patientId}`}
              size="xs"
              variant="light"
              leftSection={<IconExternalLink size={14} />}
            >
              Abrir paciente
            </Button>
            {status.nextLabel ? (
              <Button
                size="xs"
                loading={busy}
                leftSection={<IconArrowRight size={14} />}
                onClick={() => onAdvance(appointment)}
              >
                {status.nextLabel}
              </Button>
            ) : null}
            <Button
              component={Link}
              href={`/app/finance?patientId=${appointment.patientId}`}
              size="xs"
              variant="light"
              leftSection={<IconCash size={14} />}
            >
              Cobrar
            </Button>
            <Menu withinPortal position="bottom-end">
              <Menu.Target>
                <Button size="xs" variant="subtle" rightSection={<IconChevronDown size={14} />}>
                  Más
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item
                  leftSection={<IconPencil size={14} />}
                  disabled={!active}
                  onClick={() => setEditing(true)}
                >
                  Editar hora y profesional
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconCalendarRepeat size={14} />}
                  onClick={() => onReschedule(appointment)}
                >
                  Reagendar +30 min
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconUserOff size={14} />}
                  disabled={!active}
                  onClick={() => onNoShow(appointment)}
                >
                  No presentado
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  color="red"
                  leftSection={<IconBan size={14} />}
                  disabled={!active}
                  onClick={() => setCancelling(true)}
                >
                  Cancelar cita
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>

          {editing ? (
            <Stack gap="xs" className={styles.quickPanel}>
              <Group grow>
                <TextInput
                  label="Hora"
                  type="time"
                  value={edit.time}
                  onChange={(event) => setEdit({ ...edit, time: event.currentTarget.value })}
                />
                <Select
                  label="Duración"
                  data={DURATION_OPTIONS}
                  value={String(edit.durationMinutes)}
                  onChange={(value) => setEdit({ ...edit, durationMinutes: Number(value) || 30 })}
                />
              </Group>
              <Select
                label="Profesional"
                data={staffOptions}
                value={edit.staffId}
                onChange={(value) => setEdit({ ...edit, staffId: value ?? edit.staffId })}
              />
              <Group justify="flex-end" gap="xs">
                <Button size="xs" variant="default" onClick={() => setEditing(false)}>
                  Descartar
                </Button>
                <Button size="xs" loading={busy} onClick={() => onEdit(appointment, edit)}>
                  Guardar cambios
                </Button>
              </Group>
            </Stack>
          ) : null}

          {cancelling ? (
            <Stack gap="xs" className={styles.quickPanel}>
              <TextInput
                label="Motivo de la cancelación"
                value={cancelReason}
                onChange={(event) => setCancelReason(event.currentTarget.value)}
                data-autofocus
              />
              <Group justify="flex-end" gap="xs">
                <Button size="xs" variant="default" onClick={() => setCancelling(false)}>
                  Volver
                </Button>
                <Button
                  size="xs"
                  color="red"
                  loading={busy}
                  disabled={cancelReason.trim().length < 3}
                  onClick={() => onCancel(appointment, cancelReason.trim())}
                >
                  Cancelar cita
                </Button>
              </Group>
            </Stack>
          ) : null}

          {alerts.length ? (
            <Alert color="red" variant="light" icon={<IconAlertTriangle size={16} />} p="xs">
              <Stack gap={2}>
                {alerts.map((alert) => (
                  <Text size="xs" key={alert}>
                    {alert}
                  </Text>
                ))}
              </Stack>
            </Alert>
          ) : null}

          <Divider label="Cita" labelPosition="left" />
          <dl className={styles.quickFacts}>
            <dt>Hora</dt>
            <dd>
              {hhmm(appointment.startsAt)}–{hhmm(appointment.endsAt)}
            </dd>
            <dt>Motivo</dt>
            <dd>{appointment.reason}</dd>
            {staffName ? (
              <>
                <dt>Profesional</dt>
                <dd>{staffName}</dd>
              </>
            ) : null}
            {siteName ? (
              <>
                <dt>Sede</dt>
                <dd>{siteName}</dd>
              </>
            ) : null}
            {cabinetName ? (
              <>
                <dt>Gabinete</dt>
                <dd>{cabinetName}</dd>
              </>
            ) : null}
          </dl>

          {patient ? (
            <>
              <Divider label="Paciente" labelPosition="left" />
              <dl className={styles.quickFacts}>
                <dt>Historia</dt>
                <dd>{patient.recordNumber}</dd>
                {age !== null ? (
                  <>
                    <dt>Edad</dt>
                    <dd>{age} años</dd>
                  </>
                ) : null}
                {patient.phone ? (
                  <>
                    <dt>Teléfono</dt>
                    <dd>
                      <a href={`tel:${patient.phone}`}>{patient.phone}</a>
                    </dd>
                  </>
                ) : null}
              </dl>
            </>
          ) : null}
        </Stack>
      ) : null}
    </Drawer>
  );
}
