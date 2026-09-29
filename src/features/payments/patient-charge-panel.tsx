"use client";

import { Alert, Button, Group, NumberInput, Select, Stack, Text, TextInput } from "@mantine/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { dentyQueryKeys } from "@/shared/query";
import { useActiveTenant } from "@/shared/tenancy/active-context";
import styles from "@/shared/ui/parity.module.css";

import {
  listTerminalReaders,
  startProviderPayment,
  waitForProviderPayment,
  type ProviderPaymentStatus,
} from "./card-terminal";

/**
 * Stage 13: patient charge panel. Every option goes through the canonical
 * payment-attempt routes (idempotent ledger), so a manual bank terminal,
 * SumUp or Stripe charge ends as exactly one payment row.
 */
type ChargeOption = "CASH" | "BANK_CARD" | "TRANSFER" | "FINANCING" | "SUMUP" | "STRIPE";

const OPTIONS: Array<{ value: ChargeOption; label: string }> = [
  { value: "CASH", label: "Efectivo" },
  { value: "BANK_CARD", label: "Tarjeta · datáfono del banco (manual)" },
  { value: "TRANSFER", label: "Transferencia / Bizum" },
  { value: "FINANCING", label: "Financiación" },
  { value: "SUMUP", label: "Tarjeta · SumUp (conectado)" },
  { value: "STRIPE", label: "Tarjeta · Stripe Terminal (conectado)" },
];

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
  const { activeClinicId } = useActiveTenant();
  const [amount, setAmount] = useState<number | string>("");
  const [option, setOption] = useState<ChargeOption>("CASH");
  const [readerId, setReaderId] = useState<string | null>(null);
  const [stripeReaderId, setStripeReaderId] = useState("");
  const [status, setStatus] = useState<ProviderPaymentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const readers = useQuery({
    queryKey: dentyQueryKeys.finance.sumupReaders,
    queryFn: listTerminalReaders,
    enabled: option === "SUMUP",
    retry: false,
  });

  const amountCents = Math.round(Number(amount || 0) * 100);
  const canSubmit =
    Boolean(activeClinicId) &&
    amountCents > 0 &&
    !busy &&
    (option !== "STRIPE" || stripeReaderId.trim().startsWith("tmr_"));

  const charge = async () => {
    if (!activeClinicId) return;
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const provider = option === "SUMUP" ? "sumup" : option === "STRIPE" ? "stripe" : "manual";
      const method =
        option === "BANK_CARD"
          ? "CARD"
          : option === "SUMUP" || option === "STRIPE"
            ? "CARD"
            : option;
      const started = await startProviderPayment({
        provider,
        clinicId: activeClinicId,
        patientId,
        amountCents,
        method,
        idempotencyKey: crypto.randomUUID(),
        ...(provider === "sumup" && readerId ? { readerId } : {}),
        ...(provider === "stripe" ? { readerId: stripeReaderId.trim() } : {}),
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
            data={OPTIONS}
            allowDeselect={false}
          />
        </Group>
        {option === "SUMUP" ? (
          <Select
            label="Lector SumUp"
            placeholder={readers.isLoading ? "Cargando lectores…" : "Lector por defecto"}
            clearable
            value={readerId}
            onChange={setReaderId}
            data={(readers.data ?? []).map((reader) => ({
              value: reader.id,
              label: `${reader.name} · ${reader.status}`,
            }))}
          />
        ) : null}
        {option === "SUMUP" && readers.isError ? (
          <Text size="xs" c="dimmed">
            No hay lectores SumUp configurados (revisa SUMUP_API_KEY y SUMUP_MERCHANT_CODE).
          </Text>
        ) : null}
        {option === "STRIPE" ? (
          <TextInput
            label="ID del lector Stripe"
            placeholder="tmr_…"
            value={stripeReaderId}
            onChange={(event) => setStripeReaderId(event.currentTarget.value)}
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
          {option === "SUMUP" || option === "STRIPE" ? "Enviar al datáfono" : "Registrar cobro"}
        </Button>
      </Stack>
    </section>
  );
}
