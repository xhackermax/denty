import { readFileSync } from "node:fs";
import path from "node:path";

import type { ToothSurface } from "@/domain";

/**
 * Builds an evaluation corpus from the Denty NLU dictionary: every template of
 * the odontogram intents Denty executes is filled with real vocabulary (tooth
 * forms, surfaces, diagnoses, treatments) and paired with the action expected.
 */

interface DictionaryIntent {
  utterances: string[];
}

interface Dictionary {
  intents: Record<string, DictionaryIntent>;
  entities: {
    surface: { values: Record<string, string[]> };
    diagnosis: { values: Record<string, string[]> };
    treatment: { values: Record<string, string[]> };
  };
}

export interface CorpusCase {
  intent: string;
  utterance: string;
  selectedTooth?: string;
  expected: {
    type: string;
    tooth: string;
    status?: "CARIES" | "HEALTHY" | "MISSING";
    treatmentCode?: string;
    surfaces?: ToothSurface[];
  };
}

export function loadDictionary(): Dictionary {
  return JSON.parse(
    readFileSync(path.join(process.cwd(), "docs/nlu/denty-nlu-diccionario-dental.v2.json"), "utf8"),
  ) as Dictionary;
}

// Tooth forms: digits, dotted FDI, spoken words and spoken digit pairs.
const TEETH: ReadonlyArray<[string, string]> = [
  ["26", "26"],
  ["36", "treinta y seis"],
  ["16", "1.6"],
  ["46", "cuatro seis"],
  ["11", "once"],
  ["24", "veinticuatro"],
  ["37", "37"],
  ["15", "uno cinco"],
];

// Dictionary treatment categories Denty can draw on the odontogram.
const TREATMENT_CODES: Readonly<Record<string, string>> = {
  filling: "restoration",
  inlay_onlay: "inlay",
  crown: "crown",
  root_canal: "endodontics",
  post_core: "post",
  extraction: "extraction",
  implant: "implant",
};

const EXPECTATIONS: Readonly<
  Record<string, { type: string; status?: "CARIES" | "HEALTHY" | "MISSING"; treatment?: string }>
> = {
  "odontogram.mark_missing": { type: "odontogram.set_state", status: "MISSING" },
  "odontogram.mark_healthy": { type: "odontogram.set_state", status: "HEALTHY" },
  "odontogram.add_diagnosis": { type: "odontogram.set_state", status: "CARIES" },
  "restorative.mark_caries": { type: "odontogram.set_state", status: "CARIES" },
  "odontogram.plan_treatment": { type: "clinical.add_item" },
  "restorative.plan_filling": { type: "clinical.add_item", treatment: "filling" },
  "odontogram.complete_treatment": { type: "clinical.complete_item" },
  "odontogram.add_existing_treatment": { type: "clinical.complete_item" },
  "restorative.record_filling": { type: "clinical.complete_item", treatment: "filling" },
  "restorative.mark_existing_filling_bad": {
    type: "clinical.mark_unsatisfactory",
    treatment: "filling",
  },
};

export function buildCorpus(dictionary = loadDictionary()): CorpusCase[] {
  const surfaces = Object.entries(dictionary.entities.surface.values).filter(
    ([code]) => code !== "C",
  ) as Array<[ToothSurface, string[]]>;
  const surfaceForms = surfaces.flatMap(([code, forms]) =>
    forms.filter((form) => form.length > 1).map((form) => [code, form] as const),
  );
  const caries = dictionary.entities.diagnosis.values.caries ?? ["caries"];
  const treatments = Object.entries(dictionary.entities.treatment.values)
    .filter(([key]) => key in TREATMENT_CODES)
    .flatMap(([key, forms]) => forms.map((form) => [key, form] as const));

  const cases: CorpusCase[] = [];
  let counter = 0;
  for (const [intent, expectation] of Object.entries(EXPECTATIONS)) {
    const templates = dictionary.intents[intent]?.utterances ?? [];
    for (const template of templates) {
      // Placeholders we cannot fill meaningfully (materials, matrices, neighbours).
      if (/\{(?!tooth|surface|diagnosis|treatment)[a-z_]+\}/.test(template)) continue;
      const index = counter++;
      const [toothCode, toothForm] = TEETH[index % TEETH.length]!;
      const surface = template.includes("{surface}")
        ? surfaceForms[index % surfaceForms.length]
        : undefined;
      const pool = expectation.treatment
        ? treatments.filter(([key]) => key === expectation.treatment)
        : treatments;
      const treatment =
        template.includes("{treatment}") || expectation.treatment
          ? pool[index % pool.length]
          : undefined;
      if (expectation.type !== "odontogram.set_state" && !treatment) continue;
      const utterance = template
        .replace("{tooth}", toothForm)
        .replace("{surface}", surface?.[1] ?? "")
        .replace("{diagnosis}", caries[index % caries.length]!)
        .replace("{treatment}", treatment?.[1] ?? "")
        .replace(/\s+/g, " ")
        .trim();
      const hasTooth = template.includes("{tooth}");
      const treatmentCode = treatment ? TREATMENT_CODES[treatment[0]] : undefined;
      const surfacesExpected =
        surface && (expectation.status === "CARIES" || treatmentCode === "restoration")
          ? [surface[0]]
          : undefined;
      cases.push({
        intent,
        utterance,
        ...(hasTooth ? {} : { selectedTooth: toothCode }),
        expected: {
          type: expectation.type,
          tooth: toothCode,
          ...(expectation.status ? { status: expectation.status } : {}),
          ...(treatmentCode ? { treatmentCode } : {}),
          ...(surfacesExpected ? { surfaces: surfacesExpected } : {}),
        },
      });
    }
  }
  return cases;
}
