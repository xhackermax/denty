"use client";

import { useQuery } from "@tanstack/react-query";
import { IconArrowUpRight, IconCalendarEvent, IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { buildMonthGrid, monthOf, shiftMonth, type MonthDaySummary } from "@/domain/agenda";
import { todayMadrid } from "@/domain/dates";
import { getBrowserApi } from "@/shared/api/browser";
import { dentyQueryKeys } from "@/shared/query";
import { useActiveTenant } from "@/shared/tenancy/active-context";

import styles from "./sidebar-week-agenda.module.css";

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"] as const;
const monthLabel = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric", timeZone: "UTC" });
const dayLabel = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const asUtcDay = (date: string) => new Date(`${date}T12:00:00Z`);

function countText(count: number): string {
  return count === 1 ? "1 cita" : `${count} citas`;
}

function titleCase(text: string): string {
  return text.charAt(0).toLocaleUpperCase("es") + text.slice(1);
}

/**
 * Full-month calendar in the global sidebar. Count data stays site-scoped and
 * reuses the dashboard's monthly query cache; patient names are never shown.
 * The compact tablet rail keeps a direct link to today's full agenda.
 */
export function SidebarWeekAgenda({ active, initialToday }: { active: boolean; initialToday?: string }) {
  const { activeSiteId, loading } = useActiveTenant();
  const [today, setToday] = useState(() => initialToday ?? todayMadrid());
  const [month, setMonth] = useState(() => monthOf(initialToday ?? todayMadrid()));
  const days = useMemo(() => buildMonthGrid(month, today, { minWeeks: 6 }).flat(), [month, today]);

  // A session crossing midnight updates today without resetting a month the user is browsing.
  useEffect(() => {
    if (initialToday) return;
    const refresh = () => {
      const next = todayMadrid();
      if (next === today) return;
      setToday(next);
      setMonth((current) => current === monthOf(today) ? monthOf(next) : current);
    };
    const onVisible = () => {
      if (document.visibilityState !== "hidden") refresh();
    };
    const interval = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [initialToday, today]);

  const available = !loading && Boolean(activeSiteId);
  const summary = useQuery({
    queryKey: dentyQueryKeys.appointments.month(month, activeSiteId),
    queryFn: () => getBrowserApi().agenda.monthSummary(month, activeSiteId ?? undefined),
    enabled: available,
    staleTime: 60_000,
  });
  const isPending = available && summary.isPending;
  const isError = available && summary.isError;
  const countReady = available && !isPending && !isError;
  const monthDays = (summary.data?.days ?? []).filter((day) => monthOf(day.date) === month);
  const counts = new Map<string, MonthDaySummary>(monthDays.map((day) => [day.date, day]));
  const total = monthDays.reduce((sum, day) => sum + day.count, 0);
  const todayCount = counts.get(today)?.count ?? 0;
  const showingCurrentMonth = monthOf(today) === month;
  const monthTitle = titleCase(monthLabel.format(asUtcDay(`${month}-01`)));

  return (
    <div className={styles.root} data-active={active}>
      <Link
        href={`/app/agenda?date=${today}`}
        className={styles.railLink}
        data-active={active}
        aria-label={`Abrir agenda de hoy, ${dayLabel.format(asUtcDay(today))}`}
        title="Abrir agenda de hoy"
      >
        <IconCalendarEvent size={22} stroke={1.75} aria-hidden="true" />
        <span className={styles.railDate} aria-hidden="true">{Number(today.slice(8))}</span>
        {countReady && showingCurrentMonth && todayCount > 0 ? <span className={styles.railDot} aria-hidden="true" /> : null}
      </Link>

      <div className={styles.expanded}>
        <div className={styles.heading}>
          <Link
            className={styles.openFull}
            href={`/app/agenda?date=${today}`}
            aria-label="Abrir agenda de hoy"
            title="Abrir agenda de hoy"
          >
            <IconCalendarEvent size={18} stroke={1.8} aria-hidden="true" />
            <span>Agenda</span>
            <IconArrowUpRight size={14} stroke={2} aria-hidden="true" />
          </Link>
        </div>
        <div className={styles.controls}>
          <button
            type="button"
            className={styles.control}
            aria-label="Mes anterior"
            onClick={() => setMonth((current) => shiftMonth(current, -1))}
          >
            <IconChevronLeft size={17} aria-hidden="true" />
          </button>
          <span className={styles.range} aria-live="polite">{monthTitle}</span>
          <button
            type="button"
            className={styles.control}
            aria-label="Mes siguiente"
            onClick={() => setMonth((current) => shiftMonth(current, 1))}
          >
            <IconChevronRight size={17} aria-hidden="true" />
          </button>
          {!showingCurrentMonth ? (
            <button type="button" className={styles.todayButton} onClick={() => setMonth(monthOf(today))}>
              Hoy
            </button>
          ) : null}
        </div>
        <div className={styles.week} role="group" aria-label="Días de la semana">
          {WEEKDAYS.map((weekday) => (
            <span className={styles.weekday} key={weekday} aria-hidden="true">{weekday}</span>
          ))}
        </div>
        <div className={styles.monthGrid} role="group" aria-label="Días del mes">
          {days.map((day) => {
            const count = counts.get(day.date)?.count ?? 0;
            const dayCountReady = countReady && day.inMonth;
            const countDescription = !day.inMonth
              ? "mes contiguo"
              : !available || isError
                ? "citas no disponibles"
                : isPending ? "cargando citas" : countText(count);
            return (
              <Link
                href={`/app/agenda?date=${day.date}`}
                key={day.date}
                className={styles.day}
                data-outside={!day.inMonth}
                data-today={day.isToday}
                data-active={active && day.isToday}
                data-busy={dayCountReady && count > 0}
                aria-label={`Abrir agenda del ${dayLabel.format(asUtcDay(day.date))}, ${countDescription}`}
                aria-current={day.isToday ? "date" : undefined}
                title={`${dayLabel.format(asUtcDay(day.date))}: ${countDescription}`}
              >
                <span className={styles.dayNumber}>{Number(day.date.slice(8))}</span>
                <span className={styles.dots} aria-hidden="true">
                  {dayCountReady && count > 0 ? (
                    <span className={styles.busyDot} data-full={count >= 4} />
                  ) : null}
                </span>
              </Link>
            );
          })}
        </div>
        <div className={styles.footer} aria-live="polite">
          <span>{!available ? "Selecciona una sede" : isPending ? "Cargando citas…" : isError ? "Citas no disponibles" : `${countText(total)} este mes`}</span>
          <Link href={`/app/agenda?date=${today}`} aria-label="Ver agenda completa">
            Ver día <IconArrowUpRight size={12} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
