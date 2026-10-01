import fs from "node:fs";
import assert from "node:assert/strict";

const migration = "supabase/migrations/20260928112000_stage11_tasks.sql";
assert.ok(fs.existsSync(migration), "Stage 11 tasks migration missing");
const sql = fs.readFileSync(migration, "utf8").toLowerCase();
for (const token of [
  "create table if not exists public.tasks",
  "create or replace function public.create_task",
  "create or replace function public.update_task_status",
  "source_type",
  "source_id",
  "assignee_staff_id",
  "due_at",
  "private.audit_sensitive_mutation()",
  "private.broadcast_denty_change()",
])
  assert.ok(sql.includes(token), `Missing task SQL contract: ${token}`);

const tasks = fs.readFileSync("src/features/parity/tasks-page.tsx", "utf8");
assert.ok(
  !/DEMO_TASKS|Vista previa en modo demo|Confirmar solo/i.test(tasks),
  "Tasks page still contains demo/no-op behavior",
);
for (const href of [
  "/app/patients",
  "/app/agenda",
  "/app/prescriptions",
  "/app/finance",
  "/app/laboratory",
])
  assert.ok(tasks.includes(href), `Quick action missing real destination ${href}`);
assert.match(tasks, /<TasksTimeline/, "Tasks page must render the persistent timeline");
const timeline = fs.readFileSync("src/features/parity/tasks/tasks-timeline.tsx", "utf8");
assert.match(timeline, /getBrowserApi\(\)\.tasks/, "Timeline must use persistent task API");
assert.match(
  timeline,
  /useTaskActions\(resolvedApi\)/,
  "Timeline must persist mutations through task actions",
);
const route = fs.readFileSync("src/server/denty-supabase/route-handler.ts", "utf8");
assert.ok(route.includes('parts[1] === "tasks"'), "Task routes missing from Supabase handler");
console.log("Stage 11 tasks contract PASS");
