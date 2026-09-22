"use client";

import { Badge, Button, Group, SimpleGrid, Text, Title } from "@mantine/core";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { DEMO_PATIENTS } from "@/shared/demo/demo-data";
import parityStyles from "@/shared/ui/parity.module.css";
import { formatEUR } from "@/domain/money";

import styles from "./portal.module.css";

const TABS = [
  "inicio",
  "citas",
  "tratamiento",
  "documentos",
  "recetas",
  "pagos",
  "mas",
] as const;
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
              <Text fw={850}>Denty Paciente</Text>
              <Text size="sm" c="dimmed">Espacio personal de {fullName}</Text>
            </div>
          </Group>
          <Badge color="green">Acceso seguro</Badge>
        </Group>
        <div>
          <Text size="sm" c="dimmed">Mi espacio</Text>
          <Title order={1}>Hola, {patient.firstName}</Title>
          <Text c="dimmed">Tu tratamiento, citas, dinero y decisiones en un solo recorrido.</Text>
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
            {item[0]?.toLocaleUpperCase("es")}{item.slice(1)}
          </button>
        ))}
      </nav>

      {tab === "inicio" ? (
        <SimpleGrid cols={{ base: 1, md: 3 }}>
          <section className={parityStyles.section}>
            <Badge color="blue">Próximo paso</Badge>
            <Title order={3} mt="sm">{patient.nextStep}</Title>
          </section>
          <section className={parityStyles.section}>
            <Badge color="yellow">Próxima cita</Badge>
            <Title order={3} mt="sm">21 sep · 10:00</Title>
            <Text size="sm" c="dimmed">Centro Dental Funcional</Text>
          </section>
          <section className={parityStyles.section}>
            <Badge color={patient.balanceCents ? "yellow" : "green"}>Saldo</Badge>
            <Title order={3} mt="sm">{formatEUR(patient.balanceCents)}</Title>
          </section>
        </SimpleGrid>
      ) : null}

      {tab === "tratamiento" ? (
        <section className={parityStyles.section}>
          <Title order={2}>Mi tratamiento</Title>
          <Text c="dimmed" mt="xs">
            El portal separa diagnóstico, propuesta y tratamiento realizado para no mezclar estados.
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
                Reserva directa y solicitud manual sin mostrar otros pacientes.
              </Text>
            </div>
            <Button component={Link} href="/app/agenda" size="xs">Solicitar cita</Button>
          </Group>
          <Button
            mt="lg"
            variant={waitingList ? "filled" : "light"}
            onClick={() => setWaitingList((value) => !value)}
          >
            {waitingList ? "Salir de lista de espera" : "Avisarme si se libera antes"}
          </Button>
        </section>
      ) : null}

      {tab === "pagos" ? (
        <section className={parityStyles.section}>
          <Title order={2}>Pagos y presupuestos</Title>
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
            {[
              "Consentimiento implantes",
              "Presupuesto",
              "Justificante de asistencia",
            ].map((item) => (
              <div className={parityStyles.row} key={item}>
                <span className={parityStyles.rowTitle}>{item}</span>
                <Button size="xs" variant="light">Ver PDF</Button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {tab === "recetas" ? (
        <section className={parityStyles.section}>
          <Title order={2}>Recetas</Title>
          <Text c="dimmed" size="sm" mt="xs">
            Copias READY/ISSUED compartidas por la clínica para consulta e impresión.
          </Text>
          <div className={parityStyles.rowList}>
            <div className={parityStyles.row}>
              <div className={parityStyles.rowMain}>
                <span className={parityStyles.rowTitle}>Amoxicilina 500 mg</span>
                <span className={parityStyles.rowMeta}>Validada · 18 sep 2026</span>
              </div>
              <Button size="xs" variant="light">Ver copia</Button>
            </div>
          </div>
        </section>
      ) : null}

      {tab === "mas" ? (
        <div className={parityStyles.gridTwo}>
          <section className={parityStyles.section}>
            <Title order={2}>Denty Games</Title>
            <Text c="dimmed" size="sm" mt="xs">
              13 juegos, ranking y bono: 3 partidas válidas = 1 €, máximo 5 €.
            </Text>
            <Button component={Link} href={`/patient/${patient.id}/games`} mt="lg">
              Abrir juegos
            </Button>
          </section>
          <section className={parityStyles.section}>
            <Title order={2}>Ayuda y cambios médicos</Title>
            <Text c="dimmed" mt="xs">
              Las solicitudes se envían al equipo y nunca cambian datos clínicos automáticamente.
            </Text>
            <Group mt="lg">
              <Button>Enviar consulta</Button>
              <Button variant="light">Comunicar cambio médico</Button>
            </Group>
          </section>
          <section className={parityStyles.section}>
            <Title order={2}>Privacidad y acceso familiar</Title>
            <Text c="dimmed" mt="xs">
              Invitaciones temporales, delegación y revocación se validarán en el backend seguro.
            </Text>
          </section>
        </div>
      ) : null}
    </div>
  );
}
