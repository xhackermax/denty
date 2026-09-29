"use client";

import { Alert, Badge, Button, Group, Select, SimpleGrid, Text, TextInput } from "@mantine/core";
import { useMemo, useState } from "react";
import {
  PERMANENT_LOWER,
  PERMANENT_UPPER,
  createSupernumeraryToothEntity,
  createSupernumeraryTreatmentEntity,
  type DentalEntity,
  type DentalEntityType,
  type SupernumeraryToothIdentity,
} from "@/domain";
import styles from "./odontogram.module.css";

interface SupernumeraryPanelProps {
  entities: readonly DentalEntity[];
  readOnly: boolean;
  onCommit: (entity: DentalEntity) => void;
}

const CLINICAL_TYPES: Array<{ value: SupernumeraryToothIdentity["clinicalType"]; label: string }> =
  [
    { value: "mesiodens", label: "Mesiodens" },
    { value: "paramolar", label: "Paramolar" },
    { value: "distomolar", label: "Distomolar" },
    { value: "supplemental", label: "Suplementario" },
    { value: "other", label: "Otro" },
  ];

const MORPHOLOGIES: Array<{ value: SupernumeraryToothIdentity["morphology"]; label: string }> = [
  { value: "supplemental", label: "Suplementaria" },
  { value: "conical", label: "Cónica" },
  { value: "tuberculate", label: "Tuberculada" },
  { value: "molariform", label: "Molariforme" },
  { value: "unspecified", label: "Sin especificar" },
];

const TREATMENTS: Array<{
  value: string;
  label: string;
  entityType: Exclude<DentalEntityType, "SUPERNUMERARY_TOOTH">;
  status: string;
}> = [
  { value: "caries", label: "Caries", entityType: "CARIES", status: "caries" },
  {
    value: "restoration",
    label: "Restauración planificada",
    entityType: "RESTORATION",
    status: "restoration_planned",
  },
  { value: "endo", label: "Endodoncia planificada", entityType: "ENDO", status: "endo_planned" },
  { value: "crown", label: "Corona planificada", entityType: "CROWN", status: "crown_planned" },
  {
    value: "extraction",
    label: "Extracción indicada",
    entityType: "EXTRACTION",
    status: "extraction_indicated",
  },
];

function identityFor(entity: DentalEntity): SupernumeraryToothIdentity | null {
  if (entity.entityType !== "SUPERNUMERARY_TOOTH") return null;
  const value = entity.attributes?.toothIdentity;
  if (!value || typeof value !== "object") return null;
  return value as SupernumeraryToothIdentity;
}

export function SupernumeraryPanel({ entities, readOnly, onCommit }: SupernumeraryPanelProps) {
  const supernumeraries = useMemo(
    () => entities.filter((entity) => entity.active && entity.entityType === "SUPERNUMERARY_TOOTH"),
    [entities],
  );
  const [anchorFdi, setAnchorFdi] = useState("11");
  const [isoDesignation, setIsoDesignation] = useState("");
  const [clinicalType, setClinicalType] =
    useState<SupernumeraryToothIdentity["clinicalType"]>("mesiodens");
  const [morphology, setMorphology] = useState<SupernumeraryToothIdentity["morphology"]>("conical");
  const [label, setLabel] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [treatment, setTreatment] = useState("extraction");
  const [error, setError] = useState<string | null>(null);

  const add = () => {
    if (readOnly) return;
    try {
      const entity = createSupernumeraryToothEntity({
        id:
          globalThis.crypto?.randomUUID?.() ??
          `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        anchorFdi,
        ...(isoDesignation.trim() ? { iso10394Designation: isoDesignation.trim() } : {}),
        clinicalType,
        morphology,
        ...(label.trim() ? { label: label.trim() } : {}),
      });
      onCommit(entity);
      setSelectedId(entity.id);
      setIsoDesignation("");
      setLabel("");
      setError(null);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "No se pudo añadir la pieza supernumeraria",
      );
    }
  };

  const addTreatment = () => {
    const tooth = supernumeraries.find((entity) => entity.id === selectedId);
    const definition = TREATMENTS.find((item) => item.value === treatment);
    if (!tooth || !definition || readOnly) return;
    onCommit(
      createSupernumeraryTreatmentEntity({
        supernumerary: tooth,
        treatmentId: definition.value,
        entityType: definition.entityType,
        status: definition.status,
      }),
    );
  };

  return (
    <section className={styles.supernumeraryPanel} aria-label="Piezas supernumerarias">
      <Group justify="space-between" align="flex-start">
        <div>
          <Text fw={850}>Piezas adicionales / supernumerarias</Text>
          <Text size="xs" c="dimmed">
            La pieza conserva identidad propia. El FDI vecino solo sirve para ubicarla; no se
            renumeran los dientes normales.
          </Text>
        </div>
        <Badge variant="light">{supernumeraries.length} registradas</Badge>
      </Group>
      <SimpleGrid cols={{ base: 1, sm: 2, md: 5 }} mt="sm">
        <Select
          label="Junto a FDI"
          value={anchorFdi}
          onChange={(value) => setAnchorFdi(value ?? "11")}
          data={[...PERMANENT_UPPER, ...PERMANENT_LOWER]}
          searchable
          disabled={readOnly}
        />
        <Select
          label="Tipo clínico"
          value={clinicalType}
          onChange={(value) =>
            setClinicalType((value ?? "other") as SupernumeraryToothIdentity["clinicalType"])
          }
          data={CLINICAL_TYPES}
          disabled={readOnly}
        />
        <Select
          label="Morfología"
          value={morphology}
          onChange={(value) =>
            setMorphology((value ?? "unspecified") as SupernumeraryToothIdentity["morphology"])
          }
          data={MORPHOLOGIES}
          disabled={readOnly}
        />
        <TextInput
          label="Código ISO 10394"
          placeholder="2 caracteres"
          value={isoDesignation}
          maxLength={2}
          onChange={(event) => setIsoDesignation(event.currentTarget.value)}
          disabled={readOnly}
        />
        <TextInput
          label="Etiqueta opcional"
          placeholder="Ej. mesiodens palatino"
          value={label}
          onChange={(event) => setLabel(event.currentTarget.value)}
          disabled={readOnly}
        />
      </SimpleGrid>
      <Group mt="sm">
        <Button size="xs" onClick={add} disabled={readOnly}>
          Añadir pieza
        </Button>
      </Group>
      {error ? (
        <Alert color="red" mt="sm">
          {error}
        </Alert>
      ) : null}

      {supernumeraries.length ? (
        <div className={styles.supernumeraryList}>
          {supernumeraries.map((entity) => {
            const identity = identityFor(entity);
            if (!identity) return null;
            return (
              <button
                key={entity.id}
                type="button"
                className={styles.supernumeraryCard}
                data-selected={selectedId === entity.id}
                onClick={() => setSelectedId(entity.id)}
              >
                <strong>{identity.iso10394Designation ?? "SUP"}</strong>
                <span>{identity.label ?? identity.clinicalType}</span>
                <small>
                  junto a {identity.anchorFdi} · {identity.morphology}
                </small>
              </button>
            );
          })}
        </div>
      ) : null}

      {selectedId ? (
        <Group mt="sm" align="flex-end">
          <Select
            label="Tratamiento de la pieza seleccionada"
            value={treatment}
            onChange={(value) => setTreatment(value ?? "extraction")}
            data={TREATMENTS.map(({ value, label }) => ({ value, label }))}
            disabled={readOnly}
          />
          <Button size="xs" variant="light" onClick={addTreatment} disabled={readOnly}>
            Aplicar a supernumerario
          </Button>
        </Group>
      ) : null}
    </section>
  );
}
