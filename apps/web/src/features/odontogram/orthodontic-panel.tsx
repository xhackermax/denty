"use client";

import { Button, Checkbox, Group, NumberInput, Select, SimpleGrid, Text } from "@mantine/core";
import { useState } from "react";

import { createOrthodonticEntity, type DentalEntity, type OrthodonticAppliance } from "@/domain";
import styles from "./odontogram.module.css";

interface OrthodonticPanelProps {
  patientId: string;
  readOnly: boolean;
  onCommit: (entity: DentalEntity) => void;
}

const APPLIANCES: readonly { value: OrthodonticAppliance; label: string }[] = [
  { value: "brackets", label: "Brackets" },
  { value: "aligners", label: "Alineadores" },
  { value: "retainer", label: "Retenedor" },
  { value: "expander", label: "Disyuntor" },
  { value: "lingual_arch", label: "Arco lingual" },
  { value: "space_maintainer", label: "Mantenedor" },
];

export function OrthodonticPanel({ patientId, readOnly, onCommit }: OrthodonticPanelProps) {
  const [molarClassRight, setMolarClassRight] = useState<string | null>("I");
  const [overjetMm, setOverjetMm] = useState<string | number>(4);
  const [appliances, setAppliances] = useState<OrthodonticAppliance[]>(["aligners"]);

  return (
    <section className={styles.clinicalPanel} aria-label="Odontograma ortodontico">
      <Text fw={850}>Odontograma ortodontico</Text>
      <Text size="xs" c="dimmed">
        Hallazgos y aparatos conectados al modelo clinico del paciente.
      </Text>
      <SimpleGrid cols={{ base: 1, sm: 3 }} mt="md">
        <Select
          label="Clase molar derecha"
          data={["I", "II", "III"]}
          value={molarClassRight}
          onChange={setMolarClassRight}
          disabled={readOnly}
        />
        <NumberInput
          label="Overjet"
          suffix=" mm"
          value={overjetMm}
          onChange={setOverjetMm}
          disabled={readOnly}
        />
        <NumberInput label="Overbite" suffix=" %" defaultValue={60} disabled={readOnly} />
      </SimpleGrid>
      <Group mt="md">
        {APPLIANCES.map((appliance) => (
          <Checkbox
            key={appliance.value}
            label={appliance.label}
            checked={appliances.includes(appliance.value)}
            disabled={readOnly}
            onChange={(event) =>
              setAppliances((current) =>
                event.currentTarget.checked
                  ? [...current, appliance.value]
                  : current.filter((value) => value !== appliance.value),
              )
            }
          />
        ))}
      </Group>
      <Button
        mt="md"
        size="xs"
        disabled={readOnly}
        onClick={() =>
          onCommit(
            createOrthodonticEntity(patientId, {
              molarClassRight:
                molarClassRight === "II" || molarClassRight === "III"
                  ? molarClassRight
                  : "I",
              overjetMm: Number(overjetMm),
              appliances,
            }),
          )
        }
      >
        Guardar ortodoncia
      </Button>
    </section>
  );
}
