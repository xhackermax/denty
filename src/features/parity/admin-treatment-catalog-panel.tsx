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

interface CatalogItem {
  id: string;
  code: string;
  name: string;
  defaultPriceCents: number;
  baseCostCents: number;
  requiresLab: boolean;
  active: boolean;
  version: number;
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
        requiresLab,
        active: true,
        metadata: {},
      });
      setCode("");
      setName("");
      setPriceEuros(0);
      setRequiresLab(false);
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
                  </Stack>
                ) : (
                  <>
                    <span className={styles.rowTitle}>{item.name}</span>
                    <span className={styles.rowMeta}>
                      {item.code} · {(item.defaultPriceCents / 100).toFixed(2)} €
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
