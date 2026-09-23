"use client";
import { Badge, Button, Group, SimpleGrid, Text, Title } from "@mantine/core";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { DEMO_PATIENTS } from "@/shared/demo/demo-data";
import parityStyles from "@/shared/ui/parity.module.css";
import { DemoAccountSwitcher } from "@/shared/ui/demo-account-switcher";
import { formatEUR } from "@/domain/money";
import styles from "./portal.module.css";
const TABS = ["inicio", "citas", "tratamiento", "documentos", "recetas", "pagos", "mas"] as const;
type PortalTab = (typeof TABS)[number];
export function PatientPortal({ patientId }: { patientId: string }) {
  const [tab, setTab] = useState<PortalTab>("inicio");
  const [waitingList, setWaitingList] = useState(false);
  const patient = DEMO_PATIENTS.find((candidate) => candidate.id === patientId) ?? DEMO_PATIENTS[0];
  if (!patient) return null;
  const fullName = `${patient.firstName} ${patient.lastName}`;
  return (
    <div className={styles.root}>
      <section className={styles.hero}>
        <Group justify="space-between" align="flex-start">
          <Group>
            <Image
              className={styles.logo}
              src="/assets/denty-logo.png"
              alt="Denty"
              width={58}
              height={58}
            />
            <div>
              <Text fw={850}>Mi Denty</Text>
              <Text size="sm" c="dimmed">
                {fullName}
              </Text>
            </div>
          </Group>
          <Group gap="xs">
            <Badge color="green">Seguro</Badge>
            <DemoAccountSwitcher compact />
          </Group>
        </Group>
        <div>
          <Text size="sm" c="dimmed">
            Inicio
          </Text>
          <Title order={1}>Hola, {patient.firstName}</Title>
          <Text c="dimmed">Todo sobre tu tratamiento.</Text>
        </div>
      </section>

      <nav className={styles.tabs} aria-label="Portal del paciente">
        {TABS.map((item) => (
          <button
            className={styles.tab}
            type="button"
            key={item}
            data-active={tab === item}
            onClick={() => setTab(item)}
          >
            {item[0]?.toLocaleUpperCase("es")}
            {item.slice(1)}
          </button>
        ))}
      </nav>

      {tab === "inicio" ? (
        <SimpleGrid cols={{ base: 1, md: 3 }}>
          <section className={parityStyles.section}>
            <Badge color="blue">Próximo paso</Badge>
            <Title order={3} mt="sm">
              {patient.nextStep}
            </Title>
          </section>
          <section className={parityStyles.section}>
            <Badge color="yellow">Próxima cita</Badge>
            <Title order={3} mt="sm">
              21 sep · 10:00
            </Title>
            <Text size="sm" c="dimmed">
              Centro Dental Funcional
            </Text>
          </section>
          <section className={parityStyles.section}>
            <Badge color={patient.balanceCents ? "yellow" : "green"}>Saldo</Badge>
            <Title order={3} mt="sm">
              {formatEUR(patient.balanceCents)}
            </Title>
          </section>
        </SimpleGrid>
      ) : null}

      {tab === "tratamiento" ? (
        <section className={parityStyles.section}>
          <Title order={2}>Tratamiento</Title>
          <Text c="dimmed" mt="xs">
            Tu plan y su estado actual.
          </Text>
          <div className={parityStyles.rowList}>
            <div className={parityStyles.row}>
              <div className={parityStyles.rowMain}>
                <span className={parityStyles.rowTitle}>Implante 46</span>
                <span className={parityStyles.rowMeta}>Planificado · pendiente de aceptación</span>
              </div>
              <Badge color="yellow">Pendiente</Badge>
            </div>
            <div className={parityStyles.row}>
              <div className={parityStyles.rowMain}>
                <span className={parityStyles.rowTitle}>Higiene periodontal</span>
                <span className={parityStyles.rowMeta}>Realizada</span>
              </div>
              <Badge color="green">Hecho</Badge>
            </div>
          </div>
        </section>
      ) : null}

      {tab === "citas" ? (
        <section className={parityStyles.section}>
          <Group justify="space-between" align="flex-start">
            <div>
              <Title order={2}>Citas</Title>
              <Text c="dimmed" size="sm">
                Gestiona tus citas.
              </Text>
            </div>
            <Button component={Link} href="/app/agenda" size="xs">
              Pedir cita
            </Button>
          </Group>
          <Button
            mt="lg"
            variant={waitingList ? "filled" : "light"}
            onClick={() => setWaitingList((value) => !value)}
          >
            {waitingList ? "Salir de espera" : "Avisarme antes"}
          </Button>
        </section>
      ) : null}

      {tab === "pagos" ? (
        <section className={parityStyles.section}>
          <Title order={2}>Pagos</Title>
          <div className={parityStyles.metricGrid}>
            <div className={parityStyles.metric}>
              <span className={parityStyles.metricLabel}>Total plan</span>
              <strong className={parityStyles.metricValue}>1.950,00 €</strong>
            </div>
            <div className={parityStyles.metric}>
              <span className={parityStyles.metricLabel}>Pagado</span>
              <strong className={parityStyles.metricValue}>500,00 €</strong>
            </div>
            <div className={parityStyles.metric}>
              <span className={parityStyles.metricLabel}>Pendiente</span>
              <strong className={parityStyles.metricValue}>1.450,00 €</strong>
            </div>
          </div>
        </section>
      ) : null}

      {tab === "documentos" ? (
        <section className={parityStyles.section}>
          <Title order={2}>Documentos</Title>
          <div className={parityStyles.rowList}>
            {["Consentimiento implantes", "Presupuesto", "Justificante de asistencia"].map(
              (item) => (
                <div className={parityStyles.row} key={item}>
                  <span className={parityStyles.rowTitle}>{item}</span>
                  <Button size="xs" variant="light">
                    Ver
                  </Button>
                </div>
              ),
            )}
          </div>
        </section>
      ) : null}

      {tab === "recetas" ? (
        <section className={parityStyles.section}>
          <Title order={2}>Recetas</Title>
          <Text c="dimmed" size="sm" mt="xs">
            Recetas disponibles.
          </Text>
          <div className={parityStyles.rowList}>
            <div className={parityStyles.row}>
              <div className={parityStyles.rowMain}>
                <span className={parityStyles.rowTitle}>Amoxicilina 500 mg</span>
                <span className={parityStyles.rowMeta}>Validada · 18 sep 2026</span>
              </div>
              <Button size="xs" variant="light">
                Ver
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      {tab === "mas" ? (
        <div className={parityStyles.gridTwo}>
          <section className={parityStyles.section}>
            <Title order={2}>Denty Games</Title>
            <Text c="dimmed" size="sm" mt="xs">
              Juega, sube puestos y gana bonos.
            </Text>
            <Button component={Link} href={`/patient/${patient.id}/games`} mt="lg">
              Jugar
            </Button>
          </section>
          <section className={parityStyles.section}>
            <Title order={2}>Ayuda</Title>
            <Text c="dimmed" mt="xs">
              Contacta con la clínica o actualiza tu salud.
            </Text>
            <Group mt="lg">
              <Button>Consultar</Button>
              <Button variant="light">Actualizar salud</Button>
            </Group>
          </section>
          <section className={parityStyles.section}>
            <Title order={2}>Privacidad</Title>
            <Text c="dimmed" mt="xs">
              Gestiona accesos y permisos familiares.
            </Text>
          </section>
        </div>
      ) : null}
    </div>
  );
}
