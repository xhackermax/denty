import {
  PERIODONTAL_SITES,
  archApplianceOf,
  archForTooth,
  type ArchAppliance,
  type OdontogramEntityState,
  type OrthodonticAppliance,
  type PeriodontalReading,
  type PediatricToothStatus,
} from "@/domain";
import { isToothStatusVisible, type OdontogramViewState } from "./odontogram-view-state";

/** Appliances (dentures, splints, braces) that cover a tooth, whatever their arch-level entity. */
export function appliancesForTooth(state: OdontogramEntityState, tooth: string): ArchAppliance[] {
  const found = new Set<ArchAppliance>();
  for (const entity of Object.values(state.entitiesById)) {
    if (!entity.active) continue;
    const appliance = archApplianceOf(entity);
    const teeth = entity.attributes?.teeth;
    if (appliance && Array.isArray(teeth) && teeth.includes(tooth)) found.add(appliance);
  }
  return [...found];
}

/** Every whole-tooth entity family present, so a stack (endo+post+crown) draws all its parts. */
export function wholeToothParts(state: OdontogramEntityState, tooth: string): Set<string> {
  const parts = new Set<string>();
  for (const entity of Object.values(state.entitiesById)) {
    if (!entity.active || entity.tooth !== tooth || entity.surfaces?.length) continue;
    if (entity.entityType === "ENDO" && entity.status === "diagnosis") continue;
    parts.add(entity.entityType);
  }
  return parts;
}

const REPLACEMENT_STATUS_LABELS: Partial<Record<PediatricToothStatus, string>> = {
  unerupted: "No erupcionado",
  retained: "Temporal retenido",
  impacted: "Incluido/impactado",
  congenitally_missing: "Agenesia",
  exfoliated: "Exfoliado",
  erupting: "En erupción",
  space_maintainer: "Mantenedor",
};

export type OrthodonticToothMark =
  | "bracket"
  | "band"
  | "attachment"
  | "extract"
  | "space"
  | "miniscrew"
  | "maintainer";
export type OrthodonticVisualSymbol =
  | OrthodonticToothMark
  | "aligner"
  | "retainer"
  | "expander"
  | "lingual_arch";
export interface OrthodonticVisualDraft {
  appliances: readonly OrthodonticAppliance[];
  toothMarks: Readonly<Record<string, string>>;
}

const ORTHODONTIC_MARKS: readonly OrthodonticToothMark[] = [
  "bracket", "band", "attachment", "extract", "space", "miniscrew", "maintainer",
];

function isOrthodonticToothMark(value: string): value is OrthodonticToothMark {
  return ORTHODONTIC_MARKS.some((mark) => mark === value);
}

function orthoRecord(state: OdontogramEntityState) {
  return Object.values(state.entitiesById).find(
    (candidate) =>
      candidate.active &&
      candidate.entityType === "ORTHODONTIC" &&
      !candidate.attributes?.appliance,
  );
}

function toothMark(marks: unknown, tooth: string): OrthodonticToothMark | null {
  if (!marks || typeof marks !== "object" || Array.isArray(marks)) return null;
  const mark = Reflect.get(marks, tooth);
  return typeof mark === "string" && isOrthodonticToothMark(mark) ? mark : null;
}

function orthoSubfilterForMark(mark: OrthodonticToothMark): string {
  return mark === "space" ? "espacios" : mark === "extract" ? "posicion" : "aparatos";
}

export function orthodonticMarkForTooth(
  state: OdontogramEntityState,
  tooth: string,
  viewState: OdontogramViewState,
  preview?: OrthodonticVisualDraft | null,
): OrthodonticToothMark | null {
  if (!viewState.visibleLayerIds.includes("ortho")) return null;
  const mark = toothMark(preview?.toothMarks ?? orthoRecord(state)?.attributes?.toothMarks, tooth);
  if (!mark) return null;
  return viewState.subfiltersByLayer.ortho.includes(orthoSubfilterForMark(mark)) ? mark : null;
}

/** All visible orthodontic SVG symbols, from saved entities or the editor's live draft. */
export function orthodonticSymbolsForTooth(
  state: OdontogramEntityState,
  tooth: string,
  viewState: OdontogramViewState,
  preview?: OrthodonticVisualDraft | null,
): OrthodonticVisualSymbol[] {
  if (!viewState.visibleLayerIds.includes("ortho")) return [];
  const symbols = new Set<OrthodonticVisualSymbol>();
  const record = orthoRecord(state);
  const appliances = preview?.appliances ?? record?.attributes?.appliances;
  const shown = viewState.subfiltersByLayer.ortho.includes("aparatos");
  if (shown && Array.isArray(appliances)) {
    const selected = new Set(appliances.filter((name): name is OrthodonticAppliance =>
      typeof name === "string",
    ));
    if (selected.has("brackets")) symbols.add("bracket");
    if (selected.has("aligners")) symbols.add("aligner");
    if (selected.has("retainer")) symbols.add("retainer");
    if (selected.has("expander") && archForTooth(tooth) === "upper") symbols.add("expander");
    if (selected.has("lingual_arch") && archForTooth(tooth) === "lower") symbols.add("lingual_arch");
    // Miniscrews and space maintainers are site-specific: only explicit tooth marks draw them.
  }
  const mark = orthodonticMarkForTooth(state, tooth, viewState, preview);
  if (mark) symbols.add(mark);
  return [...symbols];
}

export function pediatricReplacementForTooth(
  state: OdontogramEntityState,
  tooth: string,
  viewState: OdontogramViewState,
): { status: PediatricToothStatus; label: string } | null {
  const entity = Object.values(state.entitiesById).find(
    (candidate) =>
      candidate.active &&
      candidate.entityType === "PEDIATRIC" &&
      candidate.tooth === tooth &&
      candidate.status !== "healthy",
  );
  if (!entity || !isToothStatusVisible(entity.status, viewState)) return null;
  const label = REPLACEMENT_STATUS_LABELS[entity.status as PediatricToothStatus];
  if (!label) return null;
  return { status: entity.status as PediatricToothStatus, label };
}

export function periodontalMarksForTooth(
  readings: readonly PeriodontalReading[],
  tooth: string,
  viewState: OdontogramViewState,
): string[] {
  if (!viewState.visibleLayerIds.includes("perio")) return [];
  const toothReadings = readings.filter((reading) => reading.tooth === tooth);
  if (toothReadings.length === 0) return [];
  const filters = viewState.subfiltersByLayer.perio;
  const marks: string[] = [];
  if (filters.includes("sondaje")) {
    marks.push(
      `PD ${PERIODONTAL_SITES.map(
        (site) => toothReadings.find((reading) => reading.site === site)?.probingDepth ?? "—",
      ).join("·")}`,
    );
  }
  if (filters.includes("recesion")) {
    marks.push(
      `GM ${PERIODONTAL_SITES.map(
        (site) => toothReadings.find((reading) => reading.site === site)?.recession ?? "—",
      ).join("·")}`,
    );
  }
  if (filters.includes("sangrado") && toothReadings.some((reading) => reading.bleeding))
    marks.push("Sangrado");
  if (filters.includes("supuracion") && toothReadings.some((reading) => reading.suppuration))
    marks.push("Supuración");
  if (filters.includes("placa") && toothReadings.some((reading) => reading.plaque))
    marks.push("Placa");
  if (filters.includes("movilidad")) {
    const mobility = [
      ...new Set(
        toothReadings.flatMap((reading) => (reading.mobility == null ? [] : [reading.mobility])),
      ),
    ];
    if (mobility.length) marks.push(`Movilidad ${mobility.join("/")}`);
  }
  if (filters.includes("furcas")) {
    const furcations = [
      ...new Set(
        toothReadings.flatMap((reading) => (reading.furcation == null ? [] : [reading.furcation])),
      ),
    ];
    if (furcations.length) marks.push(`Furca ${furcations.join("/")}`);
  }
  return marks;
}
