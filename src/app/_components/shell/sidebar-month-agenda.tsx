"use client";

import { Popover } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { IconArrowUpRight, IconCalendarEvent, IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { buildMonthGrid, monthOf, shiftMonth, type MonthDaySummary } from "@/domain/agenda";
import { todayMadrid } from "@/domain/dates";
import { getBrowserApi } from "@/shared/api/browser";
import { dentyQueryKeys } from "@/shared/query";
import { useActiveTenant } from "@/shared/tenancy/active-context";

import styles from "./sidebar-month-agenda.module.css";

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"] as const;
const monthLabel = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric", timeZone: "UTC" });
const dayLabel = new Intl.DateTimeFormat("es-ES", {
  weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
});
const asUtcDay = (day: string) => new Date(day + "T12:00:00Z");
const capitalize = (label: string) => label.charAt(0).toLocaleUpperCase("es") + label.slice(1);
const countText = (count: number) => count === 1 ? "1 cita" : count + " citas";

interface MonthCalendarProps {
  month: string;
  today: string;
  selected: string;
  setMonth: (month: string) => void;
  setSelected: (date: string) => void;
  onNavigate: () => void;
  counts: ReadonlyMap<string, MonthDaySummary>;
  countReady: boolean;
  pending: boolean;
  error: boolean;
  available: boolean;
  total: number;
}

/** Six complete Monday-first weeks; never seven isolated day buttons. */
function MonthCalendar({
  month, today, selected, setMonth, setSelected, onNavigate,
  counts, countReady, pending, error, available, total,
}: MonthCalendarProps) {
  const days = useMemo(() => buildMonthGrid(month, today, { minWeeks: 6 }).flat(), [month, today]);
  const header = capitalize(monthLabel.format(asUtcDay(month + "-01")));

  return (
    <div className={styles.calendar} aria-label={"Calendario de " + header}>
      <div className={styles.monthHeader}>
        <strong className={styles.monthTitle}>{header}</strong>
        <div className={styles.monthActions}>
          <button type="button" className={styles.monthButton} aria-label="Mes anterior"
            onClick={() => setMonth(shiftMonth(month, -1))}>
            <IconChevronLeft size={17} aria-hidden="true" />
          </button>
          <button type="button" className={styles.monthButton} aria-label="Mes siguiente"
            onClick={() => setMonth(shiftMonth(month, 1))}>
            <IconChevronRight size={17} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className={styles.weekdays} aria-hidden="true">
        {WEEKDAYS.map((weekday, index) => (
          <span key={index} className={styles.weekday}>{weekday}</span>
        ))}
      </div>
      <div className={styles.monthGrid} role="group" aria-label={"Días de " + header}>
        {days.map((day) => {
          const count = counts.get(day.date)?.count ?? 0;
          const appointmentLabel = !day.inMonth ? "mes contiguo" : !available || error
            ? "citas no disponibles" : pending ? "cargando citas" : countText(count);
          const label = dayLabel.format(asUtcDay(day.date)) + ", " + appointmentLabel;
          return (
            <Link
              key={day.date}
              href={"/app/agenda?date=" + day.date}
              className={styles.day}
              data-today={day.isToday}
              data-selected={selected === day.date}
              data-outside={!day.inMonth}
              data-busy={day.inMonth && countReady && count > 0}
              aria-current={day.isToday ? "date" : undefined}
              aria-label={"Abrir agenda del " + label}
              title={label}
              onClick={() => {
                setSelected(day.date);
                if (!day.inMonth) setMonth(monthOf(day.date));
                onNavigate();
              }}
            >
              <span className={styles.dayNumber}>{Number(day.date.slice(8))}</span>
              <span className={styles.busyIndicator} data-heavy={count >= 4} aria-hidden="true">
                {day.inMonth && countReady && count > 0 ? <span /> : null}
              </span>
            </Link>
          );
        })}
      </div>
      <div className={styles.footer} aria-live="polite">
        <span className={styles.monthSummary}>
          {!available ? "Selecciona una sede" : pending ? "Cargando citas…" : error
            ? "Citas no disponibles" : countText(total) + " este mes"}
        </span>
        <button type="button" className={styles.todayButton}
          onClick={() => { setMonth(monthOf(today)); setSelected(today); }}>
          Hoy
        </button>
        <Link
          href={"/app/agenda?date=" + selected}
          className={styles.openAgenda}
          onClick={onNavigate}
          aria-label={"Abrir agenda completa del " + dayLabel.format(asUtcDay(selected))}
          title="Abrir agenda completa"
        >
          <IconArrowUpRight size={17} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

/**
 * Full-month calendar in the expanded left sidebar; a popover exposes exactly
 * the same functional month grid where the navigation collapses to an icon rail.
 * Counts use one active-site-scoped monthSummary query and contain no PII.
 */
export function SidebarMonthAgenda({ active, initialToday }: { active: boolean; initialToday?: string }) {
  const { activeSiteId, loading } = useActiveTenant();
  const [today, setToday] = useState(() => initialToday ?? todayMadrid());
  const [month, setMonth] = useState(() => monthOf(initialToday ?? todayMadrid()));
  const [selected, setSelected] = useState(() => initialToday ?? todayMadrid());
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    if (initialToday) return;
    const refresh = () => {
      const next = todayMadrid();
      if (next === today) return;
      setToday(next);
      setMonth((current) => current === monthOf(today) ? monthOf(next) : current);
    };
    const whenVisible = () => {
      if (document.visibilityState !== "hidden") refresh();
    };
    const interval = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", whenVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", whenVisible);
    };
  }, [initialToday, today]);

  const available = !loading && Boolean(activeSiteId);
  const summary = useQuery({
    queryKey: dentyQueryKeys.appointments.month(month, activeSiteId),
    queryFn: () => getBrowserApi().agenda.monthSummary(month, activeSiteId ?? undefined),
    enabled: available,
    staleTime: 60_000,
  });
  const counts = useMemo(
    () => new Map<string, MonthDaySummary>((summary.data?.days ?? []).map((day) => [day.date, day])),
    [summary.data],
  );
  const total = (summary.data?.days ?? []).reduce((sum, day) => sum + day.count, 0);
  const countReady = available && !summary.isPending && !summary.isError;
  const monthProps: MonthCalendarProps = {
    month, today, selected, setMonth, setSelected,
    onNavigate: () => setOpened(false),
    counts, countReady,
    pending: summary.isPending && available,
    error: summary.isError && available,
    available, total,
  };

  return (
    <div className={styles.root} data-active={active}>
      <div className={styles.rail}>
        <Popover opened={opened} onChange={setOpened} position="right-start"
          width={302} shadow="lg" withinPortal>
          <Popover.Target>
            <button
              className={styles.railButton}
              type="button"
              data-active={active}
              aria-label="Mostrar calendario mensual"
              title="Mostrar calendario mensual"
              onClick={() => setOpened((value) => !value)}
            >
              <IconCalendarEvent size={23} stroke={1.7} aria-hidden="true" />
              <span className={styles.railDate} aria-hidden="true">{Number(today.slice(8))}</span>
              {countReady && (counts.get(today)?.count ?? 0) > 0 ? (
                <span className={styles.railDot} aria-hidden="true" />
              ) : null}
            </button>
          </Popover.Target>
          <Popover.Dropdown className={styles.popover}>
            <MonthCalendar {...monthProps} />
          </Popover.Dropdown>
        </Popover>
      </div>
      <div className={styles.expanded}>
        <MonthCalendar {...monthProps} />
      </div>
    </div>
  );
}
