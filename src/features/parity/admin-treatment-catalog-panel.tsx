"use client";

import {
  Alert,
  Badge,
  Button,
  Group,
  NumberInput,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useEffect, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { getBrowserApi } from "@/shared/api/browser";
import { DentyApiError } from "@/shared/api/errors";
import styles from "@/shared/ui/parity.module.css";
import { dentyQueryKeys } from "@/shared/query";
import { TreatmentStaffTimesEditor } from "./treatment-staff-times-editor";

interface CatalogItem {
  id: string;
  code: string;
  name: string;
  defaultPriceCents: number;
  baseCostCents: number;
  defaultDurationMin?: number | null;
  appointmentsMin?: number | null;
  appointmentsMax?: number | null;
  requiresLab: boolean;
  active: boolean;
  version: number;
}

type NumberField = number | string;

function optionalNumber(value: NumberField): number | null {
  const parsed = Number(value);
  return value === "" || !Number.isFinite(parsed) || parsed <= 0 ? null : Math.round(parsed);
}

function timesMeta(item: CatalogItem): string {
  const parts = [
    item.defaultDurationMin ? `${item.defaultDurationMin} min/cita` : null,
    item.appointmentsMin || item.appointmentsMax
      ? `${item.appointmentsMin ?? "?"}–${item.appointmentsMax ?? "?"} citas`
      : null,
  ].filter(Boolean);
  return parts.length ? ` · ${parts.join(" · ")}` : "";
}

/** Minutes per visit and the usual number of visits; empty keeps the default estimate. */
function TimeFields({
  code,
  durationMin,
  appointmentsMin,
  appointmentsMax,
  onDuration,
  onMin,
  onMax,
}: {
  code?: string;
  durationMin: NumberField;
  appointmentsMin: NumberField;
  appointmentsMax: NumberField;
  onDuration: (value: NumberField) => void;
  onMin: (value: NumberField) => void;
  onMax: (value: NumberField) => void;
}) {
  const suffix = code ? ` ${code}` : "";
  return (
    <Group grow align="end">
      <NumberInput
        label="Minutos por cita"
        min={1}
        max={600}
        value={durationMin}
        onChange={onDuration}
        aria-label={`Minutos por cita${suffix}`}
      />
      <NumberInput
        label="Citas mín."
        min={1}
        max={60}
        value={appointmentsMin}
        onChange={onMin}
        aria-label={`Citas mínimas${suffix}`}
      />
      <NumberInput
        label="Citas máx."
        min={1}
        max={60}
        value={appointmentsMax}
        onChange={onMax}
        aria-label={`Citas máximas${suffix}`}
      />
    </Group>
  );
}

function errorMessage(error: unknown) {
  return error instanceof DentyApiError ? error.message : "No se pudo guardar el catálogo clínico.";
}

export function AdminTreatmentCatalogPanel() {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [priceEuros, setPriceEuros] = useState<number | string>(0);
  const [requiresLab, setRequiresLab] = useState(false);
  const [durationMin, setDurationMin] = useState<NumberField>("");
  const [appointmentsMin, setAppointmentsMin] = useState<NumberField>("");
  const [appointmentsMax, setAppointmentsMax] = useState<NumberField>("");
  const [editDurationMin, setEditDurationMin] = useState<NumberField>("");
  const [editAppointmentsMin, setEditAppointmentsMin] = useState<NumberField>("");
  const [editAppointmentsMax, setEditAppointmentsMax] = useState<NumberField>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPriceEuros, setEditPriceEuros] = useState<number | string>(0);
  const [editRequiresLab, setEditRequiresLab] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    const response = await getBrowserApi().admin.treatmentCatalog.list();
    setItems(response.items as CatalogItem[]);
  }

  useEffect(() => {
    reload().catch((caught: unknown) => setError(errorMessage(caught)));
  }, []);

  async function createItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await getBrowserApi().admin.treatmentCatalog.create({
        code,
        name,
        defaultPriceCents: Math.round(Number(priceEuros || 0) * 100),
        baseCostCents: 0,
        defaultDurationMin: optionalNumber(durationMin),
        appointmentsMin: optionalNumber(appointmentsMin),
        appointmentsMax: optionalNumber(appointmentsMax),
        requiresLab,
        active: true,
        metadata: {},
      });
      setCode("");
      setName("");
      setPriceEuros(0);
      setRequiresLab(false);
      setDurationMin("");
      setAppointmentsMin("");
      setAppointmentsMax("");
      await reload();
      await queryClient.invalidateQueries({ queryKey: dentyQueryKeys.treatmentCatalog.root });
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  async function saveEdit(item: CatalogItem) {
    setPending(true);
    setError(null);
    try {
      await getBrowserApi().admin.treatmentCatalog.update(item.id, {
        expectedVersion: item.version,
        name: editName,
        requiresLab: editRequiresLab,
        defaultPriceCents: Math.round(Number(editPriceEuros || 0) * 100),
        defaultDurationMin: optionalNumber(editDurationMin),
        appointmentsMin: optionalNumber(editAppointmentsMin),
        appointmentsMax: optionalNumber(editAppointmentsMax),
      });
      setEditingId(null);
      await reload();
      await queryClient.invalidateQueries({ queryKey: dentyQueryKeys.treatmentCatalog.root });
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <section className={styles.section}>
      <Title order={3}>Tratamientos y costes base</Title>
      <Text c="dimmed" size="sm" mt="xs">
        Fuente única para plan, presupuesto, laboratorio, facturación y analítica. Los planes
        guardan un snapshot para que los históricos no cambien al editar el catálogo.
      </Text>
      <Text c="dimmed" size="sm" mt={4}>
        Los minutos por cita y el número de citas se usan en la agenda y en el tiempo aproximado de
        cada plan. Si se dejan vacíos, el plan usa una estimación por tipo de tratamiento.
      </Text>

      <form onSubmit={createItem}>
        <Stack mt="lg">
          <Group grow align="end">
            <TextInput
              label="Código"
              placeholder="IMPLANT"
              value={code}
              onChange={(event) => setCode(event.currentTarget.value)}
              required
            />
            <TextInput
              label="Tratamiento"
              placeholder="Implante"
              value={name}
              onChange={(event) => setName(event.currentTarget.value)}
              required
            />
            <NumberInput
              label="Precio base (€)"
              min={0}
              decimalScale={2}
              value={priceEuros}
              onChange={setPriceEuros}
            />
          </Group>
          <TimeFields
            durationMin={durationMin}
            appointmentsMin={appointmentsMin}
            appointmentsMax={appointmentsMax}
            onDuration={setDurationMin}
            onMin={setAppointmentsMin}
            onMax={setAppointmentsMax}
          />
          <Group justify="space-between">
            <Switch
              label="Requiere laboratorio"
              aria-label="Requiere laboratorio"
              description="Habilita el envío a laboratorio desde el plan clínico."
              disabled={pending}
              checked={requiresLab}
              onChange={(event) => setRequiresLab(event.currentTarget.checked)}
            />
            <Button type="submit" loading={pending}>
              Añadir tratamiento
            </Button>
          </Group>
        </Stack>
      </form>

      {error ? (
        <Alert color="red" mt="md">
          {error}
        </Alert>
      ) : null}

      <div className={styles.rowList}>
        {items.map((item) => {
          const editing = editingId === item.id;
          return (
            <div className={styles.row} key={item.id}>
              <div className={styles.rowMain}>
                {editing ? (
                  <Stack gap="sm">
                    <Group grow>
                      <TextInput
                        value={editName}
                        onChange={(event) => setEditName(event.currentTarget.value)}
                        aria-label={`Nombre ${item.code}`}
                      />
                      <NumberInput
                        value={editPriceEuros}
                        onChange={setEditPriceEuros}
                        min={0}
                        decimalScale={2}
                        suffix=" €"
                        aria-label={`Precio ${item.code}`}
                      />
                    </Group>
                    <Switch
                      label="Requiere laboratorio"
                      aria-label={`Requiere laboratorio ${item.code}`}
                      description="Habilita el envío a laboratorio desde el plan clínico."
                      checked={editRequiresLab}
                      disabled={pending}
                      onChange={(event) => setEditRequiresLab(event.currentTarget.checked)}
                    />
                    <TimeFields
                      code={item.code}
                      durationMin={editDurationMin}
                      appointmentsMin={editAppointmentsMin}
                      appointmentsMax={editAppointmentsMax}
                      onDuration={setEditDurationMin}
                      onMin={setEditAppointmentsMin}
                      onMax={setEditAppointmentsMax}
                    />
                    <TreatmentStaffTimesEditor treatmentId={item.id} treatmentCode={item.code} />
                  </Stack>
                ) : (
                  <>
                    <span className={styles.rowTitle}>{item.name}</span>
                    <span className={styles.rowMeta}>
                      {item.code} · {(item.defaultPriceCents / 100).toFixed(2)} €{timesMeta(item)}
                      {item.requiresLab ? " · laboratorio" : ""}
                    </span>
                  </>
                )}
              </div>
              <Group gap="xs">
                <Badge color={item.active ? "green" : "gray"}>
                  {item.active ? "Activo" : "Inactivo"}
                </Badge>
                {editing ? (
                  <>
                    <Button
                      size="xs"
                      variant="default"
                      onClick={() => setEditingId(null)}
                      disabled={pending}
                    >
                      Cancelar
                    </Button>
                    <Button size="xs" onClick={() => void saveEdit(item)} loading={pending}>
                      Guardar
                    </Button>
                  </>
                ) : (
                  <Button
                    size="xs"
                    variant="light"
                    disabled={pending}
                    onClick={() => {
                      setEditingId(item.id);
                      setEditName(item.name);
                      setEditPriceEuros(item.defaultPriceCents / 100);
                      setEditRequiresLab(item.requiresLab);
                      setEditDurationMin(item.defaultDurationMin ?? "");
                      setEditAppointmentsMin(item.appointmentsMin ?? "");
                      setEditAppointmentsMax(item.appointmentsMax ?? "");
                    }}
                  >
                    Editar
                  </Button>
                )}
              </Group>
            </div>
          );
        })}
      </div>
    </section>
  );
}
