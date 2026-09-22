"use client";

import {
  Badge,
  Button,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useState } from "react";

import {
  canTransitionDocument,
  type DocumentState,
} from "@/domain/state-machines";

import { DEMO_PATIENTS } from "@/shared/demo/demo-data";
import styles from "@/shared/ui/parity.module.css";

interface DocumentRow {
  id: string;
  patientId: string;
  patientName: string;
  title: string;
  type: string;
  state: DocumentState;
  signerName?: string;
}

const INITIAL_DOCUMENTS: readonly DocumentRow[] = [
  {
    id: "DOC-778",
    patientId: "juan-perez",
    patientName: "Juan Pérez",
    title: "Consentimiento implantes",
    type: "CONSENT",
    state: "SIGNED",
    signerName: "Juan Pérez",
  },
  {
    id: "DOC-779",
    patientId: "carlos-garcia",
    patientName: "Carlos García",
    title: "Presupuesto rehabilitación",
    type: "BUDGET",
    state: "DELIVERED",
  },
  {
    id: "DOC-780",
    patientId: "ana-martin",
    patientName: "Ana Martín",
    title: "Justificante de asistencia",
    type: "ATTENDANCE_CERTIFICATE",
    state: "FINALIZED",
  },
];

const TEMPLATES = [
  { value: "CONSENT_IMPLANT", label: "Consentimiento de implantes", type: "CONSENT" },
  { value: "CONSENT_ENDO", label: "Consentimiento de endodoncia", type: "CONSENT" },
  { value: "BUDGET", label: "Presupuesto", type: "BUDGET" },
  { value: "ATTENDANCE", label: "Justificante de asistencia", type: "ATTENDANCE_CERTIFICATE" },
] as const;

function stateLabel(state: DocumentState): string {
  const labels: Record<DocumentState, string> = {
    DRAFT: "Borrador",
    FINALIZED: "Finalizado",
    SIGNED: "Firmado",
    DELIVERED: "Entregado",
    ARCHIVED: "Archivado",
  };
  return labels[state];
}

function stateColor(state: DocumentState): string {
  if (["SIGNED", "DELIVERED"].includes(state)) return "green";
  if (state === "ARCHIVED") return "gray";
  if (state === "FINALIZED") return "blue";
  return "yellow";
}

function nextDocumentState(state: DocumentState): DocumentState | null {
  const ordered: readonly DocumentState[] = [
    "DRAFT",
    "FINALIZED",
    "SIGNED",
    "DELIVERED",
    "ARCHIVED",
  ];
  const index = ordered.indexOf(state);
  return index >= 0 && index < ordered.length - 1 ? (ordered[index + 1] ?? null) : null;
}

export function DocumentsModule() {
  const [documents, setDocuments] = useState<DocumentRow[]>(() => [...INITIAL_DOCUMENTS]);
  const [createOpened, setCreateOpened] = useState(false);
  const [signOpened, setSignOpened] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [patientId, setPatientId] = useState("juan-perez");
  const [templateId, setTemplateId] = useState("CONSENT_IMPLANT");
  const [title, setTitle] = useState("Consentimiento de implantes");
  const [signerName, setSignerName] = useState("");

  const createDocument = () => {
    const patient = DEMO_PATIENTS.find((item) => item.id === patientId);
    const template = TEMPLATES.find((item) => item.value === templateId);
    if (!patient || !template || !title.trim()) return;
    setDocuments((current) => [
      {
        id: `DOC-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
        patientId,
        patientName: `${patient.firstName} ${patient.lastName}`,
        title: title.trim(),
        type: template.type,
        state: "DRAFT",
      },
      ...current,
    ]);
    setCreateOpened(false);
  };

  const advance = (id: string) => {
    setDocuments((current) =>
      current.map((document) => {
        if (document.id !== id) return document;
        const next = nextDocumentState(document.state);
        if (!next || next === "SIGNED" || !canTransitionDocument(document.state, next)) {
          return document;
        }
        return { ...document, state: next };
      }),
    );
  };

  const sign = () => {
    if (!selectedId || !signerName.trim()) return;
    setDocuments((current) =>
      current.map((document) =>
        document.id === selectedId && canTransitionDocument(document.state, "SIGNED")
          ? { ...document, state: "SIGNED", signerName: signerName.trim() }
          : document,
      ),
    );
    setSignerName("");
    setSelectedId(null);
    setSignOpened(false);
  };

  return (
    <>
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionHeaderText}>
            <h2 className={styles.sectionTitle}>Documentos clínicos y administrativos</h2>
            <p className={styles.sectionDescription}>
              Plantillas, finalización, firma, entrega, certificados y archivo.
            </p>
          </div>
          <Button size="xs" onClick={() => setCreateOpened(true)}>
            Nuevo documento
          </Button>
        </div>

        <div className={styles.rowList}>
          {documents.map((document) => {
            const next = nextDocumentState(document.state);
            return (
              <div className={styles.row} key={document.id}>
                <div className={styles.rowMain}>
                  <span className={styles.rowTitle}>
                    {document.patientName} · {document.title}
                  </span>
                  <span className={styles.rowMeta}>
                    {document.id} · {document.type}
                    {document.signerName ? ` · Firmante ${document.signerName}` : ""}
                  </span>
                </div>
                <div className={styles.rowActions}>
                  <Badge color={stateColor(document.state)} variant="light">
                    {stateLabel(document.state)}
                  </Badge>
                  {document.state === "FINALIZED" ? (
                    <Button
                      size="xs"
                      variant="light"
                      onClick={() => {
                        setSelectedId(document.id);
                        setSignerName(document.patientName);
                        setSignOpened(true);
                      }}
                    >
                      Firmar
                    </Button>
                  ) : null}
                  {next && next !== "SIGNED" ? (
                    <Button size="xs" variant="light" onClick={() => advance(document.id)}>
                      {next === "FINALIZED"
                        ? "Finalizar"
                        : next === "DELIVERED"
                          ? "Entregar"
                          : "Archivar"}
                    </Button>
                  ) : null}
                  <Button size="xs" variant="subtle">
                    Ver PDF
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <Modal opened={createOpened} onClose={() => setCreateOpened(false)} title="Nuevo documento">
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
          <Select
            label="Plantilla"
            value={templateId}
            onChange={(value) => {
              const nextValue = value ?? "";
              const template = TEMPLATES.find((item) => item.value === nextValue);
              setTemplateId(nextValue);
              if (template) setTitle(template.label);
            }}
            data={TEMPLATES.map((template) => ({
              value: template.value,
              label: template.label,
            }))}
          />
          <TextInput
            label="Título"
            value={title}
            onChange={(event) => setTitle(event.currentTarget.value)}
          />
          <Text size="xs" c="dimmed">
            La generación de PDF definitivo y la auditoría de firma se conectarán a `shared/api`.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setCreateOpened(false)}>Cancelar</Button>
            <Button onClick={createDocument}>Crear borrador</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={signOpened} onClose={() => setSignOpened(false)} title="Firmar documento">
        <Stack>
          <TextInput
            label="Nombre del firmante"
            value={signerName}
            onChange={(event) => setSignerName(event.currentTarget.value)}
          />
          <Text size="xs" c="dimmed">
            La demo registra el acto de firma. Producción deberá conservar evidencia y
            auditoría servidor.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setSignOpened(false)}>Cancelar</Button>
            <Button onClick={sign}>Firmar</Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
