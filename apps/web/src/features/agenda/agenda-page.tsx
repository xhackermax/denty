"use client";

import {
  Alert,
  Badge,
  Button,
  Group,
  Modal,
  Select,
  SegmentedControl,
  SimpleGrid,
  TextInput,
  Title,
} from "@mantine/core";
import { IconCalendarPlus } from "@tabler/icons-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import {
  addMinutes,
  hhmm,
  madridLocalDateTime,
  todayMadrid,
  toMadridISO,
} from "@/domain/dates";
import {
  useAgendaContextQuery,
  useAppointmentsQuery,
  useAppointmentTransitionMutation,
  useCreateAppointmentMutation,
} from "./agenda-data";
import {
  projectApiAppointments,
  projectApiPatients,
  projectApiSites,
  projectApiStaff,
  projectDemoAppointments,
  projectDemoPatients,
  projectDemoStaff,
  type AgendaAppointmentView,
  type AgendaStatus,
} from "./agenda-projection";
import {
  DEMO_APPOINTMENTS,
  DEMO_PATIENTS,
  DEMO_STAFF,
  type DemoAppointment,
} from "@/shared/demo/demo-data";
import styles from "@/shared/ui/parity.module.css";
import { usePatientsQuery } from "@/shared/patients/patient-data";
import { publicEnv } from "@/shared/config/env";
import { PageHeader } from "@/shared/ui";

const PIPELINE = [
  { key: "planned", title: "Llegarán", statuses: ["PLANNED", "CONFIRMED"] },
  { key: "waiting", title: "En sala", statuses: ["ARRIVED"] },
  { key: "chair", title: "En gabinete", statuses: ["IN_CHAIR"] },
  { key: "done", title: "Finalizadas", statuses: ["COMPLETED"] },
] as const;

function nextStatus(status: AgendaStatus): AgendaStatus | null {
  if (status === "PLANNED" || status === "CONFIRMED") return "ARRIVED";
  if (status === "ARRIVED") return "IN_CHAIR";
  if (status === "IN_CHAIR") return "COMPLETED";
  return null;
}

function nextLabel(status: AgendaStatus): string | null {
  if (status === "PLANNED" || status === "CONFIRMED") return "Ha llegado";
  if (status === "ARRIVED") return "A gabinete";
  if (status === "IN_CHAIR") return "Finalizar";
  return null;
}

function statusColor(status: AgendaStatus): string {
  if (status === "IN_CHAIR" || status === "COMPLETED") return "green";
  if (status === "ARRIVED") return "yellow";
  if (status === "NO_SHOW" || status === "CANCELLED") return "gray";
  return "blue";
}

export function AgendaPage() {
  const demoMode = publicEnv.NEXT_PUBLIC_DEMO_MODE === "true";
  const [date] = useState(todayMadrid);
  const [demoAppointments, setDemoAppointments] =
    useState<readonly DemoAppointment[]>(DEMO_APPOINTMENTS);
  const [view, setView] = useState("pipeline");
  const [opened, setOpened] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("15:00");
  const [reason, setReason] = useState("Revisión");

  const appointmentsQuery = useAppointmentsQuery(date, !demoMode);
  const patientsQuery = usePatientsQuery(!demoMode);
  const contextQuery = useAgendaContextQuery(!demoMode);
  const createMutation = useCreateAppointmentMutation(date);
  const transitions = useAppointmentTransitionMutation(date);

  const appointments = useMemo(() => {
    if (demoMode) return projectDemoAppointments(demoAppointments);
    return projectApiAppointments(
      appointmentsQuery.data ?? [],
      patientsQuery.data?.items ?? [],
    );
  }, [
    appointmentsQuery.data,
    demoAppointments,
    demoMode,
    patientsQuery.data,
  ]);

  const staff = useMemo(
    () =>
      demoMode
        ? projectDemoStaff(DEMO_STAFF)
        : projectApiStaff(contextQuery.data),
    [contextQuery.data, demoMode],
  );
  const patientOptions = useMemo(
    () =>
      demoMode
        ? projectDemoPatients(DEMO_PATIENTS)
        : projectApiPatients(patientsQuery.data?.items ?? []),
    [demoMode, patientsQuery.data],
  );
  const sites = useMemo(
    () => (demoMode ? [] : projectApiSites(contextQuery.data)),
    [contextQuery.data, demoMode],
  );

  const effectivePatientId = patientId || patientOptions[0]?.id || "";
  const effectiveStaffId = staffId || staff[0]?.id || "";
  const effectiveSiteId = siteId || sites[0]?.id || "";

  const byStaff = useMemo(
    () =>
      staff.map((member) => ({
        staff: member,
        appointments: appointments.filter(
          (appointment) => appointment.staffId === member.id,
        ),
      })),
    [appointments, staff],
  );

  const siteNames = useMemo(
    () => new Map(sites.map((site) => [site.id, site.name])),
    [sites],
  );

  const transitionPending =
    transitions.arrive.isPending ||
    transitions.chair.isPending ||
    transitions.noShow.isPending ||
    transitions.complete.isPending;

  const advance = async (appointment: AgendaAppointmentView) => {
    const status = nextStatus(appointment.status);
    if (!status) return;

    if (demoMode) {
      setDemoAppointments((current) =>
        current.map((candidate) =>
          candidate.id === appointment.id
            ? { ...candidate, status: status as DemoAppointment["status"] }
            : candidate,
        ),
      );
      return;
    }

    const input = { id: appointment.id, expectedVersion: appointment.version };
    if (status === "ARRIVED") await transitions.arrive.mutateAsync(input);
    if (status === "IN_CHAIR") await transitions.chair.mutateAsync(input);
    if (status === "COMPLETED") await transitions.complete.mutateAsync(input);
  };

  const create = async () => {
    if (!effectivePatientId || !effectiveStaffId || !appointmentTime) return;
    const startsAt = madridLocalDateTime(date, appointmentTime);
    const endsAt = addMinutes(startsAt, 30);

    if (demoMode) {
      const patient = DEMO_PATIENTS.find(
        (candidate) => candidate.id === effectivePatientId,
      );
      if (!patient) return;
      const appointment: DemoAppointment = {
        id: `demo-${demoAppointments.length + 1}`,
        patientId: patient.id,
        patientName: `${patient.firstName} ${patient.lastName}`,
        staffId: effectiveStaffId,
        startsAt: toMadridISO(startsAt),
        endsAt: toMadridISO(endsAt),
        status: "PLANNED",
        reason: reason.trim() || "Cita",
      };
      setDemoAppointments((current) => [...current, appointment]);
    } else {
      if (!effectiveSiteId) return;
      await createMutation.mutateAsync({
        patientId: effectivePatientId,
        staffId: effectiveStaffId,
        siteId: effectiveSiteId,
        startsAt: toMadridISO(startsAt),
        endsAt: toMadridISO(endsAt),
        title: reason.trim() || "Cita",
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      });
    }

    setOpened(false);
  };

  const hasBackendError =
    !demoMode &&
    (appointmentsQuery.isError || patientsQuery.isError || contextQuery.isError);

  return (
    <div className={styles.grid}>
      <PageHeader
        eyebrow="Agenda"
        title="Pipeline de hoy"
        description="Llegarán → En sala → En gabinete → Finalizadas."
        actions={
          <Group>
            <Badge variant="light">{demoMode ? "Demo" : "Servidor"}</Badge>
            <Button
              leftSection={<IconCalendarPlus size={16} />}
              onClick={() => setOpened(true)}
            >
              Nueva cita
            </Button>
          </Group>
        }
      />

      {hasBackendError ? (
        <Alert color="red" title="No se pudo cargar la agenda real">
          Revisa la conexión con Denty. No se han sustituido los datos por demo.
        </Alert>
      ) : null}

      <SegmentedControl
        value={view}
        onChange={setView}
        data={[
          { label: "Pipeline", value: "pipeline" },
          { label: "Doctores", value: "doctors" },
          { label: "Día", value: "day" },
          { label: "Lista", value: "list" },
        ]}
      />

      {view === "pipeline" ? (
        <SimpleGrid cols={{ base: 1, xl: 4 }}>
          {PIPELINE.map((stage) => {
            const statuses = stage.statuses as readonly string[];
            const items = appointments.filter((appointment) =>
              statuses.includes(appointment.status),
            );
            return (
              <section className={styles.section} key={stage.key}>
                <div className={styles.sectionHeader}>
                  <div>
                    <h2 className={styles.sectionTitle}>{stage.title}</h2>
                    <p className={styles.sectionDescription}>
                      {items.length} pacientes
                    </p>
                  </div>
                  <Badge>{items.length}</Badge>
                </div>
                <div className={styles.rowList}>
                  {items.map((appointment) => (
                    <div className={styles.row} key={appointment.id}>
                      <div className={styles.rowMain}>
                        <Link
                          className={styles.rowTitle}
                          href={`/app/patients/${appointment.patientId}`}
                        >
                          {hhmm(appointment.startsAt)} · {appointment.patientName}
                        </Link>
                        <span className={styles.rowMeta}>{appointment.reason}</span>
                      </div>
                      {nextStatus(appointment.status) ? (
                        <Button
                          size="xs"
                          variant="light"
                          loading={transitionPending && !demoMode}
                          onClick={() => void advance(appointment)}
                        >
                          {nextLabel(appointment.status)}
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </SimpleGrid>
      ) : null}

      {view === "doctors" ? (
        <SimpleGrid cols={{ base: 1, lg: 3 }}>
          {byStaff.map(({ staff: member, appointments: memberAppointments }) => (
            <section className={styles.section} key={member.id}>
              <Title order={3}>{member.displayName}</Title>
              <div className={styles.rowList}>
                {memberAppointments.map((appointment) => (
                  <div className={styles.row} key={appointment.id}>
                    <div className={styles.rowMain}>
                      <span className={styles.rowTitle}>
                        {hhmm(appointment.startsAt)} · {appointment.patientName}
                      </span>
                      <span className={styles.rowMeta}>
                        {appointment.siteId
                          ? siteNames.get(appointment.siteId) ?? appointment.reason
                          : appointment.reason}
                      </span>
                    </div>
                    <Badge color={statusColor(appointment.status)}>
                      {appointment.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </SimpleGrid>
      ) : null}

      {view === "day" || view === "list" ? (
        <section className={styles.section}>
          <div className={styles.rowList}>
            {[...appointments]
              .sort((left, right) => left.startsAt.localeCompare(right.startsAt))
              .map((appointment) => (
                <div className={styles.row} key={appointment.id}>
                  <div className={styles.rowMain}>
                    <span className={styles.rowTitle}>
                      {hhmm(appointment.startsAt)}–{hhmm(appointment.endsAt)} ·{" "}
                      {appointment.patientName}
                    </span>
                    <span className={styles.rowMeta}>{appointment.reason}</span>
                  </div>
                  <Badge color={statusColor(appointment.status)}>
                    {appointment.status}
                  </Badge>
                </div>
              ))}
          </div>
        </section>
      ) : null}

      <Modal opened={opened} onClose={() => setOpened(false)} title="Nueva cita">
        <Select
          label="Paciente"
          value={effectivePatientId || null}
          onChange={(value) => setPatientId(value ?? "")}
          data={patientOptions.map((patient) => ({
            value: patient.id,
            label: patient.label,
          }))}
        />
        <Select
          mt="md"
          label="Profesional"
          value={effectiveStaffId || null}
          onChange={(value) => setStaffId(value ?? "")}
          data={staff.map((member) => ({
            value: member.id,
            label: member.displayName,
          }))}
        />
        {!demoMode ? (
          <Select
            mt="md"
            label="Sede"
            value={effectiveSiteId || null}
            onChange={(value) => setSiteId(value ?? "")}
            data={sites.map((site) => ({ value: site.id, label: site.name }))}
          />
        ) : null}
        <TextInput
          mt="md"
          label="Hora"
          type="time"
          value={appointmentTime}
          onChange={(event) => setAppointmentTime(event.currentTarget.value)}
        />
        <TextInput
          mt="md"
          label="Motivo"
          value={reason}
          onChange={(event) => setReason(event.currentTarget.value)}
        />
        <Group justify="flex-end" mt="lg">
          <Button variant="default" onClick={() => setOpened(false)}>
            Cancelar
          </Button>
          <Button
            loading={createMutation.isPending && !demoMode}
            onClick={() => void create()}
          >
            Guardar cita
          </Button>
        </Group>
      </Modal>
    </div>
  );
}
