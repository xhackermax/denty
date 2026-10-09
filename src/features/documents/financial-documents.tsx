"use client";

import { Alert, Badge, Button, Group, Stack, Text } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { formatEUR } from "@/domain/money";
import { useIssueInvoiceMutation, useSubmitVerifactuMutation, openInvoicePdf } from "@/features/parity/modules/finance-data";
import { getBrowserApi } from "@/shared/api/browser";
import { usePatientsQuery } from "@/shared/patients/patient-data";
import { dentyQueryKeys } from "@/shared/query";
import styles from "@/shared/ui/parity.module.css";

export function InvoiceDocuments() {
  const query = useQuery({
    queryKey: dentyQueryKeys.finance.invoices,
    queryFn: () => getBrowserApi().billing.invoices.list(),
  });
  const issue = useIssueInvoiceMutation();
  const submit = useSubmitVerifactuMutation();
  const [downloadError, setDownloadError] = useState(false);

  return (
    <Stack gap="md">
      {query.isError ? <Alert color="red">No se pudieron consultar las facturas.</Alert> : null}
      {issue.isError || submit.isError ? <Alert color="red">No se completó la operación de facturación.</Alert> : null}
      {downloadError ? <Alert color="red">No se pudo descargar la factura.</Alert> : null}
      <section className={styles.section}>
        <Group justify="space-between" mb="md">
          <h3 className={styles.sectionTitle}>Facturas de la clínica</h3>
          <Button component={Link} href="/app/finance" variant="light" size="xs">
            Ir a Finanzas
          </Button>
        </Group>
        <div className={styles.rowList}>
          {(query.data?.items ?? []).map((invoice) => (
            <div className={styles.row} key={invoice.id}>
              <div className={styles.rowMain}>
                <span className={styles.rowTitle}>{invoice.fullNumber || "Borrador de factura"}</span>
                <span className={styles.rowMeta}>{invoice.customerName} · {formatEUR(invoice.totalCents)}</span>
              </div>
              <div className={styles.rowActions}>
                <Badge variant="light">{invoice.status}</Badge>
                <Button size="xs" variant="light" onClick={() => {
                  setDownloadError(false);
                  void openInvoicePdf(invoice.id).catch(() => setDownloadError(true));
                }}>PDF</Button>
                {invoice.status === "DRAFT" ? (
                  <Button size="xs" loading={issue.isPending} onClick={() => issue.mutate(invoice.id)}>Emitir</Button>
                ) : null}
                {invoice.status === "ISSUED" ? (
                  <Button size="xs" variant="light" loading={submit.isPending} onClick={() => submit.mutate(invoice.id)}>Verifactu</Button>
                ) : null}
              </div>
            </div>
          ))}
          {query.isPending ? <Text c="dimmed">Cargando facturas…</Text> : null}
          {query.isSuccess && query.data.items.length === 0 ? <Text c="dimmed">No hay facturas todavía.</Text> : null}
        </div>
      </section>
    </Stack>
  );
}

export function BudgetDocuments() {
  const budgets = useQuery({
    queryKey: dentyQueryKeys.finance.budgets,
    queryFn: () => getBrowserApi().billing.budgets.list(),
  });
  const patients = usePatientsQuery();
  const patientNames = new Map((patients.data?.items ?? []).map((patient) => [
    patient.id,
    [patient.firstName, patient.lastName].filter(Boolean).join(" "),
  ]));

  return (
    <Stack gap="md">
      {budgets.isError ? <Alert color="red">No se pudieron consultar los presupuestos.</Alert> : null}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Presupuestos de pacientes</h3>
        <div className={styles.rowList}>
          {(budgets.data?.items ?? []).map((budget) => {
            const code = typeof budget.code === "string" ? budget.code : budget.id.slice(0, 8);
            const status = typeof budget.status === "string" ? budget.status : "DRAFT";
            return (
              <div className={styles.row} key={budget.id}>
                <div className={styles.rowMain}>
                  <span className={styles.rowTitle}>{code} · {patientNames.get(budget.patientId) ?? "Paciente"}</span>
                  <span className={styles.rowMeta}>{formatEUR(budget.totalCents ?? 0)}</span>
                </div>
                <div className={styles.rowActions}>
                  <Badge color={status === "SIGNED" ? "green" : "gray"} variant="light">
                    {status === "SIGNED" ? "Firmado" : status}
                  </Badge>
                  <Button component={Link}
                    href={"/app/patients/" + encodeURIComponent(budget.patientId) + "?view=budgets"}
                    size="xs" variant="light">
                    Abrir presupuesto
                  </Button>
                </div>
              </div>
            );
          })}
          {budgets.isPending ? <Text c="dimmed">Cargando presupuestos…</Text> : null}
          {budgets.isSuccess && budgets.data.items.length === 0 ? <Text c="dimmed">No hay presupuestos todavía.</Text> : null}
        </div>
      </section>
    </Stack>
  );
}
