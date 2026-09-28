import fs from "node:fs";

const domain = fs.readFileSync("src/domain/odontogram/index.ts", "utf8");
const panel = fs.readFileSync("src/features/odontogram/pediatric-panel.tsx", "utf8");

const expectedUpper = ['"55"', '"54"', '"53"', '"52"', '"51"', '"61"', '"62"', '"63"', '"64"', '"65"'];
const expectedLower = ['"85"', '"84"', '"83"', '"82"', '"81"', '"71"', '"72"', '"73"', '"74"', '"75"'];

function extractArray(name) {
  const match = domain.match(new RegExp(`export const ${name} = \\[([\\s\\S]*?)\\] as const;`));
  if (!match) throw new Error(`Missing ${name}`);
  return [...match[1].matchAll(/"\d{2}"/g)].map((item) => item[0]);
}

const actualUpper = extractArray("TEMPORARY_UPPER");
const actualLower = extractArray("TEMPORARY_LOWER");
if (JSON.stringify(actualUpper) !== JSON.stringify(expectedUpper)) {
  throw new Error(`FDI temporal superior incorrecto: ${actualUpper.join(" ")}`);
}
if (JSON.stringify(actualLower) !== JSON.stringify(expectedLower)) {
  throw new Error(`FDI temporal inferior incorrecto: ${actualLower.join(" ")}`);
}
for (const token of ["SegmentedControl", 'label: "Temporal"', 'label: "Mixta"']) {
  if (!panel.includes(token)) throw new Error(`Pediatric dentition selector missing: ${token}`);
}
if (!panel.includes('!birthDate || suggestedStage === "primary" ? "primary" : "mixed"')) {
  throw new Error("Pediatric panel must default to temporary dentition when birth date is missing");
}
console.log("pediatric-numbering-regression: ok");
