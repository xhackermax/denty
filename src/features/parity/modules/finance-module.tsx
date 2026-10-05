"use client";

import { Alert, Badge, Button, Group, SimpleGrid, Stack, Text } from "@mantine/core";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { ActionErrorAlert } from "./action-error-alert";

import { formatEUR } from "@/domain/money";
import { MotionNumber } from "@/shared/motion";
import { PatientChargePanel } from "@/features/payments/patient-charge-panel";
import { ClinicalSyncCard } from "@/shared/clinical/clinical-sync-card";
import styles from "@/shared/ui/parity.module.css";
import {
  downloadAccountingCsv,
  openInvoicePdf,
  useFinanceQueries,
  useIssueInvoiceMutation,
  useSubmitVerifactuMutation,
} from "./finance-data";

export function FinanceModule() {
  const [advancedEnabled, setAdvancedEnabled] = useState(false);
  const finance = useFinanceQueries(true, advancedEnabled);
  const issue = useIssueInvoiceMutation();
  const submit = useSubmitVerifactuMutation();
  const [exportError, setExportError] = useState<unknown>(null);
  const runExport = (action: () => Promise<void>) => {
    setExportError(null);
    action().catch((error: unknown) => setExportError(error ?? new Error("")));
  };
  const hasError = Object.values(finance).some((query) => query.isError);
  const summaryMetric = (value: number | undefined, label: string) => {
    if (finance.summary.isError) return "No disponible";
    if (finance.summary.isPending) return "Cargando…";
    return <MotionNumber value={(value ?? 0) / 100} format="currency" ariaLabel={label} />;
  };
  const summaryEuro = (value: number | undefined) =>
    finance.summary.isError
      ? "No disponible"
      : finance.summary.isPending
        ? "Cargando…"
        : formatEUR(value ?? 0);
  const verifactuCount = finance.verifactu.isError
    ? "No disponible"
    : finance.verifactu.isPending
      ? "Cargando…"
      : (finance.verifactu.data?.counts.pending ?? 0);
  // Stage 13: the clinical pipeline links here (?patientId=…&view=budgets[&action=sign]);
  // the sync card shows the patient's budget and the canonical signature action.
  const budgetPatientId = useSearchParams().get("patientId");

  useEffect(() => {
    const timeout = window.setTimeout(() => setAdvancedEnabled(true), 900);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <Stack gap="md">
      {hasError ? <Alert color="red">Hay datos financieros no disponibles.</Alert> : null}
      <ActionErrorAlert errors={[exportError, issue.error, submit.error]} />
      {budgetPatientId ? <ClinicalSyncCard patientId={budgetPatientId} /> : null}
      {budgetPatientId ? <PatientChargePanel patientId={budgetPatientId} /> : null}

      <Group justify="space-between">
        <Badge variant="light">Ledger real</Badge>
        <Button size="xs" variant="light" onClick={() => runExport(downloadAccountingCsv)}>
          Exportar CSV
        </Button>
      </Group>

      <SimpleGrid cols={{ base: 1, md: 3 }}>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Producido</span>
          <strong className={styles.metricValue}>
            {summaryMetric(finance.summary.data?.producedCents, "Producido")}
          </strong>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Margen</span>
          <strong className={styles.metricValue}>
            {summaryMetric(finance.summary.data?.marginCents, "Margen")}
          </strong>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Facturado emitido</span>
          <strong className={styles.metricValue}>
            {summaryMetric(finance.summary.data?.invoicedCents, "Facturado")}
          </strong>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Cobrado</span>
          <strong className={styles.metricValue}>
            {summaryMetric(finance.summary.data?.collectedCents, "Cobrado")}
          </strong>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Pendiente de cobro</span>
          <strong className={styles.metricValue}>
            {summaryMetric(finance.summary.data?.pendingCents, "Pendiente")}
          </strong>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Ticket medio</span>
          <strong className={styles.metricValue}>
            {summaryEuro(finance.summary.data?.averageTicketCents)}
          </strong>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Pendiente Verifactu</span>
          <strong className={styles.metricValue}>{verifactuCount}</strong>
        </div>
      </SimpleGrid>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Facturas</h3>
        <div className={styles.rowList}>
          {(finance.invoices.data?.items ?? []).map((invoice) => (
            <div className={styles.row} key={invoice.id}>
              <div className={styles.rowMain}>
                <span className={styles.rowTitle}>{invoice.fullNumber ?? invoice.id}</span>
                <span className={styles.rowMeta}>
                  {invoice.customerName} · {formatEUR(invoice.totalCents)}
                </span>
              </div>
              <div className={styles.rowActions}>
                <Badge>{invoice.status}</Badge>
                <Button
                  size="xs"
                  variant="light"
                  onClick={() => runExport(() => openInvoicePdf(invoice.id))}
                >
                  PDF
                </Button>
                {invoice.status === "DRAFT" ? (
                  <Button size="xs" onClick={() => issue.mutate(invoice.id)}>
                    Emitir
                  </Button>
                ) : null}
                {invoice.status === "ISSUED" ? (
                  <Button size="xs" variant="light" onClick={() => submit.mutate(invoice.id)}>
                    Verifactu
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
          {finance.invoices.isPending ? (
            <Text c="dimmed">Cargando facturas…</Text>
          ) : finance.invoices.isError ? (
            <Text c="dimmed">Facturas no disponibles.</Text>
          ) : finance.invoices.data?.items.length === 0 ? (
            <Text c="dimmed">Sin facturas.</Text>
          ) : null}
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Pagos</h3>
        <div className={styles.rowList}>
          {(finance.payments.data?.items ?? []).map((payment) => (
            <div className={styles.row} key={payment.id}>
              <div className={styles.rowMain}>
                <span className={styles.rowTitle}>{formatEUR(payment.amountCents)}</span>
                <span className={styles.rowMeta}>
                  {payment.method} · {payment.reference ?? "Sin referencia"}
                </span>
              </div>
            </div>
          ))}
          {finance.payments.isPending ? (
            <Text c="dimmed">Cargando pagos…</Text>
          ) : finance.payments.isError ? (
            <Text c="dimmed">Pagos no disponibles.</Text>
          ) : finance.payments.data?.items.length === 0 ? (
            <Text c="dimmed">Sin pagos.</Text>
          ) : null}
        </div>
      </section>
    </Stack>
  );
}
