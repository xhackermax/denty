import type { DentalEntity } from "../index.ts";

import { isFurcationEligibleTooth, isUpperPosteriorTooth } from "./anatomy.ts";
import type { ClinicalRuleContext, ClinicalRuleDecision } from "./types.ts";

const decision = (
  ruleId: string,
  severity: ClinicalRuleDecision["severity"],
  message: string,
  missingContext?: readonly string[],
): ClinicalRuleDecision => ({ ruleId, severity, message, ...(missingContext ? { missingContext } : {}) });

const has = (entities: readonly DentalEntity[], predicate: (entity: DentalEntity) => boolean) =>
  entities.some((entity) => entity.active && predicate(entity));

export function evaluateRulesR019R035(
  proposed: DentalEntity,
  existing: readonly DentalEntity[],
  context: ClinicalRuleContext = {},
): ClinicalRuleDecision[] {
  const sameTooth = existing.filter(
    (entity) => entity.active && entity.id !== proposed.id && entity.tooth === proposed.tooth,
  );
  const decisions: ClinicalRuleDecision[] = [];
  const push = (value: ClinicalRuleDecision | false) => value && decisions.push(value);
  const status = proposed.status.toLowerCase();

  push(
    status === "diastema_closure" &&
      has(sameTooth, (entity) => entity.status === "diastema_closure" && entity.entityType !== proposed.entityType) &&
      decision("R019", "WARN", "Confirma la alternativa ortodóncica o restauradora para el diastema."),
  );
  push(
    status === "pink_spot" &&
      !has(sameTooth, (entity) => entity.status === "internal_resorption") &&
      decision("R020", "REQUIRE_CONTEXT", "La mancha rosada requiere registrar reabsorción interna.", ["internalResorption"]),
  );
  push(
    proposed.entityType === "SINUS_LIFT" &&
      !isUpperPosteriorTooth(proposed.tooth) &&
      decision("R021", "BLOCK", "La elevación de seno solo se registra en sector posterosuperior."),
  );
  push(
    ["locator", "ball_attachment", "bar"].includes(status) &&
      !has(
        sameTooth,
        (entity) =>
          entity.entityType === "IMPLANT" || entity.attributes?.preparedForAttachment === true,
      ) &&
      decision("R022", "REQUIRE_CONTEXT", "El anclaje requiere implante o soporte preparado.", ["support"]),
  );
  push(
    ["bar", "locator"].includes(status) &&
      has(sameTooth, (entity) => ["bar", "locator"].includes(entity.status) && entity.status !== status) &&
      decision("R023", "BLOCK", "Barra y Locator son alternativas excluyentes en el mismo implante."),
  );
  push(
    ((status === "veneer" && has(sameTooth, (entity) => entity.entityType === "CROWN")) ||
      (proposed.entityType === "CROWN" && has(sameTooth, (entity) => entity.status === "veneer"))) &&
      decision("R024", "BLOCK", "Carilla y corona completa son incompatibles en la misma pieza."),
  );
  const hasImplant = has(sameTooth, (entity) => entity.entityType === "IMPLANT");
  const hasNaturalTooth = has(sameTooth, (entity) =>
    ["HEALTHY", "TOOTH_STATE", "RESTORATION", "ENDO"].includes(entity.entityType),
  );
  push(
    ((status === "peri_implantitis" && hasNaturalTooth && !hasImplant) ||
      (status === "periodontitis" && hasImplant && !hasNaturalTooth)) &&
      decision("R025", "BLOCK", "El diagnóstico periodontal no corresponde al tipo de soporte."),
  );
  push(
    status === "furcation" &&
      !isFurcationEligibleTooth(proposed.tooth) &&
      decision("R026", "BLOCK", "La furca solo se registra en dientes multirradiculares elegibles."),
  );
  push(
    status === "immediate_loading" &&
      (Number(proposed.attributes?.insertionTorqueNcm) < 35 ||
        Number(proposed.attributes?.primaryIsq) < 65) &&
      decision("R027", "WARN", "Carga inmediata con estabilidad primaria baja: confirma la decisión clínica."),
  );
  push(
    status === "tibase" &&
      !has(sameTooth, (entity) =>
        ["CROWN", "PROSTHETIC_STRUCTURE"].includes(entity.entityType),
      ) &&
      decision("R028", "REQUIRE_CONTEXT", "TiBase requiere una corona o estructura asociada.", ["prostheticStructure"]),
  );
  push(
    status === "multiunit" &&
      (!has(sameTooth, (entity) => entity.entityType === "PROSTHETIC_STRUCTURE") ||
        has(sameTooth, (entity) => entity.status === "single_crown")) &&
      decision("R029", "BLOCK", "Multiunit requiere contexto protésico múltiple y atornillado."),
  );
  push(
    status === "angled_abutment" &&
      Number(proposed.attributes?.angleDeg) >= 25 &&
      proposed.attributes?.straightScrewAccess === true &&
      decision("R030", "BLOCK", "La angulación es incompatible con el acceso de tornillo recto indicado."),
  );
  push(
    proposed.entityType === "MEMBRANE" &&
      !has(sameTooth, (entity) => entity.entityType === "BONE_GRAFT") &&
      decision("R031", "WARN", "Membrana sin injerto asociado: confirma la indicación."),
  );

  if (proposed.entityType === "IMPLANT") {
    const system = String(proposed.attributes?.system ?? "");
    const diameter = proposed.attributes?.diameterMm;
    const length = proposed.attributes?.lengthMm;
    if (system && diameter !== undefined && length !== undefined) {
      const configured = context.manufacturerCatalog?.[system];
      const dimension = `${String(diameter)}x${String(length)}`;
      push(
        configured
          ? !configured.includes(dimension) &&
              decision("R032", "BLOCK", "La dimensión no figura en el catálogo configurado del fabricante.")
          : decision("R032", "WARN", "Catálogo del fabricante no configurado; verifica manualmente la dimensión."),
      );
    }
  }
  push(
    proposed.entityType === "BRIDGE" &&
      proposed.attributes?.cantilever === true &&
      proposed.attributes?.allEndpointsAreAbutments === true &&
      decision("R033", "BLOCK", "Un cantilever no puede inferir todos los extremos como pilares."),
  );
  push(
    proposed.entityType === "PONTIC" &&
      has(sameTooth, (entity) =>
        ["HEALTHY", "TOOTH_STATE", "RESTORATION", "ENDO", "CROWN"].includes(entity.entityType),
      ) &&
      decision("R034", "BLOCK", "El póntico ocupa una posición ausente, no un diente natural."),
  );
  push(
    ((status === "apicoectomy" && has(sameTooth, (entity) => entity.status === "retreatment")) ||
      (status === "retreatment" && has(sameTooth, (entity) => entity.status === "apicoectomy"))) &&
      decision("R035", "BLOCK", "Retratamiento activo y apicectomía son alternativas excluyentes."),
  );

  return decisions;
}
