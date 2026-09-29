import fs from "node:fs";
const required = [
  "src/domain/appointment-lifecycle.ts",
  "src/domain/availability-engine.ts",
  "src/domain/document-export.ts",
  "src/domain/payment-ledger.ts",
  "src/domain/treatment-gate.ts",
  "src/domain/__tests__/roadmap-p1.test.ts",
  "supabase/migrations/20260927143000_roadmap_p1_clinical_operations.sql",
];
const missing = required.filter((p) => !fs.existsSync(new URL(`../${p}`, import.meta.url)));
if (missing.length) {
  console.error("P1 roadmap missing:", missing);
  process.exit(1);
}
const migration = fs.readFileSync(
  new URL(
    "../supabase/migrations/20260927143000_roadmap_p1_clinical_operations.sql",
    import.meta.url,
  ),
  "utf8",
);
for (const token of [
  "appointment_blocks",
  "payment_allocations",
  "patient_recalls",
  "enable row level security",
])
  if (!migration.includes(token)) {
    console.error("Missing migration token", token);
    process.exit(1);
  }
console.log("Denty roadmap P1 structural verification: OK");
