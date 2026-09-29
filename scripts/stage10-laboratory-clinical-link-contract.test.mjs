import fs from "node:fs";
import assert from "node:assert/strict";

const clinical = fs.readFileSync("src/shared/clinical/clinical-workspace.tsx", "utf8");
const lab = fs.readFileSync("src/features/parity/modules/laboratory-module.tsx", "utf8");

assert.ok(
  clinical.includes("/app/laboratory?patientId="),
  "plan must open laboratory with patient context",
);
assert.ok(clinical.includes("planItemId="), "plan must pass clinical plan item to laboratory");
assert.ok(
  clinical.includes("requiresLab"),
  "plan action must be driven by treatment catalog lab requirement",
);
assert.ok(lab.includes("useSearchParams"), "laboratory must consume plan deep-link context");
assert.ok(
  lab.includes('searchParams.get("patientId")'),
  "laboratory must preselect patient from plan",
);
assert.ok(
  lab.includes('searchParams.get("planItemId")'),
  "laboratory must preselect plan item from plan",
);
assert.ok(
  lab.includes("clearable={!deepLinkedPlanItemId}"),
  "plan-origin lab work must keep its clinical plan link",
);
assert.ok(
  lab.includes('clinicalPipelineHref("plan"'),
  "lab work must navigate back to patient plan",
);
assert.ok(
  lab.includes("/app/agenda?appointmentId="),
  "lab work with appointment link must navigate to agenda context",
);

console.log("stage10 laboratory clinical link contract: PASS");
