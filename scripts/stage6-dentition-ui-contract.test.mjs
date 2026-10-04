import assert from "node:assert/strict";
import fs from "node:fs";

const pediatric = fs.readFileSync(
  new URL("../src/features/odontogram/pediatric-panel.tsx", import.meta.url),
  "utf8",
);
const workspace = fs.readFileSync(
  new URL("../src/features/odontogram/odontogram-workspace.tsx", import.meta.url),
  "utf8",
);
const supernumerary = fs.readFileSync(
  new URL("../src/features/odontogram/supernumerary-panel.tsx", import.meta.url),
  "utf8",
);
const domain = fs.readFileSync(
  new URL("../src/domain/odontogram/index.ts", import.meta.url),
  "utf8",
);
const wire = fs.readFileSync(
  new URL("../src/shared/odontogram/odontogram-wire.ts", import.meta.url),
  "utf8",
);

for (const token of [
  "MIXED_DENTITION_SITES",
  "pediatricReplacementSite",
  "primary_first_molar",
  "primary_second_molar",
  "initialEntities={entities}",
]) {
  assert(
    pediatric.includes(token) || workspace.includes(token),
    `Falta contrato pediátrico: ${token}`,
  );
}
assert(
  !domain.includes('upper: ["16", "55", "54", "53", "12", "11"'),
  "No debe reaparecer la dentición mixta fija antigua",
);
assert(domain.includes('"SUPERNUMERARY_TOOTH"'), "El dominio debe aceptar supernumerarios");
// The wire reads every family from the domain registry, so supernumeraries (and any family the
// domain adds) load and save without a second hand-kept list that can fall behind.
assert(
  /DENTAL_ENTITY_TYPES = \[[\s\S]*?"SUPERNUMERARY_TOOTH"/.test(domain),
  "El registro de familias del dominio debe incluir supernumerarios",
);
assert(
  /new Set<string>\(DENTAL_ENTITY_TYPES\)/.test(wire),
  "El wire debe persistir supernumerarios usando el registro de familias del dominio",
);
for (const token of [
  "createSupernumeraryToothEntity",
  "Código ISO 10394",
  "Aplicar a supernumerario",
  "anchorFdi",
]) {
  assert(
    supernumerary.includes(token) || domain.includes(token),
    `Falta contrato supernumerario: ${token}`,
  );
}
assert(
  workspace.includes("<SupernumeraryPanel"),
  "El odontograma adulto debe exponer piezas adicionales",
);
console.log("Stage 6 dentition UI contract: PASS");
