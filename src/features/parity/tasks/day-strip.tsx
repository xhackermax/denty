"use client";

import { ActionIcon, Button } from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

import { getWeekDays, shiftDay } from "./task-timeline";
import styles from "./tasks-timeline.module.css";

interface DayStripProps {
  selectedDay: string;
  today: string;
  onSelect: (dayKey: string) => void;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function asDate(dayKey: string): Date {
  return new Date(`${dayKey}T12:00:00Z`);
}

const monthFmt = new Intl.DateTimeFormat("es-ES", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const weekdayFmt = new Intl.DateTimeFormat("es-ES", { weekday: "short", timeZone: "UTC" });
const longFmt = new Intl.DateTimeFormat("es-ES", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

export function DayStrip({ selectedDay, today, onSelect }: DayStripProps) {
  const days = getWeekDays(selectedDay);
  return (
    <nav className={styles.strip} aria-label="Selector de día">
      <div className={styles.stripHead}>
        <span className={styles.monthLabel}>
          {capitalize(monthFmt.format(asDate(selectedDay)))}
        </span>
        <div className={styles.stripNav}>
          <ActionIcon
            variant="subtle"
            aria-label="Semana anterior"
            onClick={() => onSelect(shiftDay(selectedDay, -7))}
          >
            <IconChevronLeft size={18} />
          </ActionIcon>
          <Button
            size="compact-xs"
            variant="light"
            disabled={selectedDay === today}
            onClick={() => onSelect(today)}
          >
            Hoy
          </Button>
          <ActionIcon
            variant="subtle"
            aria-label="Semana siguiente"
            onClick={() => onSelect(shiftDay(selectedDay, 7))}
          >
            <IconChevronRight size={18} />
          </ActionIcon>
        </div>
      </div>
      <div className={styles.days}>
        {days.map((day) => {
          const classes = [
            styles.day,
            day === today ? styles.dayToday : "",
            day === selectedDay ? styles.daySelected : "",
          ];
          return (
            <button
              key={day}
              type="button"
              className={classes.filter(Boolean).join(" ")}
              aria-label={longFmt.format(asDate(day))}
              aria-current={day === today ? "date" : undefined}
              aria-pressed={day === selectedDay}
              onClick={() => onSelect(day)}
            >
              <span className={styles.dayName}>
                {weekdayFmt.format(asDate(day)).replace(".", "")}
              </span>
              <span className={styles.dayNumber}>{Number(day.slice(8))}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
