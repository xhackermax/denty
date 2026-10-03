import {
  clinicalLifecycleState,
  type DentalEntity,
  type DentalEntityType,
  type PeriodontalSite,
  type ToothSurface,
} from "@/domain";
import type { MouthState } from "@/domain/odontogram/mouth-state";

import type {
  Finding,
  FindingStatus,
  Layer,
  Site,
  Surface,
  ToothRecord,
} from "./odontogram-visual";

// The visual chart draws one occlusal/incisal face and one inner (palatal/lingual) face.
const SURFACE: Readonly<Record<ToothSurface, Surface>> = {
  V: "V",
  M: "M",
  D: "D",
  O: "O",
  I: "O",
  P: "L",
  L: "L",
};

const SITE: Readonly<Record<PeriodontalSite, Site>> = {
  MV: "MV",
  V: "V",
  DV: "DV",
  MP: "ML",
  "P/L": "L",
  DP: "DL",
};

const ENTITY: Partial<Readonly<Record<DentalEntityType, { label: string; layer: Layer }>>> = {
  CARIES: { label: "Caries", layer: "restauradora" },
  RESTORATION: { label: "Obturación", layer: "restauradora" },
  ENDO: { label: "Endodoncia", layer: "endo" },
  POST: { label: "Poste", layer: "endo" },
  CROWN: { label: "Corona", layer: "protesis" },
  ABUTMENT: { label: "Pilar", layer: "protesis" },
  BRIDGE: { label: "Puente", layer: "protesis" },
  PONTIC: { label: "Póntico", layer: "protesis" },
  REMOVABLE: { label: "Prótesis removible", layer: "protesis" },
  PROSTHESIS: { label: "Prótesis", layer: "protesis" },
  IMPLANT: { label: "Implante", layer: "cirugia" },
  EXTRACTION: { label: "Extracción", layer: "cirugia" },
  MISSING: { label: "Ausencia", layer: "cirugia" },
  SUPERNUMERARY_TOOTH: { label: "Supernumerario", layer: "cirugia" },
};

// TOOTH_STATE rows carry the treatment in their status ("filling_pending", "crown_bad", …).
const STATE_FAMILY: readonly [prefix: string, label: string, layer: Layer][] = [
  ["filling", "Obturación", "restauradora"],
  ["caries", "Caries", "restauradora"],
  ["crown", "Corona", "protesis"],
  ["endo", "Endodoncia", "endo"],
  ["post", "Poste", "endo"],
  ["implant", "Implante", "cirugia"],
  ["missing", "Ausencia", "cirugia"],
];

const ORTHO_MARKS: Readonly<Record<string, string>> = {
  bracket: "Bracket",
  band: "Banda",
  attachment: "Attachment",
  extract: "Extracción ortodóncica",
  space: "Espacio",
};

function describe(entity: DentalEntity): { label: string; layer: Layer } | null {
  if (entity.entityType === "TOOTH_STATE") {
    const family = STATE_FAMILY.find(([prefix]) => entity.status.startsWith(prefix));
    return family ? { label: family[1], layer: family[2] } : null;
  }
  return ENTITY[entity.entityType] ?? null;
}

function statusOf(entity: DentalEntity): FindingStatus {
  const lifecycle = clinicalLifecycleState(entity);
  if (lifecycle === "PLANIFICADO") return "planned";
  if (lifecycle === "REALIZADO" || lifecycle === "REALIZADO_OTRA_CLINICA") return "completed";
  if (lifecycle === "HALLAZGO_EXISTENTE") return "observed";
  if (/pending|planned|indicat/i.test(entity.status)) return "planned";
  if (/done|completed|realizad/i.test(entity.status)) return "completed";
  return "observed";
}

const needsReview = (entity: DentalEntity) =>
  /_bad$/.test(entity.status) || entity.status === "implant_review";

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function findingsFor(entity: DentalEntity): Finding[] {
  const kind = describe(entity);
  if (!kind) return [];
  const base = {
    layer: kind.layer,
    label: needsReview(entity) ? `${kind.label} · a revisar` : kind.label,
    status: statusOf(entity),
  };
  const note = text(entity.attributes?.notes) ?? text(entity.attributes?.note);
  const recordedAt = text(entity.attributes?.recordedAt);
  const extras = { ...(note ? { note } : {}), ...(recordedAt ? { recordedAt } : {}) };
  const surfaces = [...new Set((entity.surfaces ?? []).map((surface) => SURFACE[surface]))];
  if (surfaces.length === 0) return [{ id: entity.id, ...base, ...extras }];
  return surfaces.map((surface) => ({
    id: `${entity.id}:${surface}`,
    ...base,
    surface,
    ...extras,
  }));
}

function orthodonticFindings(entity: DentalEntity): Map<string, Finding> {
  const result = new Map<string, Finding>();
  const marks = entity.attributes?.toothMarks;
  if (!marks || typeof marks !== "object" || Array.isArray(marks)) return result;
  for (const [tooth, mark] of Object.entries(marks)) {
    const label = typeof mark === "string" ? ORTHO_MARKS[mark] : undefined;
    if (!label) continue;
    result.set(tooth, {
      id: `${entity.id}:${tooth}`,
      layer: "orto",
      label,
      status: statusOf(entity),
      ...(mark === "bracket" ? { marker: "bracket" as const } : {}),
    });
  }
  return result;
}

/** A probing reading as stored: depth may be missing when only bleeding or plaque was charted. */
export interface VisualReading {
  tooth: string;
  site: PeriodontalSite;
  probingDepth?: number;
  bleeding?: boolean;
  suppuration?: boolean;
}

/** Saved odontogram (entities, probing and the derived mouth) as the visual chart's records. */
export function toVisualTeeth(
  entities: readonly DentalEntity[],
  readings: readonly VisualReading[],
  mouth: MouthState,
): ToothRecord[] {
  const active = entities.filter((entity) => entity.active);
  const ortho = active
    .filter((entity) => entity.entityType === "ORTHODONTIC")
    .map(orthodonticFindings);

  return Object.entries(mouth.teeth).map(([tooth, state]) => {
    const findings = active
      .filter((entity) => entity.tooth === tooth && entity.entityType !== "ORTHODONTIC")
      .flatMap(findingsFor);
    for (const marks of ortho) {
      const mark = marks.get(tooth);
      if (mark) findings.push(mark);
    }

    const probing: Partial<Record<Site, number | null>> = {};
    for (const reading of readings.filter((candidate) => candidate.tooth === tooth)) {
      const site = SITE[reading.site];
      if (!site) continue;
      if (reading.probingDepth !== undefined && Number.isFinite(reading.probingDepth))
        probing[site] = reading.probingDepth;
      if (reading.bleeding)
        findings.push({
          id: `perio:${tooth}:${site}:bleeding`,
          layer: "perio",
          label: "Sangrado al sondaje",
          status: "observed",
          site,
        });
      if (reading.suppuration)
        findings.push({
          id: `perio:${tooth}:${site}:suppuration`,
          layer: "perio",
          label: "Supuración",
          status: "observed",
          site,
        });
    }

    const presence =
      state.presence === "implant" || state.replacedBy === "implant"
        ? "implant"
        : state.presence === "missing" || state.presence === "pontic"
          ? "absent"
          : "present";
    return {
      fdi: Number(tooth),
      presence,
      ...(Object.keys(probing).length ? { probing } : {}),
      findings,
    };
  });
}

export function toVisualDentition(mouth: MouthState): "permanent" | "primary" | "mixed" {
  if (mouth.dentition === "deciduous") return "primary";
  return mouth.dentition;
}
