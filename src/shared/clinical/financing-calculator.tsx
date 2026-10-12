"use client";

import { Alert, Badge, Button, Group, NumberInput, Select, Stack, Text, Title } from "@mantine/core";
import { useMemo, useState } from "react";

import { calculateFinancing } from "@/domain/financing-calculator";
import { COMPARISON_TERMS, compareFinancingTerms, formatFinancingEstimate } from "@/domain/financing-scenarios";
import { formatEUR } from "@/domain/money";

import type { BudgetView } from "./budget-options";
import styles from "./financing-calculator.module.css";


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
  const [monthlyFeeEuro, setMonthlyFeeEuro] = useState<number | string>(0);
  const [copyStatus, setCopyStatus] = useState<"copied" | "failed" | null>(null);

  const summary = useMemo(() => {
    if (!selected || typeof downPaymentEuro !== "number" ||
        typeof tin !== "number" || typeof openingFee !== "number" ||
        typeof monthlyFeeEuro !== "number") return null;
    try {
      return calculateFinancing({
        budgetTotalCents: selected.totalCents,
        downPaymentCents: Math.round(downPaymentEuro * 100),
        months,
        tinPercent: tin,
        openingFeePercent: openingFee,
        monthlyFeeCents: Math.round(monthlyFeeEuro * 100),
      });
    } catch {
      return null;
    }
  }, [selected, downPaymentEuro, months, tin, openingFee, monthlyFeeEuro]);

  const comparisons = useMemo(() => {
    if (!summary || typeof tin !== "number" || typeof openingFee !== "number") return [];
    return compareFinancingTerms({
      budgetTotalCents: summary.budgetTotalCents,
      downPaymentCents: summary.downPaymentCents,
      months,
      tinPercent: tin,
      openingFeePercent: openingFee,
      monthlyFeeCents: summary.monthlyFeeCents,
    });
  }, [summary, months, tin, openingFee]);

  const copyEstimate = async () => {
    if (!selected || !summary || typeof tin !== "number" ||
        typeof openingFee !== "number") return;
    try {
      await navigator.clipboard.writeText(formatFinancingEstimate({
        budgetCode: selected.code, budgetTitle: selected.title,
        months, tinPercent: tin, openingFeePercent: openingFee,
        result: summary,
      }));
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
  };

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
          onChange={(id) => { setChosenId(id); setDownPaymentEuro(0); setCopyStatus(null); }}
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
            data={COMPARISON_TERMS.map((term) => ({ value: String(term), label: `${term} meses` }))}
            onChange={(value) => { if (value) { setMonths(Number(value)); setCopyStatus(null); } }}
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
          <NumberInput
            label="Gastos mensuales obligatorios (€)"
            description="Ej.: mantenimiento o administración, si aparecen en la oferta."
            min={0}
            max={1000}
            decimalScale={2}
            value={monthlyFeeEuro}
            onChange={setMonthlyFeeEuro}
          />
        </div>
        {summary ? (
          <>
            <div className={styles.highlight} aria-live="polite">
              <Text size="sm">Cuota mensual orientativa</Text>
              <div className={styles.installment}>{formatEUR(summary.monthlyPaymentsCents[0] ?? 0)}</div>
              <Text size="xs">
                {months} cuotas. Última cuota, incluidos gastos: {formatEUR(
                  summary.monthlyPaymentsCents[months - 1] ?? 0,
                )}
              </Text>
            </div>
            <section className={styles.termSelection} aria-label="Comparar plazos de financiación">
              <Group justify="space-between" mb="sm" gap="xs">
                <Text fw={700}>Comparar cuotas por plazo</Text>
                <Text size="xs" c="dimmed">Misma entrada, TIN y comisiones</Text>
              </Group>
              <div className={styles.termGrid}>
                {comparisons.map(option => (
                  <button
                    key={option.months}
                    type="button"
                    className={styles.termCard}
                    aria-pressed={months === option.months}
                    data-selected={months === option.months}
                    onClick={() => { setMonths(option.months); setCopyStatus(null); }}
                  >
                    <span className={styles.termLabel}>{option.months} meses</span>
                    <strong>{formatEUR(option.firstMonthlyPaymentCents)} / mes</strong>
                    <span className={styles.termMeta}>
                      Coste financiero: {formatEUR(option.financeCostCents)}
                    </span>
                  </button>
                ))}
              </div>
              <Text size="xs" c="dimmed" mt="xs">
                Las cuotas pueden variar unos céntimos; consulta el último pago y la TAE en el desglose.
                Al elegir un plazo se actualiza toda la simulación.
              </Text>
            </section>
            <div className={styles.metrics}>
              <div><Text size="xs" c="dimmed">Presupuesto</Text><Text fw={700}>{formatEUR(summary.budgetTotalCents)}</Text></div>
              <div><Text size="xs" c="dimmed">Capital financiado</Text><Text fw={700}>{formatEUR(summary.financedCents)}</Text></div>
              <div><Text size="xs" c="dimmed">Entrada</Text><Text fw={700}>{formatEUR(summary.downPaymentCents)}</Text></div>
              <div><Text size="xs" c="dimmed">Intereses</Text><Text fw={700}>{formatEUR(summary.interestCents)}</Text></div>
              <div><Text size="xs" c="dimmed">Apertura al inicio</Text><Text fw={700}>{formatEUR(summary.openingFeeCents)}</Text></div>
              <div><Text size="xs" c="dimmed">Gastos mensuales totales</Text><Text fw={700}>{formatEUR(summary.monthlyFeeCents * months)}</Text></div>
              <div><Text size="xs" c="dimmed">Suma de cuotas y gastos mensuales</Text><Text fw={700}>{formatEUR(summary.totalMonthlyPaymentsCents)}</Text></div>
              <div><Text size="xs" c="dimmed">TAE teórica</Text><Text fw={700}>{summary.approximateTaePercent.toFixed(2).replace(".", ",")} %</Text></div>
              <div><Text size="xs" c="dimmed">Coste financiero total</Text><Text fw={700}>{formatEUR(summary.financeCostCents)}</Text></div>
              <div><Text size="xs" c="dimmed">Total pagado, entrada incluida</Text><Text fw={700}>{formatEUR(summary.customerTotalCents)}</Text></div>
            </div>
            <Group justify="flex-end" gap="xs">
              <Button variant="light" onClick={() => { void copyEstimate(); }}>
                Copiar simulación para el paciente
              </Button>
            </Group>
            {copyStatus === "copied" ? (
              <Alert color="green" role="status">
                Simulación copiada. Revísala antes de entregarla al paciente.
              </Alert>
            ) : copyStatus === "failed" ? (
              <Alert color="orange" role="alert">
                No se pudo copiar automáticamente. Revisa los permisos del portapapeles.
              </Alert>
            ) : null}
            <details className={styles.schedule}>
              <summary>Ver desglose de las {months} cuotas</summary>
              <Text size="xs" c="dimmed" mt="sm">
                La comisión de apertura se abona al inicio y no está repartida entre las cuotas.
                El saldo pendiente no incluye gastos mensuales.
              </Text>
              <div className={styles.installmentRows}>
                {summary.amortizationSchedule.map((row) => (
                  <div className={styles.scheduleRow} key={row.month}>
                    <Text fw={700} size="sm">Cuota {row.month}</Text>
                    <div><Text size="xs" c="dimmed">Capital</Text><Text size="sm">{formatEUR(row.principalCents)}</Text></div>
                    <div><Text size="xs" c="dimmed">Interés</Text><Text size="sm">{formatEUR(row.interestCents)}</Text></div>
                    <div><Text size="xs" c="dimmed">Gastos</Text><Text size="sm">{formatEUR(row.monthlyFeeCents)}</Text></div>
                    <div><Text size="xs" c="dimmed">Pago total</Text><Text size="sm" fw={700}>{formatEUR(row.actualPaymentCents)}</Text></div>
                    <div><Text size="xs" c="dimmed">Saldo pendiente</Text><Text size="sm">{formatEUR(row.remainingBalanceCents)}</Text></div>
                  </div>
                ))}
              </div>
            </details>
          </>
        ) : (
          <Alert color="orange">
            Para calcular la cuota, indica una entrada inferior al presupuesto y condiciones válidas.
          </Alert>
        )}
        <Text size="xs" c="dimmed">
          Ejemplo financiero basado en amortización francesa: cuotas mensuales, sin carencia,
          primera cuota al mes y comisión de apertura pagada al inicio. La TAE es teórica y
          incluye los gastos mensuales indicados, pero no seguros ni otros gastos no introducidos.
          Si el TIN está en 0 %, la simulación
          supone interés cero, sin afirmar que exista una oferta a ese tipo. La entidad financiera
          debe confirmar condiciones, TAE contractual, documentación y aprobación.
        </Text>
      </Stack>
    </section>
  );
}
