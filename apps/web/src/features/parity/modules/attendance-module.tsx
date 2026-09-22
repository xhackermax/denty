"use client";

import {
  Badge,
  Button,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useState } from "react";

import { nextAttendanceAction, type AttendanceNextAction } from "@/domain/state-machines";

import styles from "@/shared/ui/parity.module.css";

interface Punch {
  id: string;
  kind: "IN" | "OUT";
  time: string;
  site: string;
}

interface Absence {
  id: string;
  kind: "PARTIAL" | "FULL_DAY";
  window: string;
  reason: string;
}

export function AttendanceModule() {
  const [nextAction, setNextAction] = useState<AttendanceNextAction>("IN");
  const [punches, setPunches] = useState<Punch[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [absenceOpened, setAbsenceOpened] = useState(false);
  const [absenceKind, setAbsenceKind] = useState<Absence["kind"]>("PARTIAL");
  const [windowText, setWindowText] = useState("15:00-17:00");
  const [reason, setReason] = useState("");

  const punch = () => {
    const kind = nextAction;
    setPunches((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        kind,
        time: kind === "IN" ? "08:03" : "17:12",
        site: "Av. Navarra",
      },
    ]);
    setNextAction(nextAttendanceAction(kind));
  };

  const addAbsence = () => {
    if (!reason.trim()) return;
    setAbsences((current) => [
      {
        id: crypto.randomUUID(),
        kind: absenceKind,
        window: absenceKind === "FULL_DAY" ? "Jornada completa" : windowText.trim(),
        reason: reason.trim(),
      },
      ...current,
    ]);
    setReason("");
    setAbsenceOpened(false);
  };

  return (
    <>
      <div className={styles.gridTwo}>
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionHeaderText}>
              <h2 className={styles.sectionTitle}>Jornada de hoy</h2>
              <p className={styles.sectionDescription}>Máximo Tiburcio · Av. Navarra</p>
            </div>
            <Badge color={nextAction === "OUT" ? "green" : "gray"}>
              {nextAction === "OUT" ? "Trabajando" : "Fuera"}
            </Badge>
          </div>
          <Button onClick={punch}>
            {nextAction === "IN" ? "Fichar entrada" : "Fichar salida"}
          </Button>
          <div className={styles.rowList}>
            {punches.map((item) => (
              <div className={styles.row} key={item.id}>
                <div className={styles.rowMain}>
                  <span className={styles.rowTitle}>
                    {item.kind === "IN" ? "Entrada" : "Salida"}
                  </span>
                  <span className={styles.rowMeta}>{item.time} · {item.site}</span>
                </div>
                <Badge variant="light">Registrado</Badge>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionHeaderText}>
              <h2 className={styles.sectionTitle}>Ausencias</h2>
              <p className={styles.sectionDescription}>Parciales o de jornada completa.</p>
            </div>
            <Button size="xs" onClick={() => setAbsenceOpened(true)}>Registrar</Button>
          </div>
          <div className={styles.rowList}>
            {absences.map((absence) => (
              <div className={styles.row} key={absence.id}>
                <div className={styles.rowMain}>
                  <span className={styles.rowTitle}>{absence.reason}</span>
                  <span className={styles.rowMeta}>{absence.window}</span>
                </div>
                <Badge color="yellow" variant="light">
                  {absence.kind === "FULL_DAY" ? "Jornada" : "Parcial"}
                </Badge>
              </div>
            ))}
            {!absences.length ? (
              <Text c="dimmed" size="sm">
                Sin ausencias registradas hoy.
              </Text>
            ) : null}
          </div>
        </section>
      </div>

      <Modal
        opened={absenceOpened}
        onClose={() => setAbsenceOpened(false)}
        title="Registrar ausencia"
      >
        <Stack>
          <Select
            label="Tipo"
            value={absenceKind}
            onChange={(value) => setAbsenceKind((value as Absence["kind"]) ?? "PARTIAL")}
            data={[
              { value: "PARTIAL", label: "Parcial" },
              { value: "FULL_DAY", label: "Jornada completa" },
            ]}
          />
          {absenceKind === "PARTIAL" ? (
            <TextInput
              label="Franja"
              value={windowText}
              onChange={(event) => setWindowText(event.currentTarget.value)}
            />
          ) : null}
          <TextInput
            label="Motivo"
            value={reason}
            onChange={(event) => setReason(event.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setAbsenceOpened(false)}>Cancelar</Button>
            <Button onClick={addAbsence}>Guardar</Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
