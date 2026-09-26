import { Badge, Button } from "@mantine/core";
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

import { formatEUR } from "@/domain/money";

import { ClinicalPipelineCard } from "@/shared/clinical/clinical-pipeline-card";
import { DEMO_ALERTS, DEMO_APPOINTMENTS, FINANCE_KPIS } from "@/shared/demo/demo-data";
import {
  MotionParallax,
  MotionPressable,
  MotionScrollReveal,
} from "@/shared/motion";
import { PageHeader } from "@/shared/ui";
import styles from "@/shared/ui/parity.module.css";

const QUICK = [
  ["Pacientes", "Abrir ficha", "/app/patients", IconUsers, "teal"],
  ["Agenda", "Ver el día", "/app/agenda", IconCalendar, "green"],
  ["Tareas", "Acciones", "/app/tasks", IconClipboardCheck, "amber"],
  ["Receta", "Nueva prescripción", "/app/prescriptions", IconPill, "blue"],
] as const;

export function Dashboard() {
  const current = DEMO_APPOINTMENTS.find((appointment) => appointment.status === "IN_CHAIR");
  const next = DEMO_APPOINTMENTS.find((appointment) => appointment.status === "ARRIVED");

  return (
    <div className={styles.grid}>
      <PageHeader
        eyebrow="HOY"
        title="¿Qué toca ahora?"
        description="La jornada clínica, sin ruido."
        actions={
          <Badge color="green" variant="light">
            Clínica activa
          </Badge>
        }
      />

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
            <h3>{current?.patientName ?? "Sin paciente"}</h3>
            <p>{current?.reason ?? "No hay una cita activa en este momento."}</p>
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
            <h3>{next?.patientName ?? "Jornada despejada"}</h3>
            <p>{next?.reason ?? "No hay otra cita pendiente en sala."}</p>
            <Button component="a" href="/app/agenda" size="xs" variant="light">
              Ver
            </Button>
          </section>
          </MotionPressable>

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
            <h3>{DEMO_ALERTS.length} alertas</h3>
            <p>Solo lo que requiere una decisión o seguimiento.</p>
            <Button component="a" href="/app/alerts" size="xs" variant="light">
              Revisar
            </Button>
          </section>
          </MotionPressable>
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

      <MotionScrollReveal intensity="expressive" delay={0.06}>
        <details className={styles.disclosure}>
          <summary>
            <span>
              <strong>Gestión y seguimiento</strong>
              <small>Pipeline, economía y operativa clínica</small>
            </span>
            <IconChevronRight size={18} aria-hidden={true} />
          </summary>
          <div className={styles.disclosureBody}>
            <ClinicalPipelineCard />

            <div className={styles.gridTwo}>
              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <div>
                    <h2 className={styles.sectionTitle}>Gestión económica</h2>
                    <p className={styles.sectionDescription}>Producción, cobros y margen</p>
                  </div>
                  <IconCash size={20} aria-hidden={true} />
                </div>
                <div className={styles.metricGrid}>
                  <div className={styles.metric}>
                    <span className={styles.metricLabel}>Producido</span>
                    <strong className={styles.metricValue}>{formatEUR(FINANCE_KPIS.producedCents)}</strong>
                  </div>
                  <div className={styles.metric}>
                    <span className={styles.metricLabel}>Cobrado</span>
                    <strong className={styles.metricValue}>{formatEUR(FINANCE_KPIS.collectedCents)}</strong>
                  </div>
                  <div className={styles.metric}>
                    <span className={styles.metricLabel}>Margen</span>
                    <strong className={styles.metricValue}>{formatEUR(FINANCE_KPIS.marginCents)}</strong>
                  </div>
                </div>
              </section>

              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <div>
                    <h2 className={styles.sectionTitle}>Operativa clínica</h2>
                    <p className={styles.sectionDescription}>
                      Herramientas que acompañan al tratamiento
                    </p>
                  </div>
                  <IconMicroscope size={20} aria-hidden={true} />
                </div>
                <div className={styles.rowList}>
                  <Link className={styles.cardLink} href="/app/laboratory">
                    Laboratorio
                  </Link>
                  <Link className={styles.cardLink} href="/app/documents">
                    Documentos
                  </Link>
                  <Link className={styles.cardLink} href="/app/communications">
                    Comunicaciones
                  </Link>
                </div>
              </section>
            </div>
          </div>
        </details>
      </MotionScrollReveal>
    </div>
  );
}
