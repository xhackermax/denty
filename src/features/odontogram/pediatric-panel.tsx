"use client";

import { useMouthState } from "./mouth-state-context";
import { isEndoCandidate } from "@/domain/odontogram/mouth-state";
import { Alert, Badge, Button, Group, SegmentedControl, Select, Text } from "@mantine/core";
import { useEffect, useMemo, useState } from "react";
import {
  MIXED_DENTITION_SITES,
  PEDIATRIC_TOOTH_STATUSES,
  TEMPORARY_LOWER,
  TEMPORARY_UPPER,
  createPediatricEntity,
  defaultMixedPresence,
  dentitionStageForBirthDate,
  standardTooth,
  type DentalEntity,
  type DentitionStage,
  type PediatricToothStatus,
} from "@/domain";
import styles from "./odontogram.module.css";

interface PediatricPanelProps {
  patientId: string;
  selectedTooth: string;
  onSelectTooth: (tooth: string) => void;
  birthDate?: string;
  readOnly: boolean;
  initialEntities?: readonly DentalEntity[];
  onCommit: (entity: DentalEntity) => void;
}

const STAGE_LABELS: Record<DentitionStage, string> = {
  primary: "Dentición temporal",
  mixed: "Dentición mixta dinámica",
  permanent: "Dentición permanente",
};

const STATUS_LABELS: Record<PediatricToothStatus, string> = {
  healthy: "Sano / presente",
  unerupted: "No erupcionado",
  retained: "Temporal retenido",
  impacted: "Incluido / impactado",
  congenitally_missing: "Agenesia / ausente",
  early_caries: "Caries inicial",
  sealant: "Sellador",
  pulpotomy: "Pulpotomía",
  pulpectomy: "Pulpectomía",
  pediatric_crown: "Corona pediátrica",
  exfoliated: "Exfoliado",
  erupting: "En erupción",
  space_maintainer: "Mantenedor de espacio",
};

function isVisiblyPresent(status: PediatricToothStatus | undefined, fallback: boolean) {
  if (!status) return fallback;
  return !["unerupted", "exfoliated", "congenitally_missing"].includes(status);
}

const NO_ENTITIES: readonly DentalEntity[] = [];

export function PediatricPanel({
  patientId,
  selectedTooth,
  onSelectTooth,
  birthDate,
  readOnly,
  initialEntities = NO_ENTITIES,
  onCommit,
}: PediatricPanelProps) {
  const mouth = useMouthState();
  const suggestedStage = useMemo(() => dentitionStageForBirthDate(birthDate), [birthDate]);
  const suggestedPediatricStage: Extract<DentitionStage, "primary" | "mixed"> =
    !birthDate || suggestedStage === "primary" ? "primary" : "mixed";
  const [stage, setStage] =
    useState<Extract<DentitionStage, "primary" | "mixed">>(suggestedPediatricStage);
  const persistedStates = useMemo(() => {
    const result: Record<string, PediatricToothStatus> = {};
    for (const entity of initialEntities) {
      if (!entity.active || entity.entityType !== "PEDIATRIC" || !entity.tooth) continue;
      if ((PEDIATRIC_TOOTH_STATUSES as readonly string[]).includes(entity.status)) {
        result[entity.tooth] = entity.status as PediatricToothStatus;
      }
    }
    return result;
  }, [initialEntities]);
  const persistedSignature = JSON.stringify(persistedStates);
  const [toothStates, setToothStates] =
    useState<Record<string, PediatricToothStatus>>(persistedStates);

  const [status, setStatus] = useState<PediatricToothStatus>("healthy");
  const [saved, setSaved] = useState(false);
  const mixedDefault = useMemo(() => defaultMixedPresence(), []);

  const primaryTeeth = useMemo(() => [...TEMPORARY_UPPER, ...TEMPORARY_LOWER], []);
  const mixedTeeth = useMemo(
    () =>
      [...MIXED_DENTITION_SITES.upper, ...MIXED_DENTITION_SITES.lower].flatMap((site) =>
        site.primaryFdi ? [site.permanentFdi, site.primaryFdi] : [site.permanentFdi],
      ),
    [],
  );
  const allTeeth = stage === "primary" ? primaryTeeth : mixedTeeth;

  useEffect(() => setStage(suggestedPediatricStage), [suggestedPediatricStage]);
  useEffect(() => {
    setToothStates(persistedStates);
    setSaved(Object.keys(persistedStates).length > 0);
  }, [patientId, persistedSignature]);
  const chosenTooth = allTeeth.includes(selectedTooth) ? selectedTooth : (allTeeth[0] ?? "55");

  const fallbackPresence = (tooth: string) =>
    stage === "primary" ? true : mixedDefault.has(tooth);
  const presentFor = (tooth: string) =>
    isVisiblyPresent(toothStates[tooth], fallbackPresence(tooth));

  const commitStatus = (tooth: string, nextStatus: PediatricToothStatus) => {
    if (readOnly) return;
    if (
      ![
        "healthy",
        "unerupted",
        "retained",
        "impacted",
        "congenitally_missing",
        "exfoliated",
        "erupting",
      ].includes(nextStatus) &&
      !isEndoCandidate(mouth, tooth)
    )
      return;
    setToothStates((current) => ({ ...current, [tooth]: nextStatus }));
    onCommit(createPediatricEntity(tooth, nextStatus));
    setSaved(false);
  };

  const togglePresence = (tooth: string) => {
    const definition = standardTooth(tooth);
    const present = presentFor(tooth);
    const next: PediatricToothStatus = present
      ? definition.dentition === "primary"
        ? "exfoliated"
        : "unerupted"
      : definition.dentition === "primary" && stage === "mixed"
        ? "retained"
        : "healthy";
    commitStatus(tooth, next);
  };

  return (
    <section className={styles.clinicalPanel} aria-label="Herramientas de dentición y recambio">
      <Group justify="space-between" align="flex-start">
        <div>
          <Text fw={850}>Dentición y recambio · pieza {chosenTooth}</Text>
          <Text size="xs" c="dimmed">
            La dentición y las marcas se representan en el odontograma común. Edita la pieza seleccionada.
          </Text>
        </div>
        <Group gap="xs">
          <Badge>{STAGE_LABELS[stage]}</Badge>
          {saved ? <Badge variant="light">Datos recuperados</Badge> : null}
        </Group>
      </Group>

      {!birthDate ? (
        <Alert color="yellow" mt="md" title="Falta fecha de nacimiento">
          Sin fecha de nacimiento Denty inicia en temporal. El profesional puede cambiar a mixta y
          definir cada pieza.
        </Alert>
      ) : null}

      <Group mt="md" align="flex-end">
        <SegmentedControl
          aria-label="Dentición pediátrica"
          value={stage}
          onChange={(value) => setStage(value as Extract<DentitionStage, "primary" | "mixed">)}
          data={[
            { label: "Temporal", value: "primary" },
            { label: "Mixta", value: "mixed" },
          ]}
          disabled={readOnly}
        />
        <Select
          label="Diente seleccionado"
          value={chosenTooth}
          onChange={(value) => { if (value) onSelectTooth(value); }}
          data={allTeeth}
          disabled={readOnly}
          searchable
        />
        <Select
          label="Hallazgo / estado"
          value={status}
          onChange={(value) => setStatus((value ?? "healthy") as PediatricToothStatus)}
          data={PEDIATRIC_TOOTH_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] }))}
          disabled={readOnly}
        />
        <Button size="xs" disabled={readOnly} onClick={() => commitStatus(chosenTooth, status)}>
          Aplicar al {chosenTooth}
        </Button>
      </Group>

      {stage === "mixed" ? (
        <Alert mt="md" color="blue" title="Dentición mixta dinámica">
          Cada sitio de recambio muestra el temporal y su sucesor permanente. Pueden coexistir,
          estar en erupción o marcarse como no presentes sin cambiar toda la arcada.
        </Alert>
      ) : null}

      <Group gap="xs" mt="sm">
        <Badge variant="light">
          {presentFor(chosenTooth) ? "Pieza presente" : "Pieza ausente / no erupcionada"}
        </Badge>
        <Button
          size="xs"
          variant="light"
          disabled={readOnly}
          onClick={() => togglePresence(chosenTooth)}
        >
          {presentFor(chosenTooth) ? "Marcar no presente" : "Marcar presente"}
        </Button>
      </Group>
      <Text size="xs" c="dimmed">
        El estado de la pieza se actualiza en el único odontograma, también en dentición mixta.
        Elige el diente en el gráfico o en el selector.
      </Text>
    </section>
  );
}
