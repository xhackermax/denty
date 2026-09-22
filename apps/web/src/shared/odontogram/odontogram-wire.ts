import {
  TOOTH_STATES,
  type DentalEntity,
  type DentalEntityType,
  type ToothState,
  type ToothSurface,
} from "@/domain";
import type { PersistedDentalEntity } from "@/shared/api/schemas/clinical";

const DOMAIN_STATES = new Set<string>(TOOTH_STATES);

const DOMAIN_ENTITY_TYPES = new Set<DentalEntityType>([
  "TOOTH_STATE",
  "HEALTHY",
  "CARIES",
  "MISSING",
  "EXTRACTION",
  "RESTORATION",
  "ENDO",
  "POST",
  "CROWN",
  "IMPLANT",
  "ABUTMENT",
  "BRIDGE",
  "PONTIC",
  "REMOVABLE",
  "ORTHODONTIC",
  "PEDIATRIC",
  "PROSTHESIS",
]);

const SURFACES = new Set<ToothSurface>(["V", "M", "O", "I", "D", "P", "L"]);

type StateKind = "completed" | "unsatisfactory" | "planned";

function stateKind(status: string): StateKind {
  const value = status.toLowerCase();
  if (/unsatisfactory|bad|redo|review|retrat/.test(value)) return "unsatisfactory";
  if (/pending|planned|indicat|caries/.test(value)) return "planned";
  return "completed";
}

function familyState(
  family: "filling" | "crown" | "endo" | "post" | "implant" | "removable" | "prosthesis",
  kind: StateKind,
): ToothState {
  if (family === "filling") {
    return kind === "completed"
      ? "filling"
      : kind === "unsatisfactory"
        ? "filling_bad"
        : "filling_pending";
  }
  if (family === "crown") {
    return kind === "completed"
      ? "crown"
      : kind === "unsatisfactory"
        ? "crown_bad"
        : "crown_pending";
  }
  if (family === "endo") {
    return kind === "completed"
      ? "endo"
      : kind === "unsatisfactory"
        ? "endo_bad"
        : "endo_indicated";
  }
  if (family === "post") {
    return kind === "completed"
      ? "post"
      : kind === "unsatisfactory"
        ? "post_bad"
        : "post_pending";
  }
  if (family === "implant") {
    return kind === "completed"
      ? "implant"
      : kind === "unsatisfactory"
        ? "implant_review"
        : "implant_indicated";
  }
  if (family === "removable") {
    return kind === "completed"
      ? "removable"
      : kind === "unsatisfactory"
        ? "removable_bad"
        : "removable_pending";
  }
  return kind === "completed"
    ? "prosthesis"
    : kind === "unsatisfactory"
      ? "prosthesis_bad"
      : "prosthesis_pending";
}

export function toothStateFromEntity(entity: DentalEntity): ToothState | null {
  if (DOMAIN_STATES.has(entity.status)) return entity.status as ToothState;

  const kind = stateKind(entity.status);
  if (entity.entityType === "HEALTHY") return "healthy";
  if (entity.entityType === "CARIES") return "caries";
  if (entity.entityType === "MISSING") return "missing";
  if (entity.entityType === "EXTRACTION") return "extraction";
  if (entity.entityType === "RESTORATION") return familyState("filling", kind);
  if (entity.entityType === "CROWN") return familyState("crown", kind);
  if (entity.entityType === "ENDO") return familyState("endo", kind);
  if (entity.entityType === "POST") return familyState("post", kind);
  if (entity.entityType === "IMPLANT") return familyState("implant", kind);
  if (entity.entityType === "REMOVABLE") return familyState("removable", kind);
  if (entity.entityType === "PROSTHESIS") return familyState("prosthesis", kind);
  return null;
}

export function createStateEntity(
  tooth: string,
  state: ToothState,
  surfaces: readonly ToothSurface[] = [],
): DentalEntity {
  const entityType = entityTypeForState(state);
  const scope = surfaces.length ? `-${surfaces.join("")}` : "";
  return {
    id: `${entityType.toLowerCase()}-${tooth}${scope}`,
    tooth,
    entityType,
    status: state,
    ...(surfaces.length ? { surfaces: [...surfaces] } : {}),
    active: true,
  };
}

function entityTypeForState(state: ToothState): DentalEntityType {
  if (state === "healthy") return "HEALTHY";
  if (state === "caries") return "CARIES";
  if (state === "missing") return "MISSING";
  if (state === "extraction") return "EXTRACTION";
  if (state.startsWith("filling")) return "RESTORATION";
  if (state.startsWith("crown")) return "CROWN";
  if (state.startsWith("endo")) return "ENDO";
  if (state.startsWith("post")) return "POST";
  if (state.startsWith("implant")) return "IMPLANT";
  if (state.startsWith("removable")) return "REMOVABLE";
  return "PROSTHESIS";
}

function wireStatus(entity: DentalEntity): string {
  const state = toothStateFromEntity(entity);
  if (!state) return entity.status;
  if (state === "healthy") return "healthy";
  if (state === "caries") return "caries_pending";
  if (state === "missing") return "missing";
  if (state === "extraction") return "extraction_indicated";
  if (state === "filling") return "restoration_completed";
  if (state === "filling_bad") return "restoration_unsatisfactory";
  if (state === "filling_pending") return "restoration_planned";
  if (state === "crown") return "crown_completed";
  if (state === "crown_bad") return "crown_unsatisfactory";
  if (state === "crown_pending") return "crown_planned";
  if (state === "endo") return "endo_completed";
  if (state === "endo_bad") return "endo_unsatisfactory";
  if (state === "endo_indicated") return "endo_planned";
  if (state === "post") return "post_completed";
  if (state === "post_bad") return "post_unsatisfactory";
  if (state === "post_pending") return "post_planned";
  if (state === "implant") return "implant_completed";
  if (state === "implant_review") return "implant_review";
  if (state === "implant_indicated") return "implant_planned";
  if (state === "removable") return "removable_completed";
  if (state === "removable_bad") return "removable_unsatisfactory";
  if (state === "removable_pending") return "removable_planned";
  if (state === "prosthesis") return "prosthesis_completed";
  if (state === "prosthesis_bad") return "prosthesis_unsatisfactory";
  return "prosthesis_planned";
}

function wireEntityType(entity: DentalEntity): string {
  if (entity.entityType !== "TOOTH_STATE") return entity.entityType;
  const state = toothStateFromEntity(entity);
  return state ? entityTypeForState(state) : entity.entityType;
}

export function domainEntityToApiInput(entity: DentalEntity) {
  return {
    id: entity.id,
    ...(entity.tooth ? { tooth: entity.tooth } : {}),
    ...(entity.arch ? { arch: entity.arch } : {}),
    entityType: wireEntityType(entity),
    status: wireStatus(entity),
    ...(entity.surfaces?.length ? { surfaces: [...entity.surfaces] } : {}),
    ...(entity.attributes ? { attributes: { ...entity.attributes } } : {}),
    ...(entity.parentId ? { parentId: entity.parentId } : {}),
    active: entity.active,
  };
}

export function persistedEntityToDomain(entity: PersistedDentalEntity): DentalEntity {
  const rawType = entity.entityType.toUpperCase();
  const entityType = normalizeEntityType(rawType);
  const surfaces = (entity.surfacesJson ?? []).filter(
    (surface): surface is ToothSurface => SURFACES.has(surface as ToothSurface),
  );
  const base: DentalEntity = {
    id: entity.id,
    ...(entity.tooth ? { tooth: entity.tooth } : {}),
    ...(entity.arch === "upper" || entity.arch === "lower"
      ? { arch: entity.arch }
      : {}),
    entityType,
    status: entity.status,
    ...(surfaces.length ? { surfaces } : {}),
    ...(entity.parentId ? { parentId: entity.parentId } : {}),
    ...(entity.attributesJson ? { attributes: entity.attributesJson } : {}),
    active: entity.active,
  };
  const state = toothStateFromEntity(base);
  return state ? { ...base, status: state } : base;
}

function normalizeEntityType(rawType: string): DentalEntityType {
  if (rawType === "FILLING" || rawType === "OBTURATION") return "RESTORATION";
  if (DOMAIN_ENTITY_TYPES.has(rawType as DentalEntityType)) {
    return rawType as DentalEntityType;
  }
  throw new TypeError(`Tipo de entidad dental no soportado: ${rawType}`);
}
