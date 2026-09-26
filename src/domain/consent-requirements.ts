export const CONSENT_TEMPLATES = [
  { code: "CONSENT_IMAGES", label: "CI Tratamiento de imágenes", patterns: [/imagen|radiograf|cbct|fotograf/] },
  { code: "CONSENT_ANESTHESIA", label: "CI Anestesia", patterns: [/anestesia|anesthesia/] },
  { code: "CONSENT_ENDO", label: "CI Endodoncia", patterns: [/\bendo\b|endodon/] },
  { code: "CONSENT_WISDOM", label: "CI Extracción tercer molar", patterns: [/tercer molar|cordal|wisdom/] },
  { code: "CONSENT_EXTRACTION", label: "CI Extracción simple", patterns: [/extracci[oó]n|exodon|extract/] },
  { code: "CONSENT_IMPLANT", label: "CI Implantes", patterns: [/implant/] },
  { code: "CONSENT_FILLINGS", label: "CI Obturaciones", patterns: [/obtur|empaste|filling|restauraci[oó]n directa|composite/] },
  { code: "CONSENT_CLEANING", label: "CI Tartrectomía / limpieza dental", patterns: [/higiene|tartrect|limpieza|prophylaxis/] },
  { code: "CONSENT_PERIO", label: "CI Periodoncia", patterns: [/periodon|raspado|alisado radicular|curetaje/] },
  { code: "CONSENT_HA", label: "CI Procedimiento ácido hialurónico", patterns: [/hialur[oó]nic/] },
  { code: "CONSENT_OVERDENTURE", label: "CI Sobredentaduras", patterns: [/sobredent|overdenture/] },
  { code: "CONSENT_VENEERS", label: "CI Carillas directas de composite", patterns: [/carilla|veneer/] },
  { code: "CONSENT_PROSTHESIS", label: "CI Prótesis", patterns: [/pr[oó]tes|corona|crown|puente|bridge|inlay|onlay|removible|zircon/] },
  { code: "CONSENT_GUM_GRAFT", label: "CI Injerto de encía", patterns: [/injerto.*enc[ií]a|gum graft|tejido conectivo/] },
  { code: "CONSENT_BONE_GRAFT", label: "CI Injertos óseos", patterns: [/injerto.*[oó]seo|bone graft/] },
  { code: "CONSENT_BONE_REGEN", label: "CI Regeneración ósea", patterns: [/regeneraci[oó]n.*[oó]sea|gb?r|membrana/] },
  { code: "CONSENT_PERIAPICAL", label: "CI Cirugía periapical", patterns: [/periapical|apicectom/] },
  { code: "CONSENT_PLASMA", label: "CI Plasma", patterns: [/plasma|prf|prp/] },
  { code: "CONSENT_SEDATION", label: "CI Sedación consciente", patterns: [/sedaci[oó]n|sedation/] },
  { code: "CONSENT_BIOPSY", label: "CI Biopsia", patterns: [/biops/] },
  { code: "CONSENT_WHITEN_INT", label: "CI Blanqueamiento dental interno", patterns: [/blanqueamiento.*intern|internal whitening/] },
  { code: "CONSENT_WHITEN_EXT", label: "CI Blanqueamiento dental externo", patterns: [/blanqueamiento|whitening/] },
] as const;

export type ConsentTemplateCode = (typeof CONSENT_TEMPLATES)[number]["code"];

export interface ConsentRequirement {
  code: ConsentTemplateCode;
  label: string;
}

export interface ConsentTreatmentLike {
  treatmentCode?: string | undefined;
  label?: string | undefined;
  description?: string | undefined;
}

export interface ConsentDocumentLike {
  type: string;
  title: string;
  status?: string | undefined;
  state?: string | undefined;
  templateCode?: string | undefined;
}

function normalizedTreatmentText(item: ConsentTreatmentLike): string {
  return `${item.treatmentCode ?? ""} ${item.label ?? ""} ${item.description ?? ""}`
    .trim()
    .toLowerCase();
}

export function requiredConsentTemplates(
  treatments: readonly ConsentTreatmentLike[],
): ConsentRequirement[] {
  const required = new Map<ConsentTemplateCode, ConsentRequirement>();
  for (const treatment of treatments) {
    const text = normalizedTreatmentText(treatment);
    if (!text) continue;
    for (const template of CONSENT_TEMPLATES) {
      if (template.patterns.some((pattern) => pattern.test(text))) {
        if (!required.has(template.code)) {
          required.set(template.code, { code: template.code, label: template.label });
        }
        break;
      }
    }
  }
  return [...required.values()];
}

function templateFromTitle(title: string): ConsentTemplateCode | null {
  const normalized = title.trim().toLowerCase();
  const exact = CONSENT_TEMPLATES.find((template) => template.label.toLowerCase() === normalized);
  if (exact) return exact.code;
  const fuzzy = CONSENT_TEMPLATES.find((template) =>
    template.patterns.some((pattern) => pattern.test(normalized)),
  );
  return fuzzy?.code ?? null;
}

export function signedConsentTemplateCodes(
  documents: readonly ConsentDocumentLike[],
): ReadonlySet<ConsentTemplateCode> {
  const result = new Set<ConsentTemplateCode>();
  for (const document of documents) {
    if (document.type !== "CONSENT") continue;
    const status = document.status ?? document.state ?? "";
    if (!["SIGNED", "DELIVERED", "ARCHIVED"].includes(status)) continue;
    const code = CONSENT_TEMPLATES.some((template) => template.code === document.templateCode)
      ? (document.templateCode as ConsentTemplateCode)
      : templateFromTitle(document.title);
    if (code) result.add(code);
  }
  return result;
}

export function hasAllRequiredConsents(
  required: readonly ConsentRequirement[],
  signedCodes: ReadonlySet<ConsentTemplateCode>,
): boolean {
  return required.every((requirement) => signedCodes.has(requirement.code));
}
