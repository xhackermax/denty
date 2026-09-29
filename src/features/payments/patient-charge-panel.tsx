"use client";

import { Alert, Button, Group, NumberInput, Select, Stack, Text } from "@mantine/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { getBrowserApi } from "@/shared/api/browser";
import { dentyQueryKeys } from "@/shared/query";
import { useActiveTenant } from "@/shared/tenancy/active-context";
import styles from "@/shared/ui/parity.module.css";

import {
  startProviderPayment,
  waitForProviderPayment,
  type ProviderPaymentStatus,
} from "./card-terminal";

/**
 * Stage 13: patient charge panel. Every option goes through the canonical
 * payment-attempt routes (idempotent ledger), so a manual bank terminal,
 * SumUp or Stripe charge ends as exactly one payment row. Connected terminals
 * are set up in Administración › Cobros y datáfonos and the one of the current
 * site is proposed first.
 */
type ChargeOption = "CASH" | "BANK_CARD" | "TRANSFER" | "FINANCING" | "TERMINAL";

const BASE_OPTIONS: Array<{ value: ChargeOption; label: string }> = [
  { value: "CASH", label: "Efectivo" },
  { value: "BANK_CARD", label: "Tarjeta · datáfono del banco (manual)" },
  { value: "TRANSFER", label: "Transferencia / Bizum" },
  { value: "FINANCING", label: "Financiación" },
];
const PROVIDER_NAMES = { sumup: "SumUp", stripe: "Stripe" } as const;

const STATUS_LABEL: Record<ProviderPaymentStatus, string> = {
  processing: "Esperando al datáfono…",
  requires_action: "El datáfono necesita una acción del paciente.",
  succeeded: "Cobro registrado.",
  failed: "El cobro ha fallado.",
  cancelled: "Cobro cancelado.",
  expired: "El datáfono no respondió a tiempo. Revisa el estado antes de repetir.",
} as Record<ProviderPaymentStatus, string>;

export function PatientChargePanel({ patientId }: { patientId: string }) {
  const queryClient = useQueryClient();
  const { activeClinicId, activeSiteId, sites } = useActiveTenant();
  const [amount, setAmount] = useState<number | string>("");
  const [option, setOption] = useState<ChargeOption>("CASH");
  const [terminalId, setTerminalId] = useState<string | null>(null);
  const [status, setStatus] = useState<ProviderPaymentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const terminals = useQuery({
    queryKey: dentyQueryKeys.finance.terminals,
    queryFn: () => getBrowserApi().admin.paymentTerminals.forCharging(),
    retry: false,
    staleTime: 60_000,
  });
  const terminalList = useMemo(() => terminals.data?.items ?? [], [terminals.data]);
  const siteNames = useMemo(() => new Map(sites.map((site) => [site.id, site.name])), [sites]);
  // The terminal of the site the reception desk is working at comes first.
  const sortedTerminals = useMemo(
    () =>
      [...terminalList].sort(
        (a, b) => Number(b.siteId === activeSiteId) - Number(a.siteId === activeSiteId),
      ),
    [activeSiteId, terminalList],
  );
  const terminal =
    sortedTerminals.find((candidate) => candidate.id === terminalId) ?? sortedTerminals[0];
  const options = terminalList.length
    ? [...BASE_OPTIONS, { value: "TERMINAL" as const, label: "Tarjeta · datáfono conectado" }]
    : BASE_OPTIONS;

  const amountCents = Math.round(Number(amount || 0) * 100);
  const canSubmit =
    Boolean(activeClinicId) && amountCents > 0 && !busy && (option !== "TERMINAL" || !!terminal);

  const charge = async () => {
    if (!activeClinicId) return;
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const provider = option === "TERMINAL" && terminal ? terminal.provider : "manual";
      const method = option === "BANK_CARD" || option === "TERMINAL" ? "CARD" : option;
      const started = await startProviderPayment({
        provider,
        clinicId: activeClinicId,
        patientId,
        amountCents,
        method,
        idempotencyKey: crypto.randomUUID(),
        ...(provider !== "manual" && terminal ? { readerId: terminal.providerTerminalId } : {}),
      });
      let final = started.status;
      if (final === "processing" && provider !== "manual" && started.attemptId) {
        setStatus("processing");
        final = await waitForProviderPayment({ provider, attemptId: started.attemptId });
      }
      setStatus(final);
      if (final === "succeeded") setAmount("");
      void queryClient.invalidateQueries({ queryKey: dentyQueryKeys.finance.root });
      void queryClient.invalidateQueries({ queryKey: dentyQueryKeys.analytics.root });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo registrar el cobro.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={styles.section} aria-label="Cobrar al paciente">
      <h3 className={styles.sectionTitle}>Cobrar</h3>
      <Stack mt="sm">
        <Group grow align="flex-end">
          <NumberInput
            label="Importe (€)"
            min={0}
            decimalScale={2}
            value={amount}
            onChange={setAmount}
          />
          <Select
            label="Forma de cobro"
            value={option}
            onChange={(value) => setOption((value as ChargeOption) ?? "CASH")}
            data={options}
            allowDeselect={false}
          />
        </Group>
        {option === "TERMINAL" ? (
          <Select
            label="Datáfono"
            value={terminal?.id ?? null}
            onChange={setTerminalId}
            allowDeselect={false}
            data={sortedTerminals.map((candidate) => ({
              value: candidate.id,
              label: [
                candidate.label,
                PROVIDER_NAMES[candidate.provider],
                candidate.siteId ? siteNames.get(candidate.siteId) : null,
              ]
                .filter(Boolean)
                .join(" · "),
            }))}
          />
        ) : null}
        {option === "BANK_CARD" ? (
          <Text size="xs" c="dimmed">
            Cobra en el datáfono del banco y pulsa Registrar cuando el ticket salga aprobado.
          </Text>
        ) : null}
        {status ? (
          <Alert
            color={status === "succeeded" ? "green" : status === "processing" ? "blue" : "orange"}
          >
            {STATUS_LABEL[status] ?? status}
          </Alert>
        ) : null}
        {error ? <Alert color="red">{error}</Alert> : null}
        <Button disabled={!canSubmit} loading={busy} onClick={() => void charge()}>
          {option === "TERMINAL" ? "Enviar al datáfono" : "Registrar cobro"}
        </Button>
      </Stack>
    </section>
  );
}
