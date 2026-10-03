"use client";

import { ActionIcon, Button } from "@mantine/core";
import { IconArrowUpRight, IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";

import { buildMonthGrid, monthOf, shiftMonth, type MonthDaySummary } from "@/domain/agenda";
import { hhmm } from "@/domain/dates";
import { getBrowserApi } from "@/shared/api/browser";
import { dentyQueryKeys } from "@/shared/query";

import { AGENDA_STATUS_META } from "@/features/agenda/agenda-status";

import styles from "./dashboard-calendar.module.css";

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];
// A day tile is ~38 px wide: one face plus a count fits.
const MAX_AVATARS = 1;
// The card is a glance, not the agenda: the next two visits, then a link to the rest.
const MAX_LISTED = 2;

// Grid dates are calendar days, so they are formatted in UTC to avoid shifting a day.
const monthTitle = new Intl.DateTimeFormat("es-ES", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const longDay = new Intl.DateTimeFormat("es-ES", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});
const dayMonth = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});
const asDate = (day: string) => new Date(`${day}T00:00:00Z`);
// "octubre de 2026" → "Octubre de 2026": only the first letter, never "De".
const sentence = (text: string) => text.charAt(0).toLocaleUpperCase("es") + text.slice(1);

function initials(name: string | undefined): string | null {
  if (!name) return null;
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toLocaleUpperCase("es") ?? "")
    .join("");
  return letters || null;
}

// One vocabulary for appointment states across Denty: the agenda's.
function statusLabel(status: string): string {
  return status in AGENDA_STATUS_META
    ? AGENDA_STATUS_META[status as keyof typeof AGENDA_STATUS_META].label
    : status;
}

function countLabel(count: number): string {
  if (count === 0) return "sin citas";
  return count === 1 ? "1 cita" : `${count} citas`;
}

export interface DashboardCalendarApi {
  monthSummary(month: string, siteId?: string): Promise<{ days: MonthDaySummary[] }>;
  dayAppointments(
    date: string,
    siteId?: string,
  ): Promise<
    readonly { id: string; patientId: string; startsAt: string; status: string; title: string }[]
  >;
}

// Looked up on use: the browser client does not exist while Next prerenders on the server.
const browserCalendarApi: DashboardCalendarApi = {
  monthSummary: (month, siteId) => getBrowserApi().agenda.monthSummary(month, siteId),
  dayAppointments: (date, siteId) => getBrowserApi().appointments.list(date, siteId),
};

export interface DashboardCalendarProps {
  api?: DashboardCalendarApi;
  today: string;
  siteId?: string | null;
  patientName: (patientId: string) => string | undefined;
}

export function DashboardCalendar({
  api = browserCalendarApi,
  today,
  siteId,
  patientName,
}: DashboardCalendarProps) {
  const [month, setMonth] = useState(() => monthOf(today));
  const [selected, setSelected] = useState(today);
  const site = siteId ?? undefined;

  const summary = useQuery({
    queryKey: dentyQueryKeys.appointments.month(month, siteId),
    queryFn: () => api.monthSummary(month, site),
  });
  const dayAppointments = useQuery({
    queryKey: dentyQueryKeys.appointments.day(selected, siteId),
    queryFn: () => api.dayAppointments(selected, site),
  });

  const weeks = useMemo(() => buildMonthGrid(month, today), [month, today]);
  const byDay = useMemo(
    () =>
      new Map<string, MonthDaySummary>((summary.data?.days ?? []).map((day) => [day.date, day])),
    [summary.data],
  );
  const monthTotal = (summary.data?.days ?? []).reduce((total, day) => total + day.count, 0);
  const active = (dayAppointments.data ?? []).filter(
    (appointment) => appointment.status !== "CANCELLED",
  );
  const visible = active.slice(0, MAX_LISTED);
  const hidden = active.length - visible.length;
  const selectedCount = byDay.get(selected)?.count ?? active.length;

  return (
    <section className={styles.card} aria-labelledby="dashboard-calendar-title">
      <header className={styles.header}>
        <div className={styles.heading}>
          <h2 className={styles.title} id="dashboard-calendar-title">
            Agenda
          </h2>
          <p className={styles.subtitle}>
            {summary.isLoading
              ? "Cargando…"
              : summary.isError
                ? "No se pudo cargar el mes."
                : `${countLabel(monthTotal)} este mes`}
          </p>
        </div>
        <ActionIcon
          component={Link}
          href={`/app/agenda?date=${selected}`}
          variant="default"
          radius="xl"
          aria-label="Abrir agenda"
        >
          <IconArrowUpRight size={15} />
        </ActionIcon>
      </header>

      <div className={styles.monthBar}>
        <ActionIcon
          variant="subtle"
          color="gray"
          radius="xl"
          size="sm"
          aria-label="Mes anterior"
          onClick={() => setMonth((current) => shiftMonth(current, -1))}
        >
          <IconChevronLeft size={15} />
        </ActionIcon>
        <span className={styles.monthTitle}>
          {sentence(monthTitle.format(asDate(`${month}-01`)))}
        </span>
        <ActionIcon
          variant="subtle"
          color="gray"
          radius="xl"
          size="sm"
          aria-label="Mes siguiente"
          onClick={() => setMonth((current) => shiftMonth(current, 1))}
        >
          <IconChevronRight size={15} />
        </ActionIcon>
        <Button
          size="compact-xs"
          variant="subtle"
          radius="xl"
          onClick={() => {
            setMonth(monthOf(today));
            setSelected(today);
          }}
        >
          Hoy
        </Button>
      </div>

      <div className={styles.grid} role="grid" aria-label="Días del mes">
        {WEEKDAYS.map((weekday) => (
          <span key={weekday} className={styles.weekday} aria-hidden="true">
            {weekday}
          </span>
        ))}
        {weeks.flat().map((day) => {
          const info = byDay.get(day.date);
          const count = info?.count ?? 0;
          const avatars = (info?.patientIds ?? [])
            .map((id) => initials(patientName(id)))
            .filter((value): value is string => value !== null)
            .slice(0, MAX_AVATARS);
          const extra = count - avatars.length;
          return (
            <button
              type="button"
              key={day.date}
              className={styles.day}
              data-today={day.isToday}
              data-selected={day.date === selected}
              data-outside={!day.inMonth}
              data-busy={count > 0}
              aria-pressed={day.date === selected}
              aria-label={`${longDay.format(asDate(day.date))}, ${countLabel(count)}${day.isToday ? ", hoy" : ""}`}
              onClick={() => {
                setSelected(day.date);
                if (!day.inMonth) setMonth(monthOf(day.date));
              }}
            >
              {count > 0 ? (
                <span className={styles.people} aria-hidden="true">
                  {avatars.map((letters, index) => (
                    <span key={`${letters}-${index}`} className={styles.avatar}>
                      {letters}
                    </span>
                  ))}
                  {extra > 0 ? <span className={styles.more}>+{extra}</span> : null}
                </span>
              ) : null}
              <span className={styles.number}>{Number(day.date.slice(8))}</span>
            </button>
          );
        })}
      </div>

      <div className={styles.dayPanel} aria-live="polite">
        <div className={styles.dayHeader}>
          <strong className={styles.dayTitle}>{sentence(longDay.format(asDate(selected)))}</strong>
          <Link
            className={styles.openDay}
            href={`/app/agenda?date=${selected}`}
            aria-label={`Abrir la agenda del ${dayMonth.format(asDate(selected))}`}
          >
            {countLabel(selectedCount)}
            <IconArrowUpRight size={13} aria-hidden="true" />
          </Link>
        </div>
        {dayAppointments.isLoading ? (
          <p className={styles.empty}>Cargando citas…</p>
        ) : dayAppointments.isError ? (
          <p className={styles.empty}>No se pudieron cargar las citas de este día.</p>
        ) : visible.length === 0 ? (
          <p className={styles.empty}>Sin citas este día.</p>
        ) : (
          <ul className={styles.list}>
            {visible.map((appointment) => (
              <li key={appointment.id} className={styles.item}>
                <span className={styles.time}>{hhmm(appointment.startsAt)}</span>
                <span className={styles.patient}>
                  {patientName(appointment.patientId) ?? appointment.title}
                </span>
                <span className={styles.status} data-status={appointment.status}>
                  {statusLabel(appointment.status)}
                </span>
              </li>
            ))}
          </ul>
        )}
        {hidden > 0 ? (
          <Link className={styles.moreLink} href={`/app/agenda?date=${selected}`}>
            Ver {hidden === 1 ? "1 cita más" : `${hidden} citas más`}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
