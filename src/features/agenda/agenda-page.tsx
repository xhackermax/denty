"use client";
import { ClinicalDragContext } from "@/shared/drag/clinical-drag-context";
import { dropMinute } from "@/shared/drag/drop-minute";
import { AgendaDropColumn } from "./agenda-drop-column";

import { agendaTreatmentOptions, shortPatientName } from "@/domain";
import {
  ActionIcon,
  Alert,
  Autocomplete,
  Badge,
  Button,
  Checkbox,
  Collapse,
  Group,
  Menu,
  Modal,
  NumberInput,
  Popover,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  UnstyledButton,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  IconAdjustmentsHorizontal,
  IconCalendarEvent,
  IconCalendarPlus,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconClipboard,
  IconClockSearch,
  IconCopy,
  IconDotsVertical,
  IconFirstAidKit,
  IconLayoutColumns,
  IconLock,
  IconMapPin,
  IconMinus,
  IconPlus,
  IconSearch,
  IconUserPlus,
} from "@tabler/icons-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
} from "react";
import {
  addMinutes,
  dateYMDMadrid,
  epochMillis,
  hhmm,
  madridLocalDateTime,
  todayMadrid,
  resolveMadridDateQuery,
  toMadridISO,
} from "@/domain/dates";
import {
  AGENDA_ZOOM,
  DEFAULT_PLAN_VISIT_GAP_DAYS,
  OCCUPYING_STATUSES,
  clinicalGlyphFor,
  currentTimeOffset,
  findConflicts,
  implantSurgeryReminderForAppointment,
  layoutDay,
  normalizePlanVisitGapDays,
  planVisitDates,
  rangeStartFor,
  shiftRange,
  staffForSiteDay,
  visibleDates,
  weekdayOfDate,
  type AgendaBlock,
  type AgendaDayCount,
  type AgendaZoom,
} from "@/domain";
import {
  useAgendaBlocksRangeQuery,
  useAgendaContextQuery,
  useAppointmentsRangeQuery,
  useAppointmentTransitionMutation,
  useCreateAgendaBlockMutation,
  useCreateAppointmentMutation,
  useMoveAppointmentMutation,
  usePrefetchAppointmentDays,
} from "./agenda-data";
import {
  projectApiAppointments,
  projectApiCabinets,
  projectApiPatients,
  projectApiSites,
  projectApiStaff,
  type AgendaAppointmentView,
  type AgendaStatus,
} from "./agenda-projection";
import { AgendaAppointmentCard } from "./agenda-appointment-card";
import { AgendaMiniCalendar } from "./agenda-mini-calendar";
import { AgendaQuickView, type QuickViewEdit } from "./agenda-quick-view";
import { NextSlotFinder } from "./next-slot-finder";
import { AGENDA_STATUS_META } from "./agenda-status";
import styles from "./agenda.module.css";
import parityStyles from "@/shared/ui/parity.module.css";
import { DentyApiError, type CreateAppointment, type UpdateAppointment } from "@/shared/api";
import { useClinicalPlanQuery, useTreatmentCatalogQuery } from "@/shared/clinical/clinical-data";
import { ClinicalGlyph, ClinicalGlyphs } from "@/shared/odontogram/clinical-glyph";
import { usePatientsQuery } from "@/shared/patients/patient-data";
import { PageHeader } from "@/shared/ui";
import { useActiveTenant } from "@/shared/tenancy/active-context";
import { slotMinuteFromOffset } from "@/domain/agenda/slot-selection";

const PIPELINE = [
  { key: "planned", title: "Llegarán", statuses: ["PLANNED", "CONFIRMED"] },
  { key: "waiting", title: "Llegados", statuses: ["ARRIVED", "WAITING"] },
  { key: "chair", title: "En gabinete", statuses: ["IN_CHAIR"] },
  { key: "done", title: "Finalizadas", statuses: ["COMPLETED"] },
] as const;
const START_HOUR = 8;
const END_HOUR = 21;
const SLOT_MINUTES = 15;
const DAY_MINUTES = (END_HOUR - START_HOUR) * 60;
const DURATION_STEPS = [5, 10, 15, 20, 30, 45, 60, 75, 90, 120];
const BLOCK_KINDS = [
  { value: "MEETING", label: "Reunión" },
  { value: "BREAK", label: "Descanso" },
  { value: "SURGERY", label: "Cirugía" },
  { value: "MAINTENANCE", label: "Mantenimiento" },
  { value: "TRAINING", label: "Formación" },
  { value: "UNAVAILABLE", label: "No disponible" },
];
const BLOCK_LABELS = new Map(BLOCK_KINDS.map((kind) => [kind.value, kind.label]));
const VIEW_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "1", label: "Día" },
  { value: "2", label: "2 días" },
  { value: "3", label: "3 días" },
  { value: "5", label: "5 días" },
  { value: "7", label: "Semana" },
  { value: "pipeline", label: "Recepción" },
  { value: "list", label: "Lista" },
];

type ResourceMode = "staff" | "cabinet";

interface AgendaColumn {
  id: string;
  date: string;
  staffId: string | null;
  cabinetId: string | null;
  label: string;
  sublabel?: string | undefined;
}

interface PendingChange {
  kind: "move" | "create" | "paste";
  appointment?: AgendaAppointmentView;
  patch?: UpdateAppointment;
  createPayload?: CreateAppointment;
  date: string;
  staffId: string;
  durationMinutes: number;
  conflicts: string[];
}

function nextStatus(status: AgendaStatus): AgendaStatus | null {
  if (status === "PLANNED" || status === "CONFIRMED" || status === "RUNNING_LATE") return "ARRIVED";
  if (status === "ARRIVED" || status === "WAITING") return "IN_CHAIR";
  if (status === "IN_CHAIR") return "COMPLETED";
  return null;
}
function durationMinutes(appointment: AgendaAppointmentView): number {
  return Math.max(
    SLOT_MINUTES,
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
const DAY_FORMAT = new Intl.DateTimeFormat("es-ES", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "Europe/Madrid",
});
function dayLabel(date: string): string {
  return DAY_FORMAT.format(madridLocalDateTime(date, "12:00"));
}
function gridStyle(columnCount: number, minColumn: number, height?: number): CSSProperties {
  return {
    gridTemplateColumns: `56px repeat(${Math.max(1, columnCount)}, minmax(${minColumn}px, 1fr))`,
    ...(height === undefined ? {} : { height }),
  };
}
function positionStyle(top: number, height: number, column = 0, columnCount = 1): CSSProperties {
  const width = 100 / columnCount;
  return {
    top,
    height,
    left: `calc(${column * width}% + 3px)`,
    width: `calc(${width}% - 6px)`,
  };
}
function heightStyle(height: number): CSSProperties {
  return { height };
}
function topStyle(top: number): CSSProperties {
  return { top };
}
function errorMessage(error: unknown): string {
  if (error instanceof DentyApiError) {
    if (error.code === "APPOINTMENT_CONFLICT" || error.status === 409)
      return "Ese hueco ya está ocupado o la cita cambió. Vuelve a intentarlo.";
    return error.message;
  }
  return "No se pudo guardar el cambio.";
}
function nextQuarterMinute(): number {
  const offset = currentTimeOffset(Date.now(), START_HOUR, END_HOUR);
  return offset === null ? 60 : snapMinutes(offset + SLOT_MINUTES);
}

interface DragPayload {
  id: string;
}

export function AgendaPage() {
  const searchParams = useSearchParams();
  const requestedPatientId = searchParams.get("patientId") ?? "";
  const requestedDate = searchParams.get("date");
  // Arriving from the treatment flow ("Dar cita"): open the form with the plan item chosen.
  const requestedPlanItemId = searchParams.get("planItemId") ?? "";
  const requestedPlanItemHandled = useRef(false);
  const isMobile = useMediaQuery("(max-width: 48em)") ?? false;
  const { activeSiteId, setActiveSiteId } = useActiveTenant();

  // Navigation & presentation.
  const [anchor, setAnchor] = useState(
    () => (requestedDate ? resolveMadridDateQuery(requestedDate) : null) ?? todayMadrid(),
  );
  const [dayCount, setDayCount] = useState<AgendaDayCount>(1);
  const [view, setView] = useState<"grid" | "pipeline" | "list">("grid");
  const [resourceMode, setResourceMode] = useState<ResourceMode>("staff");
  const [resourceFilter, setResourceFilter] = useState<string | null>(null);
  const [zoom, setZoom] = useState<AgendaZoom>("normal");
  const [showCompleted, setShowCompleted] = useState(true);
  const [showCancelled, setShowCancelled] = useState(false);
  const [showNoShows, setShowNoShows] = useState(true);
  const [showBlocks, setShowBlocks] = useState(true);
  const [search, setSearch] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!requestedDate) return;
    const date = resolveMadridDateQuery(requestedDate);
    if (date) setAnchor(date);
  }, [requestedDate]);

  // Creation form. `date` is the day of the appointment being created.
  const [opened, setOpened] = useState(false);
  const [date, setDate] = useState(todayMadrid());
  const [patientId, setPatientId] = useState(requestedPatientId);
  const [staffId, setStaffId] = useState("");
  const [cabinetId, setCabinetId] = useState<string | null>(null);
  const [appointmentSiteId, setAppointmentSiteId] = useState<string | null>(null);
  const [appointmentTime, setAppointmentTime] = useState("15:00");
  const [appointmentDuration, setAppointmentDuration] = useState(30);
  const [reason, setReason] = useState("Revisión");
  const [planItemId, setPlanItemId] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [visitCount, setVisitCount] = useState(1);
  const [planVisitGapDays, setPlanVisitGapDays] = useState(DEFAULT_PLAN_VISIT_GAP_DAYS);
  const [selectedSlot, setSelectedSlot] = useState<{ columnId: string; minute: number } | null>(
    null,
  );

  // Blocks.
  const [blockOpened, setBlockOpened] = useState(false);
  const [slotFinderOpened, setSlotFinderOpened] = useState(false);
  const [blockKind, setBlockKind] = useState("MEETING");
  const [blockReason, setBlockReason] = useState("");
  const [blockFrom, setBlockFrom] = useState("14:00");
  const [blockTo, setBlockTo] = useState("15:00");

  // Interaction.
  const [copied, setCopied] = useState<AgendaAppointmentView | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [quickViewId, setQuickViewId] = useState<string | null>(null);
  const [agendaNotice, setAgendaNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingChange | null>(null);
  const [slotSearchOpened, setSlotSearchOpened] = useState(false);
  const [resizePreview, setResizePreview] = useState<{ id: string; duration: number } | null>(null);
  const resizingRef = useRef<{ id: string; startY: number; initialDuration: number } | null>(null);
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  const longPressRef = useRef<{ timer: number; x: number; y: number } | null>(null);
  const suppressSlotClickRef = useRef(false);

  const effectiveDayCount: AgendaDayCount = isMobile ? 1 : dayCount;
  const rangeStart = rangeStartFor(anchor, effectiveDayCount);
  const dates = useMemo(
    () => visibleDates(rangeStart, effectiveDayCount),
    [rangeStart, effectiveDayCount],
  );
  const pxPerMinute = AGENDA_ZOOM[zoom];
  const dayHeight = DAY_MINUTES * pxPerMinute;
  const today = todayMadrid(nowTick);

  const appointmentsQuery = useAppointmentsRangeQuery(dates, activeSiteId);
  const blocks = useAgendaBlocksRangeQuery(dates, activeSiteId);
  const patientsQuery = usePatientsQuery();
  const contextQuery = useAgendaContextQuery();
  const catalogQuery = useTreatmentCatalogQuery();
  const planQuery = useClinicalPlanQuery(patientId || requestedPatientId, opened);
  const createMutation = useCreateAppointmentMutation(date);
  const moveMutation = useMoveAppointmentMutation();
  const blockMutation = useCreateAgendaBlockMutation();
  const transitions = useAppointmentTransitionMutation(date);
  const prefetchDays = usePrefetchAppointmentDays();

  useEffect(() => {
    const persistedGap = contextQuery.data?.settings?.defaultPlanVisitGapDays;
    if (persistedGap !== undefined) setPlanVisitGapDays(normalizePlanVisitGapDays(persistedGap));
  }, [contextQuery.data?.settings?.defaultPlanVisitGapDays]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowTick(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    prefetchDays(
      visibleDates(shiftRange(rangeStart, effectiveDayCount, 1), effectiveDayCount),
      activeSiteId,
    );
    prefetchDays(
      visibleDates(shiftRange(rangeStart, effectiveDayCount, -1), effectiveDayCount),
      activeSiteId,
    );
  }, [rangeStart, effectiveDayCount, activeSiteId]);

  const patients = useMemo(() => patientsQuery.data?.items ?? [], [patientsQuery.data]);
  const patientsById = useMemo(
    () => new Map(patients.map((patient) => [patient.id, patient])),
    [patients],
  );
  const appointments = useMemo(
    () => projectApiAppointments(appointmentsQuery.data, patients),
    [appointmentsQuery.data, patients],
  );
  const staff = useMemo(() => projectApiStaff(contextQuery.data), [contextQuery.data]);
  const doctorOptions = useMemo(
    () =>
      (contextQuery.data?.staff ?? [])
        .filter((member) => !member.role || member.role === "DENTIST")
        .map((member) => ({
          id: member.id,
          name: member.displayName,
          hasRota: (member.schedules ?? []).length > 0,
        })),
    [contextQuery.data],
  );
  const sites = useMemo(() => projectApiSites(contextQuery.data), [contextQuery.data]);
  const cabinets = useMemo(
    () =>
      projectApiCabinets(contextQuery.data).filter(
        (cabinet) => !activeSiteId || cabinet.siteId === activeSiteId,
      ),
    [contextQuery.data, activeSiteId],
  );
  const patientOptions = useMemo(() => projectApiPatients(patients), [patients]);
  const staffNames = useMemo(() => new Map(staff.map((m) => [m.id, m.displayName])), [staff]);
  const siteNames = useMemo(() => new Map(sites.map((site) => [site.id, site.name])), [sites]);
  // Doctors of the selected site: those whose rota puts them there on the visible
  // days (a doctor can rotate between sites), plus anyone already booked there.
  const siteStaff = useMemo(() => {
    if (!activeSiteId) return staff;
    const booked = new Set(appointments.map((appointment) => appointment.staffId));
    const working = staff.filter((member) =>
      dates.some((date) => staffForSiteDay([member], activeSiteId, date, booked).length > 0),
    );
    return working.length ? working : staff;
  }, [activeSiteId, appointments, dates, staff]);
  const cabinetNames = useMemo(() => new Map(cabinets.map((c) => [c.id, c.name])), [cabinets]);
  const actorStaffId = contextQuery.data?.actor.staffId ?? null;
  const effectivePatientId = patientId || patientOptions[0]?.id || "";
  const effectiveStaffId = staffId || actorStaffId || staff[0]?.id || "";
  const effectiveSiteId = appointmentSiteId || activeSiteId || sites[0]?.id || "";
  const formCabinets = useMemo(
    () => cabinets.filter((cabinet) => !effectiveSiteId || cabinet.siteId === effectiveSiteId),
    [cabinets, effectiveSiteId],
  );
  const siteForStaffSlot = useCallback(
    (targetStaffId: string, targetDate: string, targetTime: string): string | null => {
      const member = staff.find((candidate) => candidate.id === targetStaffId);
      if (!member) return null;
      const weekday = weekdayOfDate(targetDate);
      const shifts = member.schedules.filter((shift) => shift.weekday === weekday);
      const exact = shifts.find((shift) => {
        const startsAt = shift.startsAt.slice(0, 5);
        const endsAt = shift.endsAt.slice(0, 5);
        return startsAt <= targetTime && targetTime < endsAt;
      });
      return exact?.siteId ?? shifts[0]?.siteId ?? null;
    },
    [staff],
  );

  const implantSurgeryReminders = useMemo(
    () =>
      appointments.flatMap((appointment) => {
        const reminder = implantSurgeryReminderForAppointment(appointment, today);
        return reminder
          ? [{ ...reminder, appointmentId: appointment.id, patientName: appointment.patientName }]
          : [];
      }),
    [appointments, today],
  );

  // Visibility filters and search (search dims instead of hiding, to keep context).
  const visibleAppointments = useMemo(
    () =>
      appointments.filter((appointment) => {
        if (!showCompleted && appointment.status === "COMPLETED") return false;
        if (!showCancelled && appointment.status === "CANCELLED") return false;
        if (!showNoShows && appointment.status === "NO_SHOW") return false;
        return true;
      }),
    [appointments, showCancelled, showCompleted, showNoShows],
  );
  const searchTerm = search.trim().toLowerCase();
  const matchesSearch = (appointment: AgendaAppointmentView) =>
    !searchTerm ||
    appointment.patientName.toLowerCase().includes(searchTerm) ||
    appointment.reason.toLowerCase().includes(searchTerm);

  // Resources → columns.
  const resources = useMemo(() => {
    const all =
      resourceMode === "staff"
        ? siteStaff.map((member) => ({
            id: `staff:${member.id}`,
            staffId: member.id,
            cabinetId: null as string | null,
            label: member.displayName,
            sublabel: undefined as string | undefined,
          }))
        : [
            ...cabinets.map((cabinet) => ({
              id: `cabinet:${cabinet.id}`,
              staffId: null as string | null,
              cabinetId: cabinet.id as string | null,
              label: cabinet.name,
              sublabel: sites.length > 1 && !activeSiteId ? cabinet.siteName : undefined,
            })),
            ...(appointments.some((appointment) => !appointment.cabinetId)
              ? [
                  {
                    id: "cabinet:none",
                    staffId: null as string | null,
                    cabinetId: null as string | null,
                    label: "Sin gabinete",
                    sublabel: undefined as string | undefined,
                  },
                ]
              : []),
          ];
    if (resourceFilter) return all.filter((resource) => resource.id === resourceFilter);
    // Mobile and multi-day views show one resource at a time: the actor's own column
    // when available, otherwise the first one. The resource selector switches it.
    if (isMobile || effectiveDayCount > 1) {
      const own = all.find((resource) => resource.staffId && resource.staffId === actorStaffId);
      return own ? [own] : all.slice(0, 1);
    }
    return all;
  }, [
    activeSiteId,
    appointments,
    cabinets,
    isMobile,
    resourceFilter,
    resourceMode,
    sites.length,
    siteStaff,
    effectiveDayCount,
    actorStaffId,
  ]);

  const columns = useMemo<AgendaColumn[]>(
    () =>
      dates.flatMap((columnDate) =>
        resources.map((resource) => ({
          id: `${columnDate}|${resource.id}`,
          date: columnDate,
          staffId: resource.staffId,
          cabinetId: resource.cabinetId,
          label: dates.length > 1 ? dayLabel(columnDate) : resource.label,
          sublabel:
            dates.length > 1
              ? resources.length > 1
                ? resource.label
                : undefined
              : resource.sublabel,
        })),
      ),
    [dates, resources],
  );
  const columnById = useMemo(
    () => new Map(columns.map((column) => [column.id, column])),
    [columns],
  );

  const appointmentsForColumn = useCallback(
    (column: AgendaColumn) =>
      visibleAppointments.filter((appointment) => {
        if (dateYMDMadrid(appointment.startsAt) !== column.date) return false;
        if (resourceMode === "staff") return appointment.staffId === column.staffId;
        return (appointment.cabinetId ?? null) === column.cabinetId;
      }),
    [resourceMode, visibleAppointments],
  );
  const blocksForColumn = (column: AgendaColumn) =>
    blocks.filter((block) => {
      if (dateYMDMadrid(block.startsAt) !== column.date) return false;
      if (resourceMode === "staff") return !block.staffId || block.staffId === column.staffId;
      return !block.cabinetId || block.cabinetId === column.cabinetId;
    });

  // Conflict engine: occupied professional/cabinet, blocks. Never a silent double booking.
  const occupying = useMemo(
    () =>
      appointments
        .filter((appointment) => OCCUPYING_STATUSES.has(appointment.status))
        .map((appointment) => ({
          id: appointment.id,
          staffId: appointment.staffId,
          ...(appointment.cabinetId ? { cabinetId: appointment.cabinetId } : {}),
          startsAt: appointment.startsAt,
          endsAt: appointment.endsAt,
        })),
    [appointments],
  );
  const blockRanges = useMemo<AgendaBlock[]>(
    () =>
      blocks.map((block) => ({
        id: block.id,
        startsAt: block.startsAt,
        endsAt: block.endsAt,
        ...(block.staffId ? { staffId: block.staffId } : {}),
        ...(block.cabinetId ? { cabinetId: block.cabinetId } : {}),
      })),
    [blocks],
  );
  const conflictsFor = (candidate: {
    id: string;
    staffId: string;
    cabinetId?: string | null | undefined;
    startsAt: string;
    endsAt: string;
  }) =>
    findConflicts(
      {
        id: candidate.id,
        staffId: candidate.staffId,
        ...(candidate.cabinetId ? { cabinetId: candidate.cabinetId } : {}),
        startsAt: candidate.startsAt,
        endsAt: candidate.endsAt,
      },
      { startsAt: candidate.startsAt, endsAt: candidate.endsAt },
      occupying,
      blockRanges,
    );
  const describeConflict = (conflict: string) => {
    const [kind, id] = conflict.split(":");
    if (kind === "appointment") {
      const other = appointments.find((appointment) => appointment.id === id);
      return other
        ? `${hhmm(other.startsAt)}–${hhmm(other.endsAt)} · ${other.patientName}`
        : "Otra cita";
    }
    const block = blocks.find((item) => item.id === id);
    return block
      ? `Bloqueo ${BLOCK_LABELS.get(block.kind) ?? ""} ${hhmm(block.startsAt)}–${hhmm(block.endsAt)}`
      : "Bloqueo";
  };

  const transitionPending =
    transitions.arrive.isPending ||
    transitions.waiting.isPending ||
    transitions.chair.isPending ||
    transitions.noShow.isPending ||
    transitions.complete.isPending ||
    transitions.cancel.isPending;

  const commitMove = async (
    appointment: AgendaAppointmentView,
    patch: UpdateAppointment,
    targetDate: string,
    options: { skipConflictCheck?: boolean; allowOverlap?: boolean } = {},
  ) => {
    setAgendaNotice(null);
    const candidate = {
      id: appointment.id,
      staffId: patch.staffId ?? appointment.staffId,
      cabinetId: patch.cabinetId ?? appointment.cabinetId,
      startsAt: patch.startsAt ?? appointment.startsAt,
      endsAt: patch.endsAt ?? appointment.endsAt,
    };
    const conflicts = options.skipConflictCheck ? [] : conflictsFor(candidate);
    if (conflicts.length) {
      setPending({
        kind: "move",
        appointment,
        patch,
        date: targetDate,
        staffId: candidate.staffId,
        durationMinutes: Math.round(
          (epochMillis(candidate.endsAt) - epochMillis(candidate.startsAt)) / 60000,
        ),
        conflicts,
      });
      return;
    }
    try {
      await moveMutation.mutateAsync({
        id: appointment.id,
        payload: options.allowOverlap ? { ...patch, allowOverlap: true } : patch,
        targetDate,
      });
    } catch (error) {
      setAgendaNotice(errorMessage(error));
    }
  };

  const advance = async (appointment: AgendaAppointmentView) => {
    const status = nextStatus(appointment.status);
    if (!status) return;
    const input = { id: appointment.id, expectedVersion: appointment.version };
    try {
      if (status === "ARRIVED") await transitions.arrive.mutateAsync(input);
      if (status === "WAITING") await transitions.waiting.mutateAsync(input);
      if (status === "IN_CHAIR") await transitions.chair.mutateAsync(input);
      if (status === "COMPLETED") await transitions.complete.mutateAsync(input);
    } catch (error) {
      setAgendaNotice(errorMessage(error));
    }
  };

  const markNoShow = async (appointment: AgendaAppointmentView) => {
    try {
      await transitions.noShow.mutateAsync({
        id: appointment.id,
        expectedVersion: appointment.version,
      });
      setQuickViewId(null);
      setAgendaNotice(`${appointment.patientName} registrado como no presentado.`);
    } catch (error) {
      setAgendaNotice(errorMessage(error));
    }
  };

  const copyAppointment = useCallback((appointment: AgendaAppointmentView) => {
    setCopied(appointment);
    setSelectedId(appointment.id);
    setAgendaNotice(`Cita de ${appointment.patientName} copiada. Haz clic derecho en un hueco, o mantenlo pulsado en móvil, para pegarla.`);
  }, []);

  const clearLongPress = () => {
    if (longPressRef.current) window.clearTimeout(longPressRef.current.timer);
    longPressRef.current = null;
  };

  const openCreate = (input: {
    date: string;
    minute: number;
    staffId?: string | null;
    cabinetId?: string | null;
    siteId?: string | null;
    reason?: string;
    columnId?: string;
  }) => {
    const slotTime = timeForMinute(input.minute);
    setDate(input.date);
    if (input.staffId) setStaffId(input.staffId);
    const resolvedSite =
      input.siteId ??
      (input.staffId ? siteForStaffSlot(input.staffId, input.date, slotTime) : null) ??
      activeSiteId ??
      null;
    setAppointmentSiteId(resolvedSite);
    const requestedCabinet = input.cabinetId ?? null;
    const requestedCabinetSite = requestedCabinet
      ? cabinets.find((candidate) => candidate.id === requestedCabinet)?.siteId
      : null;
    setCabinetId(requestedCabinet && (!resolvedSite || requestedCabinetSite === resolvedSite) ? requestedCabinet : null);
    setAppointmentTime(slotTime);
    setAppointmentDuration(30);
    setReason(input.reason ?? "Revisión");
    setPlanItemId(null);
    setAdvancedOpen(false);
    setSelectedId(null);
    setSelectedSlot(input.columnId ? { columnId: input.columnId, minute: input.minute } : null);
    setOpened(true);
  };

  const openAppointmentAtSlot = (columnId: string, clientY: number, columnTop: number) => {
    const column = columnById.get(columnId);
    if (!column) return;
    const minute = slotMinuteFromOffset(
      clientY - columnTop,
      pxPerMinute,
      SLOT_MINUTES,
      DAY_MINUTES,
    );
    openCreate({
      date: column.date,
      minute,
      staffId: column.staffId,
      cabinetId: column.cabinetId,
      columnId,
    });
    setAppointmentTime(timeForMinute(minute));
  };

  const create = async (
    options: { skipConflictCheck?: boolean; allowOverlap?: boolean } = {},
  ) => {
    if (!effectivePatientId || !effectiveStaffId || !appointmentTime || !effectiveSiteId) return;
    const visitDates = planVisitDates(date, Math.max(1, visitCount), planVisitGapDays);
    if (!options.skipConflictCheck) {
      for (const visitDate of visitDates) {
        const startsAt = madridLocalDateTime(visitDate, appointmentTime);
        const conflicts = conflictsFor({
          id: "new",
          staffId: effectiveStaffId,
          cabinetId,
          startsAt: toMadridISO(startsAt),
          endsAt: toMadridISO(addMinutes(startsAt, appointmentDuration)),
        });
        if (conflicts.length) {
          setPending({
            kind: "create",
            date: visitDate,
            staffId: effectiveStaffId,
            durationMinutes: appointmentDuration,
            conflicts,
          });
          return;
        }
      }
    }
    try {
      for (const visitDate of visitDates) {
        const startsAt = madridLocalDateTime(visitDate, appointmentTime);
        await createMutation.mutateAsync({
          patientId: effectivePatientId,
          staffId: effectiveStaffId,
          siteId: effectiveSiteId,
          ...(cabinetId ? { cabinetId } : {}),
          ...(planItemId ? { clinicalPlanItemId: planItemId } : {}),
          startsAt: toMadridISO(startsAt),
          endsAt: toMadridISO(addMinutes(startsAt, appointmentDuration)),
          title: reason.trim() || "Cita",
          ...(reason.trim() ? { reason: reason.trim() } : {}),
          ...(options.allowOverlap ? { allowOverlap: true } : {}),
        });
      }
      setAgendaNotice(
        visitDates.length > 1
          ? `${visitDates.length} citas creadas cada ${planVisitGapDays} días.`
          : "Cita creada.",
      );
      setOpened(false);
      setSelectedSlot(null);
    } catch (error) {
      setAgendaNotice(errorMessage(error));
    }
  };

  const createBlock = async () => {
    const startsAt = madridLocalDateTime(date, blockFrom);
    const endsAt = madridLocalDateTime(date, blockTo);
    if (epochMillis(endsAt) <= epochMillis(startsAt)) {
      setAgendaNotice("El bloqueo debe terminar después de empezar.");
      return;
    }
    try {
      await blockMutation.mutateAsync({
        ...(resourceMode === "staff" && effectiveStaffId ? { staffId: effectiveStaffId } : {}),
        ...(resourceMode === "cabinet" && cabinetId ? { cabinetId } : {}),
        ...(effectiveSiteId ? { siteId: effectiveSiteId } : {}),
        startsAt: toMadridISO(startsAt),
        endsAt: toMadridISO(endsAt),
        kind: blockKind,
        ...(blockReason.trim() ? { reason: blockReason.trim() } : {}),
      });
      setBlockOpened(false);
      setAgendaNotice("Bloqueo creado.");
    } catch (error) {
      setAgendaNotice(errorMessage(error));
    }
  };

  const pasteAppointmentAt = async (
    source: AgendaAppointmentView,
    column: AgendaColumn,
    targetMinute: number,
    options: { skipConflictCheck?: boolean; allowOverlap?: boolean } = {},
  ) => {
    const minute = snapMinutes(targetMinute);
    const time = timeForMinute(minute);
    const startsAt = madridLocalDateTime(column.date, time);
    const duration = durationMinutes(source);
    const targetStaffId = column.staffId ?? source.staffId;
    const columnCabinetSite = column.cabinetId
      ? cabinets.find((candidate) => candidate.id === column.cabinetId)?.siteId
      : null;
    const resolvedSite =
      columnCabinetSite ??
      siteForStaffSlot(targetStaffId, column.date, time) ??
      source.siteId ??
      activeSiteId ??
      sites[0]?.id;
    if (!resolvedSite) {
      setAgendaNotice("No se pudo determinar la sede de la cita copiada.");
      return;
    }
    const sourceCabinetSite = source.cabinetId
      ? cabinets.find((candidate) => candidate.id === source.cabinetId)?.siteId
      : null;
    const targetCabinetId =
      column.cabinetId ?? (sourceCabinetSite === resolvedSite ? source.cabinetId : undefined);
    const payload: CreateAppointment = {
      patientId: source.patientId,
      staffId: targetStaffId,
      siteId: resolvedSite,
      ...(targetCabinetId ? { cabinetId: targetCabinetId } : {}),
      startsAt: toMadridISO(startsAt),
      endsAt: toMadridISO(addMinutes(startsAt, duration)),
      title: source.reason,
      reason: source.reason,
      ...(source.status === "NO_SHOW" ? { rescheduledFromId: source.id } : {}),
      ...(options.allowOverlap ? { allowOverlap: true } : {}),
    };
    const conflicts = options.skipConflictCheck
      ? []
      : conflictsFor({
          id: "paste",
          staffId: targetStaffId,
          cabinetId: targetCabinetId,
          startsAt: payload.startsAt,
          endsAt: payload.endsAt,
        });
    if (conflicts.length) {
      setPending({
        kind: "paste",
        appointment: source,
        createPayload: payload,
        date: column.date,
        staffId: targetStaffId,
        durationMinutes: duration,
        conflicts,
      });
      return;
    }
    try {
      await createMutation.mutateAsync(payload);
      setAgendaNotice(`Cita de ${source.patientName} pegada a las ${time}.`);
    } catch (error) {
      setAgendaNotice(errorMessage(error));
    }
  };

  const duplicate = useCallback(
    async (source: AgendaAppointmentView, offsetMinutes = 30) => {
      const start = addMinutes(source.startsAt, offsetMinutes);
      const end = addMinutes(source.endsAt, offsetMinutes);
      const resolvedSite = source.siteId ?? effectiveSiteId;
      if (!resolvedSite) {
        setAgendaNotice("Elige una sede antes de pegar.");
        return;
      }
      try {
        await createMutation.mutateAsync({
          patientId: source.patientId,
          staffId: source.staffId,
          siteId: resolvedSite,
          ...(source.cabinetId ? { cabinetId: source.cabinetId } : {}),
          startsAt: toMadridISO(start),
          endsAt: toMadridISO(end),
          title: source.reason,
          reason: source.reason,
          ...(source.status === "NO_SHOW" ? { rescheduledFromId: source.id } : {}),
        });
        setAgendaNotice(`Copia de ${source.patientName} creada ${offsetMinutes} min después.`);
      } catch (error) {
        setAgendaNotice(errorMessage(error));
      }
    },
    [createMutation, effectiveSiteId],
  );

  const moveByDrop = async (appointmentId: string, column: AgendaColumn, targetMinute: number) => {
    const appointment = appointments.find((item) => item.id === appointmentId);
    if (!appointment) return;
    const duration = durationMinutes(appointment);
    const startsAt = madridLocalDateTime(column.date, timeForMinute(snapMinutes(targetMinute)));
    const patch: UpdateAppointment = {
      expectedVersion: appointment.version,
      startsAt: toMadridISO(startsAt),
      endsAt: toMadridISO(addMinutes(startsAt, duration)),
      ...(column.staffId && column.staffId !== appointment.staffId
        ? { staffId: column.staffId }
        : {}),
      ...(column.cabinetId && column.cabinetId !== appointment.cabinetId
        ? { cabinetId: column.cabinetId }
        : {}),
    };
    await commitMove(appointment, patch, column.date);
  };

  const resizeBy = async (appointment: AgendaAppointmentView, minutes: number) => {
    const nextDuration = Math.max(SLOT_MINUTES, durationMinutes(appointment) + minutes);
    await commitMove(
      appointment,
      {
        expectedVersion: appointment.version,
        endsAt: toMadridISO(addMinutes(appointment.startsAt, nextDuration)),
      },
      dateYMDMadrid(appointment.startsAt),
    );
  };

  // The slot may be on another day or with another doctor than the clashing change.
  const applySlot = async (slot: { startsAt: string; staffId: string }) => {
    if (!pending) return;
    const time = hhmm(slot.startsAt);
    const slotDate = dateYMDMadrid(slot.startsAt);
    setPending(null);
    setSlotSearchOpened(false);
    if (pending.kind === "create") {
      setDate(slotDate);
      setAppointmentTime(time);
      setStaffId(slot.staffId);
      setAgendaNotice(`Hueco ${time} seleccionado. Revisa y guarda la cita.`);
      return;
    }
    if (pending.appointment) {
      const startsAt = madridLocalDateTime(slotDate, time);
      await commitMove(
        pending.appointment,
        {
          ...pending.patch,
          ...(slot.staffId !== pending.staffId ? { staffId: slot.staffId } : {}),
          expectedVersion: pending.appointment.version,
          startsAt: toMadridISO(startsAt),
          endsAt: toMadridISO(addMinutes(startsAt, pending.durationMinutes)),
        },
        slotDate,
      );
    }
  };

  const navigate = useCallback(
    (direction: -1 | 1) => setAnchor(shiftRange(rangeStart, effectiveDayCount, direction)),
    [effectiveDayCount, rangeStart],
  );

  // Keyboard shortcuts (desktop): N, T, F, ←/→, Esc, Ctrl/Cmd+C/V.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName ?? "");
      if (typing || opened || blockOpened || pending) return;
      const selected = appointments.find((item) => item.id === selectedId);
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c" && selected) {
        event.preventDefault();
        copyAppointment(selected);
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v" && copied) {
        event.preventDefault();
        void duplicate(copied, 30);
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === "ArrowLeft") navigate(-1);
      else if (event.key === "ArrowRight") navigate(1);
      else if (event.key.toLowerCase() === "t") setAnchor(todayMadrid());
      else if (event.key.toLowerCase() === "f") {
        event.preventDefault();
        searchRef.current?.focus();
      } else if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        const column = columns[0];
        openCreate({
          date: column?.date ?? anchor,
          minute: nextQuarterMinute(),
          staffId: column?.staffId ?? null,
          cabinetId: column?.cabinetId ?? null,
        });
      } else if (event.key === "Escape") {
        setQuickViewId(null);
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    anchor,
    appointments,
    blockOpened,
    columns,
    copied,
    duplicate,
    navigate,
    opened,
    pending,
    selectedId,
    copyAppointment,
  ]);

  // Resize with live preview; committed (with conflict check) on release.
  useEffect(() => {
    const deltaFor = (clientY: number, startY: number) =>
      Math.round((clientY - startY) / pxPerMinute / SLOT_MINUTES) * SLOT_MINUTES;
    const onPointerMove = (event: PointerEvent) => {
      const resizing = resizingRef.current;
      if (!resizing) return;
      setResizePreview({
        id: resizing.id,
        duration: Math.max(
          SLOT_MINUTES,
          resizing.initialDuration + deltaFor(event.clientY, resizing.startY),
        ),
      });
    };
    const onPointerUp = (event: PointerEvent) => {
      const resizing = resizingRef.current;
      resizingRef.current = null;
      setResizePreview(null);
      if (!resizing) return;
      const appointment = appointments.find((item) => item.id === resizing.id);
      if (!appointment) return;
      const nextDuration = Math.max(
        SLOT_MINUTES,
        resizing.initialDuration + deltaFor(event.clientY, resizing.startY),
      );
      if (nextDuration === resizing.initialDuration) return;
      void commitMove(
        appointment,
        {
          expectedVersion: appointment.version,
          endsAt: toMadridISO(addMinutes(appointment.startsAt, nextDuration)),
        },
        dateYMDMadrid(appointment.startsAt),
      );
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [appointments, pxPerMinute]);

  const hasBackendError =
    appointmentsQuery.isError || patientsQuery.isError || contextQuery.isError;
  const quickView = appointments.find((appointment) => appointment.id === quickViewId) ?? null;
  const catalog = catalogQuery.data?.items ?? [];
  const pendingPlanItems = (planQuery.data?.items ?? []).filter(
    (item) => !["COMPLETED", "CANCELLED", "SUPERSEDED", "DONE"].includes(item.status.toUpperCase()),
  );

  useEffect(() => {
    if (!requestedPlanItemId || !requestedPatientId || opened || requestedPlanItemHandled.current)
      return;
    const column = columns[0];
    openCreate({
      date: column?.date ?? anchor,
      minute: nextQuarterMinute(),
      staffId: column?.staffId ?? null,
      cabinetId: column?.cabinetId ?? null,
    });
    // openCreate is recreated every render; only the request itself matters here.
  }, [requestedPlanItemId, requestedPatientId, columns.length]);

  useEffect(() => {
    if (!requestedPlanItemId || requestedPlanItemHandled.current || !opened) return;
    const item = pendingPlanItems.find((candidate) => candidate.id === requestedPlanItemId);
    if (!item) return;
    requestedPlanItemHandled.current = true;
    setPlanItemId(item.id);
    setReason(item.label);
    const duration = catalog.find(
      (entry) => entry.id === item.treatmentCatalogId || entry.code === item.treatmentCode,
    )?.defaultDurationMin;
    if (duration) setAppointmentDuration(duration);
  }, [requestedPlanItemId, opened, pendingPlanItems, catalog]);

  const renderAppointmentMenu = (appointment: AgendaAppointmentView) => (
    <Menu withinPortal position="bottom-end" shadow="md" width={220}>
      <Menu.Target>
        <ActionIcon
          size="xs"
          variant="subtle"
          aria-label={`Acciones de ${appointment.patientName}`}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <IconDotsVertical size={14} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown onClick={(event) => event.stopPropagation()}>
        <Menu.Item
          leftSection={<IconCopy size={15} />}
          onClick={() => copyAppointment(appointment)}
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
            {AGENDA_STATUS_META[appointment.status].nextLabel}
          </Menu.Item>
        ) : null}
        {["PLANNED", "CONFIRMED", "RUNNING_LATE"].includes(appointment.status) ? (
          <Menu.Item
            color="gray"
            onClick={() => void markNoShow(appointment)}
          >
            No presentado
          </Menu.Item>
        ) : null}
        {appointment.status === "NO_SHOW" ? (
          <Menu.Item
            leftSection={<IconCalendarPlus size={15} />}
            onClick={() => void duplicate(appointment, 30)}
          >
            Reagendar +30 min
          </Menu.Item>
        ) : null}
      </Menu.Dropdown>
    </Menu>
  );

  const resourceOptions =
    resourceMode === "staff"
      ? siteStaff.map((member) => ({ value: `staff:${member.id}`, label: member.displayName }))
      : cabinets.map((cabinet) => ({ value: `cabinet:${cabinet.id}`, label: cabinet.name }));
  const minColumn = columns.length > 6 ? 120 : dates.length > 1 ? 150 : 200;
  const nowOffset = currentTimeOffset(nowTick, START_HOUR, END_HOUR);
  const dateTitle =
    dates.length > 1
      ? `${dayLabel(dates[0] ?? anchor)} – ${dayLabel(dates.at(-1) ?? anchor)}`
      : dayLabel(anchor);

  const renderToolbar = () => (
    <div className={styles.toolbar}>
      <div className={styles.toolbarGroup}>
        <Button size="xs" variant="default" onClick={() => setAnchor(todayMadrid())}>
          Hoy
        </Button>
        <ActionIcon variant="subtle" aria-label="Anterior" onClick={() => navigate(-1)}>
          <IconChevronLeft size={16} />
        </ActionIcon>
        <Popover
          opened={calendarOpen}
          onChange={setCalendarOpen}
          position="bottom-start"
          shadow="md"
        >
          <Popover.Target>
            <Button
              size="xs"
              variant="subtle"
              className={styles.dateButton}
              leftSection={<IconCalendarEvent size={14} />}
              onClick={() => setCalendarOpen((open) => !open)}
            >
              {dateTitle}
            </Button>
          </Popover.Target>
          <Popover.Dropdown>
            <AgendaMiniCalendar
              selected={anchor}
              visible={dates}
              onSelect={(day) => {
                setAnchor(day);
                setCalendarOpen(false);
              }}
            />
          </Popover.Dropdown>
        </Popover>
        <ActionIcon variant="subtle" aria-label="Siguiente" onClick={() => navigate(1)}>
          <IconChevronRight size={16} />
        </ActionIcon>
      </div>

      {sites.length > 1 ? (
        <div className={styles.toolbarGroup}>
          <Menu position="bottom-start" withinPortal>
            <Menu.Target>
              <Button
                size="xs"
                variant="light"
                aria-label="Sede"
                leftSection={<IconMapPin size={14} />}
                rightSection={<IconChevronDown size={14} />}
              >
                {sites.find((site) => site.id === activeSiteId)?.name ?? "Todas las sedes"}
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Vista de sedes</Menu.Label>
              <Menu.Item fw={!activeSiteId ? 700 : undefined} onClick={() => setActiveSiteId(null)}>
                Todas las sedes
              </Menu.Item>
              <Menu.Divider />
              {sites.map((site) => (
                <Menu.Item
                  key={site.id}
                  fw={site.id === activeSiteId ? 700 : undefined}
                  onClick={() => setActiveSiteId(site.id)}
                >
                  {site.name}
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
        </div>
      ) : null}

      <div className={styles.toolbarGroup}>
        <Menu position="bottom-start" withinPortal>
          <Menu.Target>
            <Button size="xs" variant="light" rightSection={<IconChevronDown size={14} />}>
              {view === "grid"
                ? (VIEW_OPTIONS.find((option) => option.value === String(effectiveDayCount))
                    ?.label ?? "Día")
                : view === "pipeline"
                  ? "Recepción"
                  : "Lista"}
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            {VIEW_OPTIONS.map((option) => (
              <Menu.Item
                key={option.value}
                disabled={isMobile && /^[2-7]$/.test(option.value)}
                onClick={() => {
                  if (option.value === "pipeline" || option.value === "list") setView(option.value);
                  else {
                    setView("grid");
                    setDayCount(Number(option.value) as AgendaDayCount);
                  }
                }}
              >
                {option.label}
              </Menu.Item>
            ))}
            <Menu.Divider />
            <Menu.Label>Zoom</Menu.Label>
            <div className={styles.menuPadding}>
              <SegmentedControl
                size="xs"
                fullWidth
                value={zoom}
                onChange={(value) => setZoom(value as AgendaZoom)}
                data={[
                  { value: "compacto", label: "Compacto" },
                  { value: "normal", label: "Normal" },
                  { value: "amplio", label: "Amplio" },
                ]}
              />
            </div>
          </Menu.Dropdown>
        </Menu>

        <Menu position="bottom-start" withinPortal closeOnItemClick>
          <Menu.Target>
            <Button
              size="xs"
              variant="subtle"
              leftSection={<IconLayoutColumns size={14} />}
              rightSection={<IconChevronDown size={14} />}
            >
              {resources.length === 1
                ? (resources[0]?.label ?? "Recurso")
                : resourceMode === "staff"
                  ? "Profesionales"
                  : "Gabinetes"}
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>Columnas por</Menu.Label>
            <Menu.Item
              onClick={() => {
                setResourceMode("staff");
                setResourceFilter(null);
              }}
            >
              Profesional
            </Menu.Item>
            <Menu.Item
              disabled={cabinets.length === 0}
              onClick={() => {
                setResourceMode("cabinet");
                setResourceFilter(null);
              }}
            >
              Gabinete
            </Menu.Item>
            <Menu.Divider />
            <Menu.Label>Mostrar</Menu.Label>
            {isMobile || effectiveDayCount > 1 ? null : (
              <Menu.Item onClick={() => setResourceFilter(null)}>Todos</Menu.Item>
            )}
            {resourceOptions.map((option) => (
              <Menu.Item key={option.value} onClick={() => setResourceFilter(option.value)}>
                {option.label}
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>

        <Menu position="bottom-start" withinPortal closeOnItemClick={false}>
          <Menu.Target>
            <ActionIcon variant="subtle" aria-label="Filtros de agenda">
              <IconAdjustmentsHorizontal size={16} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>Mostrar en la agenda</Menu.Label>
            <Stack gap={8} className={styles.menuPadding}>
              <Checkbox
                size="xs"
                label="Finalizadas"
                checked={showCompleted}
                onChange={(event) => setShowCompleted(event.currentTarget.checked)}
              />
              <Checkbox
                size="xs"
                label="No presentados"
                checked={showNoShows}
                onChange={(event) => setShowNoShows(event.currentTarget.checked)}
              />
              <Checkbox
                size="xs"
                label="Canceladas"
                checked={showCancelled}
                onChange={(event) => setShowCancelled(event.currentTarget.checked)}
              />
              <Checkbox
                size="xs"
                label="Bloqueos"
                checked={showBlocks}
                onChange={(event) => setShowBlocks(event.currentTarget.checked)}
              />
            </Stack>
          </Menu.Dropdown>
        </Menu>
      </div>

      <span className={styles.toolbarSpacer} />

      <Button
        size="xs"
        variant="light"
        leftSection={<IconClockSearch size={15} />}
        onClick={() => setSlotFinderOpened(true)}
      >
        Próximo hueco
      </Button>

      <TextInput
        ref={searchRef}
        size="xs"
        className={styles.search}
        placeholder="Buscar paciente (F)"
        leftSection={<IconSearch size={14} />}
        value={search}
        onChange={(event) => setSearch(event.currentTarget.value)}
        aria-label="Buscar en la agenda"
      />

      <Group gap={0} wrap="nowrap" display={isMobile ? "none" : undefined}>
        <Button
          size="xs"
          leftSection={<IconCalendarPlus size={15} />}
          onClick={() => {
            const column = columns[0];
            openCreate({
              date: column?.date ?? anchor,
              minute: nextQuarterMinute(),
              staffId: column?.staffId ?? null,
              cabinetId: column?.cabinetId ?? null,
            });
          }}
        >
          Nueva cita
        </Button>
        <Menu position="bottom-end" withinPortal>
          <Menu.Target>
            <ActionIcon size={30} variant="filled" aria-label="Más opciones de creación">
              <IconChevronDown size={14} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item
              leftSection={<IconFirstAidKit size={15} />}
              onClick={() =>
                openCreate({
                  date: anchor,
                  minute: nextQuarterMinute(),
                  staffId: columns[0]?.staffId ?? null,
                  cabinetId: columns[0]?.cabinetId ?? null,
                  reason: "Urgencia",
                })
              }
            >
              Urgencia
            </Menu.Item>
            <Menu.Item
              leftSection={<IconLock size={15} />}
              onClick={() => {
                setDate(anchor);
                setCabinetId(columns[0]?.cabinetId ?? null);
                if (columns[0]?.staffId) setStaffId(columns[0].staffId);
                setBlockOpened(true);
              }}
            >
              Bloqueo
            </Menu.Item>
            <Menu.Item
              leftSection={<IconUserPlus size={15} />}
              component={Link}
              href="/app/patients"
            >
              Nuevo paciente
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
    </div>
  );

  const renderGrid = () => (
    <section className={`${styles.shell} ${parityStyles.bluePerimeterRunner}`}>
      <div
        className={styles.scroller}
        // Keyboard users can scroll the day grid with the arrow keys once it has focus.
        tabIndex={0}
        role="region"
        aria-label="Rejilla de la agenda"
        onTouchStart={(event) => {
          const touch = event.touches[0];
          touchRef.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
        }}
        onTouchEnd={(event) => {
          const start = touchRef.current;
          const touch = event.changedTouches[0];
          touchRef.current = null;
          if (!isMobile || !start || !touch) return;
          const dx = touch.clientX - start.x;
          const dy = touch.clientY - start.y;
          if (Math.abs(dx) > 70 && Math.abs(dy) < 45) navigate(dx < 0 ? 1 : -1);
        }}
      >
        <div className={styles.header} style={gridStyle(columns.length, minColumn)}>
          <div className={styles.corner}>
            {copied ? <Badge size="xs">Copiada · {shortPatientName(copied.patientName)}</Badge> : null}
          </div>
          {columns.map((column) => (
            <div key={column.id} className={styles.columnHeader} data-today={column.date === today}>
              <span>{column.label}</span>
              {column.sublabel ? (
                <span className={styles.columnSublabel}>{column.sublabel}</span>
              ) : null}
            </div>
          ))}
        </div>
        <div className={styles.body} style={gridStyle(columns.length, minColumn, dayHeight)}>
          <div className={styles.timeRail} style={heightStyle(dayHeight)}>
            {dayHours().map((hour) => (
              <span key={hour} style={topStyle((hour - START_HOUR) * 60 * pxPerMinute)}>
                {String(hour).padStart(2, "0")}:00
              </span>
            ))}
          </div>
          {columns.map((member) => {
            const columnAppointments = appointmentsForColumn(member);
            const layout = new Map(
              layoutDay(
                columnAppointments.map((appointment) => ({
                  id: appointment.id,
                  staffId: appointment.staffId,
                  startsAt: appointment.startsAt,
                  endsAt: appointment.endsAt,
                })),
                { dayStartMinutes: START_HOUR * 60, dayEndMinutes: END_HOUR * 60 },
              ).map((item) => [item.id, item]),
            );
            return (
              <AgendaDropColumn
                id={member.id}
                key={member.id}
                className={styles.column}
                style={heightStyle(dayHeight)}
                onContextMenu={(event) => {
                  if (!copied || event.target !== event.currentTarget) return;
                  event.preventDefault();
                  clearLongPress();
                  suppressSlotClickRef.current = true;
                  const rect = event.currentTarget.getBoundingClientRect();
                  void pasteAppointmentAt(
                    copied,
                    member,
                    (event.clientY - rect.top) / pxPerMinute,
                  );
                }}
                onPointerDown={(event) => {
                  if (!copied || event.pointerType !== "touch" || event.target !== event.currentTarget)
                    return;
                  clearLongPress();
                  const rect = event.currentTarget.getBoundingClientRect();
                  longPressRef.current = {
                    x: event.clientX,
                    y: event.clientY,
                    timer: window.setTimeout(() => {
                      touchRef.current = null;
                      longPressRef.current = null;
                      suppressSlotClickRef.current = true;
                      void pasteAppointmentAt(
                        copied,
                        member,
                        (event.clientY - rect.top) / pxPerMinute,
                      );
                    }, 550),
                  };
                }}
                onPointerMove={(event) => {
                  const press = longPressRef.current;
                  if (!press) return;
                  if (Math.hypot(event.clientX - press.x, event.clientY - press.y) > 12)
                    clearLongPress();
                }}
                onPointerUp={clearLongPress}
                onPointerCancel={clearLongPress}
                onClick={(event) => {
                  if (suppressSlotClickRef.current) {
                    suppressSlotClickRef.current = false;
                    return;
                  }
                  if (event.target !== event.currentTarget) return;
                  const rect = event.currentTarget.getBoundingClientRect();
                  openAppointmentAtSlot(member.id, event.clientY, rect.top);
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event: DragEvent<HTMLDivElement>) => {
                  event.preventDefault();
                  const payload = JSON.parse(
                    event.dataTransfer.getData("application/json") || "{}",
                  ) as DragPayload;
                  const rect = event.currentTarget.getBoundingClientRect();
                  const minute = (event.clientY - rect.top) / pxPerMinute;
                  if (payload.id) void moveByDrop(payload.id, member, minute);
                }}
              >
                {Array.from({ length: DAY_MINUTES / SLOT_MINUTES }, (_, index) => (
                  <i
                    aria-hidden="true"
                    key={index}
                    className={styles.slotLine}
                    data-major={index % 4 === 0}
                    style={topStyle(index * SLOT_MINUTES * pxPerMinute)}
                  />
                ))}
                {showBlocks
                  ? blocksForColumn(member).map((block) => {
                      const top = minutesFromStart(block.startsAt) * pxPerMinute;
                      const height = Math.max(
                        12,
                        ((epochMillis(block.endsAt) - epochMillis(block.startsAt)) / 60000) *
                          pxPerMinute,
                      );
                      return (
                        <div
                          key={block.id}
                          className={styles.block}
                          style={positionStyle(top, height)}
                        >
                          <IconLock size={11} aria-hidden="true" />
                          <span>
                            {BLOCK_LABELS.get(block.kind) ?? "Bloqueo"}
                            {block.reason ? ` · ${block.reason}` : ""}
                          </span>
                        </div>
                      );
                    })
                  : null}
                {selectedSlot?.columnId === member.id ? (
                  <div
                    aria-hidden="true"
                    className={styles.selectedSlot}
                    style={positionStyle(
                      selectedSlot.minute * pxPerMinute,
                      SLOT_MINUTES * pxPerMinute,
                    )}
                  />
                ) : null}
                {member.date === today && nowOffset !== null ? (
                  <div className={styles.nowLine} style={topStyle(nowOffset * pxPerMinute)} />
                ) : null}
                {columnAppointments.map((appointment) => {
                  const placement = layout.get(appointment.id);
                  const duration =
                    resizePreview?.id === appointment.id
                      ? resizePreview.duration
                      : durationMinutes(appointment);
                  const top = minutesFromStart(appointment.startsAt) * pxPerMinute;
                  const height = Math.max(22, duration * pxPerMinute);
                  return (
                    <AgendaAppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                      heightPx={height}
                      style={positionStyle(top, height, placement?.column, placement?.columnCount)}
                      selected={selectedId === appointment.id}
                      dimmed={!matchesSearch(appointment)}
                      contextLabel={
                        resourceMode === "staff"
                          ? appointment.cabinetId
                            ? cabinetNames.get(appointment.cabinetId)
                            : undefined
                          : staffNames.get(appointment.staffId)
                      }
                      siteLabel={appointment.siteId ? siteNames.get(appointment.siteId) : undefined}
                      menu={renderAppointmentMenu(appointment)}
                      onCopy={() => copyAppointment(appointment)}
                      onOpen={() => {
                        setSelectedId(appointment.id);
                        setQuickViewId(appointment.id);
                      }}
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData(
                          "application/json",
                          JSON.stringify({ id: appointment.id } satisfies DragPayload),
                        );
                        setSelectedId(appointment.id);
                      }}
                      onResizeStart={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        resizingRef.current = {
                          id: appointment.id,
                          startY: event.clientY,
                          initialDuration: durationMinutes(appointment),
                        };
                      }}
                    />
                  );
                })}
              </AgendaDropColumn>
            );
          })}
        </div>
      </div>
    </section>
  );

  const renderRow = (appointment: AgendaAppointmentView, withAdvance: boolean) => (
    <div className={parityStyles.row} key={appointment.id}>
      <UnstyledButton
        className={parityStyles.rowMain}
        onClick={() => setQuickViewId(appointment.id)}
      >
        <Group gap={6} wrap="nowrap">
          <span className={parityStyles.rowTitle}>
            {hhmm(appointment.startsAt)} · {appointment.patientName}
          </span>
          {appointment.glyphs.length ? (
            <ClinicalGlyphs glyphs={appointment.glyphs} />
          ) : (
            <Text size="xs">{appointment.reason}</Text>
          )}
        </Group>
        <span className={parityStyles.rowMeta}>
          {[
            AGENDA_STATUS_META[appointment.status].label,
            appointment.siteId ? siteNames.get(appointment.siteId) : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </UnstyledButton>
      <div className={parityStyles.rowActions}>
        {withAdvance && nextStatus(appointment.status) ? (
          <Button
            size="xs"
            variant="light"
            loading={transitionPending}
            onClick={() => void advance(appointment)}
          >
            {AGENDA_STATUS_META[appointment.status].nextLabel}
          </Button>
        ) : null}
        {renderAppointmentMenu(appointment)}
      </div>
    </div>
  );

  const selectedPlanItem = pendingPlanItems.find((item) => item.id === planItemId);
  const createGlyph = clinicalGlyphFor({
    tooth: selectedPlanItem?.tooth,
    treatmentCode: selectedPlanItem?.treatmentCode,
    label: reason,
  });

  return (
    <ClinicalDragContext
      onDragEnd={(event) => {
        if (
          transitionPending ||
          moveMutation.isPending ||
          pending ||
          opened ||
          blockOpened ||
          !event.over
        )
          return;
        const column = columns.find((c) => c.id === String(event.over!.id));
        const appointment = appointments.find((a) => a.id === String(event.active.id));
        const initial = event.active.rect.current.initial;
        if (!column || !appointment || !initial) return;
        const minute = dropMinute({
          initialTop: initial.top,
          deltaY: event.delta.y,
          columnTop: event.over.rect.top,
          pixelsPerMinute: pxPerMinute,
          dayMinutes: DAY_MINUTES,
          duration: durationMinutes(appointment),
        });
        void moveByDrop(appointment.id, column, minute);
      }}
    >
      <div className={parityStyles.grid}>
        <PageHeader
          title="Agenda"
          description="Arrastra para mover. Clic derecho o pulsación larga para copiar y pegar citas."
        />

        {renderToolbar()}

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
          <Alert key={reminder.appointmentId} color="orange" title={reminder.title}>
            <Group justify="space-between" align="center">
              <Text size="sm">
                {reminder.patientName} · {reminder.message}
              </Text>
              <Button component={Link} href={reminder.href} size="xs" variant="light">
                Rellenar datos del implante
              </Button>
            </Group>
          </Alert>
        ))}

        {view === "grid" ? renderGrid() : null}

        {view === "pipeline" ? (
          <SimpleGrid cols={{ base: 1, xl: 4 }}>
            {PIPELINE.map((stage) => {
              const statuses = stage.statuses as readonly string[];
              const items = visibleAppointments.filter((appointment) =>
                statuses.includes(appointment.status),
              );
              return (
                <section className={parityStyles.section} key={stage.key}>
                  <div className={parityStyles.sectionHeader}>
                    <h2 className={parityStyles.sectionTitle}>{stage.title}</h2>
                    <Badge>{items.length}</Badge>
                  </div>
                  <div className={parityStyles.rowList}>
                    {items.map((appointment) => renderRow(appointment, true))}
                  </div>
                </section>
              );
            })}
          </SimpleGrid>
        ) : null}

        {view === "list" ? (
          <section className={parityStyles.section}>
            <div className={parityStyles.rowList}>
              {[...visibleAppointments]
                .filter(matchesSearch)
                .sort((left, right) => left.startsAt.localeCompare(right.startsAt))
                .map((appointment) => renderRow(appointment, false))}
            </div>
          </section>
        ) : null}

        {isMobile ? (
          <ActionIcon
            size={52}
            radius="xl"
            className={styles.fab}
            aria-label="Nueva cita"
            onClick={() =>
              openCreate({
                date: anchor,
                minute: nextQuarterMinute(),
                staffId: columns[0]?.staffId ?? null,
                cabinetId: columns[0]?.cabinetId ?? null,
              })
            }
          >
            <IconPlus size={24} />
          </ActionIcon>
        ) : null}

        <AgendaQuickView
          appointment={quickView}
          patient={quickView ? patientsById.get(quickView.patientId) : undefined}
          staffName={quickView ? staffNames.get(quickView.staffId) : undefined}
          cabinetName={quickView?.cabinetId ? cabinetNames.get(quickView.cabinetId) : undefined}
          siteName={quickView?.siteId ? siteNames.get(quickView.siteId) : undefined}
          staffOptions={staff.map((member) => ({ value: member.id, label: member.displayName }))}
          busy={transitionPending || moveMutation.isPending}
          onClose={() => setQuickViewId(null)}
          onAdvance={(appointment) => void advance(appointment)}
          onNoShow={(appointment) => void markNoShow(appointment)}
          onReschedule={(appointment) => void duplicate(appointment, 30)}
          onCancel={(appointment, cancelReason) =>
            void transitions.cancel
              .mutateAsync({
                id: appointment.id,
                expectedVersion: appointment.version,
                reason: cancelReason,
              })
              .then(() => {
                setQuickViewId(null);
                setAgendaNotice(`Cita de ${appointment.patientName} cancelada.`);
              })
              .catch((error: unknown) => setAgendaNotice(errorMessage(error)))
          }
          onEdit={(appointment, edit: QuickViewEdit) => {
            const appointmentDate = dateYMDMadrid(appointment.startsAt);
            const startsAt = madridLocalDateTime(appointmentDate, edit.time);
            void commitMove(
              appointment,
              {
                expectedVersion: appointment.version,
                startsAt: toMadridISO(startsAt),
                endsAt: toMadridISO(addMinutes(startsAt, edit.durationMinutes)),
                ...(edit.staffId !== appointment.staffId ? { staffId: edit.staffId } : {}),
              },
              appointmentDate,
            );
          }}
        />

        <Modal
          opened={pending !== null}
          onClose={() => {
            setPending(null);
            setSlotSearchOpened(false);
          }}
          title={
            pending?.conflicts.every((conflict) => conflict.startsWith("appointment:"))
              ? "¿Seguro que quieres superponer las citas?"
              : "Ese hueco no está libre"
          }
        >
          {pending ? (
            <Stack gap="sm">
              <Text size="sm">Coincide con:</Text>
              <Stack gap={2}>
                {pending.conflicts.map((conflict) => (
                  <Text size="sm" fw={600} key={conflict}>
                    {describeConflict(conflict)}
                  </Text>
                ))}
              </Stack>
              <Text size="xs" c="dimmed">
                Los bloqueos y ausencias no se pueden saltar. Si el conflicto es únicamente con otra
                cita, puedes superponerla tras confirmarlo.
              </Text>
              {slotSearchOpened ? (
                <NextSlotFinder
                  today={today}
                  siteId={activeSiteId}
                  doctors={doctorOptions}
                  initialStaffId={pending.staffId}
                  initialDurationMin={pending.durationMinutes}
                  from={pending.date}
                  onPick={(slot) => void applySlot(slot)}
                />
              ) : null}
              <Group justify="flex-end">
                <Button
                  variant="default"
                  onClick={() => {
                    setPending(null);
                    setSlotSearchOpened(false);
                  }}
                >
                  Cancelar
                </Button>
                {slotSearchOpened ? null : (
                  <>
                    <Button onClick={() => setSlotSearchOpened(true)}>Buscar otro hueco</Button>
                    {pending.conflicts.every((conflict) => conflict.startsWith("appointment:")) ? (
                      <Button
                        color="orange"
                        onClick={() => {
                          const current = pending;
                          setPending(null);
                          setSlotSearchOpened(false);
                          if (current.kind === "move" && current.appointment && current.patch) {
                            void commitMove(
                              current.appointment,
                              current.patch,
                              current.date,
                              { skipConflictCheck: true, allowOverlap: true },
                            );
                            return;
                          }
                          if (current.kind === "paste" && current.createPayload) {
                            void createMutation
                              .mutateAsync({ ...current.createPayload, allowOverlap: true })
                              .then(() =>
                                setAgendaNotice(
                                  `Cita de ${current.appointment?.patientName ?? "paciente"} superpuesta.`,
                                ),
                              )
                              .catch((error: unknown) => setAgendaNotice(errorMessage(error)));
                            return;
                          }
                          if (current.kind === "create") {
                            void create({ skipConflictCheck: true, allowOverlap: true });
                          }
                        }}
                      >
                        Sí, superponer citas
                      </Button>
                    ) : null}
                  </>
                )}
              </Group>
            </Stack>
          ) : null}
        </Modal>

        <Modal
          opened={opened}
          onClose={() => {
            setOpened(false);
            setSelectedSlot(null);
          }}
          title={`Nueva cita · ${dayLabel(date)} · ${appointmentTime}`}
        >
          <Stack>
            <Select
              searchable
              label="Paciente"
              value={effectivePatientId || null}
              onChange={(value) => {
                setPatientId(value ?? "");
                setPlanItemId(null);
              }}
              data={patientOptions.map((patient) => ({ value: patient.id, label: patient.label }))}
            />
            {pendingPlanItems.length ? (
              <div>
                <Text size="xs" c="dimmed" mb={4}>
                  Del plan de tratamiento
                </Text>
                <div className={styles.planItems}>
                  {pendingPlanItems.map((item) => {
                    const glyph = clinicalGlyphFor({
                      tooth: item.tooth,
                      treatmentCode: item.treatmentCode,
                      label: item.label,
                    });
                    return (
                      <UnstyledButton
                        key={item.id}
                        className={styles.planItem}
                        data-selected={planItemId === item.id}
                        onClick={() => {
                          const selecting = planItemId !== item.id;
                          setPlanItemId(selecting ? item.id : null);
                          if (!selecting) return;
                          setReason(item.label);
                          const duration = catalog.find(
                            (entry) =>
                              entry.id === item.treatmentCatalogId ||
                              entry.code === item.treatmentCode,
                          )?.defaultDurationMin;
                          if (duration) setAppointmentDuration(duration);
                        }}
                      >
                        {glyph ? <ClinicalGlyph glyph={glyph} mode="micro" /> : null}
                        {item.label}
                      </UnstyledButton>
                    );
                  })}
                </div>
              </div>
            ) : null}
            <Autocomplete
              label="Motivo o tratamiento"
              value={reason}
              onChange={(value) => {
                setReason(value);
                setPlanItemId(null);
                const entry = catalog.find((item) => item.name === value);
                if (entry?.defaultDurationMin) setAppointmentDuration(entry.defaultDurationMin);
              }}
              data={agendaTreatmentOptions(catalog)}
              rightSection={createGlyph ? <ClinicalGlyph glyph={createGlyph} mode="micro" /> : null}
            />
            <Group gap="xs">
              <Badge variant="light">{appointmentTime}</Badge>
              <Badge variant="light">{appointmentDuration} min</Badge>
              <Badge variant="light">{staffNames.get(effectiveStaffId) ?? "Profesional"}</Badge>
              {cabinetId ? <Badge variant="light">{cabinetNames.get(cabinetId)}</Badge> : null}
              <Button
                size="compact-xs"
                variant="subtle"
                onClick={() => setAdvancedOpen((open) => !open)}
              >
                {advancedOpen ? "Menos opciones" : "Más opciones"}
              </Button>
            </Group>
            <Collapse expanded={advancedOpen}>
              <Stack>
                <TextInput label="Fecha" type="date" value={date} readOnly />
                <Group grow>
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
                    data={[...new Set([...DURATION_STEPS, appointmentDuration])]
                      .sort((a, b) => a - b)
                      .map((minutes) => ({ value: String(minutes), label: `${minutes} min` }))}
                  />
                </Group>
                <Select
                  label="Profesional"
                  value={effectiveStaffId || null}
                  onChange={(value) => {
                    const nextStaffId = value ?? "";
                    setStaffId(nextStaffId);
                    const nextSite = nextStaffId
                      ? siteForStaffSlot(nextStaffId, date, appointmentTime)
                      : null;
                    if (nextSite) setAppointmentSiteId(nextSite);
                  }}
                  data={staff.map((member) => ({ value: member.id, label: member.displayName }))}
                />
                <Group grow>
                  <Select
                    label="Gabinete"
                    clearable
                    value={cabinetId}
                    onChange={setCabinetId}
                    data={formCabinets.map((cabinet) => ({ value: cabinet.id, label: cabinet.name }))}
                  />
                  <Select
                    label="Sede"
                    value={effectiveSiteId || null}
                    onChange={(value) => {
                      const nextSiteId = value ?? null;
                      setAppointmentSiteId(nextSiteId);
                      const selectedCabinet = cabinetId
                        ? cabinets.find((candidate) => candidate.id === cabinetId)
                        : null;
                      if (selectedCabinet && selectedCabinet.siteId !== nextSiteId) setCabinetId(null);
                    }}
                    data={sites.map((site) => ({ value: site.id, label: site.name }))}
                  />
                </Group>
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
                      Se ajusta en Ajustes → Agenda.
                    </Text>
                  </div>
                </Group>
              </Stack>
            </Collapse>
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setOpened(false)}>
                Cancelar
              </Button>
              <Button loading={createMutation.isPending} onClick={() => void create()}>
                Guardar cita
              </Button>
            </Group>
          </Stack>
        </Modal>

        <Modal
          opened={slotFinderOpened}
          onClose={() => setSlotFinderOpened(false)}
          title="Próximo hueco libre"
        >
          <NextSlotFinder
            today={today}
            siteId={activeSiteId}
            doctors={doctorOptions}
            onPick={(slot, durationMin) => {
              setSlotFinderOpened(false);
              openCreate({ date: dateYMDMadrid(slot.startsAt), minute: 0, staffId: slot.staffId });
              // openCreate expects minutes after the grid's first hour; set the exact time instead.
              setAppointmentTime(hhmm(slot.startsAt));
              setAppointmentDuration(durationMin);
            }}
          />
        </Modal>

        <Modal opened={blockOpened} onClose={() => setBlockOpened(false)} title="Bloquear agenda">
          <Stack>
            <Select
              label="Tipo"
              value={blockKind}
              onChange={(value) => setBlockKind(value ?? "MEETING")}
              data={BLOCK_KINDS}
            />
            <Group grow>
              <TextInput
                label="Desde"
                type="time"
                value={blockFrom}
                onChange={(event) => setBlockFrom(event.currentTarget.value)}
              />
              <TextInput
                label="Hasta"
                type="time"
                value={blockTo}
                onChange={(event) => setBlockTo(event.currentTarget.value)}
              />
            </Group>
            {resourceMode === "staff" ? (
              <Select
                label="Profesional"
                value={effectiveStaffId || null}
                onChange={(value) => setStaffId(value ?? "")}
                data={staff.map((member) => ({ value: member.id, label: member.displayName }))}
              />
            ) : (
              <Select
                label="Gabinete"
                value={cabinetId}
                onChange={setCabinetId}
                data={cabinets.map((cabinet) => ({ value: cabinet.id, label: cabinet.name }))}
              />
            )}
            <TextInput
              label="Nota"
              value={blockReason}
              onChange={(event) => setBlockReason(event.currentTarget.value)}
            />
            <Text size="xs" c="dimmed">
              {dayLabel(date)}
            </Text>
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setBlockOpened(false)}>
                Cancelar
              </Button>
              <Button loading={blockMutation.isPending} onClick={() => void createBlock()}>
                Crear bloqueo
              </Button>
            </Group>
          </Stack>
        </Modal>
      </div>
    </ClinicalDragContext>
  );
}
