import fs from "node:fs";
import assert from "node:assert/strict";

const pdf = fs.readFileSync("src/server/denty-supabase/prescription-pdf.ts", "utf8");
assert.ok(
  pdf.includes("/Encoding /WinAnsiEncoding"),
  "Prescription PDF font must declare WinAnsi encoding for Spanish names",
);
assert.ok(
  pdf.includes("encodeWinAnsi"),
  "Prescription PDF must encode supported Spanish characters instead of replacing all non-ASCII",
);
assert.doesNotMatch(
  pdf,
  /replaceAll\(\/\[\^\\x20-\\x7E\]\+?\/g,\s*["']\?["']\)/,
  "Prescription PDF must not blanket-replace accents with ?",
);
console.log("Stage 12 prescription PDF encoding contract PASS");
