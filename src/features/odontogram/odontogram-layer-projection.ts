import {
  PERIODONTAL_SITES,
  archApplianceOf,
  type ArchAppliance,
  type OdontogramEntityState,
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

type OrthodonticToothMark = "bracket" | "band" | "attachment" | "extract" | "space";

function isOrthodonticToothMark(value: string): value is OrthodonticToothMark {
  return ["bracket", "band", "attachment", "extract", "space"].includes(value);
}

export function orthodonticMarkForTooth(
  state: OdontogramEntityState,
  tooth: string,
  viewState: OdontogramViewState,
): OrthodonticToothMark | null {
  if (!viewState.visibleLayerIds.includes("ortho")) return null;
  const entity = Object.values(state.entitiesById).find(
    (candidate) =>
      candidate.active &&
      candidate.entityType === "ORTHODONTIC" &&
      !candidate.attributes?.appliance,
  );
  const marks = entity?.attributes?.toothMarks;
  if (!marks || typeof marks !== "object" || Array.isArray(marks)) return null;
  const mark = Reflect.get(marks, tooth);
  if (typeof mark !== "string" || !isOrthodonticToothMark(mark)) return null;
  const subfilter = mark === "space" ? "espacios" : mark === "extract" ? "posicion" : "aparatos";
  return viewState.subfiltersByLayer.ortho.includes(subfilter) ? mark : null;
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
