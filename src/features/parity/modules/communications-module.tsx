"use client";

import {
  Alert,
  Badge,
  Button,
  Group,
  Modal,
  Select,
  Stack,
  Switch,
  Text,
  Textarea,
} from "@mantine/core";
import { useState } from "react";

import { DEMO_PATIENTS } from "@/shared/demo/demo-data";
import styles from "@/shared/ui/parity.module.css";

type Channel = "WHATSAPP" | "SMS" | "EMAIL";
type Category = "CLINICAL" | "APPOINTMENT" | "FINANCIAL" | "MARKETING";

interface CommunicationRow {
  id: string;
  patientName: string;
  channel: Channel;
  category: Category;
  subject: string;
  status: "DRAFT" | "QUEUED" | "SENT" | "BLOCKED";
}

const INITIAL_ROWS: readonly CommunicationRow[] = [
  {
    id: "COM-41",
    patientName: "Juan Pérez",
    channel: "WHATSAPP",
    category: "APPOINTMENT",
    subject: "Recordatorio de cita",
    status: "SENT",
  },
  {
    id: "COM-42",
    patientName: "María López",
    channel: "EMAIL",
    category: "CLINICAL",
    subject: "Revisión semestral",
    status: "QUEUED",
  },
];

function statusColor(status: CommunicationRow["status"]): string {
  if (status === "SENT") return "green";
  if (status === "BLOCKED") return "red";
  if (status === "QUEUED") return "blue";
  return "gray";
}

export function CommunicationsModule() {
  const [rows, setRows] = useState<CommunicationRow[]>(() => [...INITIAL_ROWS]);
  const [opened, setOpened] = useState(false);
  const [patientId, setPatientId] = useState("juan-perez");
  const [channel, setChannel] = useState<Channel>("WHATSAPP");
  const [category, setCategory] = useState<Category>("APPOINTMENT");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [marketingConsent, setMarketingConsent] = useState(false);

  const queue = () => {
    const patient = DEMO_PATIENTS.find((item) => item.id === patientId);
    if (!patient || !subject.trim() || !body.trim()) return;
    const blocked = category === "MARKETING" && !marketingConsent;
    setRows((current) => [
      {
        id: `COM-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
        patientName: `${patient.firstName} ${patient.lastName}`,
        channel,
        category,
        subject: subject.trim(),
        status: blocked ? "BLOCKED" : "QUEUED",
      },
      ...current,
    ]);
    setSubject("");
    setBody("");
    setOpened(false);
  };

  const markSent = (id: string) => {
    setRows((current) =>
      current.map((row) =>
        row.id === id && row.status === "QUEUED" ? { ...row, status: "SENT" } : row,
      ),
    );
  };

  return (
    <>
      <Alert color="blue" title="Canales sin conectar" mb="md">
        La demo conserva categorías, consentimiento y estados. WhatsApp, SMS y email reales se
        enviarán por adaptadores de backend.
      </Alert>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionHeaderText}>
            <h2 className={styles.sectionTitle}>Historial de comunicaciones</h2>
            <p className={styles.sectionDescription}>
              Canal, categoría, consentimiento, bloqueo y trazabilidad de envío.
            </p>
          </div>
          <Button size="xs" onClick={() => setOpened(true)}>
            Nuevo mensaje
          </Button>
        </div>

        <div className={styles.rowList}>
          {rows.map((row) => (
            <div className={styles.row} key={row.id}>
              <div className={styles.rowMain}>
                <span className={styles.rowTitle}>
                  {row.patientName} · {row.subject}
                </span>
                <span className={styles.rowMeta}>
                  {row.id} · {row.channel} · {row.category}
                </span>
              </div>
              <div className={styles.rowActions}>
                <Badge color={statusColor(row.status)} variant="light">
                  {row.status}
                </Badge>
                {row.status === "QUEUED" ? (
                  <Button size="xs" variant="light" onClick={() => markSent(row.id)}>
                    Simular enviado
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </section>

      <Modal opened={opened} onClose={() => setOpened(false)} title="Nuevo mensaje">
        <Stack>
          <Select
            label="Paciente"
            value={patientId}
            onChange={(value) => setPatientId(value ?? "")}
            data={DEMO_PATIENTS.map((patient) => ({
              value: patient.id,
              label: `${patient.firstName} ${patient.lastName}`,
            }))}
          />
          <Group grow>
            <Select
              label="Canal"
              value={channel}
              onChange={(value) => setChannel((value as Channel) ?? "WHATSAPP")}
              data={[
                { value: "WHATSAPP", label: "WhatsApp" },
                { value: "SMS", label: "SMS" },
                { value: "EMAIL", label: "Email" },
              ]}
            />
            <Select
              label="Categoría"
              value={category}
              onChange={(value) => setCategory((value as Category) ?? "APPOINTMENT")}
              data={[
                { value: "CLINICAL", label: "Clínica" },
                { value: "APPOINTMENT", label: "Cita" },
                { value: "FINANCIAL", label: "Financiera" },
                { value: "MARKETING", label: "Marketing" },
              ]}
            />
          </Group>
          <Textarea
            label="Asunto"
            value={subject}
            onChange={(event) => setSubject(event.currentTarget.value)}
          />
          <Textarea
            label="Mensaje"
            minRows={4}
            value={body}
            onChange={(event) => setBody(event.currentTarget.value)}
          />
          {category === "MARKETING" ? (
            <Switch
              checked={marketingConsent}
              onChange={(event) => setMarketingConsent(event.currentTarget.checked)}
              label="Permite marketing"
            />
          ) : null}
          <Text size="xs" c="dimmed">
            Una comunicación de marketing sin consentimiento quedará bloqueada, no enviada.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setOpened(false)}>
              Cancelar
            </Button>
            <Button onClick={queue}>Preparar</Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
