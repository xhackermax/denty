"use client";

import { Badge, Button, Group, Select, Text } from "@mantine/core";
import { useState } from "react";

import {
  createPlannedImplant,
  implantPlanEntities,
  type DentalEntity,
  type ImplantProstheticDesign,
} from "@/domain";

import styles from "./odontogram.module.css";
import { SurgeryLegend } from "./surgery-legend";

const PROCEDURES = [
  ["extraction_simple", "Exodoncia simple"],
  ["extraction_surgical", "Exodoncia quirúrgica"],
  ["impacted", "Diente incluido / impactado"],
  ["germectomy", "Germectomía"],
  ["alveoloplasty", "Alveoloplastia"],
  ["surgical_exposure", "Exposición para tracción"],
  ["apicoectomy", "Apicectomía"],
  ["frenectomy_labial", "Frenectomía labial"],
  ["frenectomy_lingual", "Frenectomía lingual"],
  ["biopsy", "Biopsia / lesión"],
  ["implant_planned", "Implante planificado"],
  ["implant_placed", "Implante colocado"],
  ["implant_lost", "Implante perdido"],
  ["bone_graft", "Injerto óseo / ROG"],
  ["socket_preservation", "Preservación alveolar"],
  ["split_crest", "Split crest"],
  ["membrane", "Membrana"],
  ["sinus_lift_internal", "Elevación de seno interna / Summers"],
  ["sinus_lift_external", "Elevación de seno externa"],
] as const;

function entityTypeFor(procedure: string): DentalEntity["entityType"] {
  if (["bone_graft", "socket_preservation", "split_crest"].includes(procedure)) return "BONE_GRAFT";
  if (procedure === "membrane") return "MEMBRANE";
  if (procedure.startsWith("sinus_lift")) return "SINUS_LIFT";
  if (procedure === "biopsy") return "SURGICAL_LESION";
  if (procedure.startsWith("implant")) return "IMPLANT";
  return "SURGERY";
}

export interface SurgeryPanelProps {
  selectedTooth: string;
  entities: readonly DentalEntity[];
  readOnly: boolean;
  onCommitBatch: (entities: readonly DentalEntity[]) => void;
  onWarning: (message: string) => void;
}

export function SurgeryPanel({ selectedTooth, entities, readOnly, onCommitBatch }: SurgeryPanelProps) {
  const [procedure, setProcedure] = useState<string>("extraction_simple");
  const [state, setState] = useState<"PLANIFICADO" | "REALIZADO">("PLANIFICADO");
  const [implantDesign, setImplantDesign] = useState<ImplantProstheticDesign>("UNIT_TIBASE");
  const procedureLabel = PROCEDURES.find(([value]) => value === procedure)?.[1] ?? procedure;
  const selectedCount = entities.filter((entity) => entity.active && entity.tooth === selectedTooth).length;

  const commit = () => {
    if (procedure === "implant_planned") {
      onCommitBatch(implantPlanEntities(createPlannedImplant(selectedTooth, implantDesign)));
      return;
    }
    onCommitBatch([{
      id: `surgery-${selectedTooth}-${procedure}`,
      tooth: selectedTooth,
      entityType: entityTypeFor(procedure),
      status: procedure,
      active: true,
      attributes: {
        lifecycle: state,
        procedure,
        label: procedureLabel,
        ...(procedure === "extraction_surgical" ? { impacted: true } : {}),
      },
    }]);
  };

  return (
    <section className={styles.clinicalPanel} aria-label="Panel de cirugía">
      <Group justify="space-between" align="flex-start">
        <div>
          <Text fw={850}>Cirugía · pieza {selectedTooth}</Text>
          <Text size="xs" c="dimmed">Planifica o registra el procedimiento en el mismo historial clínico.</Text>
        </div>
        <Badge variant="light">{selectedCount} registros</Badge>
      </Group>
      <Group mt="sm" align="end">
        <Select label="Procedimiento" value={procedure} onChange={(value) => setProcedure(value ?? procedure)} data={PROCEDURES.map(([value, label]) => ({ value, label }))} disabled={readOnly} />
        <Select label="Estado" value={state} onChange={(value) => setState((value as "PLANIFICADO" | "REALIZADO") ?? state)} data={[{ value: "PLANIFICADO", label: "Planificado" }, { value: "REALIZADO", label: "Realizado" }]} disabled={readOnly} />
        {procedure === "implant_planned" ? (
          <Select
            label="Diseño protésico"
            value={implantDesign}
            onChange={(value) => setImplantDesign((value as ImplantProstheticDesign) ?? "UNIT_TIBASE")}
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
        <Button disabled={readOnly} onClick={commit}>Registrar</Button>
      </Group>
      <SurgeryLegend selectedTooth={selectedTooth} entities={entities} requiredFields={[]} />
    </section>
  );
}
