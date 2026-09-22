import { Badge, Button } from "@mantine/core";
import {
  IconCalendar,
  IconCash,
  IconClipboardCheck,
  IconMicroscope,
  IconPill,
  IconUsers,
} from "@tabler/icons-react";
import Link from "next/link";

import { formatEUR } from "@/domain/money";
import { ClinicalPipelineCard } from "@/shared/clinical/clinical-pipeline-card";
import { DEMO_ALERTS, DEMO_APPOINTMENTS, FINANCE_KPIS } from "@/shared/demo/demo-data";
import { PageHeader } from "@/shared/ui";
import styles from "@/shared/ui/parity.module.css";

const QUICK = [
  ["Pacientes", "Buscar, abrir ficha o dar de alta", "/app/patients", IconUsers, "teal"],
  ["Agenda", "Horario clínico y pipeline por doctor", "/app/agenda", IconCalendar, "green"],
  ["Tareas", "Acciones rápidas de la clínica", "/app/tasks", IconClipboardCheck, "amber"],
  ["Receta", "Preparar y revisar prescripciones", "/app/prescriptions", IconPill, "blue"],
] as const;

export function Dashboard() {
  const current = DEMO_APPOINTMENTS.find((appointment) => appointment.status === "IN_CHAIR");
  const next = DEMO_APPOINTMENTS.find((appointment) => appointment.status === "ARRIVED");

  return (
    <div className={styles.grid}>
      <PageHeader
        eyebrow="HOY · CENTRO DENTAL FUNCIONAL"
        title="¿Qué toca ahora?"
        description={
          "Una vista operativa: paciente actual, siguiente paso y lo que necesita atención."
        }
        actions={<Badge color="green" variant="light">Clínica activa</Badge>}
      />

      <div className={styles.dashboardNowGrid}>
        <section className={styles.nowCard} data-tone="green">
          <div className={styles.nowCardHeader}>
            <Badge color="green" variant="light">En gabinete</Badge>
            <span className={styles.nowIcon}><IconMicroscope size={19} /></span>
          </div>
          <h3>{current?.patientName ?? "Sin paciente"}</h3>
          <p>{current?.reason ?? "No hay una cita activa en este momento."}</p>
          <Button component="a" href="/app/agenda" size="xs">Abrir en agenda</Button>
        </section>

        <section className={styles.nowCard} data-tone="amber">
          <div className={styles.nowCardHeader}>
            <Badge color="yellow" variant="light">Siguiente</Badge>
            <span className={styles.nowIcon}><IconCalendar size={19} /></span>
          </div>
          <h3>{next?.patientName ?? "Jornada despejada"}</h3>
          <p>{next?.reason ?? "No hay otra cita pendiente en sala."}</p>
          <Button component="a" href="/app/agenda" size="xs" variant="light">Ver siguiente</Button>
        </section>

        <section className={styles.nowCard} data-tone="red">
          <div className={styles.nowCardHeader}>
            <Badge color="red" variant="light">Atención</Badge>
            <span className={styles.nowIcon}><IconClipboardCheck size={19} /></span>
          </div>
          <h3>{DEMO_ALERTS.length} alertas</h3>
          <p>Laboratorio, presupuestos, seguimiento y seguridad clínica.</p>
          <Button component="a" href="/app/alerts" size="xs" variant="light">
            Revisar alertas
          </Button>
        </section>
      </div>

      <section className={styles.quickSection} aria-label="Acciones rápidas">
        <div className={styles.quickSectionHeader}>
          <div>
            <h2>Acciones rápidas</h2>
            <p>Lo que más se usa durante una jornada clínica.</p>
          </div>
        </div>
        <div className={styles.quickActionGrid}>
          {QUICK.map(([title, description, href, Icon, tone]) => (
            <Link className={styles.quickAction} data-tone={tone} href={href} key={title}>
              <span className={styles.quickActionIcon}><Icon size={21} aria-hidden={true} /></span>
              <span className={styles.quickActionTitle}>{title}</span>
              <span className={styles.quickActionDescription}>{description}</span>
            </Link>
          ))}
        </div>
      </section>

      <ClinicalPipelineCard active={2} />

      <div className={styles.gridTwo}>
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Gestión económica</h2>
              <p className={styles.sectionDescription}>Producción, cobros y margen de la clínica</p>
            </div>
            <IconCash size={22} aria-hidden={true} />
          </div>
          <div className={styles.metricGrid}>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Producido</span>
              <strong className={styles.metricValue}>
                {formatEUR(FINANCE_KPIS.producedCents)}
              </strong>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Cobrado</span>
              <strong className={styles.metricValue}>
                {formatEUR(FINANCE_KPIS.collectedCents)}
              </strong>
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
              <p className={styles.sectionDescription}>Procesos que acompañan al tratamiento</p>
            </div>
            <IconMicroscope size={22} aria-hidden={true} />
          </div>
          <div className={styles.rowList}>
            <Link className={styles.cardLink} href="/app/laboratory">Laboratorio</Link>
            <Link className={styles.cardLink} href="/app/documents">Documentos</Link>
            <Link className={styles.cardLink} href="/app/communications">Comunicaciones</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
