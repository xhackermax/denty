import { readFile } from "node:fs/promises";

const sql = await readFile(
  "supabase/migrations/20260928100000_stage10_laboratories_supplier_ledger.sql",
  "utf8",
);

if (/clinical_plan_items\s+i[\s\S]{0,240}\bi\.patient_id\b/u.test(sql)) {
  throw new Error(
    "Stage 10 plan reference must not read non-existent clinical_plan_items.patient_id",
  );
}
if (
  !/clinical_plan_items\s+i\s+join\s+public\.clinical_plans\s+p\s+on\s+p\.id\s*=\s*i\.plan_id/u.test(
    sql,
  )
) {
  throw new Error("Stage 10 plan reference must validate patient through clinical_plans");
}
if (!/p\.patient_id\s*=\s*p_patient_id/u.test(sql)) {
  throw new Error("Stage 10 plan reference must bind clinical plan to the requested patient");
}

console.log("stage10 laboratory plan reference contract: PASS");
