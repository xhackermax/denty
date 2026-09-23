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
import { useEffect, useMemo, useState } from "react";

import {
  activeLaboratoryOptions,
  canTransitionLaboratory,
  laboratoryBalances,
  type LaboratoryAccount,
  type LaboratoryPayment,
  type LaboratoryState,
} from "@/domain";
import { dateDMY, madridLocalDateTime, toMadridISO } from "@/domain/dates";
import { formatEUR } from "@/domain/money";
import { publicEnv } from "@/shared/config/env";
import { DEMO_LAB_ACCOUNTS, DEMO_LAB_PAYMENTS, DEMO_LAB_WORKS } from "@/shared/demo/demo-data";
import { usePatientsQuery } from "@/shared/patients/patient-data";
import { HorizontalSnapNav } from "@/shared/ui";
import styles from "@/shared/ui/parity.module.css";
import {
  useCreateLabWorkMutation,
  useLabAttachmentMutation,
  useLabReworkMutation,
  useLaboratoryQuery,
  useLaboratorySuppliersQuery,
  useLabTransitionMutation,
} from "./laboratory-data";

interface LabWorkView {
  id: string;
  patient: string;
  title: string;
  labId?: string;
  laboratory: string;
  eta: string;
  costCents: number;
  reworkCostCents?: number;
  status: LaboratoryState;
  attachments: string[];
  version?: number;
  reworkOfId?: string;
  note?: string;
}

type LabView = "works" | "labs" | "balances";
const PAYMENT_STORAGE_KEY = "denty.demo.laboratory-payments.v1";

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

function supplierAccounts(rows: readonly Record<string, unknown>[]): LaboratoryAccount[] {
  return rows.flatMap((row, index) => {
    const id =
      typeof row.id === "string"
        ? row.id
        : typeof row.supplierId === "string"
          ? row.supplierId
          : null;
    const name =
      typeof row.name === "string"
        ? row.name
        : typeof row.supplierName === "string"
          ? row.supplierName
          : null;
    const category =
      typeof row.category === "string"
        ? row.category
        : typeof row.supplierCategory === "string"
          ? row.supplierCategory
          : "";
    if (!name) return [];
    const fingerprint = `${category} ${name}`.toLocaleLowerCase("es");
    if (category && !/(lab|laborator|pr[oó]tesis|dental)/.test(fingerprint)) return [];
    if (!category && !/(lab|laborator|pr[oó]tesis|dental)/.test(fingerprint)) return [];
    return [
      {
        id: id ?? `legacy-${index}`,
        name,
        active: row.active !== false,
        ...(typeof row.taxId === "string" ? { taxId: row.taxId } : {}),
        ...(typeof row.phone === "string" ? { phone: row.phone } : {}),
        ...(typeof row.email === "string" ? { email: row.email } : {}),
      },
    ];
  });
}

export function LaboratoryModule() {
  const demoMode = publicEnv.NEXT_PUBLIC_DEMO_MODE === "true";
  const [view, setView] = useState<LabView>("works");
  const [demoWorks, setDemoWorks] = useState<LabWorkView[]>(() =>
    DEMO_LAB_WORKS.map((work) => {
      const account = DEMO_LAB_ACCOUNTS.find((item) => item.id === work.labId);
      return {
        ...work,
        laboratory: account?.name ?? "Sin laboratorio asignado",
        status: work.status as LaboratoryState,
        attachments: [...work.attachments],
      };
    }),
  );
  const [demoPayments, setDemoPayments] = useState<LaboratoryPayment[]>(() =>
    DEMO_LAB_PAYMENTS.map((payment) => ({ ...payment })),
  );
  const [query, setQuery] = useState("");
  const [labFilter, setLabFilter] = useState<string | null>(null);
  const [newOpened, setNewOpened] = useState(false);
  const [reworkOpened, setReworkOpened] = useState(false);
  const [paymentOpened, setPaymentOpened] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [patientName, setPatientName] = useState("Juan Pérez");
  const [patientId, setPatientId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [labId, setLabId] = useState<string | null>(DEMO_LAB_ACCOUNTS[0]?.id ?? null);
  const [eta, setEta] = useState("");
  const [costEuros, setCostEuros] = useState<number | string>(0);
  const [reworkReason, setReworkReason] = useState("");
  const [reworkCost, setReworkCost] = useState<number | string>(0);
  const [paymentLabId, setPaymentLabId] = useState<string | null>(DEMO_LAB_ACCOUNTS[0]?.id ?? null);
  const [paymentEuros, setPaymentEuros] = useState<number | string>(0);

  const labQuery = useLaboratoryQuery(!demoMode);
  const suppliersQuery = useLaboratorySuppliersQuery(!demoMode);
  const patientsQuery = usePatientsQuery(!demoMode);
  const createMutation = useCreateLabWorkMutation();
  const transitionMutation = useLabTransitionMutation();
  const reworkMutation = useLabReworkMutation();
  const attachmentMutation = useLabAttachmentMutation();

  useEffect(() => {
    if (!demoMode) return;
    try {
      const raw = window.localStorage.getItem(PAYMENT_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as LaboratoryPayment[];
      if (Array.isArray(parsed)) setDemoPayments(parsed);
    } catch {
      setDemoPayments(DEMO_LAB_PAYMENTS.map((payment) => ({ ...payment })));
    }
  }, [demoMode]);

  useEffect(() => {
    if (!demoMode) return;
    window.localStorage.setItem(PAYMENT_STORAGE_KEY, JSON.stringify(demoPayments));
  }, [demoMode, demoPayments]);

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
        patient: work.patient
          ? `${work.patient.firstName} ${work.patient.lastName}`.trim()
          : (patientNames.get(work.patientId) ?? work.patientId),
        title: work.title,
        ...(work.lab?.id ? { labId: work.lab.id } : {}),
        laboratory: work.lab?.name ?? "Sin laboratorio asignado",
        eta: work.etaAt ? dateDMY(work.etaAt) : "Sin ETA",
        costCents: work.costCents,
        status: work.status as LaboratoryState,
        attachments: (work.attachments ?? []).map((item) => item.fileName),
        version: work.version,
      })),
    [labQuery.data?.items, patientNames],
  );

  const serverAccounts = useMemo(() => {
    const map = new Map<string, LaboratoryAccount>();
    for (const work of serverWorks) {
      if (!work.labId || work.laboratory === "Sin laboratorio asignado") continue;
      map.set(work.labId, { id: work.labId, name: work.laboratory, active: true });
    }
    for (const account of supplierAccounts(
      (suppliersQuery.data?.items ?? []) as Record<string, unknown>[],
    )) {
      map.set(account.id, { ...map.get(account.id), ...account });
    }
    return [...map.values()];
  }, [serverWorks, suppliersQuery.data?.items]);
  const accounts: readonly LaboratoryAccount[] = demoMode ? DEMO_LAB_ACCOUNTS : serverAccounts;
  const accountOptions = activeLaboratoryOptions(accounts);
  const works = demoMode ? demoWorks : serverWorks;
  const balances = demoMode ? laboratoryBalances(accounts, demoWorks, demoPayments) : [];

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("es");
    return works.filter((work) => {
      if (labFilter && work.labId !== labFilter) return false;
      if (!needle) return true;
      return `${work.patient} ${work.title} ${work.laboratory} ${work.status}`
        .toLocaleLowerCase("es")
        .includes(needle);
    });
  }, [labFilter, query, works]);

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
          item.id === work.id ? { ...item, attachments: [...item.attachments, file.name] } : item,
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
      if (!patientName.trim() || !labId) return;
      const account = accounts.find((candidate) => candidate.id === labId);
      if (!account) return;
      setDemoWorks((current) => [
        {
          id: `LAB-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
          patient: patientName.trim(),
          title: title.trim(),
          labId,
          laboratory: account.name,
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
        ...(labId ? { labId } : {}),
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
          costCents: 0,
          reworkCostCents: costCents,
          reworkOfId: original.id,
          note: reworkReason.trim(),
        },
        ...current,
      ]);
    } else {
      await reworkMutation.mutateAsync({ id: original.id, reason: reworkReason.trim(), costCents });
    }
    setReworkReason("");
    setReworkCost(0);
    setSelectedId(null);
    setReworkOpened(false);
  };

  const registerPayment = () => {
    if (!demoMode || !paymentLabId) return;
    const amountCents = Math.max(0, Math.round(Number(paymentEuros || 0) * 100));
    if (!amountCents) return;
    setDemoPayments((current) => [
      {
        id: `LP-${crypto.randomUUID().slice(0, 8)}`,
        labId: paymentLabId,
        amountCents,
        paidAt: new Date().toISOString().slice(0, 10),
      },
      ...current,
    ]);
    setPaymentEuros(0);
    setPaymentOpened(false);
  };

  const hasServerError =
    !demoMode &&
    (labQuery.isError ||
      suppliersQuery.isError ||
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
            <h2 className={styles.sectionTitle}>Laboratorio</h2>
            <p className={styles.sectionDescription}>Trabajos, proveedores y saldos.</p>
          </div>
          <Group>
            <Badge variant="light">{demoMode ? "Demo" : "Servidor"}</Badge>
            {view === "works" ? (
              <Button size="xs" onClick={() => setNewOpened(true)}>
                Nuevo trabajo
              </Button>
            ) : null}
            {view === "balances" && demoMode ? (
              <Button size="xs" onClick={() => setPaymentOpened(true)}>
                Registrar pago
              </Button>
            ) : null}
          </Group>
        </div>

        <HorizontalSnapNav
          ariaLabel="Laboratorio"
          value={view}
          onChange={(next) => setView(next as LabView)}
          items={[
            { value: "works", label: "Trabajos", badge: works.length },
            { value: "labs", label: "Laboratorios", badge: accounts.length },
            { value: "balances", label: "Saldos" },
          ]}
        />

        {hasServerError ? (
          <Alert mt="md" color="red" title="Laboratorio no disponible">
            No se han sustituido los datos del servidor por datos demo.
          </Alert>
        ) : null}

        {view === "works" ? (
          <>
            <Group grow mt="md" align="flex-end">
              <TextInput
                value={query}
                onChange={(event) => setQuery(event.currentTarget.value)}
                placeholder="Buscar paciente o trabajo"
              />
              <Select
                clearable
                label="Laboratorio"
                value={labFilter}
                onChange={setLabFilter}
                data={accounts.map((account) => ({ value: account.id, label: account.name }))}
              />
            </Group>
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
                        {formatEUR(work.costCents + (work.reworkCostCents ?? 0))}
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
                        placeholder="Estado"
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
          </>
        ) : null}

        {view === "labs" ? (
          <div className={styles.rowList}>
            {accounts.map((account) => {
              const accountWorks = works.filter((work) => work.labId === account.id);
              const open = accountWorks.filter(
                (work) => !["PLACED", "CANCELLED"].includes(work.status),
              ).length;
              const total = accountWorks.reduce(
                (sum, work) => sum + work.costCents + (work.reworkCostCents ?? 0),
                0,
              );
              const balance = balances.find((item) => item.labId === account.id);
              return (
                <div className={styles.row} key={account.id}>
                  <div className={styles.rowMain}>
                    <span className={styles.rowTitle}>{account.name}</span>
                    <span className={styles.rowMeta}>
                      {open} abiertos · {accountWorks.length} trabajos · {formatEUR(total)}{" "}
                      acumulado
                    </span>
                    <span className={styles.rowMeta}>
                      {account.phone ?? "Sin teléfono"} · {account.email ?? "Sin email"}
                    </span>
                  </div>
                  <div className={styles.rowActions}>
                    {demoMode && balance ? (
                      <Badge
                        variant="light"
                        color={balance.outstandingCents > 0 ? "yellow" : "green"}
                      >
                        Pendiente {formatEUR(balance.outstandingCents)}
                      </Badge>
                    ) : null}
                    <Badge color={account.active ? "green" : "gray"} variant="light">
                      {account.active ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {view === "balances" ? (
          demoMode ? (
            <div className={styles.rowList}>
              {balances.map((balance) => (
                <div className={styles.row} key={balance.labId}>
                  <div className={styles.rowMain}>
                    <span className={styles.rowTitle}>{balance.name}</span>
                    <span className={styles.rowMeta}>
                      {balance.workCount} trabajos · Acumulado {formatEUR(balance.accruedCents)} ·
                      Pagado {formatEUR(balance.paidCents)}
                    </span>
                  </div>
                  <div className={styles.rowActions}>
                    <Badge
                      color={balance.outstandingCents > 0 ? "yellow" : "green"}
                      variant="light"
                    >
                      Pendiente {formatEUR(balance.outstandingCents)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Alert color="blue" mt="md">
              Los trabajos del servidor no se presentan como deuda confirmada sin movimientos de
              proveedor. Consulta compras/contabilidad para el saldo económico real.
            </Alert>
          )
        ) : null}
      </section>

      <Modal opened={newOpened} onClose={() => setNewOpened(false)} title="Nuevo trabajo">
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
          <Select
            searchable
            label="Laboratorio"
            value={labId}
            onChange={setLabId}
            data={accountOptions}
            placeholder={accountOptions.length ? "Seleccionar" : "Sin laboratorios activos"}
          />
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
            label="Coste extra (€)"
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

      <Modal
        opened={paymentOpened}
        onClose={() => setPaymentOpened(false)}
        title="Pago a laboratorio"
      >
        <Stack>
          <Select
            label="Laboratorio"
            value={paymentLabId}
            onChange={setPaymentLabId}
            data={accountOptions}
          />
          <NumberInput
            label="Importe (€)"
            min={0}
            decimalScale={2}
            value={paymentEuros}
            onChange={setPaymentEuros}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setPaymentOpened(false)}>
              Cancelar
            </Button>
            <Button onClick={registerPayment}>Registrar</Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
