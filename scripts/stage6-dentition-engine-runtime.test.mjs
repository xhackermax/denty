import assert from "node:assert/strict";
import {
  MIXED_DENTITION_SITES,
  PRIMARY_FDI,
  PERMANENT_FDI,
  createSupernumeraryIdentity,
  defaultMixedPresence,
  mixedDentitionCandidates,
  standardTooth,
} from "../src/domain/odontogram/dentition.ts";

assert.equal(PRIMARY_FDI.length, 20, "La dentición temporal debe tener 20 piezas");
assert.equal(new Set(PRIMARY_FDI).size, 20, "No debe haber FDI temporales duplicados");
assert.equal(PERMANENT_FDI.length, 32, "La dentición permanente debe tener 32 piezas");

assert.equal(standardTooth("55").type, "primary_second_molar");
assert.equal(standardTooth("54").type, "primary_first_molar");
assert.equal(standardTooth("51").successorFdi, "11");
assert.equal(standardTooth("55").successorFdi, "15");
assert.equal(standardTooth("15").predecessorFdi, "55");
assert.equal(standardTooth("11").type, "central_incisor");
assert.equal(standardTooth("12").type, "lateral_incisor");
assert.equal(standardTooth("16").type, "first_molar");

const mixed = mixedDentitionCandidates();
assert(
  mixed.upper.includes("55") && mixed.upper.includes("15"),
  "Mixta debe poder representar temporal y sucesor",
);
assert(
  mixed.lower.includes("85") && mixed.lower.includes("45"),
  "Mixta inferior debe poder representar temporal y sucesor",
);
assert(
  MIXED_DENTITION_SITES.upper.some(
    (site) => site.primaryFdi === "55" && site.permanentFdi === "15",
  ),
);
assert(MIXED_DENTITION_SITES.upper.some((site) => site.permanentFdi === "16" && !site.primaryFdi));

const defaults = defaultMixedPresence();
assert(
  defaults.has("55") && defaults.has("16"),
  "La sugerencia inicial puede coexistir, pero no define la dentición real",
);
assert(!defaults.has("15"), "El sucesor puede existir como candidato sin asumirse presente");

const sup = createSupernumeraryIdentity({
  id: "abc",
  anchorFdi: "11",
  iso10394Designation: "a1",
  clinicalType: "mesiodens",
  morphology: "conical",
});
assert.equal(sup.key, "supernumerary:abc");
assert.equal(sup.anchorFdi, "11");
assert.equal(sup.arch, "upper");
assert.equal(sup.iso10394Designation, "A1");
assert.throws(
  () => createSupernumeraryIdentity({ id: "abc", anchorFdi: "11", iso10394Designation: "ABC" }),
  /dos caracteres/,
);

console.log("Stage 6 dentition engine runtime: PASS");
