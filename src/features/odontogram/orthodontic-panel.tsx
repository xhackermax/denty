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
import type { OrthodonticVisualDraft } from "./odontogram-layer-projection";
interface OrthodonticPanelProps {
  patientId: string;
  selectedTooth: string;
  onSelectTooth: (tooth: string) => void;
  /** The chart's entities; the saved orthodontic record is read back from them. */
  entities?: readonly DentalEntity[];
  readOnly: boolean;
  onCommit: (entity: DentalEntity) => void;
  onPreview?: (draft: OrthodonticVisualDraft | null) => void;
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
  { value: "miniscrews", label: "Microtornillos" },
  { value: "distalizer", label: "Distalizador" },
  { value: "facial_mask", label: "Máscara facial" },
  { value: "habit_corrector", label: "Aparatología para corrección de hábitos" },
];
type OrthoMark = "none" | "bracket" | "band" | "attachment" | "extract" | "space" | "miniscrew" | "maintainer";
const ORTHO_MARKS: readonly OrthoMark[] = [
  "none",
  "bracket",
  "band",
  "attachment",
  "extract",
  "space",
  "miniscrew",
  "maintainer",
];
const ORTHO_MARK_LABELS: Record<OrthoMark, string> = {
  none: "Sin marca",
  bracket: "Bracket",
  band: "Banda",
  attachment: "Atache",
  extract: "Extracción ortodóntica",
  space: "Espacio / ausencia",
  miniscrew: "Microtornillo ortodóntico",
  maintainer: "Mantenedor de espacio",
};
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
  facialProfile: "convexo" | "recto" | "concavo" | null;
  facialBiotype: "mesofacial" | "dolicofacial" | "braquifacial" | null;
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
    facialProfile: ["convexo", "recto", "concavo"].includes(String(a.facialProfile)) ? a.facialProfile as OrthodonticDraft["facialProfile"] : null,
    facialBiotype: ["mesofacial", "dolicofacial", "braquifacial"].includes(String(a.facialBiotype)) ? a.facialBiotype as OrthodonticDraft["facialBiotype"] : null,
    toothMarks: Object.fromEntries(
      Object.entries(marks).filter((entry): entry is [string, OrthoMark] =>
        MARKS.has(String(entry[1])),
      ),
    ),
  };
}
export function OrthodonticPanel({
  patientId,
  selectedTooth,
  onSelectTooth,
  entities = [],
  readOnly,
  onCommit,
  onPreview,
}: OrthodonticPanelProps) {
  const mouth = useMouthState();
  const arches = useMemo(() => chartArches(mouth), [mouth]);
  const availableTeeth = useMemo(() => [...arches.upper, ...arches.lower], [arches]);
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
  const [facialProfile, setFacialProfile] = useState<OrthodonticDraft["facialProfile"]>(null);
  const [facialBiotype, setFacialBiotype] = useState<OrthodonticDraft["facialBiotype"]>(null);
  const [appliances, setAppliances] = useState<OrthodonticAppliance[]>([]);
  const [toothMarks, setToothMarks] = useState<Record<string, OrthoMark>>({});
  const [saved, setSaved] = useState(false);
  const persisted = entities.find(
    (entity) =>
      entity.active && entity.entityType === "ORTHODONTIC" && entity.status !== "cephalometry" && !entity.attributes?.appliance,
  );
  // Compared by content: the chart hands over new entity objects on every edit.
  const persistedKey = persisted ? JSON.stringify(persisted.attributes ?? {}) : "";
  // The saved record fills the form when it opens and after each save. Another device's save
  // remounts the whole editor, so this never lands on top of unsaved typing.
  useEffect(() => {
    const draft = orthodonticDraftFromEntity(persisted);
    if (!draft) {
      setAppliances([]);
      setToothMarks({});
      setNotes("");
      setFacialProfile(null);
      setFacialBiotype(null);
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
    setFacialProfile(draft.facialProfile);
    setFacialBiotype(draft.facialBiotype);
    setToothMarks({ ...draft.toothMarks });
    setSaved(true);
  }, [patientId, persistedKey]);
  const markedCount = useMemo(
    () => Object.values(toothMarks).filter((mark) => mark && mark !== "none").length,
    [toothMarks],
  );
  const updateMark = (mark: OrthoMark) => {
    if (readOnly || mouth.teeth[selectedTooth]?.presence === "missing") return;
    setSaved(false);
    const next = { ...toothMarks, [selectedTooth]: mark };
    setToothMarks(next);
    onPreview?.({ appliances, toothMarks: next });
  };
  const updateAppliance = (value: OrthodonticAppliance, checked: boolean) => {
    if (readOnly) return;
    const nextAppliances = checked
      ? [...new Set([...appliances, value])]
      : appliances.filter((item) => item !== value);
    let nextMarks = toothMarks;
    // Site-dependent devices are placed on the currently selected tooth, not on every tooth.
    const siteMark = value === "miniscrews" ? "miniscrew"
      : value === "space_maintainer" ? "maintainer" : null;
    if (siteMark) {
      if (checked && mouth.teeth[selectedTooth]?.presence !== "missing") {
        nextMarks = { ...toothMarks, [selectedTooth]: siteMark };
      } else if (!checked) {
        nextMarks = Object.fromEntries(
          Object.entries(toothMarks).filter(([, mark]) => mark !== siteMark),
        );
      }
    }
    setSaved(false);
    setAppliances(nextAppliances);
    setToothMarks(nextMarks);
    onPreview?.({ appliances: nextAppliances, toothMarks: nextMarks });
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
      facialProfile: facialProfile ?? undefined,
      facialBiotype: facialBiotype ?? undefined,
      notes,
      toothMarks,
    } as const;
    onCommit(createOrthodonticEntity(patientId, attributes));
    setSaved(true);
  };
  return (
    <section className={styles.clinicalPanel} aria-label="Herramientas de ortodoncia">
      <Group justify="space-between" align="flex-start">
        <div>
          <Text fw={850}>Ortodoncia · pieza {selectedTooth}</Text>
          <Text size="xs" c="dimmed">
            Las marcas se superponen en el odontograma único. Selecciona una pieza en él o con el selector.
          </Text>
        </div>
        <Group gap="xs">
          <Badge variant="light">{markedCount} dientes marcados</Badge>
          {saved ? <Badge>Guardado</Badge> : null}
        </Group>
      </Group>

      <Group align="end" gap="sm">
        <Select
          label="Pieza seleccionada"
          searchable
          data={availableTeeth}
          value={selectedTooth}
          onChange={(value) => { if (value) onSelectTooth(value); }}
          aria-label="Seleccionar pieza para ortodoncia"
        />
        <Select
          label="Marca de la pieza"
          data={ORTHO_MARKS.map((value) => ({ value, label: ORTHO_MARK_LABELS[value] }))}
          value={toothMarks[selectedTooth] ?? "none"}
          disabled={readOnly || mouth.teeth[selectedTooth]?.presence === "missing"}
          onChange={(value) => updateMark((value ?? "none") as OrthoMark)}
          aria-label="Marca ortodóntica del diente seleccionado"
        />
      </Group>
      <Text size="xs" c="dimmed">
        Los símbolos se previsualizan sobre el diente inmediatamente. Guarda ortodoncia para
        registrarlos. Los microtornillos y mantenedores se asignan a la pieza seleccionada
        como referencia, no a toda la arcada.
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

      <SimpleGrid cols={{ base: 1, sm: 2 }} mt="md">
        <Select label="Perfil facial" placeholder="Seleccionar" clearable value={facialProfile} onChange={(v) => setFacialProfile(v as OrthodonticDraft["facialProfile"])} data={[{ value: "convexo", label: "Convexo" }, { value: "recto", label: "Recto" }, { value: "concavo", label: "Cóncavo" }]} disabled={readOnly}/>
        <Select label="Biotipo facial" placeholder="Seleccionar" clearable value={facialBiotype} onChange={(v) => setFacialBiotype(v as OrthodonticDraft["facialBiotype"])} data={[{ value: "mesofacial", label: "Mesofacial" }, { value: "dolicofacial", label: "Dolicofacial" }, { value: "braquifacial", label: "Braquifacial" }]} disabled={readOnly}/>
      </SimpleGrid>

      <Group mt="md">
        {APPLIANCES.map((appliance) => (
          <Checkbox
            key={appliance.value}
            label={appliance.label}
            checked={appliances.includes(appliance.value)}
            disabled={readOnly || (
              (appliance.value === "miniscrews" || appliance.value === "space_maintainer") &&
              mouth.teeth[selectedTooth]?.presence === "missing"
            )}
            onChange={(event) => updateAppliance(appliance.value, event.currentTarget.checked)}
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
          Guardar ortodoncia
        </Button>
      </Group>
    </section>
  );
}
