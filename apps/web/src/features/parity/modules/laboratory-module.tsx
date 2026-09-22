"use client";

import {
  Alert,
  Badge,
  Button,
  FileInput,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
} from "@mantine/core";
import { useMemo, useState } from "react";

import {
  canTransitionLaboratory,
  type LaboratoryState,
} from "@/domain/state-machines";
import { dateDMY, madridLocalDateTime, toMadridISO } from "@/domain/dates";
import { formatEUR } from "@/domain/money";
import { usePatientsQuery } from "@/shared/patients/patient-data";
import { publicEnv } from "@/shared/config/env";

import styles from "@/shared/ui/parity.module.css";
import {
  useCreateLabWorkMutation,
  useLabAttachmentMutation,
  useLabReworkMutation,
  useLaboratoryQuery,
  useLabTransitionMutation,
} from "./laboratory-data";

interface LabWorkView {
  id: string;
  patient: string;
  title: string;
  laboratory: string;
  eta: string;
  costCents: number;
  status: LaboratoryState;
  attachments: string[];
  version?: number;
  reworkOfId?: string;
  note?: string;
}

const LAB_STATES: readonly LaboratoryState[] = [
  "PLANNED",
  "IMPRESSION_TAKEN",
  "SCANNED",
  "SENT",
  "IN_PRODUCTION",
  "TRIAL",
  "RECEIVED",
  "PLACED",
  "INCIDENT",
  "CANCELLED",
];

const INITIAL_WORKS: readonly LabWorkView[] = [
  {
    id: "LAB-1042",
    patient: "Juan Pérez",
    title: "Corona 46",
    laboratory: "Dental Lab Zaragoza",
    eta: "24 sep",
    costCents: 14500,
    status: "IN_PRODUCTION",
    attachments: ["scan-46.stl"],
  },
  {
    id: "LAB-1043",
    patient: "Carlos García",
    title: "Estructura 11-13",
    laboratory: "Prótesis Central",
    eta: "22 sep",
    costCents: 22000,
    status: "TRIAL",
    attachments: [],
  },
  {
    id: "LAB-1044",
    patient: "Ana Martín",
    title: "Férula Michigan",
    laboratory: "Dental Lab Zaragoza",
    eta: "21 sep",
    costCents: 8500,
    status: "RECEIVED",
    attachments: ["orden-ferula.pdf"],
  },
];

function labelForStatus(status: LaboratoryState): string {
  const labels: Record<LaboratoryState, string> = {
    PLANNED: "Planificado",
    IMPRESSION_TAKEN: "Impresión tomada",
    SCANNED: "Escaneado",
    SENT: "Enviado",
    IN_PRODUCTION: "En producción",
    TRIAL: "Prueba",
    RECEIVED: "Recibido",
    PLACED: "Colocado",
    INCIDENT: "Incidencia",
    CANCELLED: "Cancelado",
  };
  return labels[status];
}

function statusColor(status: LaboratoryState): string {
  if (["RECEIVED", "PLACED"].includes(status)) return "green";
  if (["INCIDENT", "CANCELLED"].includes(status)) return "red";
  if (["TRIAL", "IN_PRODUCTION"].includes(status)) return "yellow";
  return "blue";
}

async function fileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("No se pudo leer el archivo"));
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.includes(",") ? result.slice(result.indexOf(",") + 1) : result);
    };
    reader.readAsDataURL(file);
  });
}

function etaIso(value: string): string | undefined {
  const [date, time] = value.split("T");
  if (!date || !time) return undefined;
  return toMadridISO(madridLocalDateTime(date, time));
}

export function LaboratoryModule() {
  const demoMode = publicEnv.NEXT_PUBLIC_DEMO_MODE === "true";
  const [demoWorks, setDemoWorks] = useState<LabWorkView[]>(() => [...INITIAL_WORKS]);
  const [query, setQuery] = useState("");
  const [newOpened, setNewOpened] = useState(false);
  const [reworkOpened, setReworkOpened] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [patientName, setPatientName] = useState("Juan Pérez");
  const [patientId, setPatientId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [laboratory, setLaboratory] = useState("Dental Lab Zaragoza");
  const [eta, setEta] = useState("");
  const [costEuros, setCostEuros] = useState<number | string>(0);
  const [reworkReason, setReworkReason] = useState("");
  const [reworkCost, setReworkCost] = useState<number | string>(0);

  const labQuery = useLaboratoryQuery(!demoMode);
  const patientsQuery = usePatientsQuery(!demoMode);
  const createMutation = useCreateLabWorkMutation();
  const transitionMutation = useLabTransitionMutation();
  const reworkMutation = useLabReworkMutation();
  const attachmentMutation = useLabAttachmentMutation();

  const patientNames = useMemo(
    () =>
      new Map(
        (patientsQuery.data?.items ?? []).map((patient) => [
          patient.id,
          `${patient.firstName} ${patient.lastName}`.trim(),
        ]),
      ),
    [patientsQuery.data?.items],
  );

  const serverWorks = useMemo<LabWorkView[]>(
    () =>
      (labQuery.data?.items ?? []).map((work) => ({
        id: work.id,
        patient:
          work.patient
            ? `${work.patient.firstName} ${work.patient.lastName}`.trim()
            : (patientNames.get(work.patientId) ?? work.patientId),
        title: work.title,
        laboratory: work.lab?.name ?? "Sin laboratorio asignado",
        eta: work.etaAt ? dateDMY(work.etaAt) : "Sin ETA",
        costCents: work.costCents,
        status: work.status as LaboratoryState,
        attachments: (work.attachments ?? []).map((item) => item.fileName),
        version: work.version,
      })),
    [labQuery.data?.items, patientNames],
  );

  const works = demoMode ? demoWorks : serverWorks;
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("es");
    if (!needle) return works;
    return works.filter((work) =>
      `${work.patient} ${work.title} ${work.laboratory} ${work.status}`
        .toLocaleLowerCase("es")
        .includes(needle),
    );
  }, [query, works]);

  const transition = async (work: LabWorkView, to: LaboratoryState) => {
    if (!canTransitionLaboratory(work.status, to)) return;
    if (demoMode) {
      setDemoWorks((current) =>
        current.map((item) => (item.id === work.id ? { ...item, status: to } : item)),
      );
      return;
    }
    if (work.version === undefined) return;
    await transitionMutation.mutateAsync({
      id: work.id,
      payload: { status: to, expectedVersion: work.version },
    });
  };

  const attach = async (work: LabWorkView, file: File | null) => {
    if (!file) return;
    if (demoMode) {
      setDemoWorks((current) =>
        current.map((item) =>
          item.id === work.id
            ? { ...item, attachments: [...item.attachments, file.name] }
            : item,
        ),
      );
      return;
    }
    await attachmentMutation.mutateAsync({
      id: work.id,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      base64: await fileAsBase64(file),
    });
  };

  const createWork = async () => {
    if (!title.trim()) return;
    const costCents = Math.max(0, Math.round(Number(costEuros || 0) * 100));
    if (demoMode) {
      if (!patientName.trim()) return;
      setDemoWorks((current) => [
        {
          id: `LAB-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
          patient: patientName.trim(),
          title: title.trim(),
          laboratory: laboratory.trim() || "Sin asignar",
          eta: eta.trim() || "Sin ETA",
          costCents,
          status: "PLANNED",
          attachments: [],
        },
        ...current,
      ]);
    } else {
      if (!patientId) return;
      const resolvedEta = etaIso(eta);
      await createMutation.mutateAsync({
        patientId,
        title: title.trim(),
        costCents,
        ...(resolvedEta ? { etaAt: resolvedEta } : {}),
      });
    }
    setTitle("");
    setEta("");
    setCostEuros(0);
    setNewOpened(false);
  };

  const createRework = async () => {
    const original = works.find((work) => work.id === selectedId);
    if (!original || !reworkReason.trim()) return;
    const costCents = Math.max(0, Math.round(Number(reworkCost || 0) * 100));
    if (demoMode) {
      setDemoWorks((current) => [
        {
          ...original,
          id: `LAB-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
          status: "PLANNED",
          attachments: [],
          costCents,
          reworkOfId: original.id,
          note: reworkReason.trim(),
        },
        ...current,
      ]);
    } else {
      await reworkMutation.mutateAsync({
        id: original.id,
        reason: reworkReason.trim(),
        costCents,
      });
    }
    setReworkReason("");
    setReworkCost(0);
    setSelectedId(null);
    setReworkOpened(false);
  };

  const hasServerError =
    !demoMode &&
    (labQuery.isError ||
      patientsQuery.isError ||
      createMutation.isError ||
      transitionMutation.isError ||
      reworkMutation.isError ||
      attachmentMutation.isError);

  return (
    <>
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionHeaderText}>
            <h2 className={styles.sectionTitle}>Trabajos de laboratorio</h2>
            <p className={styles.sectionDescription}>
              Estados trazables, adjuntos, incidencias y repeticiones.
            </p>
          </div>
          <Group>
            <Badge variant="light">{demoMode ? "Demo" : "Servidor"}</Badge>
            <Button size="xs" onClick={() => setNewOpened(true)}>
              Nuevo trabajo
            </Button>
          </Group>
        </div>

        {hasServerError ? (
          <Alert mb="md" color="red" title="Laboratorio no disponible">
            No se han sustituido los trabajos del servidor por datos demo.
          </Alert>
        ) : null}

        <TextInput
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="Buscar paciente, trabajo o laboratorio"
          mb="md"
        />

        <div className={styles.rowList}>
          {filtered.map((work) => {
            const transitions = LAB_STATES.filter((state) =>
              canTransitionLaboratory(work.status, state),
            );
            return (
              <div className={styles.row} key={work.id}>
                <div className={styles.rowMain}>
                  <span className={styles.rowTitle}>
                    {work.patient} · {work.title}
                  </span>
                  <span className={styles.rowMeta}>
                    {work.id} · {work.laboratory} · ETA {work.eta} ·{" "}
                    {formatEUR(work.costCents)}
                  </span>
                  {work.reworkOfId ? (
                    <span className={styles.rowMeta}>
                      Repetición de {work.reworkOfId} · {work.note}
                    </span>
                  ) : null}
                  {work.attachments.length ? (
                    <span className={styles.rowMeta}>
                      Adjuntos: {work.attachments.join(", ")}
                    </span>
                  ) : null}
                </div>
                <div className={styles.rowActions}>
                  <Badge color={statusColor(work.status)} variant="light">
                    {labelForStatus(work.status)}
                  </Badge>
                  <Select
                    size="xs"
                    placeholder="Cambiar estado"
                    data={transitions.map((state) => ({
                      value: state,
                      label: labelForStatus(state),
                    }))}
                    disabled={!transitions.length || transitionMutation.isPending}
                    onChange={(value) => {
                      if (value) void transition(work, value as LaboratoryState);
                    }}
                  />
                  <FileInput
                    size="xs"
                    placeholder="Adjuntar"
                    clearable
                    disabled={attachmentMutation.isPending}
                    onChange={(file) => void attach(work, file)}
                  />
                  <Button
                    size="xs"
                    variant="light"
                    onClick={() => {
                      setSelectedId(work.id);
                      setReworkOpened(true);
                    }}
                  >
                    Repetición
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <Modal
        opened={newOpened}
        onClose={() => setNewOpened(false)}
        title="Nuevo trabajo de laboratorio"
      >
        <Stack>
          {demoMode ? (
            <TextInput
              label="Paciente"
              value={patientName}
              onChange={(event) => setPatientName(event.currentTarget.value)}
            />
          ) : (
            <Select
              searchable
              label="Paciente"
              value={patientId}
              onChange={setPatientId}
              data={(patientsQuery.data?.items ?? []).map((patient) => ({
                value: patient.id,
                label: `${patient.firstName} ${patient.lastName}`.trim(),
              }))}
            />
          )}
          <TextInput
            label="Trabajo"
            value={title}
            onChange={(event) => setTitle(event.currentTarget.value)}
          />
          {demoMode ? (
            <TextInput
              label="Laboratorio"
              value={laboratory}
              onChange={(event) => setLaboratory(event.currentTarget.value)}
            />
          ) : (
            <Text size="xs" c="dimmed">
              La asignación a un laboratorio real requiere un identificador de laboratorio
              existente. No se inventa a partir de texto libre.
            </Text>
          )}
          <TextInput
            type={demoMode ? "text" : "datetime-local"}
            label="ETA"
            value={eta}
            onChange={(event) => setEta(event.currentTarget.value)}
          />
          <NumberInput
            label="Coste (€)"
            min={0}
            decimalScale={2}
            value={costEuros}
            onChange={setCostEuros}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setNewOpened(false)}>
              Cancelar
            </Button>
            <Button loading={createMutation.isPending} onClick={() => void createWork()}>
              Crear
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={reworkOpened}
        onClose={() => setReworkOpened(false)}
        title="Registrar repetición"
      >
        <Stack>
          <Textarea
            label="Motivo"
            value={reworkReason}
            onChange={(event) => setReworkReason(event.currentTarget.value)}
          />
          <NumberInput
            label="Coste adicional (€)"
            min={0}
            decimalScale={2}
            value={reworkCost}
            onChange={setReworkCost}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setReworkOpened(false)}>
              Cancelar
            </Button>
            <Button loading={reworkMutation.isPending} onClick={() => void createRework()}>
              Crear repetición
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
