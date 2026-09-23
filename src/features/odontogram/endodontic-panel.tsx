"use client";
import { Badge, Button, Group, Select, SimpleGrid, Text } from "@mantine/core";
import { useMemo, useState } from "react";
import {
  APICAL_DIAGNOSES,
  ENDODONTIC_VISUAL_MARKS,
  PULPAL_DIAGNOSES,
  endodonticVisualCodeForApicalDiagnosis,
  type ApicalDiagnosis,
  type DentalEntity,
  type PulpalDiagnosis,
} from "@/domain";
import styles from "./odontogram.module.css";
const ENDODONTIC_TOOTH_PATH =
  "M13 9 C9 18 10 31 16 41 C20 48 20 62 24 81 " +
  "C25 87 29 88 32 75 C35 88 39 87 40 81 C44 62 " +
  "44 48 48 41 C54 31 55 18 51 9 C45 3 39 4 32 8 " +
  "C25 4 19 3 13 9 Z";
interface EndodonticPanelProps {
  selectedTooth: string;
  readOnly: boolean;
  onCommit: (entity: DentalEntity) => void;
}
export function EndodonticPanel({ selectedTooth, readOnly, onCommit }: EndodonticPanelProps) {
  const [pulpalDiagnosis, setPulpalDiagnosis] = useState<PulpalDiagnosis>("Necrosis pulpar");
  const [apicalDiagnosis, setApicalDiagnosis] = useState<ApicalDiagnosis>("Absceso apical cronico");
  const visualCode = useMemo(
    () => endodonticVisualCodeForApicalDiagnosis(apicalDiagnosis),
    [apicalDiagnosis],
  );
  const visualMark = ENDODONTIC_VISUAL_MARKS[visualCode];
  return (
    <section className={styles.clinicalPanel} aria-label="Endodoncia visual">
      <Group justify="space-between" align="flex-start">
        <div>
          <Text fw={850}>Diagnóstico endodóntico visual</Text>
          <Text size="xs" c="dimmed">
            El diagnóstico apical se guarda como entidad clínica y se dibuja sobre el ápice del
            diente seleccionado.
          </Text>
        </div>
        <Badge variant="light">Diente {selectedTooth}</Badge>
      </Group>

      <SimpleGrid cols={{ base: 1, md: 3 }} mt="md" className={styles.endoEditorGrid}>
        <Select
          label="Diagnóstico pulpar"
          value={pulpalDiagnosis}
          data={PULPAL_DIAGNOSES.map((value) => ({ value, label: value }))}
          onChange={(value) => setPulpalDiagnosis((value ?? "Necrosis pulpar") as PulpalDiagnosis)}
          disabled={readOnly}
        />
        <Select
          label="Diagnóstico apical"
          value={apicalDiagnosis}
          data={APICAL_DIAGNOSES.map((value) => ({ value, label: value }))}
          onChange={(value) =>
            setApicalDiagnosis((value ?? "Absceso apical cronico") as ApicalDiagnosis)
          }
          disabled={readOnly}
        />
        <div className={styles.endoDiagnosisPreview} data-severity={visualMark.severity}>
          <svg viewBox="0 0 64 92" aria-hidden="true">
            <path className={styles.endoPreviewTooth} d={ENDODONTIC_TOOTH_PATH} />
            <path className={styles.endoPreviewMark} d={visualMark.svgPath} />
          </svg>
          <div>
            <strong>{visualMark.label}</strong>
            <span>Marca SVG: {visualCode}</span>
          </div>
        </div>
      </SimpleGrid>

      <Group mt="md" justify="flex-end">
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
                visualCode,
              },
              active: true,
            })
          }
        >
          Guardar y dibujar en {selectedTooth}
        </Button>
      </Group>

      <div className={styles.endoVisualLibrary}>
        {Object.values(ENDODONTIC_VISUAL_MARKS).map((mark) => (
          <div key={mark.code} data-severity={mark.severity}>
            <svg viewBox="0 0 64 92" aria-hidden="true">
              <path className={styles.endoPreviewTooth} d={ENDODONTIC_TOOTH_PATH} />
              <path className={styles.endoPreviewMark} d={mark.svgPath} />
            </svg>
            <span>{mark.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
