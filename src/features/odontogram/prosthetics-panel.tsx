"use client";

import { Badge, Button, Group, NumberInput, SegmentedControl, Select, SimpleGrid, Text } from "@mantine/core";
import { useState } from "react";
import type { DentalEntity } from "@/domain";
import { archForTooth } from "@/domain";
import {
  createProsthesisPlan,
  IMPLANT_ATTACHMENT_TYPES,
  PROSTHESIS_ON_IMPLANTS,
  PROSTHESIS_ON_TEETH,
  type ImplantAttachmentType,
  type ProsthesisLifecycle,
  type ProsthesisSupport,
} from "@/domain/odontogram/prosthesis-design";
import styles from "./odontogram.module.css";

interface ProstheticsPanelProps {
  selectedTooth: string;
  entities?: readonly DentalEntity[];
  readOnly: boolean;
  onCommit: (entity: DentalEntity) => void;
  onWarning: (message: string) => void;
}

export function ProstheticsPanel({
  selectedTooth,
  entities = [],
  readOnly,
  onCommit,
  onWarning,
}: ProstheticsPanelProps) {
  const [support, setSupport] = useState<ProsthesisSupport>("teeth");
  const [typeOnTeeth, setTypeOnTeeth] = useState<string>("fixed_bridge");
  const [typeOnImplants, setTypeOnImplants] = useState<string>("fixed_implants");
  const [lifecycle, setLifecycle] = useState<ProsthesisLifecycle>("PLANIFICADO");
  const [teethToRestore, setTeethToRestore] = useState<number | string>(1);
  const [implantCount, setImplantCount] = useState<number | string>(1);
  const [attachmentCount, setAttachmentCount] = useState<number | string>(1);
  const [attachmentType, setAttachmentType] = useState<ImplantAttachmentType>("TI_BASE");
  const implantSupported = support === "implants";
  const catalog = implantSupported ? PROSTHESIS_ON_IMPLANTS : PROSTHESIS_ON_TEETH;
  const selectedType = implantSupported ? typeOnImplants : typeOnTeeth;
  const arch = archForTooth(selectedTooth);

  const save = () => {
    try {
      const plan = createProsthesisPlan({
        selectedTooth,
        arch,
        support,
        prosthesisType: selectedType,
        lifecycle,
        teethToRestore: Number(teethToRestore),
        ...(implantSupported
          ? {
              implantCount: Number(implantCount),
              attachmentCount: Number(attachmentCount),
              attachmentType,
            }
          : {}),
      });
      const existing = entities.find((entity) => entity.active && entity.tooth === selectedTooth && entity.attributes?.support === support && entity.attributes?.prosthesisType === selectedType);
      onCommit(existing ? { ...plan, id: existing.id } : plan);
    } catch (error) {
      onWarning(error instanceof Error ? error.message : "No se pudo registrar la prótesis.");
    }
  };

  return (
    <section className={styles.clinicalPanel} aria-label="Panel de prótesis">
      <Group justify="space-between" align="flex-start">
        <div>
          <Text fw={850}>Prótesis · pieza {selectedTooth}</Text>
          <Text size="xs" c="dimmed">
            Define el soporte, el tipo de rehabilitación y sus cantidades. El registro queda vinculado al odontograma.
          </Text>
        </div>
        <Badge variant="light">{arch === "upper" ? "Arcada superior" : "Arcada inferior"}</Badge>
      </Group>
      <div>
        <Text size="sm" fw={700} mb={6}>Tipo de soporte</Text>
        <SegmentedControl
          fullWidth
          aria-label="Soporte de prótesis"
          value={support}
          onChange={(value) => setSupport(value as ProsthesisSupport)}
          disabled={readOnly}
          data={[
            { value: "teeth", label: "Sobre dientes" },
            { value: "implants", label: "Sobre implantes" },
          ]}
        />
      </div>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
        <Select
          label={implantSupported ? "Prótesis sobre implantes" : "Prótesis sobre dientes"}
          searchable
          data={catalog.map(({ value, label }) => ({ value, label }))}
          value={selectedType}
          onChange={(value) => {
            if (!value) return;
            if (implantSupported) setTypeOnImplants(value);
            else setTypeOnTeeth(value);
          }}
          disabled={readOnly}
        />
        <Select
          label="Estado"
          value={lifecycle}
          data={[
            { value: "PLANIFICADO", label: "Planificado" },
            { value: "REALIZADO", label: "Realizado" },
          ]}
          onChange={(value) => setLifecycle(value === "REALIZADO" ? "REALIZADO" : "PLANIFICADO")}
          disabled={readOnly}
        />
        <NumberInput
          label="Número de dientes a restaurar"
          value={teethToRestore}
          onChange={setTeethToRestore}
          min={1}
          max={16}
          allowDecimal={false}
          allowNegative={false}
          disabled={readOnly}
        />
        {implantSupported ? (
          <>
            <NumberInput
              label="Número de implantes"
              value={implantCount}
              onChange={setImplantCount}
              min={1}
              max={16}
              allowDecimal={false}
              allowNegative={false}
              disabled={readOnly}
            />
            <NumberInput
              label="Número de aditamentos"
              value={attachmentCount}
              onChange={setAttachmentCount}
              min={1}
              max={16}
              allowDecimal={false}
              allowNegative={false}
              disabled={readOnly}
            />
            <Select
              label="Tipo de aditamentos"
              data={[...IMPLANT_ATTACHMENT_TYPES]}
              value={attachmentType}
              onChange={(value) => setAttachmentType((value ?? "TI_BASE") as ImplantAttachmentType)}
              disabled={readOnly}
            />
          </>
        ) : null}
      </SimpleGrid>
      <Text size="xs" c="dimmed">
        Se registra el número de dientes a rehabilitar; no se asignan piezas ni implantes adicionales de forma automática.
      </Text>
      <Group justify="flex-end">
        <Button disabled={readOnly} onClick={save}>Registrar prótesis</Button>
      </Group>
    </section>
  );
}
