"use client";

import {
  Alert,
  Badge,
  Button,
  Group,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useState } from "react";

import { formatEUR } from "@/domain/money";
import styles from "@/shared/ui/parity.module.css";
import {
  useCreateLaboratoryMutation,
  useLaboratoriesQuery,
  useLaboratoryPriceListQuery,
  useUpdateLaboratoryMutation,
  useUpsertLaboratoryPriceMutation,
} from "./modules/laboratory-data";

function centsFromEuros(value: number | string): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.round(number * 100)) : 0;
}

export function AdminLaboratoriesPanel() {
  const laboratories = useLaboratoriesQuery();
  const priceList = useLaboratoryPriceListQuery();
  const createLaboratory = useCreateLaboratoryMutation();
  const updateLaboratory = useUpdateLaboratoryMutation();
  const upsertPrice = useUpsertLaboratoryPriceMutation();

  const [editingLabId, setEditingLabId] = useState<string | null>(null);
  const [labName, setLabName] = useState("");
  const [labTaxId, setLabTaxId] = useState("");
  const [labPhone, setLabPhone] = useState("");
  const [labEmail, setLabEmail] = useState("");
  const [labAddress, setLabAddress] = useState("");
  const [labTurnaround, setLabTurnaround] = useState<number | string>(7);

  const [priceLabId, setPriceLabId] = useState<string | null>(null);
  const [workTypeName, setWorkTypeName] = useState("");
  const [priceEuros, setPriceEuros] = useState<number | string>(0);
  const [turnaroundDays, setTurnaroundDays] = useState<number | string>(7);

  const labs = laboratories.data?.items ?? [];
  const labOptions = labs
    .filter((lab) => lab.active)
    .map((lab) => ({ value: lab.id, label: lab.name }));
  const selectedPriceLabId = priceLabId ?? labOptions[0]?.value ?? null;
  const hasError = laboratories.isError || priceList.isError;

  const clearLabForm = () => {
    setEditingLabId(null);
    setLabName("");
    setLabTaxId("");
    setLabPhone("");
    setLabEmail("");
    setLabAddress("");
    setLabTurnaround(7);
  };

  const clearPriceForm = () => {
    setPriceLabId(null);
    setWorkTypeName("");
    setPriceEuros(0);
    setTurnaroundDays(7);
  };

  return (
    <Stack gap="md">
      {hasError ? (
        <Alert color="red">No se pudo cargar la configuración de laboratorios.</Alert>
      ) : null}

      <section className={styles.section}>
        <Group justify="space-between">
          <div>
            <Title order={3}>Laboratorios</Title>
            <Text c="dimmed" size="sm" mt="xs">
              Alta y mantenimiento de laboratorios externos: ubicación, contacto y datos fiscales.
            </Text>
          </div>
          <Badge variant="light">{labs.length}</Badge>
        </Group>

        <Stack mt="lg">
          <Group grow align="end">
            <TextInput
              label="Nombre del laboratorio"
              value={labName}
              onChange={(event) => setLabName(event.currentTarget.value)}
              required
            />
            <TextInput
              label="Datos fiscales"
              value={labTaxId}
              onChange={(event) => setLabTaxId(event.currentTarget.value)}
            />
            <TextInput
              label="Telefono"
              value={labPhone}
              onChange={(event) => setLabPhone(event.currentTarget.value)}
            />
            <TextInput
              label="Correo"
              type="email"
              value={labEmail}
              onChange={(event) => setLabEmail(event.currentTarget.value)}
            />
          </Group>
          <Group grow align="end">
            <TextInput
              label="Ubicacion"
              value={labAddress}
              onChange={(event) => setLabAddress(event.currentTarget.value)}
            />
            <NumberInput
              label="Tiempo por defecto (dias)"
              min={0}
              max={365}
              value={labTurnaround}
              onChange={setLabTurnaround}
            />
            <Button
              disabled={!labName.trim()}
              loading={createLaboratory.isPending || updateLaboratory.isPending}
              onClick={() => {
                const payload = {
                  name: labName.trim(),
                  taxId: labTaxId.trim(),
                  phone: labPhone.trim(),
                  email: labEmail.trim(),
                  address: labAddress.trim(),
                  defaultTurnaroundDays: Number(labTurnaround) || 0,
                };
                if (editingLabId) {
                  const current = labs.find((lab) => lab.id === editingLabId);
                  if (!current) return;
                  updateLaboratory.mutate(
                    {
                      id: editingLabId,
                      payload: { ...payload, expectedVersion: current.version },
                    },
                    { onSuccess: clearLabForm },
                  );
                } else {
                  createLaboratory.mutate(payload, { onSuccess: clearLabForm });
                }
              }}
            >
              {editingLabId ? "Guardar laboratorio" : "Crear laboratorio"}
            </Button>
            {editingLabId ? (
              <Button variant="subtle" onClick={clearLabForm}>
                Cancelar
              </Button>
            ) : null}
          </Group>
        </Stack>

        <div className={styles.rowList}>
          {labs.map((lab) => (
            <div className={styles.row} key={lab.id}>
              <div className={styles.rowMain}>
                <span className={styles.rowTitle}>{lab.name}</span>
                <span className={styles.rowMeta}>
                  {lab.taxId || "Sin datos fiscales"} · {lab.address || "Sin ubicacion"} ·{" "}
                  {lab.phone || "Sin telefono"} · {lab.email || "Sin correo"} ·{" "}
                  {lab.defaultTurnaroundDays} dias
                </span>
              </div>
              <div className={styles.rowActions}>
                <Badge color={lab.active ? "green" : "gray"}>
                  {lab.active ? "Activo" : "Inactivo"}
                </Badge>
                <Button
                  size="xs"
                  variant="light"
                  onClick={() => {
                    setEditingLabId(lab.id);
                    setLabName(lab.name);
                    setLabTaxId(lab.taxId ?? "");
                    setLabPhone(lab.phone ?? "");
                    setLabEmail(lab.email ?? "");
                    setLabAddress(lab.address ?? "");
                    setLabTurnaround(lab.defaultTurnaroundDays);
                  }}
                >
                  Editar
                </Button>
                <Button
                  size="xs"
                  variant="subtle"
                  onClick={() =>
                    updateLaboratory.mutate({
                      id: lab.id,
                      payload: { expectedVersion: lab.version, active: !lab.active },
                    })
                  }
                >
                  {lab.active ? "Desactivar" : "Activar"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <Group justify="space-between">
          <div>
            <Title order={3}>Tratamientos realizados por laboratorio</Title>
            <Text c="dimmed" size="sm" mt="xs">
              Configura qué trabajos acepta cada laboratorio, con coste y tiempo previsto.
            </Text>
          </div>
          <Badge variant="light">{priceList.data?.items.length ?? 0}</Badge>
        </Group>

        <Group mt="lg" grow align="end">
          <Select
            label="Laboratorio"
            value={selectedPriceLabId}
            onChange={setPriceLabId}
            data={labOptions}
          />
          <TextInput
            label="Tratamiento realizado"
            value={workTypeName}
            onChange={(event) => setWorkTypeName(event.currentTarget.value)}
          />
          <NumberInput
            label="Coste (€)"
            min={0}
            decimalScale={2}
            value={priceEuros}
            onChange={setPriceEuros}
          />
          <NumberInput
            label="Tiempo (dias)"
            min={0}
            max={365}
            value={turnaroundDays}
            onChange={setTurnaroundDays}
          />
          <Button
            disabled={!selectedPriceLabId || !workTypeName.trim()}
            loading={upsertPrice.isPending}
            onClick={() => {
              if (!selectedPriceLabId) return;
              upsertPrice.mutate(
                {
                  laboratoryId: selectedPriceLabId,
                  workTypeName: workTypeName.trim(),
                  priceCents: centsFromEuros(priceEuros),
                  turnaroundDays: Number(turnaroundDays) || 0,
                  active: true,
                },
                { onSuccess: clearPriceForm },
              );
            }}
          >
            Guardar tratamiento
          </Button>
        </Group>

        <div className={styles.rowList}>
          {(priceList.data?.items ?? []).map((item) => {
            const lab = labs.find((candidate) => candidate.id === item.laboratoryId);
            return (
              <div className={styles.row} key={item.id}>
                <div className={styles.rowMain}>
                  <span className={styles.rowTitle}>{item.workTypeName}</span>
                  <span className={styles.rowMeta}>
                    {lab?.name ?? "Laboratorio"} · {formatEUR(item.priceCents)} ·{" "}
                    {item.turnaroundDays} dias
                  </span>
                </div>
                <div className={styles.rowActions}>
                  <Badge color={item.active ? "green" : "gray"}>
                    {item.active ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </Stack>
  );
}
