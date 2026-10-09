"use client";

import { isSurgicalSite } from "@/domain/odontogram/mouth-state";
import { useMouthState } from "./mouth-state-context";
import { Badge, Button, Group, MultiSelect, Select, Text } from "@mantine/core";
import {
  SURGERY_PROCEDURES,
  archForTooth,
  createSurgeryEntity,
} from "@/domain/odontogram/surgery-procedures";
import { useState } from "react";

import {
  createPlannedImplant,
  implantPlanEntities,
  type DentalEntity,
  type ImplantProstheticDesign,
} from "@/domain";

import styles from "./odontogram.module.css";
import { SurgeryLegend } from "./surgery-legend";

export interface SurgeryPanelProps {
  selectedTooth: string;
  entities: readonly DentalEntity[];
  readOnly: boolean;
  onCommitBatch: (entities: readonly DentalEntity[]) => void;
  onWarning: (message: string) => void;
}

export function SurgeryPanel({
  selectedTooth,
  entities,
  readOnly,
  onCommitBatch,
  onWarning,
}: SurgeryPanelProps) {
  const mouth = useMouthState();
  const [procedure, setProcedure] = useState<string>("extraction_simple");
  const [extraProcedures, setExtraProcedures] = useState<string[]>([]);
  const [state, setState] = useState<"PLANIFICADO" | "REALIZADO">("PLANIFICADO");
  const [implantDesign, setImplantDesign] = useState<ImplantProstheticDesign>("UNIT_TIBASE");
  const [arch, setArch] = useState(archForTooth(selectedTooth));
  const selectedCount = entities.filter(
    (entity) => entity.active && entity.tooth === selectedTooth,
  ).length;

  const commit = () => {
    if (!isSurgicalSite(mouth, selectedTooth, procedure)) {
      onWarning("Diente ausente: elige implante o regeneración.");
      return;
    }
    if (procedure === "implant_planned") {
      onCommitBatch(implantPlanEntities(createPlannedImplant(selectedTooth, implantDesign)));
      return;
    }
    try {
      const procedures = [procedure, ...extraProcedures.filter((item) => item !== procedure)];
      if (procedures.some((item) => !isSurgicalSite(mouth, selectedTooth, item))) {
        onWarning("Alg�n tratamiento adicional no es aplicable a esta pieza.");
        return;
      }
      onCommitBatch(
        procedures
          .filter((item) => item !== "implant_planned")
          .map((item) => {
            const created = createSurgeryEntity(item, selectedTooth, state, entities, arch);
            const current = entities.find((entity) => entity.active && entity.entityType === created.entityType && entity.status === item && entity.tooth === created.tooth && entity.arch === created.arch);
            return current ? { ...created, id: current.id } : created;
          }),
      );
    } catch (error) {
      onWarning(error instanceof Error ? error.message : "No se pudo registrar el procedimiento");
    }
  };

  return (
    <section className={styles.clinicalPanel} aria-label="Panel de cirugía">
      <Group justify="space-between" align="flex-start">
        <div>
          <Text fw={850}>Cirugía · pieza {selectedTooth}</Text>
          <Text size="xs" c="dimmed">
            Planifica o registra el procedimiento en el mismo historial clínico.
          </Text>
        </div>
        <Badge variant="light">{selectedCount} registros</Badge>
      </Group>
      <Group mt="sm" align="end">
        <Select
          label="Procedimiento"
          value={procedure}
          onChange={(value) => setProcedure(value ?? procedure)}
          data={SURGERY_PROCEDURES.map(({ value, label }) => ({ value, label }))}
          disabled={readOnly}
        />
        <MultiSelect
          label="Tratamientos adicionales"
          placeholder="Ej. regeneración ósea guiada"
          value={extraProcedures}
          onChange={setExtraProcedures}
          data={SURGERY_PROCEDURES.filter(
            ({ value }) => value !== procedure && value !== "implant_planned",
          ).map(({ value, label }) => ({ value, label }))}
          disabled={readOnly || procedure === "implant_planned"}
          clearable
        />
        <Select
          label="Estado"
          value={state}
          onChange={(value) => setState((value as "PLANIFICADO" | "REALIZADO") ?? state)}
          data={[
            { value: "PLANIFICADO", label: "Planificado" },
            { value: "REALIZADO", label: "Realizado" },
          ]}
          disabled={readOnly}
        />
        {procedure === "guided_surgery_splint" ? (
          <Select
            label="Arcada"
            value={arch}
            onChange={(value) => setArch(value === "lower" ? "lower" : "upper")}
            data={[
              { value: "upper", label: "Superior" },
              { value: "lower", label: "Inferior" },
            ]}
            disabled={readOnly}
          />
        ) : null}
        {procedure === "implant_planned" ? (
          <Select
            label="Diseño protésico"
            value={implantDesign}
            onChange={(value) =>
              setImplantDesign((value as ImplantProstheticDesign) ?? "UNIT_TIBASE")
            }
            data={[
              { value: "UNIT_TIBASE", label: "Unitario · TiBase + corona" },
              { value: "MULTIUNIT_FIXED", label: "Multiunit + estructura atornillada" },
              { value: "DIRECT_SCREWED", label: "Directo a implante" },
              { value: "BAR_OVERDENTURE", label: "Sobredentadura con barra" },
              { value: "LOCATOR_OVERDENTURE", label: "Sobredentadura con Locator" },
              { value: "HYBRID_ALL_ON_X", label: "Híbrida All-on-X" },
              { value: "CUSTOM", label: "Personalizado" },
            ]}
            disabled={readOnly}
          />
        ) : null}
        <Button disabled={readOnly} onClick={commit}>
          Registrar
        </Button>
      </Group>
      <SurgeryLegend selectedTooth={selectedTooth} entities={entities} requiredFields={[]} />
    </section>
  );
}
