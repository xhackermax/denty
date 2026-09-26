"use client";

import { Button, Group, Select, Text } from "@mantine/core";
import { useState } from "react";

import type { DentalEntity } from "@/domain";

const PROCEDURES = [
  ["extraction_simple", "Exodoncia simple"],
  ["extraction_surgical", "Exodoncia quirúrgica"],
  ["impacted", "Diente incluido / impactado"],
  ["apicoectomy", "Apicectomía"],
  ["implant_planned", "Implante planificado"],
  ["implant_lost", "Implante perdido"],
  ["bone_graft", "Injerto óseo / ROG"],
  ["membrane", "Membrana"],
  ["sinus_lift", "Elevación de seno"],
  ["biopsy", "Biopsia / lesión"],
  ["surgical_exposure", "Exposición quirúrgica"],
] as const;

function entityTypeFor(procedure: string): DentalEntity["entityType"] {
  if (procedure === "bone_graft") return "BONE_GRAFT";
  if (procedure === "membrane") return "MEMBRANE";
  if (procedure === "sinus_lift") return "SINUS_LIFT";
  if (procedure === "biopsy") return "SURGICAL_LESION";
  if (procedure.startsWith("implant")) return "IMPLANT";
  return "SURGERY";
}

export function SurgeryPanel({
  selectedTooth,
  readOnly,
  onCommit,
}: {
  selectedTooth: string;
  readOnly: boolean;
  onCommit: (entity: DentalEntity) => void;
}) {
  const [procedure, setProcedure] = useState<string>("extraction_simple");
  const [state, setState] = useState<"PLANIFICADO" | "REALIZADO">("PLANIFICADO");
  const procedureLabel = PROCEDURES.find(([value]) => value === procedure)?.[1] ?? procedure;

  return (
    <section aria-label="Panel de cirugía">
      <Text fw={800}>Cirugía · pieza {selectedTooth}</Text>
      <Text size="xs" c="dimmed">Planifica o registra el procedimiento en el mismo historial clínico.</Text>
      <Group mt="sm" align="end">
        <Select label="Procedimiento" value={procedure} onChange={(value) => setProcedure(value ?? procedure)} data={PROCEDURES.map(([value, label]) => ({ value, label }))} disabled={readOnly} />
        <Select label="Estado" value={state} onChange={(value) => setState((value as "PLANIFICADO" | "REALIZADO") ?? state)} data={[{ value: "PLANIFICADO", label: "Planificado" }, { value: "REALIZADO", label: "Realizado" }]} disabled={readOnly} />
        <Button disabled={readOnly} onClick={() => onCommit({ id: `surgery-${selectedTooth}-${procedure}`, tooth: selectedTooth, entityType: entityTypeFor(procedure), status: procedure, active: true, attributes: { lifecycle: state, procedure, label: procedureLabel } })}>Registrar</Button>
      </Group>
    </section>
  );
}
