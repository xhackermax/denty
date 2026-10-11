"use client";

import { Alert, Badge, Group, NumberInput, Select, SimpleGrid, Stack, Text } from "@mantine/core";
import { useMemo, useState } from "react";

import { simulateBudgetFinancing } from "@/domain/budget-financing";
import { formatEUR } from "@/domain/money";
import styles from "@/shared/ui/parity.module.css";
import calculatorStyles from "./budget-financing-calculator.module.css";

interface BudgetOption {
  id: string;
  code: string;
  title?: string | null | undefined;
  status: string;
  totalCents: number;
}

const TERMS = [3, 6, 9, 12, 18, 24, 36, 48, 60, 72, 84, 96, 120]
  .map((months) => ({ value: String(months), label: `${months} meses` }));

function cents(value: number | string): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.round(value * 100)
    : Number.NaN;
}

function decimal(value: number | string): number {
  return typeof value === "number" ? value : Number.NaN;
}

function QuoteMetric({ label, value, prominent = false }: {
  label: string;
  value: string;
  prominent?: boolean;
}) {
  return (
    <div className={calculatorStyles.metric}>
      <Text size="xs" c="dimmed">{label}</Text>
      <Text fw={prominent ? 800 : 650} size={prominent ? "xl" : "md"}>{value}</Text>
    </div>
  );
}

/** Patient-facing indicative calculation; no credit product is created or recorded. */
export function BudgetFinancingCalculator({ budgets }: { budgets: readonly BudgetOption[] }) {
  const [budgetId, setBudgetId] = useState<string | null>(null);
  const [downPayment, setDownPayment] = useState<number | string>(0);
  const [months, setMonths] = useState("24");
  const [annualRate, setAnnualRate] = useState<number | string>(0);
  const [openingFee, setOpeningFee] = useState<number | string>(0);
  const [monthlyFee, setMonthlyFee] = useState<number | string>(0);

  const budget = budgets.find((option) => option.id === budgetId)
    ?? budgets.find((option) => option.status === "SIGNED" && option.totalCents > 0)
    ?? budgets.find((option) => option.totalCents > 0);

  const quote = useMemo(() => {
    if (!budget) return null;
    try {
      return {
        result: simulateBudgetFinancing({
          budgetTotalCents: budget.totalCents,
          downPaymentCents: cents(downPayment),
          months: Number(months),
          annualNominalRatePercent: decimal(annualRate),
          openingFeeCents: cents(openingFee),
          monthlyFeeCents: cents(monthlyFee),
        }),
        error: null,
      };
    } catch (error) {
      return {
        result: null,
        error: error instanceof Error ? error.message : "Parámetros de financiación no válidos.",
      };
    }
  }, [budget, downPayment, months, annualRate, openingFee, monthlyFee]);

  return (
    <section className={styles.section} aria-label="Simulador de financiación">
      <Group justify="space-between" align="flex-start" mb="sm">
        <div>
          <h3 className={styles.sectionTitle}>Simulador de financiación</h3>
          <p className={styles.sectionDescription}>
            Calcula una posible cuota mensual a partir de un presupuesto del paciente.
          </p>
        </div>
        <Badge variant="light">Orientativo</Badge>
      </Group>
      {!budget ? (
        <Text size="sm" c="dimmed">
          Guarda un presupuesto con importe positivo para calcular posibles cuotas.
        </Text>
      ) : (
        <Stack gap="md">
          <Select
            label="Presupuesto a financiar"
            searchable
            data={budgets.filter((b) => b.totalCents > 0).map((b) => ({
              value: b.id,
              label: `${b.code}${b.title ? ` · ${b.title}` : ""} · ${formatEUR(b.totalCents)}`,
            }))}
            value={budget.id}
            onChange={(value) => {
              setBudgetId(value);
              setDownPayment(0);
            }}
          />
          {budget.status !== "SIGNED" ? (
            <Text size="xs" c="dimmed">
              El presupuesto seleccionado no está firmado. Los cálculos no implican aceptación.
            </Text>
          ) : null}
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="sm">
            <NumberInput label="Entrada inicial (€)" min={0}
              max={budget.totalCents / 100}
              decimalScale={2} thousandSeparator=" "
              value={downPayment} onChange={setDownPayment} />
            <Select label="Plazo" data={TERMS} value={months} onChange={(value) =>
              setMonths(value ?? "24")} />
            <NumberInput label="TIN anual (%)" min={0} max={100}
              decimalScale={3} value={annualRate} onChange={setAnnualRate} />
            <NumberInput label="Comisión de apertura (€)" min={0}
              decimalScale={2} value={openingFee} onChange={setOpeningFee} />
            <NumberInput label="Gastos mensuales (€)" min={0}
              decimalScale={2} value={monthlyFee} onChange={setMonthlyFee} />
          </SimpleGrid>
          {quote?.error ? <Alert color="orange">{quote.error}</Alert> : null}
          {quote?.result ? (
            <>
              <div className={calculatorStyles.metrics} aria-live="polite">
                <QuoteMetric label="Cuota mensual estimada"
                  value={formatEUR(quote.result.standardMonthlyCents)} prominent />
                <QuoteMetric label="Importe financiado"
                  value={formatEUR(quote.result.financedCents)} />
                <QuoteMetric label="TAE aproximada"
                  value={`${quote.result.approximateAprPercent.toLocaleString("es-ES", {
                    maximumFractionDigits: 2, minimumFractionDigits: 2,
                  })} %`} />
                <QuoteMetric label="Intereses estimados"
                  value={formatEUR(quote.result.interestCents)} />
                <QuoteMetric label="Comisiones y gastos"
                  value={formatEUR(quote.result.feesCents)} />
                <QuoteMetric label="Coste total de la financiación"
                  value={formatEUR(quote.result.creditCostCents)} />
                <QuoteMetric label="Total a devolver por financiación"
                  value={formatEUR(quote.result.totalCreditPaymentsCents)} />
                <QuoteMetric label="Total con entrada incluida"
                  value={formatEUR(quote.result.totalWithDownPaymentCents)} />
              </div>
              {quote.result.standardMonthlyCents !== quote.result.lastMonthlyCents ? (
                <Text size="xs" c="dimmed">
                  Última cuota: {formatEUR(quote.result.lastMonthlyCents)}.
                  Puede variar ligeramente por el ajuste final de céntimos.
                </Text>
              ) : null}
            </>
          ) : null}
          <Alert color="blue" title="Simulación sin compromiso">
            El TIN empieza en 0 % solo como valor de prueba: introduce las condiciones
            reales ofrecidas por la entidad financiera, incluidas todas las comisiones
            obligatorias. La TAE es aproximada y puede no incluir otros costes
            exigidos por el prestamista. No supone una oferta vinculante, aprobación
            del crédito ni aceptación del presupuesto. No se guarda ni tramita
            una solicitud de financiación.
          </Alert>
        </Stack>
      )}
    </section>
  );
}
