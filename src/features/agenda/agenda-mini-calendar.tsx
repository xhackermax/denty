"use client";

import { ActionIcon, Group, Text, UnstyledButton } from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useState } from "react";

import { buildMonthGrid, monthOf, shiftMonth } from "@/domain/agenda";
import { todayMadrid } from "@/domain/dates";
import styles from "./agenda.module.css";

const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];
const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

export function AgendaMiniCalendar({
  selected,
  visible,
  onSelect,
}: {
  selected: string;
  visible: readonly string[];
  onSelect: (date: string) => void;
}) {
  const [month, setMonth] = useState(monthOf(selected));
  const [year = 0, monthIndex = 1] = month.split("-").map(Number);
  // Six rows always: the side panel must not change height between months.
  const days = buildMonthGrid(month, todayMadrid(), { minWeeks: 6 }).flat();
  const visibleSet = new Set(visible);

  return (
    <div className={styles.miniCalendar}>
      <Group justify="space-between" mb={6}>
        <ActionIcon
          variant="subtle"
          size="sm"
          aria-label="Mes anterior"
          onClick={() => setMonth(shiftMonth(month, -1))}
        >
          <IconChevronLeft size={14} />
        </ActionIcon>
        <Text size="sm" fw={700}>
          {MONTHS[monthIndex - 1]} {year}
        </Text>
        <ActionIcon
          variant="subtle"
          size="sm"
          aria-label="Mes siguiente"
          onClick={() => setMonth(shiftMonth(month, 1))}
        >
          <IconChevronRight size={14} />
        </ActionIcon>
      </Group>
      <div className={styles.miniCalendarGrid} role="grid" aria-label="Calendario">
        {WEEKDAYS.map((day) => (
          <span key={day} className={styles.miniCalendarWeekday}>
            {day}
          </span>
        ))}
        {days.map(({ date, inMonth, isToday }) => (
          <UnstyledButton
            key={date}
            className={styles.miniCalendarDay}
            data-outside={!inMonth}
            data-today={isToday}
            data-visible={visibleSet.has(date)}
            data-selected={date === selected}
            aria-label={date}
            onClick={() => onSelect(date)}
          >
            {Number(date.slice(8))}
          </UnstyledButton>
        ))}
      </div>
    </div>
  );
}
