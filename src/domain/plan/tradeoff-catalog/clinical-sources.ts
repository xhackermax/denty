// Source: «DENTY · Matriz maestra de tratamientos odontológicos» v1.0, part VI. Orientation
// references for validating the catalog; the document warns they are not an audit of every
// phrase, so each entry still needs specific literature before clinical use.
import type { TradeoffSpecialtyId } from "./types.ts";

export interface ClinicalSource {
  id: string;
  organisation: string;
  citation: string;
  url: string;
  specialties: readonly TradeoffSpecialtyId[];
}

export const CLINICAL_SOURCES: readonly ClinicalSource[] = [
  {
    id: "R01",
    organisation: "European Society of Endodontology",
    citation:
      "Duncan HF et al. Treatment of pulpal and apical disease: ESE S3-level clinical practice guideline. Int Endod J. 2023;56(S3):238-295. DOI:10.1111/iej.13974",
    url: "https://doi.org/10.1111/iej.13974",
    specialties: ["endodoncia"],
  },
  {
    id: "R02",
    organisation: "European Federation of Periodontology",
    citation:
      "EFP. Guideline on treatment of stage I-III periodontitis (2020); conjunto de guías sobre periodontitis y enfermedad periimplantaria.",
    url: "https://www.efp.org/education/continuing-education/clinical-guidelines/",
    specialties: ["periodoncia", "implantologia"],
  },
  {
    id: "R03",
    organisation: "National Institute of Dental and Craniofacial Research",
    citation:
      "NIDCR. Los trastornos temporomandibulares. Priorizar medidas conservadoras y evitar cambios irreversibles sin indicación.",
    url: "https://www.nidcr.nih.gov/espanol/temas-de-salud/los-trastornos-temporomandibulares",
    specialties: ["oclusion"],
  },
  {
    id: "R04",
    organisation: "SSRD, SEPES y PROSEC",
    citation:
      "Ioannidis A et al. Rehabilitation Strategies and Occlusal Vertical Dimension Considerations in the Management of Worn Dentitions. J Esthet Restor Dent. 2025;37:702-706. DOI:10.1111/jerd.13432",
    url: "https://doi.org/10.1111/jerd.13432",
    specialties: ["oclusion", "protesis"],
  },
  {
    id: "R05",
    organisation: "International Association of Dental Traumatology",
    citation:
      "IADT. Guidelines for the Evaluation and Management of Traumatic Dental Injuries (2020).",
    url: "https://iadt-dentaltrauma.org/guidelines-and-resources/guidelines/",
    specialties: ["traumatologia"],
  },
];

/** Quality rules the catalog content must meet before it is used with patients. */
export const CATALOG_QUALITY_RULES: readonly string[] = [
  "Toda afirmación deberá tener condiciones de aplicabilidad y, cuando proceda, evidencia vinculada.",
  "No comparar únicamente precios: incluir pronóstico, procedimientos, mantenimiento y reversibilidad.",
  "Los riesgos se expresarán como posibles, nunca inevitables; evitar exageración comercial.",
  "No usar frases universales del tipo «la endodoncia siempre es más barata que el implante».",
  "Permitir «no tratar» solo cuando sea una opción clínicamente defendible o para documentar rechazo informado.",
  "Distinguir el ajuste de la férula de un tallado dentario irreversible y del aumento de dimensión vertical restaurador.",
  "Asegurar revisión por odontólogo responsable y actualización periódica de la biblioteca clínica.",
  "La comparación ayuda al consentimiento informado, pero no lo sustituye.",
];
