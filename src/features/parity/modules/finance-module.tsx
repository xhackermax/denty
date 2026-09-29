"use client";

import { Alert, Badge, Button, Group, SimpleGrid, Stack, Text } from "@mantine/core";

import { useSearchParams } from "next/navigation";

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
  const finance = useFinanceQueries(true);
  const issue = useIssueInvoiceMutation();
  const submit = useSubmitVerifactuMutation();
  const hasError = Object.values(finance).some((query) => query.isError);
  // Stage 13: the clinical pipeline links here (?patientId=…&view=budgets[&action=sign]);
  // the sync card shows the patient's budget and the canonical signature action.
  const budgetPatientId = useSearchParams().get("patientId");

  return (
    <Stack gap="md">
      {hasError ? <Alert color="red">Hay datos financieros no disponibles.</Alert> : null}
      {budgetPatientId ? <ClinicalSyncCard patientId={budgetPatientId} /> : null}
      {budgetPatientId ? <PatientChargePanel patientId={budgetPatientId} /> : null}

      <Group justify="space-between">
        <Badge variant="light">Ledger real</Badge>
        <Button size="xs" variant="light" onClick={() => void downloadAccountingCsv()}>
          Exportar CSV
        </Button>
      </Group>

      <SimpleGrid cols={{ base: 1, md: 3 }}>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Producido</span>
          <strong className={styles.metricValue}>
            <MotionNumber
              value={(finance.summary.data?.producedCents ?? 0) / 100}
              format="currency"
              ariaLabel="Producido"
            />
          </strong>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Margen</span>
          <strong className={styles.metricValue}>
            <MotionNumber
              value={(finance.summary.data?.marginCents ?? 0) / 100}
              format="currency"
              ariaLabel="Margen"
            />
          </strong>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Facturado emitido</span>
          <strong className={styles.metricValue}>
            <MotionNumber
              value={(finance.summary.data?.invoicedCents ?? 0) / 100}
              format="currency"
              ariaLabel="Facturado"
            />
          </strong>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Cobrado</span>
          <strong className={styles.metricValue}>
            <MotionNumber
              value={(finance.summary.data?.collectedCents ?? 0) / 100}
              format="currency"
              ariaLabel="Cobrado"
            />
          </strong>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Pendiente de cobro</span>
          <strong className={styles.metricValue}>
            <MotionNumber
              value={(finance.summary.data?.pendingCents ?? 0) / 100}
              format="currency"
              ariaLabel="Pendiente"
            />
          </strong>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Ticket medio</span>
          <strong className={styles.metricValue}>
            {formatEUR(finance.summary.data?.averageTicketCents ?? 0)}
          </strong>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Pendiente Verifactu</span>
          <strong className={styles.metricValue}>
            {finance.verifactu.data?.counts.pending ?? 0}
          </strong>
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
                <Button size="xs" variant="light" onClick={() => void openInvoicePdf(invoice.id)}>
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
          {!finance.invoices.isLoading && (finance.invoices.data?.items.length ?? 0) === 0 ? (
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
          {!finance.payments.isLoading && (finance.payments.data?.items.length ?? 0) === 0 ? (
            <Text c="dimmed">Sin pagos.</Text>
          ) : null}
        </div>
      </section>
    </Stack>
  );
}
