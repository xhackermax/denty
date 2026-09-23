"use client";

import { Alert, Badge, Button, Group, Loader, Text, Title } from "@mantine/core";
import Link from "next/link";
import { useMemo } from "react";

import { DEMO_PATIENTS } from "@/shared/demo/demo-data";
import { publicEnv } from "@/shared/config/env";
import { usePatientQuery } from "@/shared/patients/patient-data";
import styles from "@/features/portal/portal.module.css";

interface PatientGamesProps {
  patientId: string;
  backHref: string;
  backLabel: string;
}

export function PatientGames({ patientId, backHref, backLabel }: PatientGamesProps) {
  const demoMode = publicEnv.NEXT_PUBLIC_DEMO_MODE === "true";
  const demoPatient = DEMO_PATIENTS.find((candidate) => candidate.id === patientId);
  const patientQuery = usePatientQuery(patientId, !demoMode);

  const patient = demoMode ? demoPatient : patientQuery.data;
  const recordNumber = patient?.recordNumber ?? "";
  const fullName = patient ? `${patient.firstName ?? ""} ${patient.lastName ?? ""}`.trim() : "";

  const gamesUrl = useMemo(() => {
    const params = new URLSearchParams({ patientId });
    if (recordNumber) params.set("recordNumber", recordNumber);
    if (demoMode) params.set("demo", "legacy-preview");
    return `/games/index.html?${params.toString()}`;
  }, [demoMode, patientId, recordNumber]);

  if (!demoMode && patientQuery.isPending) {
    return (
      <div className={styles.root}>
        <Group>
          <Loader size="sm" />
          <Text>Cargando la ficha del paciente…</Text>
        </Group>
      </div>
    );
  }

  if (!demoMode && patientQuery.isError) {
    return (
      <div className={styles.root}>
        <Alert color="red" title="No se pudo vincular Denty Games a la ficha">
          No se ha podido leer el paciente {patientId}. Los juegos no se abrirán con una ficha
          vacía.
        </Alert>
        <Button component={Link} href={backHref} variant="light">
          {backLabel}
        </Button>
      </div>
    );
  }

  if (!patient || !recordNumber) {
    return (
      <div className={styles.root}>
        <Alert color="yellow" title="La ficha no tiene número de paciente">
          Denty Games necesita un número de ficha para identificar correctamente al paciente.
        </Alert>
        <Button component={Link} href={backHref} variant="light">
          {backLabel}
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <Group justify="space-between" align="flex-start">
        <div>
          <Group gap="xs">
            <Title order={1}>Denty Games</Title>
            <Badge color="teal" variant="light">
              Ficha {recordNumber}
            </Badge>
          </Group>
          <Text c="dimmed" mt={4}>
            {fullName || "Paciente"} · juegos, récords y bono vinculados a esta ficha.
          </Text>
        </div>
        <Button component={Link} href={backHref} variant="light">
          {backLabel}
        </Button>
      </Group>

      <iframe
        key={gamesUrl}
        className={styles.iframe}
        title={`Denty Games · ficha ${recordNumber}`}
        src={gamesUrl}
        sandbox="allow-scripts allow-same-origin"
        referrerPolicy="same-origin"
      />
    </div>
  );
}
