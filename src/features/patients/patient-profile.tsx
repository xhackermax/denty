"use client";

import { Alert, Badge, Button, Group, SimpleGrid, Text, Title } from "@mantine/core";
import {
  IconCalendar,
  IconFileText,
  IconHeartbeat,
  IconPill,
  IconReceipt,
} from "@tabler/icons-react";
import Link from "next/link";
import { useState } from "react";

import { dateDMY, epochMillis, hhmm } from "@/domain/dates";
import { formatEUR } from "@/domain/money";
import { ClinicalPipelineCard } from "@/shared/clinical/clinical-pipeline-card";
import { ClinicalSyncCard } from "@/shared/clinical/clinical-sync-card";
import { DEMO_PATIENTS } from "@/shared/demo/demo-data";
import { PatientClinicalSummary } from "./patient-clinical-summary";
import styles from "@/shared/ui/parity.module.css";
import {
  usePatientProjectionQuery,
  usePatientQuery,
} from "@/shared/patients/patient-data";
import { publicEnv } from "@/shared/config/env";
import { PageHeader } from "@/shared/ui";

const SOURCE_LABELS: Readonly<Record<string, string>> = {
  GOOGLE: "Google",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  PATIENT_REFERRAL: "Recomendación de paciente",
  PROFESSIONAL_REFERRAL: "Recomendación profesional",
  WALK_IN: "Entrada directa",
  EXISTING_PATIENT: "Paciente existente",
  OTHER: "Otro",
};

export function PatientProfile({ patientId }: { patientId: string }) {
  const demoMode = publicEnv.NEXT_PUBLIC_DEMO_MODE === "true";
  const demoPatient = DEMO_PATIENTS.find((candidate) => candidate.id === patientId);
  const patientQuery = usePatientQuery(patientId, !demoMode);
  const projectionQuery = usePatientProjectionQuery(patientId, !demoMode);
  const [now] = useState(() => Date.now());

  if (demoMode && !demoPatient) {
    return (
      <PageHeader
        title="Paciente no encontrado"
        description="La ficha solicitada no existe en el conjunto demo."
      />
    );
  }

  if (!demoMode && patientQuery.isError) {
    return (
      <Alert color="red" title="No se pudo cargar la ficha">
        Revisa la conexión con el backend Denty. No se ha usado una ficha demo.
      </Alert>
    );
  }

  if (!demoMode && !patientQuery.data) {
    return (
      <PageHeader
        title="Cargando ficha"
        description="Consultando la información clínica del paciente."
      />
    );
  }

  const patient = demoMode ? null : patientQuery.data;
  const fullName = demoPatient
    ? `${demoPatient.firstName} ${demoPatient.lastName}`
    : `${patient?.firstName ?? ""} ${patient?.lastName ?? ""}`.trim();
  const recordNumber = demoPatient?.recordNumber ?? patient?.recordNumber ?? "—";
  const phone = demoPatient?.phone ?? patient?.phone ?? "Sin teléfono";
  const email = demoPatient?.email ?? patient?.email ?? "Sin email";
  const source = demoPatient?.source ?? (
    patient?.declaredSource
      ? SOURCE_LABELS[patient.declaredSource] ?? patient.declaredSource
      : "Sin origen registrado"
  );

  const projection = projectionQuery.data;
  const upcoming = [...(projection?.appointments ?? [])]
    .filter((appointment) => {
      if (["CANCELLED", "NO_SHOW", "COMPLETED"].includes(appointment.status)) {
        return false;
      }
      return epochMillis(appointment.startsAt) >= now;
    })
    .sort((left, right) => epochMillis(left.startsAt) - epochMillis(right.startsAt))[0];
  const completed = [...(projection?.appointments ?? [])]
    .filter((appointment) => appointment.status === "COMPLETED")
    .sort((left, right) => epochMillis(right.startsAt) - epochMillis(left.startsAt))[0];
  const openBudgetTotal = (projection?.budgets ?? []).reduce(
    (sum, budget) => sum + budget.totalCents,
    0,
  );

  const nextVisitTitle = demoPatient?.nextStep ?? (
    upcoming
      ? `${dateDMY(upcoming.startsAt)} · ${hhmm(upcoming.startsAt)}`
      : "Sin próxima cita"
  );
  const nextVisitDescription = demoPatient
    ? "Resumen operativo y próximo paso recuperado de Denty original."
    : upcoming?.reason ?? upcoming?.title ?? "La agenda no tiene una cita futura activa.";
  const economyValue = demoPatient
    ? formatEUR(demoPatient.balanceCents)
    : formatEUR(openBudgetTotal);
  const economyDescription = demoPatient
    ? "Saldo pendiente registrado"
    : `${projection?.budgets.length ?? 0} presupuestos abiertos`;

  return (
    <div className={styles.grid}>
      <PageHeader
        eyebrow={`Ficha ${recordNumber}`}
        title={fullName || "Paciente"}
        description={`${phone} · ${email} · Origen: ${source}`}
        actions={
          <Group>
            <Badge variant="light">{demoMode ? "Demo" : "Servidor"}</Badge>
            <Button component={Link} href={`/app/patients/${patientId}/odontogram`}>
              Odontograma
            </Button>
            <Button component={Link} href="/app/agenda" variant="light">
              Dar cita
            </Button>
          </Group>
        }
      />

      {!demoMode && projectionQuery.isError ? (
        <Alert color="yellow" title="Resumen operativo incompleto">
          La ficha demográfica está disponible, pero no se pudo cargar su proyección clínica.
        </Alert>
      ) : null}

      <SimpleGrid cols={{ base: 1, md: 2 }}>
        <section className={styles.section}>
          <Badge color="blue" variant="light">
            Ahora
          </Badge>
          <Title order={3} mt="sm">{nextVisitTitle}</Title>
          <Text c="dimmed" mt="xs" size="sm">
            {nextVisitDescription}
          </Text>
          {!demoMode && completed ? (
            <Text c="dimmed" mt="sm" size="xs">
              Última visita completada: {dateDMY(completed.startsAt)} ·{" "}
              {hhmm(completed.startsAt)}
            </Text>
          ) : null}
        </section>
        <section className={styles.section}>
          <Badge
            color={demoPatient?.balanceCents || openBudgetTotal ? "yellow" : "green"}
            variant="light"
          >
            Economía
          </Badge>
          <Title order={3} mt="sm">{economyValue}</Title>
          <Text c="dimmed" mt="xs" size="sm">{economyDescription}</Text>
        </section>
      </SimpleGrid>

      <ClinicalPipelineCard active={2} />
      <ClinicalSyncCard patientId={patientId} demoMode={demoMode} />
      <PatientClinicalSummary patientId={patientId} demoMode={demoMode} />

      <div className={styles.cards}>
        <Link className={styles.cardLink} href={`/app/patients/${patientId}/odontogram`}>
          <IconHeartbeat size={22} />
          <span className={styles.cardLinkTitle}>Clínica</span>
          <span className={styles.cardLinkDescription}>
            Odontograma, endodoncia AAE, periodoncia y actos clínicos
          </span>
        </Link>
        <Link className={styles.cardLink} href="/app/documents">
          <IconFileText size={22} />
          <span className={styles.cardLinkTitle}>Documentos</span>
          <span className={styles.cardLinkDescription}>
            Consentimientos, presupuestos, firma, dossier y justificantes
          </span>
        </Link>
        <Link className={styles.cardLink} href="/app/prescriptions">
          <IconPill size={22} />
          <span className={styles.cardLinkTitle}>Recetas</span>
          <span className={styles.cardLinkDescription}>
            Borradores, validación, anulación y prescriptor
          </span>
        </Link>
        <Link className={styles.cardLink} href="/app/finance">
          <IconReceipt size={22} />
          <span className={styles.cardLinkTitle}>Presupuestos y cobros</span>
          <span className={styles.cardLinkDescription}>
            Plan, presupuesto, factura y asignación de cobros
          </span>
        </Link>
        <Link className={styles.cardLink} href="/app/agenda">
          <IconCalendar size={22} />
          <span className={styles.cardLinkTitle}>Citas</span>
          <span className={styles.cardLinkDescription}>
            Próximas citas, cambios y solicitudes del paciente
          </span>
        </Link>
      </div>
    </div>
  );
}
