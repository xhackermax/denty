"use client";

import { Badge, Button } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import {
  IconCalendar,
  IconCash,
  IconChevronRight,
  IconClipboardCheck,
  IconMicroscope,
  IconPill,
  IconUsers,
} from "@tabler/icons-react";
import Link from "next/link";

import { todayMadrid } from "@/domain/dates";
import { formatEUR } from "@/domain/money";
import { useAppointmentsQuery } from "@/features/agenda/agenda-data";
import { getBrowserApi } from "@/shared/api/browser";
import { ClinicalPipelineCard } from "@/shared/clinical/clinical-pipeline-card";
import { MotionParallax, MotionPressable, MotionScrollReveal } from "@/shared/motion";
import { usePatientsQuery } from "@/shared/patients/patient-data";
import { dentyQueryKeys } from "@/shared/query";
import { useActiveTenant } from "@/shared/tenancy/active-context";
import { PageHeader } from "@/shared/ui";
import styles from "@/shared/ui/parity.module.css";

const QUICK = [
  ["Pacientes", "Abrir ficha", "/app/patients", IconUsers, "teal"],
  ["Agenda", "Ver el día", "/app/agenda", IconCalendar, "green"],
  ["Tareas", "Acciones", "/app/tasks", IconClipboardCheck, "amber"],
  ["Receta", "Nueva prescripción", "/app/prescriptions", IconPill, "blue"],
] as const;

export function Dashboard() {
  const day = todayMadrid();
  const { activeSiteId, permissions } = useActiveTenant();
  const canReadFinance = permissions.includes("finance.read");
  const canReadAlerts = permissions.includes("alerts.read");
  const appointments = useAppointmentsQuery(day, true, activeSiteId);
  const patients = usePatientsQuery();
  const alerts = useQuery({
    queryKey: dentyQueryKeys.alerts.all,
    queryFn: () => getBrowserApi().engagement.alerts.list(),
    enabled: canReadAlerts,
  });
  const financeQuery = activeSiteId ? { siteId: activeSiteId } : {};
  const finance = useQuery({
    queryKey: dentyQueryKeys.analytics.summary(financeQuery),
    queryFn: () => getBrowserApi().analytics.summary(financeQuery),
    enabled: canReadFinance,
  });

  const names = new Map(
    (patients.data?.items ?? []).map((patient) => [
      patient.id,
      `${patient.firstName} ${patient.lastName}`,
    ]),
  );
  const current = appointments.data?.find((appointment) => appointment.status === "IN_CHAIR");
  const next = appointments.data?.find((appointment) => appointment.status === "ARRIVED");
  const patientName = (patientId?: string) =>
    patientId ? (names.get(patientId) ?? "Paciente") : "Sin paciente";

  return (
    <div className={styles.grid}>
      <PageHeader
        eyebrow="HOY"
        title="¿Qué toca ahora?"
        description="La jornada clínica desde la fuente canónica de Denty."
        actions={
          <Badge color="green" variant="light">
            Clínica activa
          </Badge>
        }
      />

      {(appointments.isError ||
        patients.isError ||
        (canReadAlerts && alerts.isError) ||
        (canReadFinance && finance.isError)) && (
        <section className={styles.section}>
          <strong>No se pudieron cargar todos los datos operativos.</strong>
          <p className={styles.sectionDescription}>
            Denty no sustituye errores del servidor por información ficticia.
          </p>
        </section>
      )}

      <MotionScrollReveal intensity="normal">
        <div className={styles.dashboardNowGrid}>
          <MotionPressable intensity="expressive" className={styles.nowCardMotion}>
            <section className={styles.nowCard} data-tone="green">
              <div className={styles.nowCardHeader}>
                <Badge color="green" variant="light">
                  En gabinete
                </Badge>
                <MotionParallax className={styles.nowIcon} intensity="subtle">
                  <IconMicroscope size={18} />
                </MotionParallax>
              </div>
              <h3>{patientName(current?.patientId)}</h3>
              <p>
                {current?.reason ?? current?.title ?? "No hay una cita activa en este momento."}
              </p>
              <Button component="a" href="/app/agenda" size="xs">
                Agenda
              </Button>
            </section>
          </MotionPressable>
          <MotionPressable intensity="expressive" className={styles.nowCardMotion}>
            <section className={styles.nowCard} data-tone="amber">
              <div className={styles.nowCardHeader}>
                <Badge color="yellow" variant="light">
                  Siguiente
                </Badge>
                <MotionParallax className={styles.nowIcon} intensity="subtle">
                  <IconCalendar size={18} />
                </MotionParallax>
              </div>
              <h3>{next ? patientName(next.patientId) : "Jornada despejada"}</h3>
              <p>{next?.reason ?? next?.title ?? "No hay otra cita pendiente en sala."}</p>
              <Button component="a" href="/app/agenda" size="xs" variant="light">
                Ver
              </Button>
            </section>
          </MotionPressable>
          {canReadAlerts ? (
            <MotionPressable intensity="expressive" className={styles.nowCardMotion}>
              <section className={styles.nowCard} data-tone="red">
                <div className={styles.nowCardHeader}>
                  <Badge color="red" variant="light">
                    Atención
                  </Badge>
                  <MotionParallax className={styles.nowIcon} intensity="subtle">
                    <IconClipboardCheck size={18} />
                  </MotionParallax>
                </div>
                <h3>{alerts.data?.openCount ?? 0} alertas</h3>
                <p>Solo alertas persistidas que requieren seguimiento.</p>
                <Button component="a" href="/app/alerts" size="xs" variant="light">
                  Revisar
                </Button>
              </section>
            </MotionPressable>
          ) : null}
        </div>
      </MotionScrollReveal>

      <MotionScrollReveal intensity="normal" delay={0.04}>
        <section className={styles.quickSection} aria-label="Acciones rápidas">
          <div className={styles.quickSectionHeader}>
            <div>
              <h2>Rápido</h2>
              <p>Lo más usado.</p>
            </div>
          </div>
          <div className={styles.quickActionGrid}>
            {QUICK.map(([title, description, href, Icon, tone]) => (
              <MotionPressable key={title} intensity="normal" className={styles.quickActionMotion}>
                <Link className={styles.quickAction} data-tone={tone} href={href}>
                  <span className={styles.quickActionIcon}>
                    <Icon size={20} aria-hidden={true} />
                  </span>
                  <span className={styles.quickActionTitle}>{title}</span>
                  <span className={styles.quickActionDescription}>{description}</span>
                  <IconChevronRight
                    className={styles.quickActionChevron}
                    size={17}
                    aria-hidden={true}
                  />
                </Link>
              </MotionPressable>
            ))}
          </div>
        </section>
      </MotionScrollReveal>

      <details className={styles.disclosure}>
        <summary>
          <span>
            <strong>Gestión y seguimiento</strong>
            <small>Pipeline y economía</small>
          </span>
          <IconChevronRight size={18} />
        </summary>
        <div className={styles.disclosureBody}>
          <ClinicalPipelineCard />
          {canReadFinance ? (
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.sectionTitle}>Gestión económica</h2>
                  <p className={styles.sectionDescription}>Datos calculados con DENTY-KPI-1.</p>
                </div>
                <IconCash size={20} />
              </div>
              <div className={styles.metricGrid}>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>Producido</span>
                  <strong className={styles.metricValue}>
                    {formatEUR(finance.data?.producedCents ?? 0)}
                  </strong>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>Cobrado</span>
                  <strong className={styles.metricValue}>
                    {formatEUR(finance.data?.collectedCents ?? 0)}
                  </strong>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>Margen</span>
                  <strong className={styles.metricValue}>
                    {formatEUR(finance.data?.marginCents ?? 0)}
                  </strong>
                </div>
              </div>
            </section>
          ) : null}
        </div>
      </details>
    </div>
  );
}
