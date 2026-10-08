"use client";

import { useQueries } from "@tanstack/react-query";
import { IconArrowUpRight, IconCalendarEvent, IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { monthOf, type MonthDaySummary } from "@/domain/agenda";
import { addDaysMadrid, dateYMDMadrid, madridLocalDateTime, todayMadrid, weekdayMadrid } from "@/domain/dates";
import { getBrowserApi } from "@/shared/api/browser";
import { dentyQueryKeys } from "@/shared/query";
import { useActiveTenant } from "@/shared/tenancy/active-context";

import styles from "./sidebar-week-agenda.module.css";

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"] as const;
const monthLabel = new Intl.DateTimeFormat("es-ES", { month: "short", year: "numeric", timeZone: "UTC" });
const dayLabel = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const shortDay = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", timeZone: "UTC" });
const asUtcDay = (date: string) => new Date(`${date}T12:00:00Z`);

/** Madrid-local noon avoids skipping or repeating days around DST changes. */
export function weekDatesMadrid(anchor: string): string[] {
  const mondayOffset = (weekdayMadrid(anchor) + 6) % 7;
  const noon = madridLocalDateTime(anchor, "12:00");
  return Array.from({ length: 7 }, (_, offset) =>
    dateYMDMadrid(addDaysMadrid(noon, offset - mondayOffset)),
  );
}

function moveWeek(date: string, weeks: number): string {
  return dateYMDMadrid(addDaysMadrid(madridLocalDateTime(date, "12:00"), weeks * 7));
}

function countText(count: number): string {
  return count === 1 ? "1 cita" : `${count} citas`;
}

/**
 * A functional, site-scoped week calendar replacing the plain Agenda label.
 * Counts reuse the dashboard's month-summary cache, with 1-2 requests rather
 * than seven day requests. No patient identities are exposed in the navigation.
 */
export function SidebarWeekAgenda({ active, initialToday }: { active: boolean; initialToday?: string }) {
  const { activeSiteId, loading } = useActiveTenant();
  const [today, setToday] = useState(() => initialToday ?? todayMadrid());
  const [weekAnchor, setWeekAnchor] = useState(() => initialToday ?? todayMadrid());
  const days = useMemo(() => weekDatesMadrid(weekAnchor), [weekAnchor]);
  const months = useMemo(() => [...new Set(days.map(monthOf))], [days]);

  // A long-running clinic session crosses midnight without requiring a reload.
  useEffect(() => {
    if (initialToday) return;
    const refresh = () => {
      const next = todayMadrid();
      setToday((previous) => {
        if (next !== previous) {
          setWeekAnchor((anchor) =>
            weekDatesMadrid(anchor)[0] === weekDatesMadrid(previous)[0] ? next : anchor,
          );
        }
        return next;
      });
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
  }, [initialToday]);

  const summaries = useQueries({
    queries: months.map((month) => ({
      queryKey: dentyQueryKeys.appointments.month(month, activeSiteId),
      queryFn: () => getBrowserApi().agenda.monthSummary(month, activeSiteId ?? undefined),
      enabled: !loading && Boolean(activeSiteId),
      staleTime: 60_000,
    })),
  });
  const available = !loading && Boolean(activeSiteId);
  const isPending = available && summaries.some((result) => result.isPending);
  const isError = available && summaries.some((result) => result.isError);
  const counts = new Map<string, MonthDaySummary>(
    summaries.flatMap((result) => result.data?.days ?? []).map((day) => [day.date, day]),
  );
  const total = days.reduce((sum, date) => sum + (counts.get(date)?.count ?? 0), 0);
  const currentWeek = days.includes(today);
  const todayCount = counts.get(today)?.count ?? 0;
  const countReady = available && !isPending && !isError;
  const rangeTitle = `${shortDay.format(asUtcDay(days[0]!))} – ${shortDay.format(asUtcDay(days[6]!))}`;

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
        {countReady && todayCount > 0 ? <span className={styles.railDot} aria-hidden="true" /> : null}
      </Link>

      <div className={styles.expanded}>
        <div className={styles.heading}>
          <Link
            className={styles.openFull}
            href={`/app/agenda?date=${today}`}
            aria-label="Abrir agenda de hoy"
            title="Abrir agenda de hoy"
          >
            <IconCalendarEvent size={17} stroke={1.8} aria-hidden="true" />
            <span>{monthLabel.format(asUtcDay(days[3]!))}</span>
            <IconArrowUpRight size={13} stroke={2} aria-hidden="true" />
          </Link>
        </div>
        <div className={styles.controls}>
          <button
            type="button"
            className={styles.control}
            aria-label="Semana anterior"
            onClick={() => setWeekAnchor((value) => moveWeek(value, -1))}
          >
            <IconChevronLeft size={16} aria-hidden="true" />
          </button>
          <span className={styles.range} title={rangeTitle}>{rangeTitle}</span>
          <button
            type="button"
            className={styles.control}
            aria-label="Semana siguiente"
            onClick={() => setWeekAnchor((value) => moveWeek(value, 1))}
          >
            <IconChevronRight size={16} aria-hidden="true" />
          </button>
          {!currentWeek ? (
            <button type="button" className={styles.todayButton} onClick={() => setWeekAnchor(today)}>
              Hoy
            </button>
          ) : null}
        </div>
        <div className={styles.week} role="group" aria-label="Días de la semana">
          {days.map((date, index) => {
            const count = counts.get(date)?.count ?? 0;
            const countDescription = !available || isError
              ? "citas no disponibles"
              : isPending ? "cargando citas" : countText(count);
            return (
              <Link
                href={`/app/agenda?date=${date}`}
                key={date}
                className={styles.day}
                data-today={date === today}
                data-active={active && date === today}
                data-busy={countReady && count > 0}
                aria-label={`Abrir agenda del ${dayLabel.format(asUtcDay(date))}, ${countDescription}`}
                aria-current={date === today ? "date" : undefined}
                title={`${dayLabel.format(asUtcDay(date))}: ${countDescription}`}
              >
                <span className={styles.weekday}>{WEEKDAYS[index]}</span>
                <span className={styles.dayNumber}>{Number(date.slice(8))}</span>
                <span className={styles.dots} aria-hidden="true">
                  {countReady && count > 0 ? (
                    <span className={styles.busyDot} data-full={count >= 4} />
                  ) : null}
                </span>
              </Link>
            );
          })}
        </div>
        <div className={styles.footer} aria-live="polite">
          <span>{!available ? "Selecciona una sede" : isPending ? "Cargando citas…" : isError ? "Citas no disponibles" : `${countText(total)} esta semana`}</span>
          <Link href={`/app/agenda?date=${today}`} aria-label="Ver agenda completa">
            Ver día <IconArrowUpRight size={12} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
