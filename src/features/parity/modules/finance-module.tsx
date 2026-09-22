"use client";

import {
  Alert,
  Badge,
  Button,
  Group,
  Modal,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useMemo, useState } from "react";

import { formatEUR } from "@/domain/money";
import { usePatientsQuery } from "@/shared/patients/patient-data";
import { publicEnv } from "@/shared/config/env";

import { DEMO_PATIENTS, FINANCE_KPIS } from "@/shared/demo/demo-data";
import styles from "@/shared/ui/parity.module.css";
import {
  downloadAccountingCsv,
  openInvoicePdf,
  useAllocatePaymentMutation,
  useCreateInvoiceMutation,
  useFinanceQueries,
  useIssueInvoiceMutation,
  useRecordPaymentMutation,
  useRectifyInvoiceMutation,
  useSubmitVerifactuMutation,
} from "./finance-data";

interface DemoInvoice {
  id: string;
  patientId: string;
  patientName: string;
  totalCents: number;
  status: "DRAFT" | "ISSUED" | "RECTIFIED";
}

interface DemoPayment {
  id: string;
  patientId: string;
  patientName: string;
  amountCents: number;
  method: "CASH" | "CARD" | "TRANSFER" | "FINANCING" | "OTHER";
}

const INITIAL_INVOICES: readonly DemoInvoice[] = [
  {
    id: "F-2026-0089",
    patientId: "juan-perez",
    patientName: "Juan Pérez",
    totalCents: 95000,
    status: "ISSUED",
  },
  {
    id: "BOR-104",
    patientId: "ana-martin",
    patientName: "Ana Martín",
    totalCents: 180000,
    status: "DRAFT",
  },
];

const INITIAL_PAYMENTS: readonly DemoPayment[] = [
  {
    id: "PAY-410",
    patientId: "carlos-garcia",
    patientName: "Carlos García",
    amountCents: 120000,
    method: "TRANSFER",
  },
];

function statusColor(status: string): string {
  if (status === "ISSUED") return "green";
  if (status === "RECTIFIED") return "orange";
  return "gray";
}

function statusLabel(status: string): string {
  if (status === "ISSUED") return "Emitida";
  if (status === "RECTIFIED") return "Rectificada";
  return "Borrador";
}

function optionalStringField(value: object, key: string): string | undefined {
  const field = (value as Record<string, unknown>)[key];
  return typeof field === "string" ? field : undefined;
}

export function FinanceModule() {
  const demoMode = publicEnv.NEXT_PUBLIC_DEMO_MODE === "true";
  const finance = useFinanceQueries(!demoMode);
  const patientsQuery = usePatientsQuery(!demoMode);
  const createInvoiceMutation = useCreateInvoiceMutation();
  const issueInvoiceMutation = useIssueInvoiceMutation();
  const rectifyMutation = useRectifyInvoiceMutation();
  const paymentMutation = useRecordPaymentMutation();
  const allocationMutation = useAllocatePaymentMutation();
  const verifactuMutation = useSubmitVerifactuMutation();

  const [demoInvoices, setDemoInvoices] = useState<DemoInvoice[]>(() => [
    ...INITIAL_INVOICES,
  ]);
  const [demoPayments, setDemoPayments] = useState<DemoPayment[]>(() => [
    ...INITIAL_PAYMENTS,
  ]);
  const [invoiceOpened, setInvoiceOpened] = useState(false);
  const [paymentOpened, setPaymentOpened] = useState(false);
  const [allocationOpened, setAllocationOpened] = useState(false);
  const [rectifyOpened, setRectifyOpened] = useState(false);
  const [patientId, setPatientId] = useState<string | null>(
    demoMode ? "juan-perez" : null,
  );
  const [seriesId, setSeriesId] = useState<string | null>(null);
  const [concept, setConcept] = useState("");
  const [amountEuros, setAmountEuros] = useState<number | string>(0);
  const [method, setMethod] = useState<DemoPayment["method"]>("CARD");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [allocationEuros, setAllocationEuros] = useState<number | string>(0);
  const [rectificationType, setRectificationType] = useState("R1");
  const [error, setError] = useState<string | null>(null);

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

  const patientOptions = demoMode
    ? DEMO_PATIENTS.map((patient) => ({
        value: patient.id,
        label: `${patient.firstName} ${patient.lastName}`,
      }))
    : (patientsQuery.data?.items ?? []).map((patient) => ({
        value: patient.id,
        label: `${patient.firstName} ${patient.lastName}`.trim(),
      }));

  const serverInvoices = finance.invoices.data?.items ?? [];
  const serverPayments = finance.payments.data?.items ?? [];
  const invoices = demoMode ? demoInvoices : serverInvoices;
  const payments = demoMode ? demoPayments : serverPayments;

  const invoicedCents = invoices
    .filter((invoice) => invoice.status !== "DRAFT")
    .reduce((sum, invoice) => sum + invoice.totalCents, 0);
  const collectedCents = payments.reduce(
    (sum, payment) => sum + payment.amountCents,
    0,
  );

  const busy =
    createInvoiceMutation.isPending ||
    issueInvoiceMutation.isPending ||
    rectifyMutation.isPending ||
    paymentMutation.isPending ||
    allocationMutation.isPending ||
    verifactuMutation.isPending;

  const run = async (work: () => Promise<unknown>) => {
    setError(null);
    try {
      await work();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo completar la operación.");
    }
  };

  const createInvoice = async () => {
    const amountCents = Math.round(Number(amountEuros || 0) * 100);
    const patientName = patientId ? patientNames.get(patientId) : undefined;
    const demoPatient = DEMO_PATIENTS.find((item) => item.id === patientId);
    const resolvedName = patientName ??
      (demoPatient ? `${demoPatient.firstName} ${demoPatient.lastName}` : undefined);
    if (!patientId || !resolvedName || !concept.trim() || amountCents <= 0) return;

    if (demoMode) {
      setDemoInvoices((current) => [
        {
          id: `BOR-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
          patientId,
          patientName: resolvedName,
          totalCents: amountCents,
          status: "DRAFT",
        },
        ...current,
      ]);
      setInvoiceOpened(false);
      return;
    }
    if (!seriesId) return;
    await run(async () => {
      await createInvoiceMutation.mutateAsync({
        patientId,
        seriesId,
        customerName: resolvedName,
        lines: [
          {
            description: concept.trim(),
            quantity: 1,
            unitPriceCents: amountCents,
            taxRateBps: 0,
          },
        ],
      });
      setInvoiceOpened(false);
    });
  };

  const issue = async (invoiceId: string) => {
    if (demoMode) {
      setDemoInvoices((current) =>
        current.map((invoice) =>
          invoice.id === invoiceId ? { ...invoice, status: "ISSUED" } : invoice,
        ),
      );
      return;
    }
    await run(() => issueInvoiceMutation.mutateAsync(invoiceId));
  };

  const rectify = async () => {
    if (!selectedInvoiceId) return;
    if (demoMode) {
      setDemoInvoices((current) =>
        current.map((invoice) =>
          invoice.id === selectedInvoiceId
            ? { ...invoice, status: "RECTIFIED" }
            : invoice,
        ),
      );
      setRectifyOpened(false);
      return;
    }
    await run(async () => {
      await rectifyMutation.mutateAsync({
        invoiceId: selectedInvoiceId,
        payload: {
          reason: "Rectificación solicitada desde Denty",
          aeatRectificationType: rectificationType as "R1" | "R2" | "R3" | "R4" | "R5",
        },
      });
      setRectifyOpened(false);
    });
  };

  const recordPayment = async () => {
    const amountCents = Math.round(Number(amountEuros || 0) * 100);
    if (!patientId || amountCents <= 0) return;
    if (demoMode) {
      const patient = DEMO_PATIENTS.find((item) => item.id === patientId);
      if (!patient) return;
      setDemoPayments((current) => [
        {
          id: `PAY-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
          patientId,
          patientName: `${patient.firstName} ${patient.lastName}`,
          amountCents,
          method,
        },
        ...current,
      ]);
      setPaymentOpened(false);
      return;
    }
    await run(async () => {
      await paymentMutation.mutateAsync({ patientId, amountCents, method });
      setPaymentOpened(false);
    });
  };

  const allocate = async () => {
    const amountCents = Math.round(Number(allocationEuros || 0) * 100);
    if (!selectedPaymentId || !selectedInvoiceId || amountCents <= 0) return;
    if (demoMode) {
      setAllocationOpened(false);
      return;
    }
    await run(async () => {
      await allocationMutation.mutateAsync({
        paymentId: selectedPaymentId,
        payload: { invoiceId: selectedInvoiceId, amountCents },
      });
      setAllocationOpened(false);
    });
  };

  const loadingError =
    finance.invoices.error ??
    finance.payments.error ??
    finance.series.error ??
    finance.verifactu.error;

  return (
    <>
      {demoMode ? (
        <Alert color="yellow" title="Finanzas en modo demo" mb="md">
          VERI*FACTU y AEAT no se simulan. Activa backend para operaciones fiscales reales.
        </Alert>
      ) : null}
      {loadingError ? (
        <Alert color="red" title="No se pudieron cargar las finanzas" mb="md">
          {loadingError instanceof Error ? loadingError.message : "Error de servidor"}
        </Alert>
      ) : null}
      {error ? (
        <Alert color="red" title="Operación rechazada" mb="md">
          {error}
        </Alert>
      ) : null}

      <SimpleGrid cols={{ base: 2, md: 4 }} mb="md">
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Producido</span>
          <strong className={styles.metricValue}>
            {demoMode ? formatEUR(FINANCE_KPIS.producedCents) : "Servidor"}
          </strong>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Facturado</span>
          <strong className={styles.metricValue}>{formatEUR(invoicedCents)}</strong>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Cobrado</span>
          <strong className={styles.metricValue}>{formatEUR(collectedCents)}</strong>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>VERI*FACTU</span>
          <strong className={styles.metricValue}>
            {demoMode
              ? "No conectado"
              : `${finance.verifactu.data?.counts.accepted ?? 0} aceptadas`}
          </strong>
        </div>
      </SimpleGrid>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionHeaderText}>
            <h2 className={styles.sectionTitle}>Facturas</h2>
            <p className={styles.sectionDescription}>
              Borradores, emisión, rectificativas R1-R5, PDF y remisión VERI*FACTU.
            </p>
          </div>
          <Group gap="xs">
            {!demoMode ? (
              <Button
                size="xs"
                variant="light"
                onClick={() => void downloadAccountingCsv()}
              >
                CSV contable
              </Button>
            ) : null}
            <Button size="xs" onClick={() => setInvoiceOpened(true)}>
              Nueva factura
            </Button>
          </Group>
        </div>
        <div className={styles.rowList}>
          {invoices.map((invoice) => {
            const patientName =
              optionalStringField(invoice, "patientName") ??
              patientNames.get(invoice.patientId ?? "") ??
              optionalStringField(invoice, "customerName") ??
              "Sin paciente";
            const label = optionalStringField(invoice, "fullNumber") ?? invoice.id;
            return (
              <div className={styles.row} key={invoice.id}>
                <div className={styles.rowMain}>
                  <span className={styles.rowTitle}>{patientName}</span>
                  <span className={styles.rowMeta}>
                    {label} · {formatEUR(invoice.totalCents)}
                  </span>
                </div>
                <div className={styles.rowActions}>
                  <Badge color={statusColor(invoice.status)} variant="light">
                    {statusLabel(invoice.status)}
                  </Badge>
                  {invoice.status === "DRAFT" ? (
                    <Button size="xs" variant="light" onClick={() => void issue(invoice.id)}>
                      Emitir
                    </Button>
                  ) : null}
                  {invoice.status === "ISSUED" ? (
                    <>
                      <Button
                        size="xs"
                        variant="light"
                        onClick={() => {
                          setSelectedInvoiceId(invoice.id);
                          setRectifyOpened(true);
                        }}
                      >
                        Rectificar
                      </Button>
                      {!demoMode ? (
                        <Button
                          size="xs"
                          variant="light"
                          loading={verifactuMutation.isPending}
                          onClick={() => void run(
                            () => verifactuMutation.mutateAsync(invoice.id),
                          )}
                        >
                          Remitir AEAT
                        </Button>
                      ) : null}
                    </>
                  ) : null}
                  {!demoMode ? (
                    <Button
                      size="xs"
                      variant="subtle"
                      onClick={() => void run(() => openInvoicePdf(invoice.id))}
                    >
                      PDF
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionHeaderText}>
            <h2 className={styles.sectionTitle}>Cobros</h2>
            <p className={styles.sectionDescription}>
              El cobro se registra primero. La asignación a factura es explícita.
            </p>
          </div>
          <Group gap="xs">
            {!demoMode ? (
              <Button size="xs" variant="light" onClick={() => setAllocationOpened(true)}>
                Asignar cobro
              </Button>
            ) : null}
            <Button size="xs" onClick={() => setPaymentOpened(true)}>
              Registrar cobro
            </Button>
          </Group>
        </div>
        <div className={styles.rowList}>
          {payments.map((payment) => {
            const patientName =
              optionalStringField(payment, "patientName") ??
              patientNames.get(payment.patientId ?? "") ??
              "Sin paciente";
            return (
              <div className={styles.row} key={payment.id}>
                <div className={styles.rowMain}>
                  <span className={styles.rowTitle}>
                    {patientName} · {formatEUR(payment.amountCents)}
                  </span>
                  <span className={styles.rowMeta}>
                    {payment.id} · {payment.method}
                  </span>
                </div>
                <Badge color="green" variant="light">Registrado</Badge>
              </div>
            );
          })}
        </div>
      </section>

      <Modal opened={invoiceOpened} onClose={() => setInvoiceOpened(false)} title="Nueva factura">
        <Stack>
          <Select
            label="Paciente"
            data={patientOptions}
            value={patientId}
            onChange={setPatientId}
          />
          {!demoMode ? (
            <Select
              label="Serie"
              data={(finance.series.data?.items ?? []).map((item) => ({
                value: item.id,
                label: `${item.code} · ${item.name}`,
              }))}
              value={seriesId}
              onChange={setSeriesId}
            />
          ) : null}
          <TextInput
            label="Concepto"
            value={concept}
            onChange={(event) => setConcept(event.currentTarget.value)}
          />
          <NumberInput label="Importe (€)" min={0} value={amountEuros} onChange={setAmountEuros} />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setInvoiceOpened(false)}>Cancelar</Button>
            <Button loading={busy} onClick={() => void createInvoice()}>Crear borrador</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={paymentOpened} onClose={() => setPaymentOpened(false)} title="Registrar cobro">
        <Stack>
          <Select
            label="Paciente"
            data={patientOptions}
            value={patientId}
            onChange={setPatientId}
          />
          <NumberInput label="Importe (€)" min={0} value={amountEuros} onChange={setAmountEuros} />
          <Select
            label="Método"
            value={method}
            onChange={(value) => setMethod((value ?? "CARD") as DemoPayment["method"])}
            data={["CASH", "CARD", "TRANSFER", "FINANCING", "OTHER"]}
          />
          <Text size="xs" c="dimmed">
            En producción la asignación a factura se realiza después y de forma explícita.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setPaymentOpened(false)}>Cancelar</Button>
            <Button loading={busy} onClick={() => void recordPayment()}>Registrar</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={allocationOpened}
        onClose={() => setAllocationOpened(false)}
        title="Asignar cobro a factura"
      >
        <Stack>
          <Select
            label="Cobro"
            value={selectedPaymentId}
            onChange={setSelectedPaymentId}
            data={serverPayments.map((payment) => ({
              value: payment.id,
              label: `${payment.id} · ${formatEUR(payment.amountCents)}`,
            }))}
          />
          <Select
            label="Factura"
            value={selectedInvoiceId}
            onChange={setSelectedInvoiceId}
            data={serverInvoices
              .filter((invoice) => invoice.status === "ISSUED")
              .map((invoice) => ({
                value: invoice.id,
                label: `${invoice.fullNumber ?? invoice.id} · ${formatEUR(invoice.totalCents)}`,
              }))}
          />
          <NumberInput
            label="Importe a asignar (€)"
            min={0}
            value={allocationEuros}
            onChange={setAllocationEuros}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setAllocationOpened(false)}>Cancelar</Button>
            <Button loading={busy} onClick={() => void allocate()}>Asignar</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={rectifyOpened}
        onClose={() => setRectifyOpened(false)}
        title="Rectificar factura"
      >
        <Stack>
          <Select
            label="Tipo AEAT"
            value={rectificationType}
            onChange={(value) => setRectificationType(value ?? "R1")}
            data={["R1", "R2", "R3", "R4", "R5"]}
          />
          <Text size="xs" c="dimmed">
            La rectificación se registra en backend y conserva la trazabilidad fiscal.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setRectifyOpened(false)}>Cancelar</Button>
            <Button loading={busy} onClick={() => void rectify()}>Crear rectificativa</Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
