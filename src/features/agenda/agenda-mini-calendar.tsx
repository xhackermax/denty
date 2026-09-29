"use client";

import { ActionIcon, Group, Text, UnstyledButton } from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useState } from "react";

import { addDaysYMD, rangeStartFor } from "@/domain";
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

function shiftMonth(month: string, delta: number): string {
  const [year = 0, index = 1] = month.split("-").map(Number);
  const total = year * 12 + (index - 1) + delta;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

export function AgendaMiniCalendar({
  selected,
  visible,
  onSelect,
}: {
  selected: string;
  visible: readonly string[];
  onSelect: (date: string) => void;
}) {
  const [month, setMonth] = useState(selected.slice(0, 7));
  const [year = 0, monthIndex = 1] = month.split("-").map(Number);
  const gridStart = rangeStartFor(`${month}-01`, 7);
  const days = Array.from({ length: 42 }, (_, index) => addDaysYMD(gridStart, index));
  const today = todayMadrid();
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
        {days.map((day) => (
          <UnstyledButton
            key={day}
            className={styles.miniCalendarDay}
            data-outside={!day.startsWith(month)}
            data-today={day === today}
            data-visible={visibleSet.has(day)}
            data-selected={day === selected}
            aria-label={day}
            onClick={() => onSelect(day)}
          >
            {Number(day.slice(8))}
          </UnstyledButton>
        ))}
      </div>
    </div>
  );
}
