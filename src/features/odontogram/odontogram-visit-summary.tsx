"use client";

import { Alert, Badge, Button, Group, Text, Textarea } from "@mantine/core";
import { useEffect, useMemo, useState } from "react";

import type { DentalEntity } from "@/domain";
import { TOOTH_STATE_LABELS } from "@/shared/odontogram/tooth-state-labels";
import parityStyles from "@/shared/ui/parity.module.css";

interface OdontogramVisitSummaryPanelProps {
  entities: readonly DentalEntity[];
  readOnly: boolean;
  suggestedNextVisit?: string | undefined;
  saving?: boolean | undefined;
  saveError?: boolean | undefined;
  onSaveEncounter?:
    | ((input: {
        narrativeNote: string;
        nextVisit?: string | undefined;
        sign: boolean;
      }) => Promise<unknown>)
    | undefined;
}

interface VisitSummaryDraft {
  text: string;
  findingCount: number;
}

function textList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function labelForEntity(entity: DentalEntity): string {
  const statusLabel = TOOTH_STATE_LABELS[entity.status as keyof typeof TOOTH_STATE_LABELS];
  if (statusLabel) return statusLabel;
  if (entity.entityType === "PONTIC") return "Póntico";
  if (entity.entityType === "BRIDGE") return "Puente";
  return entity.entityType.replaceAll("_", " ").toLowerCase();
}

function locationForEntity(entity: DentalEntity): string {
  if (entity.tooth) return `Diente ${entity.tooth}`;
  if (entity.arch === "upper") return "Maxilar";
  if (entity.arch === "lower") return "Mandíbula";
  return "Zona general";
}

function surfacesForEntity(entity: DentalEntity): string {
  return entity.surfaces?.length ? ` (${entity.surfaces.join(", ")})` : "";
}

function summarizeEntity(entity: DentalEntity): string {
  if (entity.entityType === "BRIDGE") {
    const pillars = textList(entity.attributes?.pillars);
    const pontics = textList(entity.attributes?.pontics);
    const teeth = textList(entity.attributes?.teeth);
    const range =
      pillars.length >= 2 ? `${pillars[0]}-${pillars[pillars.length - 1]}` : teeth.join("-");
    const parts = [
      range ? `Puente ${range}` : "Puente",
      pillars.length ? `pilares ${pillars.join(", ")}` : "",
      pontics.length ? `pónticos ${pontics.join(", ")}` : "",
    ].filter(Boolean);
    return `${parts.join(": ")}.`;
  }
  return `${locationForEntity(entity)}: ${labelForEntity(entity)}${surfacesForEntity(entity)}.`;
}

export function buildOdontogramVisitSummary(entities: readonly DentalEntity[]): VisitSummaryDraft {
  const active = entities.filter((entity) => entity.active);
  const parentIds = new Set(active.map((entity) => entity.id));
  const lines = active
    .filter((entity) => !(entity.parentId && parentIds.has(entity.parentId)))
    .sort((left, right) => {
      const leftLocation = left.tooth ?? left.arch ?? "";
      const rightLocation = right.tooth ?? right.arch ?? "";
      return leftLocation.localeCompare(rightLocation, "es", { numeric: true });
    })
    .map(summarizeEntity);

  return {
    text: lines.length ? lines.join("\n") : "Sin hallazgos registrados hoy en el odontograma.",
    findingCount: lines.length,
  };
}

export function OdontogramVisitSummaryPanel({
  entities,
  readOnly,
  suggestedNextVisit,
  saving = false,
  saveError = false,
  onSaveEncounter,
}: OdontogramVisitSummaryPanelProps) {
  const draft = useMemo(() => buildOdontogramVisitSummary(entities), [entities]);
  const [summary, setSummary] = useState(draft.text);
  const [nextVisit, setNextVisit] = useState("");
  const [edited, setEdited] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (suggestedNextVisit === undefined) return;
    setNextVisit(suggestedNextVisit);
    setSaved(false);
  }, [suggestedNextVisit]);

  useEffect(() => {
    if (!edited) setSummary(draft.text);
  }, [draft.text, edited]);

  return (
    <details className={parityStyles.disclosure} open>
      <summary>
        <span>
          <strong>Visita de hoy</strong>
          <small>Resumen editable generado desde el odontograma</small>
        </span>
        <Badge variant="light">
          {draft.findingCount === 1 ? "1 hallazgo" : `${draft.findingCount} hallazgos`}
        </Badge>
      </summary>
      <div className={parityStyles.disclosureBody}>
        <section className={parityStyles.section}>
          <Group justify="space-between" align="flex-start" mb="sm">
            <div>
              <Text fw={820}>Resumen clínico</Text>
              <Text size="xs" c="dimmed">
                Puedes corregir el texto antes de pasarlo a historia clínica.
              </Text>
            </div>
            <Button
              size="xs"
              variant="light"
              disabled={readOnly}
              onClick={() => {
                setSummary(draft.text);
                setEdited(false);
                setSaved(false);
              }}
            >
              Regenerar desde odontograma
            </Button>
          </Group>
          <Textarea
            autosize
            minRows={4}
            label="Resumen editable de hoy"
            value={summary}
            readOnly={readOnly}
            onChange={(event) => {
              setSummary(event.currentTarget.value);
              setEdited(true);
              setSaved(false);
            }}
          />
          <Textarea
            autosize
            minRows={2}
            mt="md"
            label="Previsto para la próxima visita"
            placeholder="Ej. anestesia 36, retirar caries distal y reconstrucción"
            value={nextVisit}
            readOnly={readOnly}
            onChange={(event) => {
              setNextVisit(event.currentTarget.value);
              setSaved(false);
            }}
          />
          {saveError ? (
            <Alert mt="md" color="red">
              No se pudo guardar la nota en historia clínica.
            </Alert>
          ) : null}
          {saved ? (
            <Alert mt="md" color="green">
              Nota guardada en historia clínica.
            </Alert>
          ) : null}
          <Group justify="flex-end" mt="md">
            <Button
              size="xs"
              loading={saving}
              disabled={readOnly || !onSaveEncounter || !summary.trim()}
              onClick={async () => {
                if (!onSaveEncounter || !summary.trim()) return;
                await onSaveEncounter({
                  narrativeNote: summary.trim(),
                  ...(nextVisit.trim() ? { nextVisit: nextVisit.trim() } : {}),
                  sign: true,
                });
                setSaved(true);
              }}
            >
              Guardar en historia clínica
            </Button>
          </Group>
        </section>
      </div>
    </details>
  );
}
