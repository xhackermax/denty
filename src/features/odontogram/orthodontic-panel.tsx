"use client";
import { chartArches } from "@/domain/odontogram/mouth-state";

import { useMouthState } from "./mouth-state-context";
import {
  Badge,
  Button,
  Checkbox,
  Group,
  NumberInput,
  Select,
  SimpleGrid,
  Text,
  Textarea,
} from "@mantine/core";
import { useEffect, useMemo, useState } from "react";
import {
  createOrthodonticEntity,
  type DentalEntity,
  type OrthodonticAppliance,
  type OrthodonticClass,
} from "@/domain";
import styles from "./odontogram.module.css";
interface OrthodonticPanelProps {
  patientId: string;
  /** The chart's entities; the saved orthodontic record is read back from them. */
  entities?: readonly DentalEntity[];
  readOnly: boolean;
  onCommit: (entity: DentalEntity) => void;
}
const APPLIANCES: readonly {
  value: OrthodonticAppliance;
  label: string;
}[] = [
  { value: "brackets", label: "Brackets" },
  { value: "aligners", label: "Alineadores" },
  { value: "retainer", label: "Retenedor" },
  { value: "expander", label: "Disyuntor" },
  { value: "lingual_arch", label: "Arco lingual" },
  { value: "space_maintainer", label: "Mantenedor" },
];
type OrthoMark = "none" | "bracket" | "band" | "attachment" | "extract" | "space";
const ORTHO_MARKS: readonly OrthoMark[] = [
  "none",
  "bracket",
  "band",
  "attachment",
  "extract",
  "space",
];
const ORTHO_MARK_LABELS: Record<OrthoMark, string> = {
  none: "Sin marca",
  bracket: "Bracket",
  band: "Banda",
  attachment: "Atache",
  extract: "Extracción ortodóntica",
  space: "Espacio / ausencia",
};
function nextMark(mark: OrthoMark): OrthoMark {
  const index = ORTHO_MARKS.indexOf(mark);
  return ORTHO_MARKS[(index + 1) % ORTHO_MARKS.length] ?? "none";
}
interface OrthodonticDraft {
  molarClassRight: OrthodonticClass;
  molarClassLeft: OrthodonticClass;
  canineClassRight: OrthodonticClass;
  canineClassLeft: OrthodonticClass;
  overjetMm: number;
  overbitePct: number;
  midlineDeviationMm: number;
  upperCrowdingMm: number;
  lowerCrowdingMm: number;
  crossbite: boolean;
  openBite: boolean;
  deepBite: boolean;
  appliances: OrthodonticAppliance[];
  notes: string;
  toothMarks: Record<string, OrthoMark>;
}
const CLASSES = new Set<string>(["I", "II", "III"]);
const MARKS = new Set<string>(ORTHO_MARKS);

const orthoClass = (value: unknown): OrthodonticClass =>
  typeof value === "string" && CLASSES.has(value) ? (value as OrthodonticClass) : "I";
const orthoNumber = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

/** Reads the saved record back into the form; anything missing keeps the form's default. */
export function orthodonticDraftFromEntity(
  entity: DentalEntity | undefined,
): OrthodonticDraft | null {
  if (!entity) return null;
  const a = (entity.attributes ?? {}) as Record<string, unknown>;
  const marks = (a.toothMarks ?? {}) as Record<string, unknown>;
  return {
    molarClassRight: orthoClass(a.molarClassRight),
    molarClassLeft: orthoClass(a.molarClassLeft),
    canineClassRight: orthoClass(a.canineClassRight),
    canineClassLeft: orthoClass(a.canineClassLeft),
    overjetMm: orthoNumber(a.overjetMm, 4),
    overbitePct: orthoNumber(a.overbitePct, 40),
    midlineDeviationMm: orthoNumber(a.midlineDeviationMm, 0),
    upperCrowdingMm: orthoNumber(a.upperCrowdingMm, 0),
    lowerCrowdingMm: orthoNumber(a.lowerCrowdingMm, 0),
    crossbite: a.crossbite === true,
    openBite: a.openBite === true,
    deepBite: a.deepBite === true,
    appliances: Array.isArray(a.appliances)
      ? a.appliances.filter((value): value is OrthodonticAppliance =>
          APPLIANCES.some((option) => option.value === value),
        )
      : [],
    notes: typeof a.notes === "string" ? a.notes : "",
    toothMarks: Object.fromEntries(
      Object.entries(marks).filter((entry): entry is [string, OrthoMark] =>
        MARKS.has(String(entry[1])),
      ),
    ),
  };
}
function OrthoTooth({
  tooth,
  mark,
  disabled,
  onCycle,
}: {
  tooth: string;
  mark: OrthoMark;
  disabled: boolean;
  onCycle: () => void;
}) {
  return (
    <button
      type="button"
      className={styles.orthoTooth}
      data-mark={mark}
      disabled={disabled}
      onClick={onCycle}
      title={`${tooth} · ${ORTHO_MARK_LABELS[mark]}. Clic para cambiar.`}
    >
      <span>{tooth}</span>
      <svg viewBox="0 0 44 58" aria-hidden="true">
        <path d="M9 11 C12 4 32 4 35 11 L33 31 C31 38 13 38 11 31 Z" />
        <path d="M16 31 C16 42 17 50 22 54 C27 49 28 42 28 31" />
        {mark === "bracket" ? <rect x="17" y="15" width="10" height="8" rx="2" /> : null}
        {mark === "band" ? <path d="M10 19 H34" /> : null}
        {mark === "attachment" ? <circle cx="22" cy="19" r="4" /> : null}
        {mark === "extract" ? <path d="M8 8 L36 39 M36 8 L8 39" /> : null}
        {mark === "space" ? <path d="M8 22 H36" /> : null}
      </svg>
    </button>
  );
}
export function OrthodonticPanel({
  patientId,
  entities = [],
  readOnly,
  onCommit,
}: OrthodonticPanelProps) {
  const mouth = useMouthState();
  const arches = useMemo(() => chartArches(mouth), [mouth]);
  const [molarClassRight, setMolarClassRight] = useState<OrthodonticClass>("I");
  const [molarClassLeft, setMolarClassLeft] = useState<OrthodonticClass>("I");
  const [canineClassRight, setCanineClassRight] = useState<OrthodonticClass>("I");
  const [canineClassLeft, setCanineClassLeft] = useState<OrthodonticClass>("I");
  const [overjetMm, setOverjetMm] = useState<string | number>(4);
  const [overbitePct, setOverbitePct] = useState<string | number>(40);
  const [midlineDeviationMm, setMidlineDeviationMm] = useState<string | number>(0);
  const [upperCrowdingMm, setUpperCrowdingMm] = useState<string | number>(0);
  const [lowerCrowdingMm, setLowerCrowdingMm] = useState<string | number>(0);
  const [crossbite, setCrossbite] = useState(false);
  const [openBite, setOpenBite] = useState(false);
  const [deepBite, setDeepBite] = useState(false);
  const [notes, setNotes] = useState("");
  const [appliances, setAppliances] = useState<OrthodonticAppliance[]>(["aligners"]);
  const [toothMarks, setToothMarks] = useState<Record<string, OrthoMark>>({});
  const [saved, setSaved] = useState(false);
  const persisted = entities.find((entity) => entity.active && entity.entityType === "ORTHODONTIC");
  // Compared by content: the chart hands over new entity objects on every edit.
  const persistedKey = persisted ? JSON.stringify(persisted.attributes ?? {}) : "";
  // The saved record fills the form when it opens and after each save. Another device's save
  // remounts the whole editor, so this never lands on top of unsaved typing.
  useEffect(() => {
    const draft = orthodonticDraftFromEntity(persisted);
    if (!draft) {
      setToothMarks({});
      setNotes("");
      setSaved(false);
      return;
    }
    setMolarClassRight(draft.molarClassRight);
    setMolarClassLeft(draft.molarClassLeft);
    setCanineClassRight(draft.canineClassRight);
    setCanineClassLeft(draft.canineClassLeft);
    setOverjetMm(draft.overjetMm);
    setOverbitePct(draft.overbitePct);
    setMidlineDeviationMm(draft.midlineDeviationMm);
    setUpperCrowdingMm(draft.upperCrowdingMm);
    setLowerCrowdingMm(draft.lowerCrowdingMm);
    setCrossbite(draft.crossbite);
    setOpenBite(draft.openBite);
    setDeepBite(draft.deepBite);
    setAppliances([...draft.appliances]);
    setNotes(draft.notes);
    setToothMarks({ ...draft.toothMarks });
    setSaved(true);
  }, [patientId, persistedKey]);
  const markedCount = useMemo(
    () => Object.values(toothMarks).filter((mark) => mark && mark !== "none").length,
    [toothMarks],
  );
  const cycleTooth = (tooth: string) => {
    if (mouth.teeth[tooth]?.presence === "missing") return;
    if (readOnly) return;
    setSaved(false);
    setToothMarks((current) => ({
      ...current,
      [tooth]: nextMark(current[tooth] ?? "none"),
    }));
  };
  const save = () => {
    if (readOnly) return;
    const attributes = {
      molarClassRight,
      molarClassLeft,
      canineClassRight,
      canineClassLeft,
      overjetMm: Number(overjetMm),
      overbitePct: Number(overbitePct),
      midlineDeviationMm: Number(midlineDeviationMm),
      upperCrowdingMm: Number(upperCrowdingMm),
      lowerCrowdingMm: Number(lowerCrowdingMm),
      crossbite,
      openBite,
      deepBite,
      appliances,
      notes,
      toothMarks,
    } as const;
    onCommit(createOrthodonticEntity(patientId, attributes));
    setSaved(true);
  };
  const renderArch = (teeth: readonly string[]) => (
    <div className={styles.orthoArch}>
      {teeth.map((tooth) => (
        <OrthoTooth
          key={tooth}
          tooth={tooth}
          mark={toothMarks[tooth] ?? "none"}
          disabled={readOnly}
          onCycle={() => cycleTooth(tooth)}
        />
      ))}
    </div>
  );
  return (
    <section className={styles.clinicalPanel} aria-label="Odontograma ortodóntico">
      <Group justify="space-between" align="flex-start">
        <div>
          <Text fw={850}>Odontograma ortodóntico</Text>
          <Text size="xs" c="dimmed">
            Arcadas editables, oclusión, discrepancia, aparatos y marcas por diente.
          </Text>
        </div>
        <Group gap="xs">
          <Badge variant="light">{markedCount} dientes marcados</Badge>
          {saved ? <Badge>Guardado</Badge> : null}
        </Group>
      </Group>

      <div className={styles.orthoLegend}>
        {ORTHO_MARKS.slice(1).map((mark) => (
          <span key={mark}>
            <i data-mark={mark} />
            {ORTHO_MARK_LABELS[mark]}
          </span>
        ))}
      </div>

      <Text fw={800} size="sm" mt="md">
        Maxilar
      </Text>
      <Text size="sm">
        Ausencias / agenesias:{" "}
        {Object.entries(mouth.teeth)
          .filter(([tooth, data]) => Number(tooth[0]) < 5 && data.presence === "missing")
          .map(([tooth]) => tooth)
          .join(", ") || "Ninguna"}
      </Text>
      {renderArch(arches.upper)}
      <div className={styles.orthoOcclusalLine}>Plano oclusal</div>
      {renderArch(arches.lower)}
      <Text fw={800} size="sm">
        Mandíbula
      </Text>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mt="lg">
        <Select
          label="Clase molar derecha"
          data={["I", "II", "III"]}
          value={molarClassRight}
          onChange={(value) => setMolarClassRight((value ?? "I") as OrthodonticClass)}
          disabled={readOnly}
        />
        <Select
          label="Clase molar izquierda"
          data={["I", "II", "III"]}
          value={molarClassLeft}
          onChange={(value) => setMolarClassLeft((value ?? "I") as OrthodonticClass)}
          disabled={readOnly}
        />
        <Select
          label="Clase canina derecha"
          data={["I", "II", "III"]}
          value={canineClassRight}
          onChange={(value) => setCanineClassRight((value ?? "I") as OrthodonticClass)}
          disabled={readOnly}
        />
        <Select
          label="Clase canina izquierda"
          data={["I", "II", "III"]}
          value={canineClassLeft}
          onChange={(value) => setCanineClassLeft((value ?? "I") as OrthodonticClass)}
          disabled={readOnly}
        />
        <NumberInput
          label="Overjet"
          suffix=" mm"
          value={overjetMm}
          onChange={setOverjetMm}
          disabled={readOnly}
        />
        <NumberInput
          label="Overbite"
          suffix=" %"
          value={overbitePct}
          onChange={setOverbitePct}
          disabled={readOnly}
        />
        <NumberInput
          label="Desviación línea media"
          suffix=" mm"
          value={midlineDeviationMm}
          onChange={setMidlineDeviationMm}
          disabled={readOnly}
        />
        <NumberInput
          label="Apiñamiento superior"
          suffix=" mm"
          value={upperCrowdingMm}
          onChange={setUpperCrowdingMm}
          disabled={readOnly}
        />
        <NumberInput
          label="Apiñamiento inferior"
          suffix=" mm"
          value={lowerCrowdingMm}
          onChange={setLowerCrowdingMm}
          disabled={readOnly}
        />
      </SimpleGrid>

      <Group mt="md">
        <Checkbox
          label="Mordida cruzada"
          checked={crossbite}
          disabled={readOnly}
          onChange={(event) => setCrossbite(event.currentTarget.checked)}
        />
        <Checkbox
          label="Mordida abierta"
          checked={openBite}
          disabled={readOnly}
          onChange={(event) => setOpenBite(event.currentTarget.checked)}
        />
        <Checkbox
          label="Sobremordida profunda"
          checked={deepBite}
          disabled={readOnly}
          onChange={(event) => setDeepBite(event.currentTarget.checked)}
        />
      </Group>

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

      <Textarea
        mt="md"
        label="Notas ortodónticas"
        minRows={2}
        value={notes}
        disabled={readOnly}
        onChange={(event) => setNotes(event.currentTarget.value)}
      />

      <Group justify="flex-end" mt="md">
        <Button size="xs" disabled={readOnly} onClick={save}>
          Guardar odontograma ortodóntico
        </Button>
      </Group>
    </section>
  );
}
