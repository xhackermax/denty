"use client";
import {
  Alert,
  Badge,
  Button,
  Group,
  Menu,
  Modal,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconDots, IconDownload, IconFileText, IconReceiptRefund } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  projectDoctorMetrics,
  projectMonthlyMetrics,
  projectTreatmentMetrics,
  summarizeFinanceMetrics,
} from "@/domain";
import { formatEUR } from "@/domain/money";
import {
  listTerminalReaders,
  startTerminalCheckout,
  waitForTerminalResult,
  type TerminalCheckoutStatus,
  type TerminalReader,
} from "@/features/payments/card-terminal";
import { usePatientsQuery } from "@/shared/patients/patient-data";
import { publicEnv } from "@/shared/config/env";
import {
  DEMO_BUDGETS,
  DEMO_DOCTOR_ANALYTICS,
  DEMO_MONTHLY_ANALYTICS,
  DEMO_PATIENTS,
  DEMO_TREATMENT_ANALYTICS,
} from "@/shared/demo/demo-data";
import { HorizontalSnapNav } from "@/shared/ui";
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
import { DoctorBars, MonthlyTrend, TreatmentDonut } from "./finance-charts";

type FinanceSection = "analytics" | "budgets" | "invoices" | "payments";

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
  terminalName?: string;
  terminalStatus?: TerminalCheckoutStatus;
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
  const searchParams = useSearchParams();
  const requestedPatientId = searchParams.get("patientId");
  const requestedView = searchParams.get("view") === "budgets" ? "budgets" : "analytics";
  const demoMode = publicEnv.NEXT_PUBLIC_DEMO_MODE === "true";
  const finance = useFinanceQueries(!demoMode);
  const patientsQuery = usePatientsQuery(!demoMode);
  const createInvoiceMutation = useCreateInvoiceMutation();
  const issueInvoiceMutation = useIssueInvoiceMutation();
  const rectifyMutation = useRectifyInvoiceMutation();
  const paymentMutation = useRecordPaymentMutation();
  const allocationMutation = useAllocatePaymentMutation();
  const verifactuMutation = useSubmitVerifactuMutation();
  const [demoInvoices, setDemoInvoices] = useState<DemoInvoice[]>(() => [...INITIAL_INVOICES]);
  const [demoPayments, setDemoPayments] = useState<DemoPayment[]>(() => [...INITIAL_PAYMENTS]);
  const [invoiceOpened, setInvoiceOpened] = useState(false);
  const [paymentOpened, setPaymentOpened] = useState(false);
  const [allocationOpened, setAllocationOpened] = useState(false);
  const [rectifyOpened, setRectifyOpened] = useState(false);
  const [patientId, setPatientId] = useState<string | null>(
    requestedPatientId ?? (demoMode ? "juan-perez" : null),
  );
  const [financeSection, setFinanceSection] = useState<FinanceSection>(requestedView);
  const [seriesId, setSeriesId] = useState<string | null>(null);
  const [concept, setConcept] = useState("");
  const [amountEuros, setAmountEuros] = useState<number | string>(0);
  const [method, setMethod] = useState<DemoPayment["method"]>("CARD");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [allocationEuros, setAllocationEuros] = useState<number | string>(0);
  const [rectificationType, setRectificationType] = useState("R1");
  const [error, setError] = useState<string | null>(null);
  const [terminalReaders, setTerminalReaders] = useState<TerminalReader[]>([]);
  const [selectedReaderId, setSelectedReaderId] = useState<string | null>(null);
  const [terminalStatus, setTerminalStatus] = useState<TerminalCheckoutStatus>("idle");
  const [demoVerifactuIds, setDemoVerifactuIds] = useState<string[]>([]);
  useEffect(() => {
    if (requestedPatientId) setPatientId(requestedPatientId);
    if (searchParams.get("view") === "budgets") setFinanceSection("budgets");
  }, [requestedPatientId, searchParams]);
  useEffect(() => {
    document
      .getElementById(`finance-${financeSection}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [financeSection]);
  useEffect(() => {
    if (!paymentOpened || method !== "CARD") return;
    let active = true;
    setTerminalStatus("idle");
    void listTerminalReaders(demoMode)
      .then((items) => {
        if (!active) return;
        setTerminalReaders(items);
        setSelectedReaderId((current) => current ?? items[0]?.id ?? null);
      })
      .catch((caught) => {
        if (active)
          setError(
            caught instanceof Error ? caught.message : "No se pudieron cargar los datáfonos.",
          );
      });
    return () => {
      active = false;
    };
  }, [demoMode, method, paymentOpened]);
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
  const collectedCents = payments.reduce((sum, payment) => sum + payment.amountCents, 0);
  const treatmentMetrics = useMemo(
    () =>
      projectTreatmentMetrics(
        (demoMode
          ? DEMO_TREATMENT_ANALYTICS
          : (finance.treatments.data?.items ?? [])) as readonly Record<string, unknown>[],
      ),
    [demoMode, finance.treatments.data?.items],
  );
  const doctorMetrics = useMemo(
    () =>
      projectDoctorMetrics(
        (demoMode ? DEMO_DOCTOR_ANALYTICS : (finance.doctors.data?.items ?? [])) as readonly Record<
          string,
          unknown
        >[],
      ),
    [demoMode, finance.doctors.data?.items],
  );
  const monthlyMetrics = useMemo(
    () =>
      projectMonthlyMetrics(
        (demoMode
          ? DEMO_MONTHLY_ANALYTICS
          : (finance.monthly.data?.items ?? [])) as readonly Record<string, unknown>[],
      ),
    [demoMode, finance.monthly.data?.items],
  );
  const dashboardMetrics = useMemo(
    () => summarizeFinanceMetrics(treatmentMetrics, invoicedCents, collectedCents),
    [collectedCents, invoicedCents, treatmentMetrics],
  );
  const budgets = demoMode ? DEMO_BUDGETS : (finance.budgets.data?.items ?? []);
  const visibleBudgets = patientId
    ? budgets.filter((budget) => budget.patientId === patientId)
    : budgets;
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
    const resolvedName =
      patientName ?? (demoPatient ? `${demoPatient.firstName} ${demoPatient.lastName}` : undefined);
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
          invoice.id === invoiceId
            ? {
                ...invoice,
                status: "ISSUED",
              }
            : invoice,
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
          invoice.id === selectedInvoiceId ? { ...invoice, status: "RECTIFIED" } : invoice,
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
    const patient = DEMO_PATIENTS.find((item) => item.id === patientId);
    const resolvedName = patient
      ? `${patient.firstName} ${patient.lastName}`
      : (patientNames.get(patientId) ?? patientId);
    let terminalName: string | undefined;
    if (method === "CARD") {
      const reader = terminalReaders.find((item) => item.id === selectedReaderId);
      if (!reader || !selectedReaderId) {
        setError("Selecciona un datáfono disponible.");
        return;
      }
      terminalName = reader.name;
      setTerminalStatus("pending");
      setError(null);
      try {
        const checkout = await startTerminalCheckout({
          demoMode,
          readerId: selectedReaderId,
          amountCents,
          description: `Denty · ${resolvedName}`,
        });
        const status = await waitForTerminalResult({
          demoMode,
          readerId: checkout.readerId,
          checkoutId: checkout.checkoutId,
        });
        setTerminalStatus(status);
        if (status !== "successful") {
          setError(
            status === "cancelled"
              ? "El cobro fue cancelado en el datáfono."
              : status === "failed"
                ? "El datáfono rechazó el cobro."
                : "No se confirmó el cobro en el datáfono.",
          );
          return;
        }
      } catch (caught) {
        setTerminalStatus("error");
        setError(caught instanceof Error ? caught.message : "Error de datáfono.");
        return;
      }
    }
    if (demoMode) {
      setDemoPayments((current) => [
        {
          id: `PAY-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
          patientId,
          patientName: resolvedName,
          amountCents,
          method,
          ...(terminalName === undefined ? {} : { terminalName }),
          ...(method === "CARD" ? { terminalStatus: "successful" as const } : {}),
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
          El datáfono usa un Solo virtual y VERI*FACTU se simula visualmente. Ninguna operación demo
          mueve dinero ni remite datos a AEAT.
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

      <HorizontalSnapNav
        ariaLabel="Finanzas"
        value={financeSection}
        onChange={(value) => setFinanceSection(value as FinanceSection)}
        items={[
          { value: "analytics", label: "Análisis" },
          { value: "budgets", label: "Presupuestos", badge: visibleBudgets.length },
          { value: "invoices", label: "Facturas", badge: invoices.length },
          { value: "payments", label: "Cobros", badge: payments.length },
        ]}
      />

      <SimpleGrid cols={{ base: 2, md: 5 }} mb="md" mt="md">
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Producido</span>
          <strong className={styles.metricValue}>
            {treatmentMetrics.length ? formatEUR(dashboardMetrics.producedCents) : "Sin datos"}
          </strong>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Facturado</span>
          <strong className={styles.metricValue}>
            {formatEUR(dashboardMetrics.invoicedCents)}
          </strong>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Cobrado</span>
          <strong className={styles.metricValue}>
            {formatEUR(dashboardMetrics.collectedCents)}
          </strong>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Pendiente</span>
          <strong className={styles.metricValue}>{formatEUR(dashboardMetrics.pendingCents)}</strong>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Margen</span>
          <strong className={styles.metricValue}>
            {treatmentMetrics.length ? formatEUR(dashboardMetrics.marginCents) : "Sin datos"}
          </strong>
        </div>
      </SimpleGrid>

      <section className={styles.section} id="finance-analytics">
        <div className={styles.sectionHeader}>
          <div className={styles.sectionHeaderText}>
            <h2 className={styles.sectionTitle}>Análisis</h2>
            <p className={styles.sectionDescription}>Tratamientos, odontólogos y evolución.</p>
          </div>
          <Badge variant="light">{demoMode ? "Demo" : "Servidor"}</Badge>
        </div>
        <div className={styles.financeAnalyticsGrid}>
          <div className={styles.financeChartCard}>
            <h3>Producción por tratamiento</h3>
            <TreatmentDonut metrics={treatmentMetrics} />
          </div>
          <div className={styles.financeChartCard}>
            <h3>Producción por odontólogo</h3>
            <DoctorBars metrics={doctorMetrics} />
          </div>
          <div className={styles.financeChartCard} style={{ gridColumn: "1 / -1" }}>
            <h3>Evolución mensual</h3>
            <MonthlyTrend metrics={monthlyMetrics} />
          </div>
        </div>
        <div className={styles.financeAnalyticsGrid} style={{ marginTop: 16 }}>
          <div className={styles.financeChartCard}>
            <h3>Tratamientos</h3>
            <div className={styles.rowList}>
              {treatmentMetrics.map((metric) => (
                <div className={styles.row} key={metric.label}>
                  <div className={styles.rowMain}>
                    <span className={styles.rowTitle}>{metric.label}</span>
                    <span className={styles.rowMeta}>
                      {metric.count} casos · Cobrado {formatEUR(metric.collectedCents)}
                    </span>
                  </div>
                  <strong>{formatEUR(metric.producedCents)}</strong>
                </div>
              ))}
            </div>
          </div>
          <div className={styles.financeChartCard}>
            <h3>Odontólogos</h3>
            <div className={styles.rowList}>
              {doctorMetrics.map((metric) => (
                <div className={styles.row} key={metric.id ?? metric.name}>
                  <div className={styles.rowMain}>
                    <span className={styles.rowTitle}>{metric.name}</span>
                    <span className={styles.rowMeta}>
                      {metric.count} tratamientos · Cobrado {formatEUR(metric.collectedCents)}
                    </span>
                  </div>
                  <strong>{formatEUR(metric.producedCents)}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section} id="finance-budgets">
        <div className={styles.sectionHeader}>
          <div className={styles.sectionHeaderText}>
            <h2 className={styles.sectionTitle}>Presupuestos</h2>
            <p className={styles.sectionDescription}>
              {patientId ? "Filtrados por el paciente del pipeline." : "Presupuestos clínicos."}
            </p>
          </div>
          {patientId ? <Badge variant="light">Paciente activo</Badge> : null}
        </div>
        <div className={styles.rowList}>
          {visibleBudgets.length ? (
            visibleBudgets.map((budget) => (
              <div className={styles.row} key={budget.id}>
                <div className={styles.rowMain}>
                  <span className={styles.rowTitle}>{budget.id}</span>
                  <span className={styles.rowMeta}>
                    {patientOptions.find((item) => item.value === budget.patientId)?.label ??
                      budget.patientId}
                  </span>
                </div>
                <div className={styles.rowActions}>
                  <strong>{formatEUR(budget.totalCents ?? 0)}</strong>
                  <Badge variant="light">{optionalStringField(budget, "status") ?? "Activo"}</Badge>
                </div>
              </div>
            ))
          ) : (
            <Text c="dimmed" size="sm">
              Sin presupuestos para este paciente.
            </Text>
          )}
        </div>
      </section>

      <section className={styles.section} id="finance-invoices">
        <div className={styles.sectionHeader}>
          <div className={styles.sectionHeaderText}>
            <h2 className={styles.sectionTitle}>Facturas</h2>
            <p className={styles.sectionDescription}>
              Borradores, emisión, rectificativas R1-R5, PDF y remisión VERI*FACTU.
            </p>
          </div>
          <Group gap="xs">
            <Button size="xs" onClick={() => setInvoiceOpened(true)}>
              Nueva factura
            </Button>
            {!demoMode ? (
              <Menu position="bottom-end" withinPortal>
                <Menu.Target>
                  <Button size="xs" variant="subtle" px={8} aria-label="Más acciones">
                    <IconDots size={16} />
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item
                    leftSection={<IconDownload size={14} />}
                    onClick={() => void downloadAccountingCsv()}
                  >
                    CSV contable
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            ) : null}
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
                    demoMode ? (
                      <Button
                        size="xs"
                        variant="light"
                        disabled={demoVerifactuIds.includes(invoice.id)}
                        onClick={() =>
                          setDemoVerifactuIds((current) =>
                            current.includes(invoice.id) ? current : [...current, invoice.id],
                          )
                        }
                      >
                        {demoVerifactuIds.includes(invoice.id)
                          ? "VERI*FACTU aceptada"
                          : "Simular VERI*FACTU"}
                      </Button>
                    ) : (
                      <Button
                        size="xs"
                        variant="light"
                        loading={verifactuMutation.isPending}
                        onClick={() => void run(() => verifactuMutation.mutateAsync(invoice.id))}
                      >
                        Remitir AEAT
                      </Button>
                    )
                  ) : null}
                  {invoice.status === "ISSUED" || !demoMode ? (
                    <Menu position="bottom-end" withinPortal>
                      <Menu.Target>
                        <Button size="xs" variant="subtle" px={8} aria-label="Más acciones">
                          <IconDots size={16} />
                        </Button>
                      </Menu.Target>
                      <Menu.Dropdown>
                        {invoice.status === "ISSUED" ? (
                          <Menu.Item
                            leftSection={<IconReceiptRefund size={14} />}
                            onClick={() => {
                              setSelectedInvoiceId(invoice.id);
                              setRectifyOpened(true);
                            }}
                          >
                            Rectificar
                          </Menu.Item>
                        ) : null}
                        {!demoMode ? (
                          <Menu.Item
                            leftSection={<IconFileText size={14} />}
                            onClick={() => void run(() => openInvoicePdf(invoice.id))}
                          >
                            Abrir PDF
                          </Menu.Item>
                        ) : null}
                      </Menu.Dropdown>
                    </Menu>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className={styles.section} id="finance-payments">
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
                    {optionalStringField(payment, "terminalName")
                      ? ` · ${optionalStringField(payment, "terminalName")}`
                      : ""}
                  </span>
                </div>
                <Badge color="green" variant="light">
                  Registrado
                </Badge>
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
            <Button variant="default" onClick={() => setInvoiceOpened(false)}>
              Cancelar
            </Button>
            <Button loading={busy} onClick={() => void createInvoice()}>
              Crear borrador
            </Button>
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
            data={[
              { value: "CARD", label: "Tarjeta · datáfono" },
              { value: "CASH", label: "Efectivo" },
              { value: "TRANSFER", label: "Transferencia" },
              { value: "FINANCING", label: "Financiación" },
              { value: "OTHER", label: "Otro" },
            ]}
          />
          {method === "CARD" ? (
            <>
              <Select
                searchable
                label="Datáfono"
                placeholder="Selecciona SumUp Solo"
                value={selectedReaderId}
                onChange={setSelectedReaderId}
                data={terminalReaders.map((reader) => ({
                  value: reader.id,
                  label: `${reader.name}${reader.model ? ` · ${reader.model}` : ""}`,
                }))}
                nothingFoundMessage="No hay lectores emparejados"
              />
              <Group justify="space-between">
                <Text size="xs" c="dimmed">
                  El cobro solo se registra en Denty cuando el terminal devuelve successful.
                </Text>
                <Badge
                  color={
                    terminalStatus === "successful"
                      ? "green"
                      : terminalStatus === "failed" || terminalStatus === "error"
                        ? "red"
                        : terminalStatus === "pending"
                          ? "blue"
                          : "gray"
                  }
                >
                  {terminalStatus === "idle" ? "Listo" : terminalStatus}
                </Badge>
              </Group>
            </>
          ) : (
            <Text size="xs" c="dimmed">
              La asignación a factura se realiza después y de forma explícita.
            </Text>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setPaymentOpened(false)}>
              Cancelar
            </Button>
            <Button
              loading={busy || terminalStatus === "pending"}
              onClick={() => void recordPayment()}
            >
              {method === "CARD" ? "Cobrar en datáfono" : "Registrar"}
            </Button>
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
            <Button variant="default" onClick={() => setAllocationOpened(false)}>
              Cancelar
            </Button>
            <Button loading={busy} onClick={() => void allocate()}>
              Asignar
            </Button>
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
            <Button variant="default" onClick={() => setRectifyOpened(false)}>
              Cancelar
            </Button>
            <Button loading={busy} onClick={() => void rectify()}>
              Crear rectificativa
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
