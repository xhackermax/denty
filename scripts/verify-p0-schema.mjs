import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const dir = path.resolve("supabase/migrations");
const files = (await readdir(dir)).filter((name) => name.endsWith(".sql")).sort();
const sql = (await Promise.all(files.map((name) => readFile(path.join(dir, name), "utf8")))).join("\n");
const requiredTables = [
  "profiles", "clinic_members", "user_permissions", "patient_accounts",
  "appointment_status_events", "appointment_relationships", "notifications",
  "document_exports", "payments", "audit_log",
];
const failures = [];
for (const table of requiredTables) {
  if (!new RegExp(`create\\s+table\\s+if\\s+not\\s+exists\\s+public\\.${table}\\b`, "i").test(sql)) failures.push(`missing table ${table}`);
  if (!new RegExp(`alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`, "i").test(sql)) failures.push(`missing RLS ${table}`);
}
for (const fn of ["is_clinic_member", "is_clinic_admin", "can_access_patient"]) {
  if (!new RegExp(`function\\s+public\\.${fn}\\b`, "i").test(sql)) failures.push(`missing function ${fn}`);
}
for (const column of ["arrived_at", "waiting_room_at", "chair_started_at", "completed_at", "no_show_at"]) {
  if (!new RegExp(`appointments\\s+add\\s+column\\s+if\\s+not\\s+exists\\s+${column}\\b`, "i").test(sql)) failures.push(`missing appointment timestamp ${column}`);
}
if (!/documents\s+add\s+column\s+if\s+not\s+exists\s+checksum\b/i.test(sql)) failures.push("missing document checksum");
if (!/payments_access[\s\S]*can_access_patient/i.test(sql)) failures.push("missing patient-isolated payment policy");
if (!/documents_access[\s\S]*can_access_patient/i.test(sql)) failures.push("missing patient-isolated document policy");

if (failures.length) {
  console.error(`P0 Supabase schema: FAIL\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("P0 Supabase schema: OK");
