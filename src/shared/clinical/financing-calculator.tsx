"use client";

import { Alert, Badge, Group, NumberInput, Select, Stack, Text, Title } from "@mantine/core";
import { useMemo, useState } from "react";

import { calculateFinancing } from "@/domain/financing-calculator";
import { formatEUR } from "@/domain/money";

import type { BudgetView } from "./budget-options";
import styles from "./financing-calculator.module.css";

const MONTHS = [6, 12, 18, 24, 36, 48, 60] as const;

export function FinancingCalculator({
  budgets,
  preferredBudgetId,
}: {
  budgets: readonly BudgetView[];
  preferredBudgetId?: string | null;
}) {
  const options = budgets.filter((budget) =>
    Number.isSafeInteger(budget.totalCents) && budget.totalCents >= 100);
  const [chosenId, setChosenId] = useState<string | null>(null);
  const selected = options.find((budget) => budget.id === chosenId) ??
    options.find((budget) => budget.id === preferredBudgetId) ?? options[0];
  const [downPaymentEuro, setDownPaymentEuro] = useState<number | string>(0);
  const [months, setMonths] = useState(24);
  const [tin, setTin] = useState<number | string>(0);
  const [openingFee, setOpeningFee] = useState<number | string>(0);

  const summary = useMemo(() => {
    if (!selected || typeof downPaymentEuro !== "number" ||
        typeof tin !== "number" || typeof openingFee !== "number") return null;
    try {
      return calculateFinancing({
        budgetTotalCents: selected.totalCents,
        downPaymentCents: Math.round(downPaymentEuro * 100),
        months,
        tinPercent: tin,
        openingFeePercent: openingFee,
      });
    } catch {
      return null;
    }
  }, [selected, downPaymentEuro, months, tin, openingFee]);

  if (options.length === 0) return null;

  return (
    <section className={styles.section} aria-labelledby="patient-financing-title">
      <Group justify="space-between" align="center" mb="xs">
        <Title order={3} id="patient-financing-title">Calculadora de financiación</Title>
        <Badge variant="light">Simulación</Badge>
      </Group>
      <Text size="sm" c="dimmed" mb="md">
        Calcula una cuota orientativa a partir del presupuesto elegido.
        No realiza cobros ni solicita financiación al banco.
      </Text>
      <Stack gap="md">
        <Select
          label="Presupuesto que quieres financiar"
          description="El importe se obtiene del presupuesto guardado, sin introducirlo dos veces."
          searchable
          allowDeselect={false}
          data={options.map((budget) => ({
            value: budget.id,
            label: `${budget.title || budget.code} · ${formatEUR(budget.totalCents)} · ${budget.status === "SIGNED" ? "Firmado" : "No firmado"}`,
          }))}
          value={selected?.id ?? null}
          onChange={setChosenId}
        />
        <div className={styles.fields}>
          <NumberInput
            label="Entrada inicial (€)"
            aria-label="Entrada inicial en euros"
            min={0}
            max={selected ? Math.max(0, selected.totalCents / 100 - 0.01) : 0}
            decimalScale={2}
            fixedDecimalScale
            value={downPaymentEuro}
            onChange={setDownPaymentEuro}
          />
          <Select
            label="Plazo de devolución"
            allowDeselect={false}
            value={String(months)}
            data={MONTHS.map((term) => ({ value: String(term), label: `${term} meses` }))}
            onChange={(value) => { if (value) setMonths(Number(value)); }}
          />
          <NumberInput
            label="TIN anual (%)"
            description="Escribe el TIN ofrecido realmente por la financiera. No se consulta al banco."
            min={0}
            max={60}
            step={0.25}
            decimalScale={2}
            value={tin}
            onChange={setTin}
          />
          <NumberInput
            label="Comisión de apertura (%)"
            description="Se supone pagada al inicio, además de la entrada."
            min={0}
            max={10}
            step={0.25}
            decimalScale={2}
            value={openingFee}
            onChange={setOpeningFee}
          />
        </div>
        {summary ? (
          <>
            <div className={styles.highlight} aria-live="polite">
              <Text size="sm">Cuota mensual orientativa</Text>
              <div className={styles.installment}>{formatEUR(summary.regularInstallmentCents)}</div>
              <Text size="xs">
                {months} cuotas. Última cuota ajustada: {formatEUR(summary.lastInstallmentCents)}
              </Text>
            </div>
            <div className={styles.metrics}>
              <div><Text size="xs" c="dimmed">Presupuesto</Text><Text fw={700}>{formatEUR(summary.budgetTotalCents)}</Text></div>
              <div><Text size="xs" c="dimmed">Capital financiado</Text><Text fw={700}>{formatEUR(summary.financedCents)}</Text></div>
              <div><Text size="xs" c="dimmed">Entrada</Text><Text fw={700}>{formatEUR(summary.downPaymentCents)}</Text></div>
              <div><Text size="xs" c="dimmed">Intereses</Text><Text fw={700}>{formatEUR(summary.interestCents)}</Text></div>
              <div><Text size="xs" c="dimmed">Apertura al inicio</Text><Text fw={700}>{formatEUR(summary.openingFeeCents)}</Text></div>
              <div><Text size="xs" c="dimmed">TAE teórica</Text><Text fw={700}>{summary.approximateTaePercent.toFixed(2).replace(".", ",")} %</Text></div>
              <div><Text size="xs" c="dimmed">Coste financiero total</Text><Text fw={700}>{formatEUR(summary.financeCostCents)}</Text></div>
              <div><Text size="xs" c="dimmed">Total pagado, entrada incluida</Text><Text fw={700}>{formatEUR(summary.customerTotalCents)}</Text></div>
            </div>
          </>
        ) : (
          <Alert color="orange">
            Para calcular la cuota, indica una entrada inferior al presupuesto y condiciones válidas.
          </Alert>
        )}
        <Text size="xs" c="dimmed">
          Ejemplo financiero basado en amortización francesa: cuotas mensuales, sin carencia,
          primera cuota al mes y comisión de apertura pagada al inicio. La TAE es teórica y
          no incluye seguros ni otros gastos no introducidos. Si el TIN está en 0 %, la simulación
          supone interés cero, sin afirmar que exista una oferta a ese tipo. La entidad financiera
          debe confirmar condiciones, TAE contractual, documentación y aprobación.
        </Text>
      </Stack>
    </section>
  );
}
