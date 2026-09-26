"use client";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Group,
  Menu,
  Modal,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import {
  IconCalendarPlus,
  IconChevronDown,
  IconClipboard,
  IconCopy,
  IconDotsVertical,
  IconGripVertical,
  IconMinus,
  IconPlus,
} from "@tabler/icons-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  addMinutes,
  epochMillis,
  hhmm,
  madridLocalDateTime,
  todayMadrid,
  toMadridISO,
} from "@/domain/dates";
import {
  DEFAULT_PLAN_VISIT_GAP_DAYS,
  DEMO_SCHEDULING_STORAGE_KEY,
  normalizePlanVisitGapDays,
  planVisitDates,
  implantSurgeryReminderForAppointment,
} from "@/domain";
import {
  useAgendaContextQuery,
  useAppointmentsQuery,
  useAppointmentTransitionMutation,
  useCreateAppointmentMutation,
  useUpdateAppointmentForDayMutation,
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
import { slotMinuteFromOffset } from "@/domain/agenda/slot-selection";
const PIPELINE = [
  { key: "planned", title: "Llegarán", statuses: ["PLANNED", "CONFIRMED"] },
  { key: "waiting", title: "En sala", statuses: ["ARRIVED"] },
  { key: "chair", title: "En gabinete", statuses: ["IN_CHAIR"] },
  { key: "done", title: "Finalizadas", statuses: ["COMPLETED"] },
] as const;
const START_HOUR = 8;
const END_HOUR = 21;
const SLOT_MINUTES = 15;
const PX_PER_MINUTE = 1.55;
const DAY_MINUTES = (END_HOUR - START_HOUR) * 60;
const DAY_HEIGHT = DAY_MINUTES * PX_PER_MINUTE;
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
function durationMinutes(appointment: AgendaAppointmentView): number {
  return Math.max(
    15,
    Math.round((epochMillis(appointment.endsAt) - epochMillis(appointment.startsAt)) / 60000),
  );
}
function minutesFromStart(iso: string): number {
  const [hour = START_HOUR, minute = 0] = hhmm(iso).split(":").map(Number);
  return Math.max(0, (hour - START_HOUR) * 60 + minute);
}
function snapMinutes(value: number): number {
  return Math.max(
    0,
    Math.min(DAY_MINUTES - SLOT_MINUTES, Math.round(value / SLOT_MINUTES) * SLOT_MINUTES),
  );
}
function timeForMinute(minute: number): string {
  const total = START_HOUR * 60 + minute;
  const hour = Math.floor(total / 60);
  const min = total % 60;
  return `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}
function dayHours() {
  return Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, index) => START_HOUR + index);
}
function agendaGridStyle(staffCount: number, height?: number): CSSProperties {
  return {
    gridTemplateColumns: `74px repeat(${Math.max(1, staffCount)}, minmax(210px, 1fr))`,
    ...(height === undefined ? {} : { height }),
  };
}
const DAY_HEIGHT_STYLE: CSSProperties = { height: DAY_HEIGHT };
function topStyle(top: number): CSSProperties {
  return { top };
}
function appointmentStyle(top: number, height: number): CSSProperties {
  return { top, height };
}
interface DragPayload {
  id: string;
}
export function AgendaPage() {
  const searchParams = useSearchParams();
  const requestedPatientId = searchParams.get("patientId") ?? "";
  const demoMode = publicEnv.NEXT_PUBLIC_DEMO_MODE === "true";
  const demoDate = DEMO_APPOINTMENTS[0]?.startsAt.slice(0, 10) ?? todayMadrid();
  const [date] = useState(demoMode ? demoDate : todayMadrid());
  const [demoAppointments, setDemoAppointments] =
    useState<readonly DemoAppointment[]>(DEMO_APPOINTMENTS);
  const [view, setView] = useState("day");
  const [opened, setOpened] = useState(false);
  const [patientId, setPatientId] = useState(requestedPatientId);
  const [staffId, setStaffId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("15:00");
  const [appointmentDuration, setAppointmentDuration] = useState(30);
  const [selectedSlot, setSelectedSlot] = useState<{ staffId: string; minute: number } | null>(null);
  const [reason, setReason] = useState("Revisión");
  const [visitCount, setVisitCount] = useState(1);
  const [planVisitGapDays, setPlanVisitGapDays] = useState(DEFAULT_PLAN_VISIT_GAP_DAYS);
  const [copied, setCopied] = useState<AgendaAppointmentView | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [agendaNotice, setAgendaNotice] = useState<string | null>(null);
  const resizingRef = useRef<{
    id: string;
    startY: number;
    initialDuration: number;
  } | null>(null);
  const appointmentsQuery = useAppointmentsQuery(date, !demoMode);
  const patientsQuery = usePatientsQuery(!demoMode);
  const contextQuery = useAgendaContextQuery(!demoMode);
  const createMutation = useCreateAppointmentMutation(date);
  const updateMutation = useUpdateAppointmentForDayMutation(date);
  const transitions = useAppointmentTransitionMutation(date);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DEMO_SCHEDULING_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { defaultPlanVisitGapDays?: unknown };
      setPlanVisitGapDays(normalizePlanVisitGapDays(parsed.defaultPlanVisitGapDays));
    } catch {
      setPlanVisitGapDays(DEFAULT_PLAN_VISIT_GAP_DAYS);
    }
  }, []);
  const appointments = useMemo(() => {
    if (demoMode) return projectDemoAppointments(demoAppointments);
    return projectApiAppointments(appointmentsQuery.data ?? [], patientsQuery.data?.items ?? []);
  }, [appointmentsQuery.data, demoAppointments, demoMode, patientsQuery.data]);
  const implantSurgeryReminders = useMemo(
    () =>
      appointments.flatMap((appointment) => {
        const reminder = implantSurgeryReminderForAppointment(appointment, date);
        return reminder
          ? [{ ...reminder, appointmentId: appointment.id, patientName: appointment.patientName }]
          : [];
      }),
    [appointments, date],
  );
  const staff = useMemo(
    () => (demoMode ? projectDemoStaff(DEMO_STAFF) : projectApiStaff(contextQuery.data)),
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
        appointments: appointments.filter((appointment) => appointment.staffId === member.id),
      })),
    [appointments, staff],
  );
  const siteNames = useMemo(() => new Map(sites.map((site) => [site.id, site.name])), [sites]);
  const transitionPending =
    transitions.arrive.isPending ||
    transitions.chair.isPending ||
    transitions.noShow.isPending ||
    transitions.complete.isPending;
  const updateAppointment = useCallback(
    async (
      appointment: AgendaAppointmentView,
      patch: Partial<
        Pick<AgendaAppointmentView, "staffId" | "startsAt" | "endsAt" | "reason" | "status">
      >,
    ) => {
      setAgendaNotice(null);
      if (demoMode) {
        setDemoAppointments((current) =>
          current.map((candidate) =>
            candidate.id === appointment.id
              ? {
                  ...candidate,
                  ...(patch.staffId ? { staffId: patch.staffId } : {}),
                  ...(patch.startsAt ? { startsAt: patch.startsAt } : {}),
                  ...(patch.endsAt ? { endsAt: patch.endsAt } : {}),
                  ...(patch.reason ? { reason: patch.reason } : {}),
                  ...(patch.status ? { status: patch.status as DemoAppointment["status"] } : {}),
                }
              : candidate,
          ),
        );
        return;
      }
      await updateMutation.mutateAsync({
        id: appointment.id,
        payload: {
          expectedVersion: appointment.version,
          ...(patch.staffId ? { staffId: patch.staffId } : {}),
          ...(patch.startsAt ? { startsAt: patch.startsAt } : {}),
          ...(patch.endsAt ? { endsAt: patch.endsAt } : {}),
          ...(patch.reason ? { reason: patch.reason, title: patch.reason } : {}),
          ...(patch.status ? { status: patch.status } : {}),
        },
      });
    },
    [demoMode, updateMutation],
  );
  const advance = async (appointment: AgendaAppointmentView) => {
    const status = nextStatus(appointment.status);
    if (!status) return;
    if (demoMode) {
      await updateAppointment(appointment, { status });
      return;
    }
    const input = { id: appointment.id, expectedVersion: appointment.version };
    if (status === "ARRIVED") await transitions.arrive.mutateAsync(input);
    if (status === "IN_CHAIR") await transitions.chair.mutateAsync(input);
    if (status === "COMPLETED") await transitions.complete.mutateAsync(input);
  };
  const create = async () => {
    if (!effectivePatientId || !effectiveStaffId || !appointmentTime) return;
    const dates = planVisitDates(date, Math.max(1, visitCount), planVisitGapDays);
    if (demoMode) {
      const patient = DEMO_PATIENTS.find((candidate) => candidate.id === effectivePatientId);
      if (!patient) return;
      const created: DemoAppointment[] = dates.map((visitDate) => {
        const startsAt = madridLocalDateTime(visitDate, appointmentTime);
        return {
          id: `demo-${crypto.randomUUID().slice(0, 8)}`,
          patientId: patient.id,
          patientName: `${patient.firstName} ${patient.lastName}`,
          staffId: effectiveStaffId,
          startsAt: toMadridISO(startsAt),
          endsAt: toMadridISO(addMinutes(startsAt, appointmentDuration)),
          status: "PLANNED",
          reason: reason.trim() || "Cita",
        };
      });
      setDemoAppointments((current) => [...current, ...created]);
    } else {
      if (!effectiveSiteId) return;
      for (const visitDate of dates) {
        const startsAt = madridLocalDateTime(visitDate, appointmentTime);
        await createMutation.mutateAsync({
          patientId: effectivePatientId,
          staffId: effectiveStaffId,
          siteId: effectiveSiteId,
          startsAt: toMadridISO(startsAt),
          endsAt: toMadridISO(addMinutes(startsAt, appointmentDuration)),
          title: reason.trim() || "Cita",
          ...(reason.trim() ? { reason: reason.trim() } : {}),
        });
      }
    }
    setAgendaNotice(
      dates.length > 1
        ? `${dates.length} citas creadas cada ${planVisitGapDays} días.`
        : "Cita creada.",
    );
    setOpened(false);
    setSelectedSlot(null);
  };
  const duplicate = useCallback(
    async (source: AgendaAppointmentView, offsetMinutes = 30) => {
      const start = addMinutes(source.startsAt, offsetMinutes);
      const end = addMinutes(source.endsAt, offsetMinutes);
      if (demoMode) {
        setDemoAppointments((current) => [
          ...current,
          {
            id: `demo-${crypto.randomUUID().slice(0, 8)}`,
            patientId: source.patientId,
            patientName: source.patientName,
            staffId: source.staffId,
            startsAt: toMadridISO(start),
            endsAt: toMadridISO(end),
            status: "PLANNED",
            reason: source.reason,
          },
        ]);
      } else {
        const resolvedSite = source.siteId ?? effectiveSiteId;
        if (!resolvedSite) {
          setAgendaNotice("Elige una sede antes de pegar.");
          return;
        }
        await createMutation.mutateAsync({
          patientId: source.patientId,
          staffId: source.staffId,
          siteId: resolvedSite,
          startsAt: toMadridISO(start),
          endsAt: toMadridISO(end),
          title: source.reason,
          reason: source.reason,
        });
      }
      setAgendaNotice(`Copia de ${source.patientName} creada ${offsetMinutes} min después.`);
    },
    [createMutation, demoMode, effectiveSiteId],
  );
  const pasteCopied = async () => {
    if (!copied) return;
    await duplicate(copied, 30);
  };
  const moveByDrop = async (appointmentId: string, targetStaffId: string, targetMinute: number) => {
    const appointment = appointments.find((item) => item.id === appointmentId);
    if (!appointment) return;
    const duration = durationMinutes(appointment);
    const startsAt = madridLocalDateTime(date, timeForMinute(snapMinutes(targetMinute)));
    const endsAt = addMinutes(startsAt, duration);
    await updateAppointment(appointment, {
      staffId: targetStaffId,
      startsAt: toMadridISO(startsAt),
      endsAt: toMadridISO(endsAt),
    });
  };

  const openAppointmentAtSlot = (targetStaffId: string, clientY: number, columnTop: number) => {
    const minute = slotMinuteFromOffset(
      clientY - columnTop,
      PX_PER_MINUTE,
      SLOT_MINUTES,
      DAY_MINUTES,
    );
    setStaffId(targetStaffId);
    setAppointmentTime(timeForMinute(minute));
    setAppointmentDuration(30);
    setSelectedId(null);
    setSelectedSlot({ staffId: targetStaffId, minute });
    setOpened(true);
  };

  const resizeBy = async (appointment: AgendaAppointmentView, minutes: number) => {
    const nextDuration = Math.max(15, durationMinutes(appointment) + minutes);
    await updateAppointment(appointment, {
      endsAt: toMadridISO(addMinutes(appointment.startsAt, nextDuration)),
    });
  };
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const selected = appointments.find((item) => item.id === selectedId);
      if (!selected) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c") {
        event.preventDefault();
        setCopied(selected);
        setAgendaNotice(`Cita de ${selected.patientName} copiada.`);
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v" && copied) {
        event.preventDefault();
        void duplicate(copied, 30);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [appointments, copied, duplicate, selectedId]);
  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const resizing = resizingRef.current;
      if (!resizing) return;
      const appointment = appointments.find((item) => item.id === resizing.id);
      if (!appointment) return;
      const deltaMinutes =
        Math.round((event.clientY - resizing.startY) / PX_PER_MINUTE / SLOT_MINUTES) * SLOT_MINUTES;
      const nextDuration = Math.max(15, resizing.initialDuration + deltaMinutes);
      if (demoMode) {
        setDemoAppointments((current) =>
          current.map((candidate) =>
            candidate.id === appointment.id
              ? { ...candidate, endsAt: toMadridISO(addMinutes(candidate.startsAt, nextDuration)) }
              : candidate,
          ),
        );
      }
    };
    const onPointerUp = async (event: PointerEvent) => {
      const resizing = resizingRef.current;
      resizingRef.current = null;
      if (!resizing || demoMode) return;
      const appointment = appointments.find((item) => item.id === resizing.id);
      if (!appointment) return;
      const deltaMinutes =
        Math.round((event.clientY - resizing.startY) / PX_PER_MINUTE / SLOT_MINUTES) * SLOT_MINUTES;
      const nextDuration = Math.max(15, resizing.initialDuration + deltaMinutes);
      await updateAppointment(appointment, {
        endsAt: toMadridISO(addMinutes(appointment.startsAt, nextDuration)),
      });
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [appointments, demoMode, updateAppointment]);
  const hasBackendError =
    !demoMode && (appointmentsQuery.isError || patientsQuery.isError || contextQuery.isError);
  const renderAppointmentMenu = (appointment: AgendaAppointmentView) => (
    <Menu withinPortal position="bottom-end" shadow="md" width={220}>
      <Menu.Target>
        <ActionIcon
          size="sm"
          variant="subtle"
          aria-label={`Acciones de ${appointment.patientName}`}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <IconDotsVertical size={16} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          leftSection={<IconCopy size={15} />}
          onClick={() => {
            setCopied(appointment);
            setSelectedId(appointment.id);
            setAgendaNotice(`Cita de ${appointment.patientName} copiada.`);
          }}
        >
          Copiar cita
        </Menu.Item>
        <Menu.Item
          leftSection={<IconClipboard size={15} />}
          onClick={() => void duplicate(appointment, 30)}
        >
          Duplicar +30 min
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item
          leftSection={<IconPlus size={15} />}
          onClick={() => void resizeBy(appointment, 15)}
        >
          Extender 15 min
        </Menu.Item>
        <Menu.Item
          leftSection={<IconMinus size={15} />}
          onClick={() => void resizeBy(appointment, -15)}
        >
          Acortar 15 min
        </Menu.Item>
        {nextStatus(appointment.status) ? (
          <Menu.Item onClick={() => void advance(appointment)}>
            {nextLabel(appointment.status)}
          </Menu.Item>
        ) : null}
        {!demoMode && appointment.status !== "COMPLETED" ? (
          <Menu.Item
            color="gray"
            onClick={() =>
              void transitions.noShow.mutateAsync({
                id: appointment.id,
                expectedVersion: appointment.version,
              })
            }
          >
            No presentado
          </Menu.Item>
        ) : null}
      </Menu.Dropdown>
    </Menu>
  );
  const renderDayGrid = () => (
    <section className={styles.agendaDayShell}>
      <div className={styles.agendaToolbarHint}>
        <Group justify="space-between" gap="xs">
          <Text size="xs" c="dimmed">
            Arrastra cualquier cita para moverla. Usa el tirador inferior para cambiar duración.
            Ctrl/Cmd+C y Ctrl/Cmd+V también funcionan.
          </Text>
          <Group gap="xs">
            {copied ? <Badge variant="light">Copiada: {copied.patientName}</Badge> : null}
            <Button size="xs" variant="light" disabled={!copied} onClick={() => void pasteCopied()}>
              Pegar copia +30 min
            </Button>
          </Group>
        </Group>
      </div>
      <div className={styles.agendaDayScroller}>
        <div className={styles.agendaDayHeader} style={agendaGridStyle(staff.length)}>
          <div className={styles.agendaCorner}>Hora</div>
          {staff.map((member) => (
            <div key={member.id} className={styles.agendaDoctorHeader}>
              {member.displayName}
            </div>
          ))}
        </div>
        <div className={styles.agendaDayBody} style={agendaGridStyle(staff.length, DAY_HEIGHT)}>
          <div className={styles.agendaTimeRail} style={DAY_HEIGHT_STYLE}>
            {dayHours().map((hour) => (
              <span key={hour} style={topStyle((hour - START_HOUR) * 60 * PX_PER_MINUTE)}>
                {String(hour).padStart(2, "0")}:00
              </span>
            ))}
          </div>
          {staff.map((member) => (
            <div
              key={member.id}
              className={styles.agendaDoctorColumn}
              style={DAY_HEIGHT_STYLE}
              onClick={(event) => {
                if (event.target !== event.currentTarget) return;
                const rect = event.currentTarget.getBoundingClientRect();
                openAppointmentAtSlot(member.id, event.clientY, rect.top);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const payload = JSON.parse(
                  event.dataTransfer.getData("application/json") || "{}",
                ) as DragPayload;
                const rect = event.currentTarget.getBoundingClientRect();
                const minute = (event.clientY - rect.top) / PX_PER_MINUTE;
                if (payload.id) void moveByDrop(payload.id, member.id, minute);
              }}
            >
              {selectedSlot?.staffId === member.id ? (
                <div
                  aria-hidden="true"
                  className={styles.agendaSelectedSlot}
                  style={appointmentStyle(
                    selectedSlot.minute * PX_PER_MINUTE,
                    SLOT_MINUTES * PX_PER_MINUTE,
                  )}
                />
              ) : null}
              {Array.from({ length: DAY_MINUTES / SLOT_MINUTES }, (_, index) => (
                <i
                  aria-hidden="true"
                  key={index}
                  className={styles.agendaSlotLine}
                  data-major={index % 4 === 0}
                  style={topStyle(index * SLOT_MINUTES * PX_PER_MINUTE)}
                />
              ))}
              {appointments
                .filter((appointment) => appointment.staffId === member.id)
                .map((appointment) => {
                  const top = minutesFromStart(appointment.startsAt) * PX_PER_MINUTE;
                  const height = Math.max(34, durationMinutes(appointment) * PX_PER_MINUTE);
                  return (
                    <article
                      key={appointment.id}
                      className={styles.agendaAppointmentCard}
                      data-status={appointment.status}
                      data-selected={selectedId === appointment.id}
                      draggable
                      style={appointmentStyle(top, height)}
                      onClick={() => setSelectedId(appointment.id)}
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData(
                          "application/json",
                          JSON.stringify({ id: appointment.id } satisfies DragPayload),
                        );
                        setSelectedId(appointment.id);
                      }}
                    >
                      <div className={styles.agendaAppointmentTop}>
                        <span className={styles.agendaAppointmentTime}>
                          {hhmm(appointment.startsAt)}–{hhmm(appointment.endsAt)}
                        </span>
                        {renderAppointmentMenu(appointment)}
                      </div>
                      <Link
                        href={`/app/patients/${appointment.patientId}`}
                        className={styles.agendaAppointmentName}
                        onClick={(event) => event.stopPropagation()}
                      >
                        {appointment.patientName}
                      </Link>
                      <span className={styles.agendaAppointmentReason}>{appointment.reason}</span>
                      <div
                        className={styles.agendaResizeHandle}
                        title="Arrastrar para cambiar duración"
                        onPointerDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          resizingRef.current = {
                            id: appointment.id,
                            startY: event.clientY,
                            initialDuration: durationMinutes(appointment),
                          };
                        }}
                      >
                        <IconGripVertical size={14} />
                      </div>
                    </article>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
  return (
    <div className={styles.grid}>
      <PageHeader
        eyebrow="Agenda"
        title="Agenda"
        description="Arrastra para mover. ··· para más."
        actions={
          <Group>
            <Badge variant="light">{demoMode ? "Demo" : "Servidor"}</Badge>
            <Button
              leftSection={<IconCalendarPlus size={16} />}
              onClick={() => {
                setSelectedSlot(null);
                setAppointmentDuration(30);
                setOpened(true);
              }}
            >
              Nueva cita
            </Button>
          </Group>
        }
      />

      {hasBackendError ? (
        <Alert color="red" title="Error al cargar agenda">
          Revisa la conexión con Denty.
        </Alert>
      ) : null}
      {agendaNotice ? (
        <Alert color="blue" withCloseButton onClose={() => setAgendaNotice(null)}>
          {agendaNotice}
        </Alert>
      ) : null}

      {implantSurgeryReminders.map((reminder) => (
        <Alert
          key={reminder.appointmentId}
          color="orange"
          title={reminder.title}
        >
          <Group justify="space-between" align="center">
            <Text size="sm">
              {reminder.patientName} · {reminder.message}
            </Text>
            <Button
              component={Link}
              href={reminder.href}
              size="xs"
              variant="light"
            >
              Rellenar datos del implante
            </Button>
          </Group>
        </Alert>
      ))}

      <div className={styles.agendaViewBar} aria-label="Vistas de agenda">
        <Button
          size="xs"
          variant={view === "day" ? "filled" : "subtle"}
          onClick={() => setView("day")}
        >
          Día
        </Button>
        <Button
          size="xs"
          variant={view === "pipeline" ? "filled" : "subtle"}
          onClick={() => setView("pipeline")}
        >
          Pipeline
        </Button>
        <Menu position="bottom-start" withinPortal>
          <Menu.Target>
            <Button
              size="xs"
              variant={view === "doctors" || view === "list" ? "light" : "subtle"}
              rightSection={<IconChevronDown size={14} />}
            >
              {view === "doctors" ? "Doctores" : view === "list" ? "Lista" : "Más vistas"}
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item onClick={() => setView("doctors")}>Por doctores</Menu.Item>
            <Menu.Item onClick={() => setView("list")}>Lista del día</Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </div>

      {view === "day" ? renderDayGrid() : null}

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
                    <p className={styles.sectionDescription}>{items.length} pacientes</p>
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
                      <div className={styles.rowActions}>
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
                        {renderAppointmentMenu(appointment)}
                      </div>
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
                          ? (siteNames.get(appointment.siteId) ?? appointment.reason)
                          : appointment.reason}
                      </span>
                    </div>
                    <div className={styles.rowActions}>
                      <Badge color={statusColor(appointment.status)}>{appointment.status}</Badge>
                      {renderAppointmentMenu(appointment)}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </SimpleGrid>
      ) : null}

      {view === "list" ? (
        <section className={styles.section}>
          <div className={styles.rowList}>
            {[...appointments]
              .sort((left, right) => left.startsAt.localeCompare(right.startsAt))
              .map((appointment) => (
                <div className={styles.row} key={appointment.id}>
                  <div className={styles.rowMain}>
                    <span className={styles.rowTitle}>
                      {hhmm(appointment.startsAt)}–{hhmm(appointment.endsAt)} ·
                      {appointment.patientName}
                    </span>
                    <span className={styles.rowMeta}>{appointment.reason}</span>
                  </div>
                  <div className={styles.rowActions}>
                    <Badge color={statusColor(appointment.status)}>{appointment.status}</Badge>
                    {renderAppointmentMenu(appointment)}
                  </div>
                </div>
              ))}
          </div>
        </section>
      ) : null}

      <Modal
        opened={opened}
        onClose={() => {
          setOpened(false);
          setSelectedSlot(null);
        }}
        title={selectedSlot ? `Nueva cita · ${appointmentTime}` : "Nueva cita"}
      >
        <Stack>
          <Select
            searchable
            label="Paciente"
            value={effectivePatientId || null}
            onChange={(value) => setPatientId(value ?? "")}
            data={patientOptions.map((patient) => ({ value: patient.id, label: patient.label }))}
          />
          <Select
            label="Profesional"
            value={effectiveStaffId || null}
            onChange={(value) => setStaffId(value ?? "")}
            data={staff.map((member) => ({ value: member.id, label: member.displayName }))}
          />
          {!demoMode ? (
            <Select
              label="Sede"
              value={effectiveSiteId || null}
              onChange={(value) => setSiteId(value ?? "")}
              data={sites.map((site) => ({ value: site.id, label: site.name }))}
            />
          ) : null}
          <TextInput label="Fecha" type="date" value={date} readOnly />
          <TextInput
            label="Hora"
            type="time"
            value={appointmentTime}
            onChange={(event) => setAppointmentTime(event.currentTarget.value)}
          />
          <Select
            label="Duración"
            value={String(appointmentDuration)}
            onChange={(value) => setAppointmentDuration(Number(value) || 30)}
            data={[15, 30, 45, 60, 90, 120].map((minutes) => ({
              value: String(minutes),
              label: `${minutes} min`,
            }))}
          />
          <TextInput
            label="Motivo"
            value={reason}
            onChange={(event) => setReason(event.currentTarget.value)}
          />
          <Group grow align="flex-start">
            <NumberInput
              label="Visitas"
                min={1}
                max={12}
                value={visitCount}
                onChange={(value: string | number) =>
                  setVisitCount(Math.max(1, Number(value) || 1))
                }
              />
            <div>
              <Text size="sm" fw={600}>
                Intervalo
              </Text>
              <Text size="sm">{planVisitGapDays} días</Text>
              <Text size="xs" c="dimmed">
                Lo establece el administrador en Ajustes → Agenda.
              </Text>
            </div>
          </Group>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setOpened(false)}>
              Cancelar
            </Button>
            <Button loading={createMutation.isPending && !demoMode} onClick={() => void create()}>
              Guardar cita
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}
