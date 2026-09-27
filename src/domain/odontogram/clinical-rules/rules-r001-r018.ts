import type { DentalEntity } from "../index.ts";

import { isPrimaryTooth, typicalMaximumCanalCount } from "./anatomy.ts";
import type { ClinicalRuleDecision } from "./types.ts";

const naturalTreatmentTypes = new Set<DentalEntity["entityType"]>([
  "RESTORATION",
  "ENDO",
  "CROWN",
  "PEDIATRIC",
]);

const decision = (
  ruleId: string,
  severity: ClinicalRuleDecision["severity"],
  message: string,
  missingContext?: readonly string[],
): ClinicalRuleDecision => ({ ruleId, severity, message, ...(missingContext ? { missingContext } : {}) });

const has = (entities: readonly DentalEntity[], predicate: (entity: DentalEntity) => boolean) =>
  entities.some((entity) => entity.active && predicate(entity));

const sameSurface = (left: DentalEntity, right: DentalEntity): boolean => {
  if (!left.surfaces?.length || !right.surfaces?.length) return true;
  return left.surfaces.some((surface) => right.surfaces?.includes(surface));
};

export function evaluateRulesR001R018(
  proposed: DentalEntity,
  existing: readonly DentalEntity[],
): ClinicalRuleDecision[] {
  const sameTooth = existing.filter(
    (entity) => entity.active && entity.id !== proposed.id && entity.tooth === proposed.tooth,
  );
  const decisions: ClinicalRuleDecision[] = [];
  const push = (value: ClinicalRuleDecision | false) => value && decisions.push(value);

  push(
    naturalTreatmentTypes.has(proposed.entityType) &&
      has(sameTooth, (entity) => entity.entityType === "MISSING" || entity.status === "missing") &&
      decision("R001", "BLOCK", "Un diente ausente no admite tratamiento natural."),
  );
  push(
    proposed.entityType === "IMPLANT" &&
      !proposed.attributes?.orthodonticTad &&
      has(
        sameTooth,
        (entity) =>
          entity.entityType === "HEALTHY" ||
          (entity.entityType === "TOOTH_STATE" && entity.status !== "missing") ||
          (naturalTreatmentTypes.has(entity.entityType) && entity.attributes?.implantSupported !== true),
      ) &&
      decision("R002", "BLOCK", "Implante y diente natural no pueden coexistir."),
  );
  push(
    proposed.entityType === "CROWN" &&
      !has(sameTooth, (entity) =>
        ["TOOTH_STATE", "HEALTHY", "IMPLANT", "ABUTMENT", "POST"].includes(entity.entityType),
      ) &&
      decision("R003", "REQUIRE_CONTEXT", "La corona necesita un soporte válido.", ["support"]),
  );
  push(
    proposed.entityType === "POST" &&
      !has(sameTooth, (entity) => entity.entityType === "ENDO" && entity.active) &&
      decision("R004", "REQUIRE_CONTEXT", "El perno requiere endodoncia previa.", ["endodonticTreatment"]),
  );
  push(
    proposed.status === "access_chimney" &&
      !has(sameTooth, (entity) =>
        ["screwed", "direct_screwed", "multiunit_fixed"].some((value) =>
          `${entity.status} ${String(entity.attributes?.design ?? "")}`.toLowerCase().includes(value),
        ),
      ) &&
      decision("R005", "BLOCK", "La chimenea solo corresponde a una restauración implantosoportada atornillada."),
  );
  push(
    proposed.attributes?.role === "abutment" &&
      has(sameTooth, (entity) => entity.status === "mobility" && Number(entity.attributes?.grade) >= 3) &&
      decision("R006", "WARN", "Movilidad grado III: confirma el uso como pilar."),
  );
  push(
    proposed.status === "sealant" &&
      has(
        sameTooth,
        (entity) =>
          ["CARIES", "RESTORATION"].includes(entity.entityType) && sameSurface(proposed, entity),
      ) &&
      decision("R007", "BLOCK", "No se puede sellar una superficie con caries o restauración."),
  );
  push(
    proposed.entityType === "EXTRACTION" &&
      has(sameTooth, (entity) => entity.status === "bridge_abutment" || entity.attributes?.role === "abutment") &&
      decision("R008", "WARN", "La pieza marcada para extracción también figura como pilar de puente."),
  );
  push(
    proposed.status === "clasp" &&
      proposed.attributes?.bridgeAbutment === true &&
      decision("R009", "BLOCK", "Un retenedor de removible no es un pilar de puente."),
  );
  const maximumCanals = typicalMaximumCanalCount(proposed.tooth);
  push(
    proposed.entityType === "ENDO" &&
      maximumCanals !== null &&
      Number(proposed.attributes?.canalCount) > maximumCanals &&
      decision("R010", "WARN", "El número de conductos supera el contexto anatómico típico."),
  );
  push(
    ["pulpotomy", "pulpectomy"].includes(proposed.status) &&
      !isPrimaryTooth(proposed.tooth) &&
      proposed.attributes?.immatureApex !== true &&
      decision("R011", "BLOCK", "Pulpotomía/pulpectomía requiere dentición temporal o indicación inmadura."),
  );
  push(
    proposed.status === "stainless_steel_crown" &&
      !isPrimaryTooth(proposed.tooth) &&
      decision("R012", "WARN", "La corona de acero se restringe normalmente a dentición temporal."),
  );
  const prematureLoss = proposed.attributes?.prematureLoss;
  const successorNotErupted = proposed.attributes?.successorNotErupted;
  push(
    proposed.status === "space_maintainer" &&
      (prematureLoss !== true || successorNotErupted !== true) &&
      decision("R013", "REQUIRE_CONTEXT", "Confirma pérdida prematura y sucesor no erupcionado.", [
        ...(prematureLoss === true ? [] : ["prematureLoss"]),
        ...(successorNotErupted === true ? [] : ["successorNotErupted"]),
      ]),
  );
  push(
    proposed.entityType === "IMPLANT" &&
      (proposed.status === "orthodontic_tad" || proposed.attributes?.orthodonticTad === true) &&
      decision("R014", "BLOCK", "Un microtornillo ortodóncico no se registra como implante protésico."),
  );
  push(
    ["apexification", "apexogenesis"].includes(proposed.status) &&
      proposed.attributes?.immatureApex !== true &&
      decision("R015", "REQUIRE_CONTEXT", "El procedimiento requiere ápice inmaduro.", ["immatureApex"]),
  );
  push(
    ["traction", "bridge_abutment"].includes(proposed.status) &&
      has(sameTooth, (entity) => entity.status === "ankylosed") &&
      decision("R016", "BLOCK", "Un diente anquilosado no admite tracción ni uso como pilar."),
  );
  push(
    proposed.status === "bridge_abutment" &&
      has(sameTooth, (entity) => entity.status === "external_root_resorption_severe") &&
      decision("R017", "WARN", "La reabsorción radicular externa severa restringe el uso como pilar."),
  );
  push(
    proposed.status === "extraction_surgical" &&
      proposed.attributes?.impacted !== true &&
      !has(sameTooth, (entity) => ["impacted", "included"].includes(entity.status)) &&
      decision("R018", "REQUIRE_CONTEXT", "La exodoncia quirúrgica requiere contexto de inclusión/impactación.", ["impacted"]),
  );

  return decisions;
}
