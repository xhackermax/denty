import { todayMadrid, type DateInput } from "../dates.ts";

export const PERMANENT_UPPER = [
  "18",
  "17",
  "16",
  "15",
  "14",
  "13",
  "12",
  "11",
  "21",
  "22",
  "23",
  "24",
  "25",
  "26",
  "27",
  "28",
] as const;
export const PERMANENT_LOWER = [
  "48",
  "47",
  "46",
  "45",
  "44",
  "43",
  "42",
  "41",
  "31",
  "32",
  "33",
  "34",
  "35",
  "36",
  "37",
  "38",
] as const;
export const TEMPORARY_UPPER = [
  "55",
  "54",
  "53",
  "52",
  "51",
  "61",
  "62",
  "63",
  "64",
  "65",
] as const;
export const TEMPORARY_LOWER = [
  "85",
  "84",
  "83",
  "82",
  "81",
  "71",
  "72",
  "73",
  "74",
  "75",
] as const;

export const TOOTH_STATES = [
  "healthy",
  "filling",
  "filling_bad",
  "filling_pending",
  "crown",
  "crown_bad",
  "crown_pending",
  "endo",
  "endo_bad",
  "endo_indicated",
  "post",
  "post_bad",
  "post_pending",
  "implant",
  "implant_review",
  "implant_indicated",
  "prosthesis",
  "prosthesis_bad",
  "prosthesis_pending",
  "removable",
  "removable_bad",
  "removable_pending",
  "caries",
  "extraction",
  "missing",
] as const;

export type ToothState = (typeof TOOTH_STATES)[number];
export type ToothArch = "upper" | "lower";
export type ToothType = "incisor" | "canine" | "premolar" | "molar";
export type ToothSurface = "V" | "M" | "O" | "I" | "D" | "P" | "L";
export type TreatmentStateKind = "completed" | "unsatisfactory" | "planned";
export type TriStateFamily = "filling" | "crown" | "endo" | "post" | "implant";
export type DentitionStage = "primary" | "mixed" | "permanent";

export const PEDIATRIC_TOOTH_STATUSES = [
  "healthy",
  "early_caries",
  "sealant",
  "pulpotomy",
  "pulpectomy",
  "pediatric_crown",
  "exfoliated",
  "erupting",
  "space_maintainer",
] as const;

export type PediatricToothStatus = (typeof PEDIATRIC_TOOTH_STATUSES)[number];
export type OrthodonticClass = "I" | "II" | "III";
export type OrthodonticAppliance =
  "brackets" | "aligners" | "retainer" | "expander" | "lingual_arch" | "space_maintainer";

export interface OrthodonticAttributes {
  molarClassRight?: OrthodonticClass;
  molarClassLeft?: OrthodonticClass;
  canineClassRight?: OrthodonticClass;
  canineClassLeft?: OrthodonticClass;
  overjetMm?: number;
  overbitePct?: number;
  crossbite?: boolean;
  openBite?: boolean;
  deepBite?: boolean;
  midlineDeviationMm?: number;
  upperCrowdingMm?: number;
  lowerCrowdingMm?: number;
  upperSpacingMm?: number;
  lowerSpacingMm?: number;
  appliances?: readonly OrthodonticAppliance[];
  notes?: string;
}

export type DentalEntityType =
  | "TOOTH_STATE"
  | "HEALTHY"
  | "CARIES"
  | "MISSING"
  | "EXTRACTION"
  | "RESTORATION"
  | "ENDO"
  | "POST"
  | "CROWN"
  | "IMPLANT"
  | "ABUTMENT"
  | "BRIDGE"
  | "PONTIC"
  | "REMOVABLE"
  | "ORTHODONTIC"
  | "PEDIATRIC"
  | "PROSTHESIS";

export interface DentalEntity {
  id: string;
  tooth?: string;
  arch?: ToothArch;
  entityType: DentalEntityType;
  status: string;
  surfaces?: ToothSurface[];
  parentId?: string;
  attributes?: Readonly<Record<string, unknown>>;
  active: boolean;
}

const TRI_STATE_STATUS: Record<TriStateFamily, Record<TreatmentStateKind, ToothState>> = {
  filling: { completed: "filling", unsatisfactory: "filling_bad", planned: "filling_pending" },
  crown: { completed: "crown", unsatisfactory: "crown_bad", planned: "crown_pending" },
  endo: { completed: "endo", unsatisfactory: "endo_bad", planned: "endo_indicated" },
  post: { completed: "post", unsatisfactory: "post_bad", planned: "post_pending" },
  implant: { completed: "implant", unsatisfactory: "implant_review", planned: "implant_indicated" },
};

function parseTooth(tooth: string): { quadrant: number; position: number } {
  if (!/^\d{2}$/.test(tooth)) throw new RangeError(`FDI no válido: ${tooth}`);
  const quadrant = Number(tooth[0]);
  const position = Number(tooth[1]);
  const permanent = quadrant >= 1 && quadrant <= 4 && position >= 1 && position <= 8;
  const temporary = quadrant >= 5 && quadrant <= 8 && position >= 1 && position <= 5;
  if (!permanent && !temporary) throw new RangeError(`FDI no válido: ${tooth}`);
  return { quadrant, position };
}

export function archForTooth(tooth: string): ToothArch {
  const { quadrant } = parseTooth(tooth);
  return [1, 2, 5, 6].includes(quadrant) ? "upper" : "lower";
}

export function toothType(tooth: string): ToothType {
  const { quadrant, position } = parseTooth(tooth);
  if (position <= 2) return "incisor";
  if (position === 3) return "canine";
  if (quadrant >= 5) return "molar";
  return position <= 5 ? "premolar" : "molar";
}

export function occlusalSurfaceForTooth(tooth: string): "O" | "I" {
  const type = toothType(tooth);
  return type === "incisor" || type === "canine" ? "I" : "O";
}

export function dentitionStageForBirthDate(
  birthDate: string | undefined,
  today: DateInput = Date.now(),
): DentitionStage {
  if (!birthDate) return "permanent";
  const birthMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(birthDate);
  if (!birthMatch) return "permanent";
  const todayMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(todayMadrid(today));
  if (!todayMatch) return "permanent";
  const [, birthYear, birthMonth, birthDay] = birthMatch;
  const [, currentYear, currentMonth, currentDay] = todayMatch;
  let age = Number(currentYear) - Number(birthYear);
  const birthdayHasPassed =
    Number(currentMonth) > Number(birthMonth) ||
    (Number(currentMonth) === Number(birthMonth) && Number(currentDay) >= Number(birthDay));
  if (!birthdayHasPassed) age -= 1;
  if (age <= 5) return "primary";
  if (age <= 12) return "mixed";
  return "permanent";
}

export function teethForDentition(stage: DentitionStage): {
  upper: readonly string[];
  lower: readonly string[];
} {
  if (stage === "primary") return { upper: TEMPORARY_UPPER, lower: TEMPORARY_LOWER };
  if (stage === "mixed") {
    // Typical mixed dentition view: erupted permanent incisors/first molars plus
    // retained primary canines and molars. The clinical editor can still record
    // eruption/exfoliation status tooth by tooth.
    return {
      upper: ["16", "55", "54", "53", "12", "11", "21", "22", "63", "64", "65", "26"],
      lower: ["46", "85", "84", "83", "42", "41", "31", "32", "73", "74", "75", "36"],
    };
  }
  return { upper: PERMANENT_UPPER, lower: PERMANENT_LOWER };
}

export function normalizeSurfaceForTooth(tooth: string, surface: string): ToothSurface {
  const normalized = surface.trim().toUpperCase();
  if (normalized === "O" || normalized === "I" || normalized === "O/I") {
    return occlusalSurfaceForTooth(tooth);
  }
  if (normalized === "P/L") return archForTooth(tooth) === "upper" ? "P" : "L";
  if (["V", "M", "D", "P", "L"].includes(normalized)) {
    return normalized as ToothSurface;
  }
  throw new RangeError(`Superficie no válida: ${surface}`);
}

export function treatmentStateKind(state: ToothState): TreatmentStateKind | null {
  if (/_bad$/.test(state) || state === "implant_review") return "unsatisfactory";
  if (/_pending$/.test(state) || /_indicated$/.test(state)) return "planned";
  if (["filling", "crown", "endo", "post", "implant"].includes(state)) return "completed";
  return null;
}

export function nextTriStateKind(current: TreatmentStateKind): TreatmentStateKind {
  if (current === "completed") return "unsatisfactory";
  if (current === "unsatisfactory") return "planned";
  return "completed";
}

export function cycleClinicalState(family: TriStateFamily, current: ToothState): ToothState {
  const kind = treatmentStateKind(current);
  if (!kind) throw new RangeError(`${current} no pertenece a un tratamiento triestado`);
  return TRI_STATE_STATUS[family][nextTriStateKind(kind)];
}

export function bridgeTeethFromEndpoints(from: string, to: string): string[] {
  const arch = archForTooth(from);
  if (archForTooth(to) !== arch) {
    throw new RangeError("Los extremos del puente deben estar en la misma arcada");
  }
  const order: string[] = arch === "upper" ? [...PERMANENT_UPPER] : [...PERMANENT_LOWER];
  const start = order.indexOf(from);
  const end = order.indexOf(to);
  if (start < 0 || end < 0) {
    throw new RangeError("Los puentes permanentes requieren dientes FDI permanentes");
  }
  const [low, high] = start <= end ? [start, end] : [end, start];
  const segment = order.slice(low, high + 1);
  return start <= end ? segment : segment.reverse();
}

export function createImplantStack(tooth: string): DentalEntity[] {
  parseTooth(tooth);
  const base = `implant-${tooth}`;
  return [
    { id: base, tooth, entityType: "IMPLANT", status: "implant_pending", active: true },
    {
      id: `${base}-abutment`,
      tooth,
      entityType: "ABUTMENT",
      status: "abutment_pending",
      parentId: base,
      active: true,
    },
    {
      id: `${base}-crown`,
      tooth,
      entityType: "CROWN",
      status: "crown_pending",
      parentId: `${base}-abutment`,
      active: true,
    },
  ];
}

export function createEndoPostCrown(tooth: string): DentalEntity[] {
  parseTooth(tooth);
  return [
    { id: `endo-${tooth}`, tooth, entityType: "ENDO", status: "endo_indicated", active: true },
    { id: `post-${tooth}`, tooth, entityType: "POST", status: "post_pending", active: true },
    { id: `crown-${tooth}`, tooth, entityType: "CROWN", status: "crown_pending", active: true },
  ];
}

export function createBridgeEntities(
  from: string,
  to: string,
  prosthesisState: "prosthesis" | "prosthesis_bad" | "prosthesis_pending" = "prosthesis_pending",
): DentalEntity[] {
  const teeth = bridgeTeethFromEndpoints(from, to);
  if (teeth.length < 2) throw new RangeError("Un puente requiere al menos dos dientes");
  const bridgeId = `bridge-${from}-${to}`;
  const pillars = [teeth[0], teeth.at(-1)].filter((value): value is string => Boolean(value));
  const pontics = teeth.slice(1, -1);
  const bridgeStatus =
    prosthesisState === "prosthesis"
      ? "bridge_completed"
      : prosthesisState === "prosthesis_bad"
        ? "bridge_unsatisfactory"
        : "bridge_pending";
  const bridge: DentalEntity = {
    id: bridgeId,
    entityType: "BRIDGE",
    status: bridgeStatus,
    active: true,
    attributes: { from, to, teeth, pillars, pontics },
  };
  return [
    bridge,
    ...teeth.map<DentalEntity>((tooth) => ({
      id: `prosthesis-${from}-${to}-${tooth}`,
      tooth,
      entityType: "PROSTHESIS",
      status: prosthesisState,
      parentId: bridgeId,
      active: true,
      attributes: {
        from,
        to,
        role: pillars.includes(tooth) ? "abutment" : "pontic",
      },
    })),
    ...pontics.map<DentalEntity>((tooth) => ({
      id: `pontic-${from}-${to}-${tooth}`,
      tooth,
      entityType: "PONTIC",
      status: "pontic_pending",
      parentId: bridgeId,
      active: true,
    })),
  ];
}

export function createRemovable(arch: ToothArch, teeth: readonly string[]): DentalEntity {
  const normalized = teeth.map(String);
  if (!normalized.length) throw new RangeError("La removible necesita al menos un diente");
  if (normalized.some((tooth) => archForTooth(tooth) !== arch)) {
    throw new RangeError("Todos los dientes de una removible deben pertenecer a la misma arcada");
  }
  return {
    id: `removable-${arch}-${normalized.join("-")}`,
    arch,
    entityType: "REMOVABLE",
    status: "removable_pending",
    active: true,
    attributes: { teeth: normalized },
  };
}

export function createPediatricEntity(tooth: string, status: PediatricToothStatus): DentalEntity {
  parseTooth(tooth);
  return {
    id: `pediatric-${tooth}-${status}`,
    tooth,
    entityType: "PEDIATRIC",
    status,
    active: true,
  };
}

export function createOrthodonticEntity(
  patientId: string,
  attributes: OrthodonticAttributes,
): DentalEntity {
  return {
    id: `orthodontic-${patientId}`,
    entityType: "ORTHODONTIC",
    status: "active",
    attributes: { ...attributes },
    active: true,
  };
}

export function assertNoImplantCariesConflict(
  entities: readonly DentalEntity[],
  tooth: string,
  proposed: "caries" | "implant",
): void {
  const current = entities.filter((entity) => entity.active && entity.tooth === tooth);
  const hasImplant = current.some((entity) => entity.entityType === "IMPLANT");
  const hasCaries = current.some(
    (entity) =>
      entity.entityType === "CARIES" ||
      (entity.entityType === "TOOTH_STATE" && entity.status === "caries"),
  );
  if ((proposed === "implant" && hasCaries) || (proposed === "caries" && hasImplant)) {
    throw new Error("Implante y caries activa son estados incompatibles en el mismo diente");
  }
}

export interface OdontogramSnapshot {
  readonly entities: readonly DentalEntity[];
}

export interface OdontogramSnapshotDiff {
  readonly added: readonly DentalEntity[];
  readonly removed: readonly DentalEntity[];
  readonly changed: readonly DentalEntity[];
}

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, canonicalValue(nested)]),
    );
  }
  return value;
}

function entityEquals(left: DentalEntity, right: DentalEntity): boolean {
  return JSON.stringify(canonicalValue(left)) === JSON.stringify(canonicalValue(right));
}

export function compareOdontogramSnapshots(
  before: OdontogramSnapshot,
  after: OdontogramSnapshot,
): OdontogramSnapshotDiff {
  const beforeById = new Map(before.entities.map((entity) => [entity.id, entity]));
  const afterById = new Map(after.entities.map((entity) => [entity.id, entity]));

  return {
    added: after.entities.filter((entity) => !beforeById.has(entity.id)),
    removed: before.entities.filter((entity) => !afterById.has(entity.id)),
    changed: after.entities.filter((entity) => {
      const previous = beforeById.get(entity.id);
      return previous !== undefined && !entityEquals(previous, entity);
    }),
  };
}
