#!/usr/bin/env node
// Builds the compact lexicon the in-browser voice interpreter uses from the full
// Denty NLU dictionary (docs/nlu/*.json, ~1 MB). Only vocabulary is shipped:
// normalization, number words, surfaces, quadrants, treatments, diagnoses and
// statuses, all accent-free and lower-case. Run after editing the dictionary:
//   node scripts/nlu/build-dental-lexicon.mjs
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const DICTIONARY_PATH = path.join(ROOT, "docs/nlu/denty-nlu-diccionario-dental.v2.json");
export const LEXICON_PATH = path.join(ROOT, "src/features/voice/dental-lexicon.generated.json");

const fold = (value) =>
  value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

// Canonical words the rule-based interpreter already understands.
const TREATMENT_CANONICAL = {
  filling: "obturacion",
  inlay_onlay: "incrustacion",
  crown: "corona",
  root_canal: "endodoncia",
  retreatment: "reendodoncia",
  post_core: "perno",
  extraction: "extraccion",
  implant: "implante",
  prophylaxis: "limpieza",
  scaling_root_planing: "raspado",
};
const REGIONAL_TREATMENTS = {
  filling: "filling",
  root_canal: "root_canal",
  extraction: "extraction",
  cleaning: "prophylaxis",
};

// Clinic wording the dictionary implies but does not list as a synonym.
const DENTY_ADDITIONS = {
  caries: ["pon roja", "pon rojo", "ponlo rojo", "ponla roja"],
  treatments: {
    restaurar: "obturacion",
    restaura: "obturacion",
    obturar: "obturacion",
    empastar: "obturacion",
    sacame: "extraccion",
    quitame: "extraccion",
  },
  completed: [
    "termina",
    "terminar",
    "finaliza",
    "acaba",
    "existente",
    "ya tiene",
    "previa",
    "previo",
    "antigua",
    "antiguo",
    "correcta",
    "buena",
    "bueno",
  ],
  unsatisfactory: [
    "rota",
    "roto",
    "fracturada",
    "defectuosa",
    "insatisfactoria",
    "filtrada",
    "caries secundaria",
  ],
  healthy: ["sin patologia", "pon verde", "ponlo verde", "ponla verde"],
};
const EXCLUDED_FILLERS = new Set(["este", "denty", "oye"]);
const SINGLE_DIGITS = ["uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho"];

function unique(values) {
  return [...new Set(values)];
}

/** Longest forms first, so "tratamiento de conductos" wins over "conducto". */
function byLength(entries) {
  return Object.fromEntries(
    Object.entries(entries).sort(([a], [b]) => b.length - a.length || a.localeCompare(b)),
  );
}

export function buildDentalLexicon(dictionary) {
  const entities = dictionary.entities;
  const normalization = dictionary.normalization;

  const numberWords = {};
  for (const [word, digits] of Object.entries(normalization.number_words)) {
    if (/^(?:[1-4][1-8]|[5-8][1-5])$/.test(digits)) numberWords[fold(word)] = digits;
  }

  const surfaces = {};
  for (const [code, forms] of Object.entries(entities.surface.values)) {
    if (!["M", "D", "O", "I", "V", "L", "P"].includes(code)) continue;
    for (const form of forms) if (form.length > 1) surfaces[fold(form)] = code;
  }
  const surfaceCompounds = {};
  for (const [code, forms] of Object.entries(entities.surface.compound_examples ?? {})) {
    for (const form of forms)
      if (form.length > 3 && /[-\s]/.test(form)) surfaceCompounds[fold(form)] = code;
  }

  const quadrants = {};
  for (const [code, forms] of Object.entries(entities.quadrant.values)) {
    for (const form of forms) quadrants[fold(form)] = Number(code.slice(1));
  }

  const treatments = {};
  for (const [key, canonical] of Object.entries(TREATMENT_CANONICAL)) {
    for (const form of entities.treatment.values[key] ?? []) treatments[fold(form)] = canonical;
  }
  Object.assign(treatments, DENTY_ADDITIONS.treatments);
  for (const [regionalKey, key] of Object.entries(REGIONAL_TREATMENTS)) {
    for (const form of dictionary.regional_lexicon[regionalKey] ?? []) {
      treatments[fold(form)] = TREATMENT_CANONICAL[key];
    }
  }

  const caries = unique([
    ...(entities.diagnosis.values.caries ?? []).map(fold),
    ...DENTY_ADDITIONS.caries,
  ]).filter((form) => form !== "caries");
  const missing = unique((entities.diagnosis.values.edentulous ?? []).map(fold));
  const status = entities.status.values;
  const completed = unique([
    ...[...(status.completed ?? []), ...(status.existing_good ?? [])].map(fold),
    ...DENTY_ADDITIONS.completed,
  ]);
  const unsatisfactory = unique([
    ...(status.existing_bad ?? []).map(fold).filter((form) => form !== "mal"),
    ...DENTY_ADDITIONS.unsatisfactory,
  ]);

  return {
    source: {
      name: dictionary.meta.name,
      version: dictionary.meta.version,
      intents: Object.keys(dictionary.intents).length,
    },
    fillers: unique(
      [
        ...normalization.remove_filler_words,
        ...(dictionary.speech_robustness?.common_fillers_to_ignore ?? []),
      ]
        .map(fold)
        .filter((word) => !EXCLUDED_FILLERS.has(word)),
    ),
    correctionMarkers: unique(
      [
        ...dictionary.negation_and_correction.self_correction_markers,
        ...(dictionary.speech_robustness?.common_self_repairs ?? []),
      ]
        .map((marker) => fold(marker).replace(/,/g, ""))
        // "mejor"/"cambialo" alone are too ambiguous to split a sentence on.
        .filter(
          (marker) => marker.includes(" ") || ["perdon", "corrijo", "rectifico"].includes(marker),
        ),
    ),
    singleDigits: Object.fromEntries(SINGLE_DIGITS.map((word, index) => [word, String(index + 1)])),
    numberWords: byLength(numberWords),
    surfaces: byLength(surfaces),
    surfaceCompounds: byLength(surfaceCompounds),
    quadrants: byLength(quadrants),
    treatments: byLength(treatments),
    caries: caries.sort((a, b) => b.length - a.length),
    missing: missing.sort((a, b) => b.length - a.length),
    healthy: DENTY_ADDITIONS.healthy,
    completed: completed.sort((a, b) => b.length - a.length),
    unsatisfactory: unsatisfactory.sort((a, b) => b.length - a.length),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dictionary = JSON.parse(readFileSync(DICTIONARY_PATH, "utf8"));
  const lexicon = buildDentalLexicon(dictionary);
  writeFileSync(LEXICON_PATH, `${JSON.stringify(lexicon, null, 2)}\n`);
  console.log(`Léxico dental generado: ${path.relative(ROOT, LEXICON_PATH)}`);
}
