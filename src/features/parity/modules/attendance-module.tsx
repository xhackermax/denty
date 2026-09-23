"use client";
import { Alert, Badge, Button, Group, Modal, Select, Stack, Text, TextInput } from "@mantine/core";
import { useMemo, useState } from "react";
import { madridLocalDateTime, todayMadrid, toMadridISO } from "@/domain/dates";
import { nextAttendanceAction, type AttendanceNextAction } from "@/domain/state-machines";
import { useAgendaContextQuery } from "@/features/agenda/agenda-data";
import { getBrowserApi } from "@/shared/api/browser";
import { publicEnv } from "@/shared/config/env";
import { DEMO_STAFF } from "@/shared/demo/demo-data";
import styles from "@/shared/ui/parity.module.css";
interface Punch {
  id: string;
  kind: "IN" | "OUT";
  time: string;
  site: string;
}
interface Absence {
  id: string;
  staffId: string;
  staffName: string;
  kind: "PARTIAL" | "FULL_DAY";
  window: string;
  reason: string;
}
export function AttendanceModule() {
  const demoMode = publicEnv.NEXT_PUBLIC_DEMO_MODE === "true";
  const contextQuery = useAgendaContextQuery(!demoMode);
  const doctorOptions = useMemo(() => {
    if (demoMode) {
      return DEMO_STAFF.filter((staff) => staff.role.toLocaleLowerCase("es").includes("odont")).map(
        (staff) => ({ value: staff.id, label: staff.displayName }),
      );
    }
    return (contextQuery.data?.staff ?? []).map((staff) => ({
      value: staff.id,
      label: staff.displayName,
    }));
  }, [contextQuery.data?.staff, demoMode]);
  const [nextAction, setNextAction] = useState<AttendanceNextAction>("IN");
  const [punches, setPunches] = useState<Punch[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [absenceOpened, setAbsenceOpened] = useState(false);
  const [absenceStaffId, setAbsenceStaffId] = useState(demoMode ? "maximo" : "");
  const [absenceKind, setAbsenceKind] = useState<Absence["kind"]>("PARTIAL");
  const [windowText, setWindowText] = useState("15:00-17:00");
  const [reason, setReason] = useState("");
  const [absenceSaving, setAbsenceSaving] = useState(false);
  const [absenceError, setAbsenceError] = useState<string | null>(null);
  const punch = () => {
    const kind = nextAction;
    setPunches((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        kind,
        time: new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
        site: "Av. Navarra",
      },
    ]);
    setNextAction(nextAttendanceAction(kind));
  };
  const addAbsence = async () => {
    const doctor = doctorOptions.find((item) => item.value === absenceStaffId);
    if (!doctor || !reason.trim()) return;
    setAbsenceError(null);
    let startsAt = "";
    let endsAt = "";
    if (absenceKind === "FULL_DAY") {
      startsAt = "08:00";
      endsAt = "20:00";
    } else {
      const match = /^(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})$/.exec(windowText.trim());
      if (!match) {
        setAbsenceError("Usa una franja con formato HH:MM-HH:MM, por ejemplo 15:00-17:00.");
        return;
      }
      const [, matchedStart, matchedEnd] = match;
      if (!matchedStart || !matchedEnd) {
        setAbsenceError("No se pudo interpretar la franja horaria.");
        return;
      }
      startsAt = matchedStart;
      endsAt = matchedEnd;
      if (endsAt <= startsAt) {
        setAbsenceError("La hora de fin debe ser posterior a la hora de inicio.");
        return;
      }
    }
    let absenceId = crypto.randomUUID();
    if (!demoMode) {
      setAbsenceSaving(true);
      try {
        const date = todayMadrid();
        const created = await getBrowserApi().attendance.createAbsence({
          staffId: doctor.value,
          startsAt: toMadridISO(madridLocalDateTime(date, startsAt)),
          endsAt: toMadridISO(madridLocalDateTime(date, endsAt)),
          type: "PERSONAL",
          reason: reason.trim(),
        });
        absenceId = created.id;
      } catch {
        setAbsenceError("No se pudo registrar la ausencia en el servidor.");
        setAbsenceSaving(false);
        return;
      }
      setAbsenceSaving(false);
    }
    setAbsences((current) => [
      {
        id: absenceId,
        staffId: doctor.value,
        staffName: doctor.label,
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
              <p className={styles.sectionDescription}>
                Fichaje por entrada y salida con trazabilidad.
              </p>
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
                  <span className={styles.rowMeta}>
                    {item.time} · {item.site}
                  </span>
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
              <p className={styles.sectionDescription}>
                Selecciona uno de los odontólogos registrados.
              </p>
            </div>
            <Button size="xs" onClick={() => setAbsenceOpened(true)}>
              Registrar
            </Button>
          </div>
          <div className={styles.rowList}>
            {absences.map((absence) => (
              <div className={styles.row} key={absence.id}>
                <div className={styles.rowMain}>
                  <span className={styles.rowTitle}>
                    {absence.staffName} · {absence.reason}
                  </span>
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
          {absenceError ? <Alert color="red">{absenceError}</Alert> : null}
          <Select
            searchable
            label="Odontólogo"
            placeholder="Selecciona doctor"
            value={absenceStaffId}
            onChange={(value) => setAbsenceStaffId(value ?? "")}
            data={doctorOptions}
            nothingFoundMessage="No hay odontólogos registrados"
          />
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
            <Button variant="default" onClick={() => setAbsenceOpened(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!absenceStaffId || !reason.trim()}
              loading={absenceSaving}
              onClick={() => void addAbsence()}
            >
              Guardar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
