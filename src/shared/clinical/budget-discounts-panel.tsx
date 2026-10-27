"use client";

import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Group,
  NumberInput,
  SegmentedControl,
  Select,
  Stack,
  Text,
  TextInput,
  UnstyledButton,
} from "@mantine/core";
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react";
import { useState } from "react";

import { computeBudgetTotals, formatPercent } from "@/domain/budget-discounts";
import { formatEUR } from "@/domain/money";
import { DentyApiError } from "@/shared/api/errors";
import styles from "@/shared/ui/parity.module.css";

import type { BudgetView } from "./budget-options";
import { useBudgetDiscountSettingsQuery, useUpdateBudgetDiscountsMutation } from "./clinical-data";

type DiscountMode = "percent" | "amount";
const CUSTOM = "__custom__";

function errorText(error: unknown): string {
  return error instanceof DentyApiError || error instanceof Error
    ? error.message
    : "No se pudo guardar el descuento.";
}

function initialMode(budget: BudgetView): DiscountMode {
  return (budget.discountAmountCents ?? 0) > 0 && !budget.discountPercent ? "amount" : "percent";
}

/**
 * Collapsible section of the budget step: one discount (a preset from Administración →
 * Finanzas or a custom one) and the early-payment option, with the resulting breakdown.
 */
export function BudgetDiscountsPanel({
  patientId,
  budget,
  onUpdated,
}: {
  patientId: string;
  budget: BudgetView;
  onUpdated: (budget: BudgetView) => void;
}) {
  const settings = useBudgetDiscountSettingsQuery();
  const update = useUpdateBudgetDiscountsMutation(patientId);
  const hasDiscount =
    (budget.discountPercent ?? 0) > 0 ||
    (budget.discountAmountCents ?? 0) > 0 ||
    Boolean(budget.earlyPaymentApplied);
  const [open, setOpen] = useState(hasDiscount);
  const [label, setLabel] = useState(budget.discountLabel ?? "");
  const [mode, setMode] = useState<DiscountMode>(initialMode(budget));
  const [percent, setPercent] = useState<number | string>(budget.discountPercent ?? 0);
  const [amountEuro, setAmountEuro] = useState<number | string>(
    (budget.discountAmountCents ?? 0) / 100,
  );
  const [earlyPayment, setEarlyPayment] = useState(Boolean(budget.earlyPaymentApplied));

  const editable = budget.status === "DRAFT" && budget.version !== undefined;
  const presets = settings.data?.discountPresets ?? [];
  const earlyEnabled = settings.data?.earlyPaymentEnabled ?? false;
  const earlyPercent = earlyEnabled ? (settings.data?.earlyPaymentPercent ?? null) : null;
  const maxPercent = settings.data?.maxDiscountPercent ?? 100;
  const subtotal = budget.subtotalCents ?? budget.totalCents;

  const discountPercent = mode === "percent" ? Number(percent) || 0 : 0;
  const discountAmountCents = mode === "amount" ? Math.round((Number(amountEuro) || 0) * 100) : 0;
  const preview = computeBudgetTotals({
    subtotalCents: subtotal,
    discountPercent,
    discountAmountCents,
    earlyPaymentPercent: earlyPercent,
    earlyPaymentApplied: earlyPayment,
  });
  const overMax =
    discountPercent > maxPercent || discountAmountCents > Math.round((subtotal * maxPercent) / 100);
  const presetValue =
    presets.find((preset) => preset.label === label && preset.percent === discountPercent)?.label ??
    (label || discountPercent ? CUSTOM : null);

  const save = (input: {
    label: string | null;
    percent: number;
    amountCents: number;
    earlyPayment: boolean;
  }) => {
    if (budget.version === undefined) return;
    update.mutate(
      {
        budgetId: budget.id,
        expectedVersion: budget.version,
        discountLabel: input.label,
        discountPercent: input.percent,
        discountAmountCents: input.amountCents,
        earlyPaymentApplied: input.earlyPayment,
      },
      { onSuccess: (result) => onUpdated(result.budget as BudgetView) },
    );
  };

  const summary = [
    budget.discountCents ? `−${formatEUR(budget.discountCents)}` : null,
    budget.earlyPaymentApplied ? "pronto pago" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className={styles.section}>
      <UnstyledButton
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={`budget-discounts-${budget.id}`}
        w="100%"
      >
        <Group justify="space-between" wrap="nowrap">
          <Group gap="xs" wrap="nowrap">
            {open ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
            <Text fw={700}>Descuentos y pronto pago</Text>
          </Group>
          {summary ? (
            <Badge variant="light" color="teal">
              {summary}
            </Badge>
          ) : (
            <Text size="xs" c="dimmed">
              Sin descuentos
            </Text>
          )}
        </Group>
      </UnstyledButton>
      {open ? (
        <Stack gap="sm" mt="sm" id={`budget-discounts-${budget.id}`}>
          {!editable ? (
            <Text size="sm" c="dimmed">
              El presupuesto ya está firmado: los descuentos no se pueden cambiar.
            </Text>
          ) : null}
          {settings.isError ? (
            <Alert color="orange">
              No se pudo cargar la configuración de descuentos de la clínica.
            </Alert>
          ) : null}
          {presets.length ? (
            <Select
              label="Descuento"
              placeholder="Elige uno o escribe uno propio"
              disabled={!editable}
              clearable
              data={[
                ...presets.map((preset) => ({
                  value: preset.label,
                  label: `${preset.label} · ${formatPercent(preset.percent)}`,
                })),
                { value: CUSTOM, label: "Otro descuento" },
              ]}
              value={presetValue}
              onChange={(value) => {
                update.reset();
                const preset = presets.find((item) => item.label === value);
                if (preset) {
                  setLabel(preset.label);
                  setMode("percent");
                  setPercent(preset.percent);
                } else if (value === null) {
                  setLabel("");
                  setPercent(0);
                  setAmountEuro(0);
                } else {
                  setLabel("");
                }
              }}
            />
          ) : null}
          <Group grow align="end">
            <TextInput
              label="Concepto"
              placeholder="Por ejemplo: Familiar"
              maxLength={80}
              disabled={!editable}
              value={label}
              onChange={(event) => {
                update.reset();
                setLabel(event.currentTarget.value);
              }}
            />
            <SegmentedControl
              size="xs"
              disabled={!editable}
              value={mode}
              onChange={(value) => {
                update.reset();
                setMode(value === "amount" ? "amount" : "percent");
              }}
              data={[
                { value: "percent", label: "%" },
                { value: "amount", label: "€" },
              ]}
              aria-label="Tipo de descuento"
            />
            {mode === "percent" ? (
              <NumberInput
                label="Porcentaje"
                suffix=" %"
                min={0}
                max={maxPercent}
                decimalScale={2}
                disabled={!editable}
                value={percent}
                onChange={(value) => {
                  update.reset();
                  setPercent(value);
                }}
              />
            ) : (
              <NumberInput
                label="Importe"
                suffix=" €"
                min={0}
                max={subtotal / 100}
                decimalScale={2}
                disabled={!editable}
                value={amountEuro}
                onChange={(value) => {
                  update.reset();
                  setAmountEuro(value);
                }}
              />
            )}
          </Group>
          {earlyPercent !== null ? (
            <Checkbox
              disabled={!editable}
              checked={earlyPayment}
              onChange={(event) => {
                update.reset();
                setEarlyPayment(event.currentTarget.checked);
              }}
              label={`Pronto pago: −${formatPercent(earlyPercent)} (${formatEUR(
                preview.earlyPaymentTotalCents ?? preview.totalCents,
              )})`}
              description={settings.data?.earlyPaymentTerms}
            />
          ) : (
            <Text size="xs" c="dimmed">
              El pronto pago está desactivado. Actívalo en Administración → Finanzas.
            </Text>
          )}

          <Stack gap={2}>
            <Group justify="space-between">
              <Text size="sm">Subtotal</Text>
              <Text size="sm">{formatEUR(preview.subtotalCents)}</Text>
            </Group>
            {preview.discountCents > 0 ? (
              <Group justify="space-between">
                <Text size="sm">Descuento{label.trim() ? ` · ${label.trim()}` : ""}</Text>
                <Text size="sm" c="teal">
                  −{formatEUR(preview.discountCents)}
                </Text>
              </Group>
            ) : null}
            {preview.earlyPaymentCents > 0 ? (
              <Group justify="space-between">
                <Text size="sm">Pronto pago</Text>
                <Text size="sm" c="teal">
                  −{formatEUR(preview.earlyPaymentCents)}
                </Text>
              </Group>
            ) : null}
            <Group justify="space-between">
              <Text fw={800}>Total</Text>
              <Text fw={800}>{formatEUR(preview.totalCents)}</Text>
            </Group>
          </Stack>

          {overMax ? (
            <Text size="xs" c="red">
              El máximo permitido es {formatPercent(maxPercent)} del subtotal.
            </Text>
          ) : null}
          {update.isError ? <Alert color="red">{errorText(update.error)}</Alert> : null}
          {editable ? (
            <Group justify="flex-end">
              {hasDiscount ? (
                <Button
                  variant="subtle"
                  color="red"
                  size="xs"
                  loading={update.isPending}
                  onClick={() => {
                    setLabel("");
                    setPercent(0);
                    setAmountEuro(0);
                    setEarlyPayment(false);
                    save({ label: null, percent: 0, amountCents: 0, earlyPayment: false });
                  }}
                >
                  Quitar descuentos
                </Button>
              ) : null}
              <Button
                size="xs"
                loading={update.isPending}
                disabled={overMax}
                onClick={() =>
                  save({
                    label: label.trim() || null,
                    percent: discountPercent,
                    amountCents: discountAmountCents,
                    earlyPayment,
                  })
                }
              >
                Aplicar al presupuesto
              </Button>
            </Group>
          ) : null}
        </Stack>
      ) : null}
    </div>
  );
}
