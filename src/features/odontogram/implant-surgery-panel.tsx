"use client";

import {
  Alert,
  Badge,
  Button,
  Group,
  NumberInput,
  Select,
  SimpleGrid,
  Text,
  TextInput,
  Textarea,
  Title,
} from "@mantine/core";
import { useEffect, useMemo, useState } from "react";

import {
  PERMANENT_LOWER,
  PERMANENT_UPPER,
  implantSurgeryDataFromAttributes,
  missingImplantSurgeryFields,
  type DentalEntity,
  type ImplantSurgeryData,
} from "@/domain";

interface ImplantSurgeryPanelProps {
  entities: readonly DentalEntity[];
  selectedTooth: string;
  readOnly: boolean;
  onSelectTooth: (tooth: string) => void;
  onCommit: (entity: DentalEntity) => void;
}

function implantEntityForTooth(
  entities: readonly DentalEntity[],
  tooth: string,
): DentalEntity | undefined {
  return [...entities]
    .reverse()
    .find((entity) => entity.active && entity.tooth === tooth && entity.entityType === "IMPLANT");
}

function surgeryDataFromEntity(entity: DentalEntity | undefined): ImplantSurgeryData {
  return implantSurgeryDataFromAttributes(entity?.attributes ?? {});
}

export function ImplantSurgeryPanel({
  entities,
  selectedTooth,
  readOnly,
  onSelectTooth,
  onCommit,
}: ImplantSurgeryPanelProps) {
  const entity = useMemo(
    () => implantEntityForTooth(entities, selectedTooth),
    [entities, selectedTooth],
  );
  const [data, setData] = useState<ImplantSurgeryData>(() => surgeryDataFromEntity(entity));

  useEffect(() => {
    setData(surgeryDataFromEntity(entity));
  }, [entity]);

  const implantTeeth = useMemo(() => {
    const planned = entities
      .filter((candidate) => candidate.active && candidate.entityType === "IMPLANT" && candidate.tooth)
      .map((candidate) => candidate.tooth!)
      .filter((tooth, index, values) => values.indexOf(tooth) === index);
    return planned.length ? planned : [...PERMANENT_UPPER, ...PERMANENT_LOWER];
  }, [entities]);

  const missing = missingImplantSurgeryFields(data);
  const completed = entity?.status === "implant" && missing.length === 0;

  const update = <K extends keyof ImplantSurgeryData>(key: K, value: ImplantSurgeryData[K]) => {
    setData((current) => ({ ...current, [key]: value }));
  };

  const save = () => {
    if (readOnly || missing.length > 0) return;
    const baseId = entity?.id ?? `implant-${selectedTooth}`;
    onCommit({
      ...(entity ?? {
        id: baseId,
        tooth: selectedTooth,
        entityType: "IMPLANT" as const,
        active: true,
      }),
      status: "implant",
      attributes: {
        ...(entity?.attributes ?? {}),
        ...data,
        surgicalRecordCompleted: true,
      },
      active: true,
    });
  };

  return (
    <section>
      <Group justify="space-between" align="flex-start" mb="md">
        <div>
          <Title order={3}>Registro quirúrgico del implante</Title>
          <Text c="dimmed" size="sm" mt={4}>
            Completa los datos reales después de la colocación. La planificación y el presupuesto
            permanecen separados.
          </Text>
        </div>
        <Badge color={completed ? "green" : "orange"} variant="light">
          {completed ? "Completo" : "Pendiente"}
        </Badge>
      </Group>

      {missing.length > 0 ? (
        <Alert color="orange" title="Datos del implante pendientes" mb="md">
          Faltan {missing.length} campos obligatorios antes de marcar el implante como realizado.
        </Alert>
      ) : (
        <Alert color="green" title="Ficha lista" mb="md">
          Los datos esenciales están completos. Puedes registrar el implante colocado.
        </Alert>
      )}

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
        <Select
          label="Posición"
          data={implantTeeth}
          value={selectedTooth}
          onChange={(value) => value && onSelectTooth(value)}
          disabled={readOnly}
        />
        <TextInput
          label="Marca / sistema"
          placeholder="Ej. Ticare INHEX"
          value={data.system ?? ""}
          onChange={(event) => update("system", event.currentTarget.value)}
          disabled={readOnly}
          required
        />
        <Select
          label="Conexión"
          placeholder="Opcional"
          value={data.connection || null}
          onChange={(value) => update("connection", value ?? "")}
          data={[
            { value: "hexagono_externo", label: "Hexágono externo" },
            { value: "hexagono_interno", label: "Hexágono interno" },
            { value: "cono_morse", label: "Cono Morse" },
          ]}
          clearable
          disabled={readOnly}
        />
        <NumberInput
          label="Diámetro (mm)"
          decimalScale={2}
          min={2}
          max={8}
          value={data.diameterMm ?? ""}
          onChange={(value) =>
            update("diameterMm", typeof value === "number" ? value : undefined)
          }
          disabled={readOnly}
          required
        />
        <NumberInput
          label="Longitud (mm)"
          decimalScale={1}
          min={4}
          max={30}
          value={data.lengthMm ?? ""}
          onChange={(value) => update("lengthMm", typeof value === "number" ? value : undefined)}
          disabled={readOnly}
          required
        />
        <TextInput
          label="Fecha de colocación"
          type="date"
          value={data.placementDate ?? ""}
          onChange={(event) => update("placementDate", event.currentTarget.value)}
          disabled={readOnly}
          required
        />
        <NumberInput
          label="Torque de inserción (Ncm)"
          min={0}
          max={100}
          value={data.insertionTorqueNcm ?? ""}
          onChange={(value) =>
            update("insertionTorqueNcm", typeof value === "number" ? value : undefined)
          }
          disabled={readOnly}
          required
        />
        <NumberInput
          label="ISQ primario"
          min={0}
          max={100}
          value={data.primaryIsq ?? ""}
          onChange={(value) => update("primaryIsq", typeof value === "number" ? value : undefined)}
          disabled={readOnly}
          required
        />
        <TextInput
          label="Lote / referencia"
          placeholder="Opcional"
          value={data.lotNumber ?? ""}
          onChange={(event) => update("lotNumber", event.currentTarget.value)}
          disabled={readOnly}
        />
      </SimpleGrid>

      <Textarea
        mt="md"
        label="Notas quirúrgicas"
        placeholder="Observaciones de la colocación, injerto, incidencias..."
        value={data.notes ?? ""}
        onChange={(event) => update("notes", event.currentTarget.value)}
        disabled={readOnly}
        autosize
        minRows={2}
      />

      <Group mt="md" justify="flex-end">
        <Button onClick={save} disabled={readOnly || missing.length > 0}>
          Registrar implante colocado
        </Button>
      </Group>
    </section>
  );
}
