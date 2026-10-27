"use client";

import {
  ActionIcon,
  Alert,
  Button,
  Group,
  NumberInput,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { getBrowserApi } from "@/shared/api/browser";
import { dentyQueryKeys } from "@/shared/query/keys";
import styles from "@/shared/ui/parity.module.css";

interface PresetDraft {
  key: number;
  label: string;
  percent: number | string;
}

const DEFAULT_TERMS = "Abonando el importe total antes de iniciar el tratamiento.";

/** Admin → Finanzas: early-payment offer and the discounts staff can apply to budgets. */
export function AdminBudgetDiscountsPanel() {
  const queryClient = useQueryClient();
  const settings = useQuery({
    queryKey: dentyQueryKeys.finance.budgetDiscounts,
    queryFn: () => getBrowserApi().billing.discountSettings.get(),
  });
  const [earlyPaymentEnabled, setEarlyPaymentEnabled] = useState(false);
  const [earlyPaymentPercent, setEarlyPaymentPercent] = useState<number | string>(5);
  const [earlyPaymentTerms, setEarlyPaymentTerms] = useState(DEFAULT_TERMS);
  const [maxDiscountPercent, setMaxDiscountPercent] = useState<number | string>(100);
  const [presets, setPresets] = useState<PresetDraft[]>([]);
  const [nextKey, setNextKey] = useState(0);

  useEffect(() => {
    const data = settings.data;
    if (!data) return;
    setEarlyPaymentEnabled(data.earlyPaymentEnabled);
    setEarlyPaymentPercent(data.earlyPaymentPercent);
    setEarlyPaymentTerms(data.earlyPaymentTerms || DEFAULT_TERMS);
    setMaxDiscountPercent(data.maxDiscountPercent);
    setPresets(data.discountPresets.map((preset, index) => ({ key: index, ...preset })));
    setNextKey(data.discountPresets.length);
  }, [settings.data]);

  const save = useMutation({
    mutationFn: () =>
      getBrowserApi().billing.discountSettings.update({
        earlyPaymentEnabled,
        earlyPaymentPercent: Number(earlyPaymentPercent),
        earlyPaymentTerms: earlyPaymentTerms.trim() || DEFAULT_TERMS,
        maxDiscountPercent: Number(maxDiscountPercent),
        discountPresets: presets
          .filter((preset) => preset.label.trim())
          .map((preset) => ({ label: preset.label.trim(), percent: Number(preset.percent) })),
      }),
    onSuccess: (data) => queryClient.setQueryData(dentyQueryKeys.finance.budgetDiscounts, data),
  });

  const updatePreset = (key: number, change: Partial<PresetDraft>) =>
    setPresets((current) =>
      current.map((preset) => (preset.key === key ? { ...preset, ...change } : preset)),
    );

  return (
    <Stack gap="md">
      {settings.isError ? (
        <Alert color="red">No se pudo cargar la configuración de descuentos.</Alert>
      ) : null}
      <section className={styles.section}>
        <Title order={3}>Pronto pago</Title>
        <Text c="dimmed" size="sm" mt="xs">
          Descuento que se ofrece en cada presupuesto si el paciente paga el total por adelantado.
        </Text>
        <Stack mt="md">
          <Switch
            label="Ofrecer descuento por pronto pago"
            checked={earlyPaymentEnabled}
            onChange={(event) => setEarlyPaymentEnabled(event.currentTarget.checked)}
          />
          <Group grow align="end">
            <NumberInput
              label="Descuento"
              suffix=" %"
              min={0.01}
              max={100}
              decimalScale={2}
              disabled={!earlyPaymentEnabled}
              value={earlyPaymentPercent}
              onChange={setEarlyPaymentPercent}
            />
            <TextInput
              label="Condición que se imprime"
              maxLength={300}
              disabled={!earlyPaymentEnabled}
              value={earlyPaymentTerms}
              onChange={(event) => setEarlyPaymentTerms(event.currentTarget.value)}
            />
          </Group>
        </Stack>
      </section>

      <section className={styles.section}>
        <Title order={3}>Descuentos</Title>
        <Text c="dimmed" size="sm" mt="xs">
          Descuentos habituales para elegir con un clic en el presupuesto, y el máximo que se puede
          aplicar.
        </Text>
        <Stack mt="md">
          <NumberInput
            label="Descuento máximo por presupuesto"
            description="Se aplica tanto a porcentajes como a importes fijos."
            suffix=" %"
            min={0}
            max={100}
            decimalScale={2}
            value={maxDiscountPercent}
            onChange={setMaxDiscountPercent}
          />
          {presets.map((preset) => (
            <Group key={preset.key} align="end" wrap="nowrap">
              <TextInput
                flex={1}
                label="Nombre"
                placeholder="Familiar, convenio, segunda visita…"
                maxLength={80}
                value={preset.label}
                onChange={(event) => updatePreset(preset.key, { label: event.currentTarget.value })}
              />
              <NumberInput
                w={120}
                label="Descuento"
                suffix=" %"
                min={0.01}
                max={100}
                decimalScale={2}
                value={preset.percent}
                onChange={(value) => updatePreset(preset.key, { percent: value })}
              />
              <ActionIcon
                variant="subtle"
                color="red"
                size="lg"
                aria-label={`Quitar ${preset.label || "descuento"}`}
                onClick={() =>
                  setPresets((current) => current.filter((item) => item.key !== preset.key))
                }
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Group>
          ))}
          <Group>
            <Button
              variant="light"
              size="xs"
              leftSection={<IconPlus size={14} />}
              disabled={presets.length >= 20}
              onClick={() => {
                setPresets((current) => [...current, { key: nextKey, label: "", percent: 10 }]);
                setNextKey((key) => key + 1);
              }}
            >
              Añadir descuento
            </Button>
          </Group>
        </Stack>
      </section>

      <Group justify="flex-end">
        <Button onClick={() => save.mutate()} loading={save.isPending}>
          Guardar configuración
        </Button>
      </Group>
      {save.isSuccess ? <Alert color="green">Configuración guardada.</Alert> : null}
      {save.isError ? (
        <Alert color="red">
          No se pudo guardar. Revisa que cada descuento tenga nombre y un porcentaje entre 0 y 100.
        </Alert>
      ) : null}
    </Stack>
  );
}
