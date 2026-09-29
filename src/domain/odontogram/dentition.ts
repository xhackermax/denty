export type StandardDentition = "primary" | "permanent";
export type DentalArch = "upper" | "lower";
export type DentalSide = "right" | "left";
export type AnatomicalToothType =
  | "central_incisor"
  | "lateral_incisor"
  | "canine"
  | "first_premolar"
  | "second_premolar"
  | "first_molar"
  | "second_molar"
  | "third_molar"
  | "primary_first_molar"
  | "primary_second_molar";
export type EruptionState =
  "present" | "erupting" | "unerupted" | "exfoliated" | "missing" | "retained" | "impacted";

export interface StandardToothDefinition {
  readonly key: `fdi:${string}`;
  readonly fdi: string;
  readonly dentition: StandardDentition;
  readonly arch: DentalArch;
  readonly side: DentalSide;
  readonly quadrant: number;
  readonly position: number;
  readonly type: AnatomicalToothType;
  readonly predecessorFdi?: string;
  readonly successorFdi?: string;
}

export interface SupernumeraryToothIdentity {
  readonly key: `supernumerary:${string}`;
  readonly kind: "supernumerary";
  readonly iso10394Designation?: string;
  readonly anchorFdi: string;
  readonly arch: DentalArch;
  readonly side: DentalSide;
  readonly morphology: "supplemental" | "conical" | "tuberculate" | "molariform" | "unspecified";
  readonly clinicalType: "mesiodens" | "paramolar" | "distomolar" | "supplemental" | "other";
  readonly label?: string;
}

const PRIMARY_SUCCESSORS: Readonly<Record<string, string>> = {
  "51": "11",
  "52": "12",
  "53": "13",
  "54": "14",
  "55": "15",
  "61": "21",
  "62": "22",
  "63": "23",
  "64": "24",
  "65": "25",
  "71": "31",
  "72": "32",
  "73": "33",
  "74": "34",
  "75": "35",
  "81": "41",
  "82": "42",
  "83": "43",
  "84": "44",
  "85": "45",
};

const PERMANENT_PREDECESSORS = Object.fromEntries(
  Object.entries(PRIMARY_SUCCESSORS).map(([primary, permanent]) => [permanent, primary]),
) as Readonly<Record<string, string>>;

function typeFor(position: number, dentition: StandardDentition): AnatomicalToothType {
  if (position === 1) return "central_incisor";
  if (position === 2) return "lateral_incisor";
  if (position === 3) return "canine";
  if (dentition === "primary")
    return position === 4 ? "primary_first_molar" : "primary_second_molar";
  if (position === 4) return "first_premolar";
  if (position === 5) return "second_premolar";
  if (position === 6) return "first_molar";
  if (position === 7) return "second_molar";
  return "third_molar";
}

function defineStandardTooth(fdi: string): StandardToothDefinition {
  if (!/^\d{2}$/.test(fdi)) throw new RangeError(`FDI no válido: ${fdi}`);
  const quadrant = Number(fdi[0]);
  const position = Number(fdi[1]);
  const dentition: StandardDentition = quadrant >= 5 ? "primary" : "permanent";
  const valid =
    dentition === "primary"
      ? quadrant >= 5 && quadrant <= 8 && position >= 1 && position <= 5
      : quadrant >= 1 && quadrant <= 4 && position >= 1 && position <= 8;
  if (!valid) throw new RangeError(`FDI no válido: ${fdi}`);
  const arch: DentalArch = [1, 2, 5, 6].includes(quadrant) ? "upper" : "lower";
  const side: DentalSide = [1, 4, 5, 8].includes(quadrant) ? "right" : "left";
  const predecessorFdi = PERMANENT_PREDECESSORS[fdi];
  const successorFdi = PRIMARY_SUCCESSORS[fdi];
  return {
    key: `fdi:${fdi}`,
    fdi,
    dentition,
    arch,
    side,
    quadrant,
    position,
    type: typeFor(position, dentition),
    ...(predecessorFdi ? { predecessorFdi } : {}),
    ...(successorFdi ? { successorFdi } : {}),
  };
}

export const PRIMARY_FDI = [
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

export const PERMANENT_FDI = [
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

export const STANDARD_TOOTH_CATALOG: Readonly<Record<string, StandardToothDefinition>> =
  Object.freeze(
    Object.fromEntries(
      [...PRIMARY_FDI, ...PERMANENT_FDI].map((fdi) => [fdi, defineStandardTooth(fdi)]),
    ),
  );

export function standardTooth(fdi: string): StandardToothDefinition {
  const tooth = STANDARD_TOOTH_CATALOG[fdi];
  if (!tooth) throw new RangeError(`FDI no válido: ${fdi}`);
  return tooth;
}

export interface MixedDentitionSite {
  readonly siteId: string;
  readonly arch: DentalArch;
  readonly side: DentalSide;
  readonly primaryFdi?: string;
  readonly permanentFdi: string;
  readonly replacementSite: boolean;
}

function site(permanentFdi: string): MixedDentitionSite {
  const permanent = standardTooth(permanentFdi);
  return {
    siteId: `${permanent.arch}:${permanent.side}:${permanent.position}`,
    arch: permanent.arch,
    side: permanent.side,
    ...(permanent.predecessorFdi ? { primaryFdi: permanent.predecessorFdi } : {}),
    permanentFdi,
    replacementSite: Boolean(permanent.predecessorFdi),
  };
}

// Mixed dentition is represented as anatomical sites, not as one fixed list of erupted teeth.
// Third molars are intentionally excluded from the mixed-dentition working set.
export const MIXED_DENTITION_SITES = Object.freeze({
  upper: ["16", "15", "14", "13", "12", "11", "21", "22", "23", "24", "25", "26"].map(site),
  lower: ["46", "45", "44", "43", "42", "41", "31", "32", "33", "34", "35", "36"].map(site),
});

export function mixedDentitionCandidates(): { upper: readonly string[]; lower: readonly string[] } {
  const expand = (sites: readonly MixedDentitionSite[]) =>
    sites.flatMap((entry) =>
      entry.primaryFdi ? [entry.permanentFdi, entry.primaryFdi] : [entry.permanentFdi],
    );
  return { upper: expand(MIXED_DENTITION_SITES.upper), lower: expand(MIXED_DENTITION_SITES.lower) };
}

export function defaultMixedPresence(): ReadonlySet<string> {
  // Conservative display suggestion only. The UI exposes every candidate and the clinician decides presence.
  return new Set([
    "16",
    "55",
    "54",
    "53",
    "12",
    "11",
    "21",
    "22",
    "63",
    "64",
    "65",
    "26",
    "46",
    "85",
    "84",
    "83",
    "42",
    "41",
    "31",
    "32",
    "73",
    "74",
    "75",
    "36",
  ]);
}

export function createSupernumeraryIdentity(input: {
  id: string;
  anchorFdi: string;
  iso10394Designation?: string;
  morphology?: SupernumeraryToothIdentity["morphology"];
  clinicalType?: SupernumeraryToothIdentity["clinicalType"];
  label?: string;
}): SupernumeraryToothIdentity {
  const anchor = standardTooth(input.anchorFdi);
  if (!input.id.trim()) throw new RangeError("El supernumerario necesita un id estable");
  if (
    input.iso10394Designation !== undefined &&
    !/^[A-Za-z0-9]{2}$/.test(input.iso10394Designation)
  ) {
    throw new RangeError("La designación ISO 10394 debe tener dos caracteres alfanuméricos");
  }
  return {
    key: `supernumerary:${input.id.trim()}`,
    kind: "supernumerary",
    ...(input.iso10394Designation
      ? { iso10394Designation: input.iso10394Designation.toUpperCase() }
      : {}),
    anchorFdi: anchor.fdi,
    arch: anchor.arch,
    side: anchor.side,
    morphology: input.morphology ?? "unspecified",
    clinicalType: input.clinicalType ?? "other",
    ...(input.label?.trim() ? { label: input.label.trim() } : {}),
  };
}
