"use client";

import { Alert, Badge, Button, Checkbox, Group, Modal, Select, Stack, Text, Textarea, TextInput } from "@mantine/core";
import { useState } from "react";
import { formatEUR } from "@/domain/money";
import { useCreateClinicalPlanBranchMutation } from "./clinical-data";

interface CommonItem {
  id: string;
  label: string;
  tooth?: string | null;
  priceCents?: number | null;
  phase: number;
  status: string;
}
interface CatalogItem {
  id: string;
  name: string;
  defaultPriceCents: number;
}
interface Extra {
  catalogId: string;
  tooth?: string;
}

/** Copies shared clinical steps into a new fork, while alternatives stay outside Plan A. */
export function ClinicalPlanBranchBuilder({
  opened, onClose, patientId, planVersion, items, catalog, letter,
  onCreated,
}: {
  opened: boolean;
  onClose: () => void;
  patientId: string;
  planVersion: number;
  items: readonly CommonItem[];
  catalog: readonly CatalogItem[];
  letter: string;
  onCreated?: (budgetId: string) => void;
}) {
  const create = useCreateClinicalPlanBranchMutation(patientId);
  const [title, setTitle] = useState("");
  const [sharedIds, setSharedIds] = useState<string[]>([]);
  const [catalogId, setCatalogId] = useState<string | null>(null);
  const [tooth, setTooth] = useState("");
  const [exclusive, setExclusive] = useState<Extra[]>([]);
  const [advantages, setAdvantages] = useState("");
  const [disadvantages, setDisadvantages] = useState("");
  const added = exclusive.map((extra) => ({
    ...extra,
    catalog: catalog.find((entry) => entry.id === extra.catalogId),
  }));
  const total = items.filter((item) => sharedIds.includes(item.id))
    .reduce((sum, item) => sum + (item.priceCents ?? 0), 0)
    + added.reduce((sum, item) => sum + (item.catalog?.defaultPriceCents ?? 0), 0);
  const clean = () => {
    setTitle("");
    setSharedIds([]);
    setCatalogId(null);
    setTooth("");
    setExclusive([]);
    setAdvantages("");
    setDisadvantages("");
  };
  return (
    <Modal
      opened={opened}
      onClose={() => { if (!create.isPending) onClose(); }}
      title={`Ramificar tratamiento · Plan ${letter}`}
      size="lg"
      centered
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Copia los pasos comunes de Plan A y añade únicamente las intervenciones que
          cambian en esta alternativa. El original no se modifica. Los precios son una
          propuesta inicial del catálogo y después se pueden editar en Presupuestos.
        </Text>
        <TextInput
          label="Nombre del nuevo plan"
          placeholder="Ejemplo: controlar periodontitis y reponer con prótesis removible"
          value={title}
          maxLength={120}
          onChange={(event) => setTitle(event.currentTarget.value)}
          required
        />
        <div>
          <Text fw={750} size="sm">1. Copiar tratamientos comunes del plan original</Text>
          <Text size="xs" c="dimmed" mb="sm">
            Ejemplo: raspado y alisado radicular en ambas alternativas.
          </Text>
          <Checkbox.Group value={sharedIds} onChange={setSharedIds}>
            <Stack gap="xs">
              {items.filter((item) => !["CANCELLED", "SUPERSEDED", "COMPLETED"].includes(item.status))
                .map((item) => (
                  <Checkbox
                    key={item.id}
                    value={item.id}
                    label={`Fase ${item.phase} · ${item.tooth ? `Diente ${item.tooth} · ` : ""}${item.label}`}
                  />
                ))}
            </Stack>
          </Checkbox.Group>
        </div>
        <div>
          <Text fw={750} size="sm">2. Tratamientos exclusivos de esta rama</Text>
          <Text size="xs" c="dimmed" mb="sm">
            No pasan al Plan A y se mantienen diferenciados para comparar y presupuestar.
          </Text>
          <Group align="end" gap="xs">
            <Select
              label="Tratamiento del catálogo"
              data={catalog.map((item) => ({
                value: item.id,
                label: `${item.name} · ${formatEUR(item.defaultPriceCents)}`,
              }))}
              searchable
              placeholder="Por ejemplo: implante o prótesis removible"
              value={catalogId}
              onChange={setCatalogId}
              style={{ flex: 1, minWidth: 190 }}
            />
            <TextInput
              label="Diente o zona"
              placeholder="16 / arcada superior"
              value={tooth}
              maxLength={40}
              onChange={(event) => setTooth(event.currentTarget.value)}
              style={{ width: 155 }}
            />
            <Button
              disabled={!catalogId || exclusive.length >= 50}
              onClick={() => {
                if (!catalogId) return;
                setExclusive((current) => [...current, {
                  catalogId, ...(tooth.trim() ? { tooth: tooth.trim() } : {}),
                }]);
                setCatalogId(null);
                setTooth("");
              }}
            >
              Añadir
            </Button>
          </Group>
          {added.length ? (
            <Stack gap={6} mt="sm">
              {added.map((entry, index) => (
                <Group key={index} justify="space-between" gap="xs" wrap="nowrap">
                  <Text size="sm">
                    {entry.tooth ? `${entry.tooth} · ` : ""}
                    {entry.catalog?.name ?? "Tratamiento"} · {formatEUR(entry.catalog?.defaultPriceCents ?? 0)}
                  </Text>
                  <Button variant="subtle" color="red" size="xs"
                    onClick={() => setExclusive((current) => current.filter((_, i) => i !== index))}>
                    Quitar
                  </Button>
                </Group>
              ))}
            </Stack>
          ) : null}
        </div>
        <div>
          <Text fw={750} size="sm" mb="xs">3. Explicación clínica al paciente</Text>
          <Textarea
            label="Ventajas de esta alternativa"
            placeholder="Ventajas valoradas por el profesional en este caso concreto"
            rows={3}
            maxLength={2000}
            value={advantages}
            onChange={(event) => setAdvantages(event.currentTarget.value)}
          />
          <Textarea
            label="Desventajas, riesgos y limitaciones"
            mt="xs"
            placeholder="Limitaciones, duración, mantenimiento, intervenciones o riesgos aplicables"
            rows={3}
            maxLength={2000}
            value={disadvantages}
            onChange={(event) => setDisadvantages(event.currentTarget.value)}
          />
        </div>
        <Group justify="space-between">
          <Group gap="xs">
            <Badge variant="light">{sharedIds.length} comunes</Badge>
            <Badge variant="light">{exclusive.length} exclusivos</Badge>
            <Text fw={800}>{formatEUR(total)}</Text>
          </Group>
        </Group>
        {create.isError ? (
          <Alert color="red" title="No se pudo guardar la rama">
            {create.error instanceof Error ? create.error.message : "Comprueba el plan e inténtalo de nuevo."}
          </Alert>
        ) : null}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose} disabled={create.isPending}>Cancelar</Button>
          <Button
            color="teal"
            loading={create.isPending}
            disabled={!title.trim() || !planVersion || sharedIds.length + exclusive.length === 0}
            onClick={() => {
              void create.mutateAsync({
                expectedPlanVersion: planVersion,
                title: title.trim(),
                sharedPlanItemIds: sharedIds,
                exclusiveTreatments: exclusive,
                advantages: advantages.trim(),
                disadvantages: disadvantages.trim(),
              }).then(({ budget }) => {
                clean();
                onCreated?.(budget.id);
                onClose();
              }, () => undefined);
            }}
          >
            Crear rama y presupuesto
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
