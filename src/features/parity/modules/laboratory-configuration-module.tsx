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
} from "@mantine/core";
import Link from "next/link";
import { useState } from "react";

import { formatEUR } from "@/domain/money";
import { useActiveTenant } from "@/shared/tenancy/active-context";
import styles from "@/shared/ui/parity.module.css";
import {
  useCreateLaboratoryMutation,
  useLaboratoriesQuery,
  useLaboratoryPriceListQuery,
  useUpdateLaboratoryMutation,
  useUpsertLaboratoryPriceMutation,
} from "./laboratory-data";

function centsFromEuros(value: number | string): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.round(number * 100)) : 0;
}

export function LaboratoryConfigurationModule() {
  const { role, loading } = useActiveTenant();
  const canManage = role === "ADMIN";
  const laboratories = useLaboratoriesQuery(canManage);
  const priceList = useLaboratoryPriceListQuery(canManage);
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

  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [priceLabId, setPriceLabId] = useState<string | null>(null);
  const [priceWorkTypeName, setPriceWorkTypeName] = useState("");
  const [priceEuros, setPriceEuros] = useState<number | string>(0);
  const [priceTurnaround, setPriceTurnaround] = useState<number | string>(7);

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
    setEditingPriceId(null);
    setPriceLabId(null);
    setPriceWorkTypeName("");
    setPriceEuros(0);
    setPriceTurnaround(7);
  };

  if (loading) return <Text c="dimmed">Cargando configuración…</Text>;

  if (!canManage) {
    return (
      <Alert color="red" title="Acceso restringido">
        Solo una cuenta administradora puede modificar laboratorios, procedimientos y tarifas.
      </Alert>
    );
  }

  const labOptions = (laboratories.data?.items ?? []).map((lab) => ({
    value: lab.id,
    label: lab.active ? lab.name : `${lab.name} · inactivo`,
    disabled: !lab.active,
  }));

  const currentPrice = (priceList.data?.items ?? []).find((item) => item.id === editingPriceId);
  const hasError = laboratories.isError || priceList.isError;

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Button component={Link} href="/app/laboratory" variant="subtle">
          Volver a trabajos
        </Button>
        <Badge variant="light">Solo administradores</Badge>
      </Group>

      {hasError ? (
        <Alert color="red">No se pudieron cargar todos los datos de configuración.</Alert>
      ) : null}

      <section className={styles.section}>
        <Group justify="space-between">
          <div>
            <h3 className={styles.sectionTitle}>Laboratorios</h3>
            <p className={styles.sectionDescription}>
              Datos maestros y de facturación. Esta información queda fuera del flujo clínico diario.
            </p>
          </div>
          <Badge variant="light">{laboratories.data?.items.length ?? 0}</Badge>
        </Group>

        <Group grow align="end">
          <TextInput
            label="Nombre"
            value={labName}
            onChange={(event) => setLabName(event.currentTarget.value)}
          />
          <TextInput
            label="NIF/CIF"
            value={labTaxId}
            onChange={(event) => setLabTaxId(event.currentTarget.value)}
          />
          <TextInput
            label="Teléfono"
            value={labPhone}
            onChange={(event) => setLabPhone(event.currentTarget.value)}
          />
          <TextInput
            label="Email"
            value={labEmail}
            onChange={(event) => setLabEmail(event.currentTarget.value)}
          />
        </Group>

        <Group grow align="end" mt="sm">
          <TextInput
            label="Dirección"
            value={labAddress}
            onChange={(event) => setLabAddress(event.currentTarget.value)}
          />
          <NumberInput
            label="Plazo habitual (días)"
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
                taxId: labTaxId,
                phone: labPhone,
                email: labEmail,
                address: labAddress,
                defaultTurnaroundDays: Number(labTurnaround) || 0,
              };
              if (editingLabId) {
                const current = laboratories.data?.items.find((lab) => lab.id === editingLabId);
                if (!current) return;
                updateLaboratory.mutate(
                  { id: editingLabId, payload: { ...payload, expectedVersion: current.version } },
                  { onSuccess: clearLabForm },
                );
                return;
              }
              createLaboratory.mutate(payload, { onSuccess: clearLabForm });
            }}
          >
            {editingLabId ? "Guardar cambios" : "Crear laboratorio"}
          </Button>
          {editingLabId ? (
            <Button variant="subtle" onClick={clearLabForm}>
              Cancelar
            </Button>
          ) : null}
        </Group>

        <div className={styles.rowList}>
          {(laboratories.data?.items ?? []).map((lab) => (
            <div className={styles.row} key={lab.id}>
              <div className={styles.rowMain}>
                <span className={styles.rowTitle}>{lab.name}</span>
                <span className={styles.rowMeta}>
                  {lab.taxId || "Sin NIF/CIF"} · {lab.phone || "Sin teléfono"} ·{" "}
                  {lab.defaultTurnaroundDays} días · {lab.active ? "Activo" : "Inactivo"}
                </span>
                {lab.email || lab.address ? (
                  <span className={styles.rowMeta}>
                    {[lab.email, lab.address].filter(Boolean).join(" · ")}
                  </span>
                ) : null}
              </div>
              <div className={styles.rowActions}>
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
          {!laboratories.isLoading && (laboratories.data?.items.length ?? 0) === 0 ? (
            <Text c="dimmed">Todavía no hay laboratorios configurados.</Text>
          ) : null}
        </div>
      </section>

      <section className={styles.section}>
        <div>
          <h3 className={styles.sectionTitle}>Procedimientos y tarifas</h3>
          <p className={styles.sectionDescription}>
            Define qué trabajos realiza cada laboratorio, su precio y el plazo habitual.
          </p>
        </div>

        <Group grow align="end">
          <Select
            searchable
            label="Laboratorio"
            value={priceLabId}
            onChange={setPriceLabId}
            data={labOptions}
            disabled={Boolean(editingPriceId)}
          />
          <TextInput
            label="Tipo de trabajo"
            value={priceWorkTypeName}
            onChange={(event) => setPriceWorkTypeName(event.currentTarget.value)}
            disabled={Boolean(editingPriceId)}
          />
          <NumberInput
            label="Precio (€)"
            min={0}
            decimalScale={2}
            value={priceEuros}
            onChange={setPriceEuros}
          />
          <NumberInput
            label="Plazo (días)"
            min={0}
            max={365}
            value={priceTurnaround}
            onChange={setPriceTurnaround}
          />
          <Button
            disabled={!priceLabId || !priceWorkTypeName.trim()}
            loading={upsertPrice.isPending}
            onClick={() => {
              if (!priceLabId) return;
              upsertPrice.mutate(
                {
                  laboratoryId: priceLabId,
                  workTypeName: priceWorkTypeName.trim(),
                  priceCents: centsFromEuros(priceEuros),
                  turnaroundDays: Number(priceTurnaround) || 0,
                  active: true,
                  ...(currentPrice ? { expectedVersion: currentPrice.version } : {}),
                },
                { onSuccess: clearPriceForm },
              );
            }}
          >
            {editingPriceId ? "Guardar tarifa" : "Añadir procedimiento"}
          </Button>
          {editingPriceId ? (
            <Button variant="subtle" onClick={clearPriceForm}>
              Cancelar
            </Button>
          ) : null}
        </Group>

        <div className={styles.rowList}>
          {(priceList.data?.items ?? []).map((item) => {
            const lab = laboratories.data?.items.find(
              (candidate) => candidate.id === item.laboratoryId,
            );
            return (
              <div className={styles.row} key={item.id}>
                <div className={styles.rowMain}>
                  <span className={styles.rowTitle}>{item.workTypeName}</span>
                  <span className={styles.rowMeta}>
                    {lab?.name ?? "Laboratorio"} · {formatEUR(item.priceCents)} ·{" "}
                    {item.turnaroundDays} días · {item.active ? "Activo" : "Inactivo"}
                  </span>
                </div>
                <div className={styles.rowActions}>
                  <Button
                    size="xs"
                    variant="light"
                    disabled={!item.active}
                    onClick={() => {
                      setEditingPriceId(item.id);
                      setPriceLabId(item.laboratoryId);
                      setPriceWorkTypeName(item.workTypeName);
                      setPriceEuros(item.priceCents / 100);
                      setPriceTurnaround(item.turnaroundDays);
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    size="xs"
                    variant="subtle"
                    disabled={!item.active}
                    onClick={() =>
                      upsertPrice.mutate({
                        laboratoryId: item.laboratoryId,
                        workTypeName: item.workTypeName,
                        workTypeCode: item.workTypeCode ?? undefined,
                        priceCents: item.priceCents,
                        turnaroundDays: item.turnaroundDays,
                        active: false,
                        expectedVersion: item.version,
                      })
                    }
                  >
                    Desactivar
                  </Button>
                </div>
              </div>
            );
          })}
          {!priceList.isLoading && (priceList.data?.items.length ?? 0) === 0 ? (
            <Text c="dimmed">Aún no hay procedimientos ni tarifas.</Text>
          ) : null}
        </div>
      </section>
    </Stack>
  );
}
