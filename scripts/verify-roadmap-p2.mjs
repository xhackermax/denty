import fs from "node:fs";
const registry = fs.readFileSync(
  new URL("../src/features/assistant/tools/assistant-tool-registry.ts", import.meta.url),
  "utf8",
);
const policy = fs.readFileSync(
  new URL("../src/features/assistant/tools/assistant-policy.ts", import.meta.url),
  "utf8",
);
for (const token of [
  "appointment.reschedule",
  "appointment.mark_no_show",
  "documents.export",
  "recall.create",
])
  if (!registry.includes(token)) throw new Error(`Missing assistant tool ${token}`);
for (const token of ["UNKNOWN_TOOL", "PATIENT_REQUIRED", "CONSEQUENTIAL_ACTION"])
  if (!policy.includes(token)) throw new Error(`Missing assistant policy ${token}`);
console.log("Denty roadmap P2 assistant policy verification: OK");
