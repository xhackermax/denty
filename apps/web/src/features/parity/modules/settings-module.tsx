"use client";

import {
  Alert,
  Badge,
  Button,
  Group,
  SegmentedControl,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useState } from "react";

import styles from "@/shared/ui/parity.module.css";

type SettingsTab = "sessions" | "backups" | "privacy" | "prescription" | "marketing";

interface SessionRow {
  id: string;
  device: string;
  lastSeen: string;
  expires: string;
  current: boolean;
}

interface BackupRow {
  id: string;
  createdAt: string;
  size: string;
  verified: boolean;
}

interface PrivacyRow {
  id: string;
  patient: string;
  type: "ACCESS" | "EXPORT" | "RECTIFICATION" | "RESTRICTION" | "ERASURE";
  status: "OPEN" | "IN_REVIEW" | "COMPLETED" | "REJECTED";
  note: string;
}

const INITIAL_SESSIONS: readonly SessionRow[] = [
  {
    id: "SES-1",
    device: "Chrome · Windows · clínica",
    lastSeen: "Ahora",
    expires: "28 sep",
    current: true,
  },
  {
    id: "SES-2",
    device: "iPhone · Safari",
    lastSeen: "Ayer 20:14",
    expires: "26 sep",
    current: false,
  },
];

const INITIAL_BACKUPS: readonly BackupRow[] = [
  { id: "BKP-102", createdAt: "21 sep 03:00", size: "12,4 MB", verified: true },
  { id: "BKP-101", createdAt: "20 sep 03:00", size: "12,1 MB", verified: true },
];

const INITIAL_PRIVACY: readonly PrivacyRow[] = [
  {
    id: "RGPD-31",
    patient: "Juan Pérez",
    type: "EXPORT",
    status: "IN_REVIEW",
    note: "Solicita copia completa de sus datos.",
  },
];

export function SettingsModule() {
  const [tab, setTab] = useState<SettingsTab>("sessions");
  const [sessions, setSessions] = useState<SessionRow[]>(() => [...INITIAL_SESSIONS]);
  const [backups, setBackups] = useState<BackupRow[]>(() => [...INITIAL_BACKUPS]);
  const [privacy, setPrivacy] = useState<PrivacyRow[]>(() => [...INITIAL_PRIVACY]);
  const [privacyPatient, setPrivacyPatient] = useState("Juan Pérez");
  const [privacyType, setPrivacyType] = useState<PrivacyRow["type"]>("ACCESS");
  const [privacyNote, setPrivacyNote] = useState("");
  const [prescriberEnabled, setPrescriberEnabled] = useState(true);
  const [receptionCanDraft, setReceptionCanDraft] = useState(true);

  const revokeSession = (id: string) => {
    setSessions((current) => current.filter((session) => session.id !== id || session.current));
  };

  const createBackup = () => {
    setBackups((current) => [
      {
        id: `BKP-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
        createdAt: "Ahora",
        size: "12,6 MB",
        verified: false,
      },
      ...current,
    ]);
  };

  const verifyBackup = (id: string) => {
    setBackups((current) =>
      current.map((backup) => (backup.id === id ? { ...backup, verified: true } : backup)),
    );
  };

  const createPrivacyRequest = () => {
    if (!privacyPatient.trim() || !privacyNote.trim()) return;
    setPrivacy((current) => [
      {
        id: `RGPD-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
        patient: privacyPatient.trim(),
        type: privacyType,
        status: "OPEN",
        note: privacyNote.trim(),
      },
      ...current,
    ]);
    setPrivacyNote("");
  };

  const updatePrivacy = (id: string, status: PrivacyRow["status"]) => {
    setPrivacy((current) =>
      current.map((request) => (request.id === id ? { ...request, status } : request)),
    );
  };

  return (
    <div className={styles.grid}>
      <SegmentedControl
        fullWidth
        value={tab}
        onChange={(value) => setTab(value as SettingsTab)}
        data={[
          { label: "Sesiones", value: "sessions" },
          { label: "Copias", value: "backups" },
          { label: "Privacidad", value: "privacy" },
          { label: "Receta", value: "prescription" },
          { label: "Marketing", value: "marketing" },
        ]}
      />

      {tab === "sessions" ? (
        <section className={styles.section}>
          <Title order={3}>Sesiones activas</Title>
          <Text c="dimmed" size="sm" mt="xs">
            Dispositivos, última actividad y revocación.
          </Text>
          <div className={styles.rowList}>
            {sessions.map((session) => (
              <div className={styles.row} key={session.id}>
                <div className={styles.rowMain}>
                  <span className={styles.rowTitle}>{session.device}</span>
                  <span className={styles.rowMeta}>
                    Última actividad {session.lastSeen} · Caduca {session.expires}
                  </span>
                </div>
                <div className={styles.rowActions}>
                  {session.current ? <Badge color="green">Actual</Badge> : null}
                  <Button
                    size="xs"
                    variant="light"
                    disabled={session.current}
                    onClick={() => revokeSession(session.id)}
                  >
                    Cerrar sesión
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {tab === "backups" ? (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionHeaderText}>
              <h2 className={styles.sectionTitle}>Copias cifradas</h2>
              <p className={styles.sectionDescription}>
                Creación, verificación y restauración controlada.
              </p>
            </div>
            <Button size="xs" onClick={createBackup}>Crear copia</Button>
          </div>
          <Alert color="blue" mb="md">
            La restauración productiva se ejecutará en backend/CLI sobre una copia validada
            antes de reemplazar la base activa.
          </Alert>
          <div className={styles.rowList}>
            {backups.map((backup) => (
              <div className={styles.row} key={backup.id}>
                <div className={styles.rowMain}>
                  <span className={styles.rowTitle}>{backup.createdAt}</span>
                  <span className={styles.rowMeta}>{backup.size} · {backup.id}</span>
                </div>
                <div className={styles.rowActions}>
                  <Badge color={backup.verified ? "green" : "yellow"} variant="light">
                    {backup.verified ? "Verificada" : "Sin verificar"}
                  </Badge>
                  <Button size="xs" variant="light" onClick={() => verifyBackup(backup.id)}>
                    Verificar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {tab === "privacy" ? (
        <section className={styles.section}>
          <Title order={3}>Privacidad y derechos del paciente</Title>
          <Text c="dimmed" size="sm" mt="xs">
            Acceso, exportación, rectificación, restricción y supresión con trazabilidad.
          </Text>
          <Stack mt="md">
            <Group grow>
              <TextInput
                label="Paciente"
                value={privacyPatient}
                onChange={(event) => setPrivacyPatient(event.currentTarget.value)}
              />
              <Select
                label="Solicitud"
                value={privacyType}
                onChange={(value) =>
                  setPrivacyType((value as PrivacyRow["type"]) ?? "ACCESS")
                }
                data={["ACCESS", "EXPORT", "RECTIFICATION", "RESTRICTION", "ERASURE"]}
              />
            </Group>
            <TextInput
              label="Nota"
              value={privacyNote}
              onChange={(event) => setPrivacyNote(event.currentTarget.value)}
            />
            <Group justify="flex-end">
              <Button size="xs" onClick={createPrivacyRequest}>Registrar solicitud</Button>
            </Group>
          </Stack>
          <div className={styles.rowList}>
            {privacy.map((request) => (
              <div className={styles.row} key={request.id}>
                <div className={styles.rowMain}>
                  <span className={styles.rowTitle}>{request.patient} · {request.type}</span>
                  <span className={styles.rowMeta}>{request.note}</span>
                </div>
                <div className={styles.rowActions}>
                  <Badge variant="light">{request.status}</Badge>
                  {request.status === "OPEN" ? (
                    <Button
                      size="xs"
                      variant="light"
                      onClick={() => updatePrivacy(request.id, "IN_REVIEW")}
                    >
                      En revisión
                    </Button>
                  ) : null}
                  {!['COMPLETED', 'REJECTED'].includes(request.status) ? (
                    <Button
                      size="xs"
                      color="green"
                      variant="light"
                      onClick={() => updatePrivacy(request.id, "COMPLETED")}
                    >
                      Completar
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {tab === "prescription" ? (
        <section className={styles.section}>
          <Title order={3}>Prescripción y firma</Title>
          <Alert color="yellow" mt="md" mb="md">
            Sin proveedor certificado conectado: los documentos locales no son eRecetas
            dispensables.
          </Alert>
          <Stack>
            <TextInput
              label="Nombre comercial de la clínica"
              defaultValue="Centro Dental Funcional"
            />
            <TextInput label="NIF/CIF" defaultValue="" />
            <TextInput label="N.º colegiado" defaultValue="" />
            <Switch
              checked={prescriberEnabled}
              onChange={(event) => setPrescriberEnabled(event.currentTarget.checked)}
              label="Odontólogo habilitado para prescripción"
            />
            <Switch
              checked={receptionCanDraft}
              onChange={(event) => setReceptionCanDraft(event.currentTarget.checked)}
              label="Recepción puede preparar borradores"
            />
            <Group justify="flex-end"><Button size="xs">Guardar configuración</Button></Group>
          </Stack>
        </section>
      ) : null}

      {tab === "marketing" ? (
        <section className={styles.section}>
          <Title order={3}>Integraciones de marketing</Title>
          <Text c="dimmed" size="sm" mt="xs">
            Las credenciales nunca se envían al navegador.
          </Text>
          <div className={styles.rowList}>
            {[
              ["Meta · Facebook + Instagram", "Marketing API"],
              ["Google Ads", "Google Ads API"],
            ].map(([label, detail]) => (
              <div className={styles.row} key={label}>
                <div className={styles.rowMain}>
                  <span className={styles.rowTitle}>{label}</span>
                  <span className={styles.rowMeta}>{detail} · Configurar en servidor</span>
                </div>
                <Badge color="gray">No conectado</Badge>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
