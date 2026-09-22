"use client";

import { Button, Group, Select, Text } from "@mantine/core";
import { useState } from "react";

import {
  APICAL_DIAGNOSES,
  PULPAL_DIAGNOSES,
  endodonticVisualCodeForApicalDiagnosis,
  type ApicalDiagnosis,
  type DentalEntity,
  type PulpalDiagnosis,
} from "@/domain";
import styles from "./odontogram.module.css";

interface EndodonticPanelProps {
  selectedTooth: string;
  readOnly: boolean;
  onCommit: (entity: DentalEntity) => void;
}

export function EndodonticPanel({ selectedTooth, readOnly, onCommit }: EndodonticPanelProps) {
  const [pulpalDiagnosis, setPulpalDiagnosis] = useState<PulpalDiagnosis>("Necrosis pulpar");
  const [apicalDiagnosis, setApicalDiagnosis] =
    useState<ApicalDiagnosis>("Absceso apical cronico");

  return (
    <section className={styles.clinicalPanel} aria-label="Endodoncia visual">
      <Text fw={850}>Endodoncia visual</Text>
      <Text size="xs" c="dimmed">Diagnosticos con marca SVG propia sobre el diente seleccionado.</Text>
      <Group mt="md" align="flex-end">
        <Select
          label="Diagnostico pulpar"
          value={pulpalDiagnosis}
          data={PULPAL_DIAGNOSES.map((value) => ({ value, label: value }))}
          onChange={(value) => setPulpalDiagnosis((value ?? "Necrosis pulpar") as PulpalDiagnosis)}
          disabled={readOnly}
        />
        <Select
          label="Diagnostico apical"
          value={apicalDiagnosis}
          data={APICAL_DIAGNOSES.map((value) => ({ value, label: value }))}
          onChange={(value) =>
            setApicalDiagnosis((value ?? "Absceso apical cronico") as ApicalDiagnosis)
          }
          disabled={readOnly}
        />
        <Button
          size="xs"
          disabled={readOnly}
          onClick={() =>
            onCommit({
              id: `endo-diagnosis-${selectedTooth}`,
              tooth: selectedTooth,
              entityType: "ENDO",
              status: "diagnosis",
              attributes: {
                pulpalDiagnosis,
                apicalDiagnosis,
                visualCode: endodonticVisualCodeForApicalDiagnosis(apicalDiagnosis),
              },
              active: true,
            })
          }
        >
          Marcar diente {selectedTooth}
        </Button>
      </Group>
    </section>
  );
}
