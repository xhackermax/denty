"use client";

import { TextInput } from "@mantine/core";
import { useState } from "react";

import { describeDay, shiftDay } from "./task-timeline";
import styles from "./tasks-timeline.module.css";

interface DayPickerProps {
  value: string | null;
  today: string;
  onChange: (day: string | null) => void;
}

type Choice = "today" | "tomorrow" | "custom" | "none";

function derive(value: string | null, today: string): Choice {
  if (value === null) return "none";
  if (value === today) return "today";
  if (value === shiftDay(today, 1)) return "tomorrow";
  return "custom";
}

const LABELS: Record<Choice, string> = {
  today: "Hoy",
  tomorrow: "Mañana",
  custom: "Elegir fecha",
  none: "Sin día (Bandeja)",
};

const ORDER: Choice[] = ["today", "tomorrow", "custom", "none"];

export function DayPicker({ value, today, onChange }: DayPickerProps) {
  // "Elegir fecha" debe seguir activa aunque la fecha elegida coincida con hoy o mañana.
  const [forceCustom, setForceCustom] = useState(false);
  const derived = derive(value, today);
  const choice: Choice = forceCustom && value !== null ? "custom" : derived;

  function select(next: Choice) {
    setForceCustom(next === "custom");
    if (next === "today") onChange(today);
    else if (next === "tomorrow") onChange(shiftDay(today, 1));
    else if (next === "none") onChange(null);
    else if (value === null) onChange(today);
  }

  return (
    <div>
      <span className={styles.fieldLabel} id="task-day-label">
        Día
      </span>
      <div className={styles.choices} role="radiogroup" aria-labelledby="task-day-label">
        {ORDER.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={choice === option}
            className={`${styles.choice} ${choice === option ? styles.choiceOn : ""}`}
            onClick={() => select(option)}
          >
            {LABELS[option]}
          </button>
        ))}
      </div>
      {choice === "custom" && value !== null ? (
        <TextInput
          mt="xs"
          label="Fecha"
          type="date"
          value={value}
          onChange={(event) => {
            if (event.currentTarget.value) onChange(event.currentTarget.value);
          }}
        />
      ) : null}
      <p className={styles.fieldHint}>
        {value === null
          ? "Se guarda en la Bandeja, sin día."
          : `Se programa para ${describeDay(value, today)}.`}
      </p>
    </div>
  );
}
