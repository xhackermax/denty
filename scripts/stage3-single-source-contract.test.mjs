import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const root = process.cwd();
const read = (p) => readFileSync(resolve(root, p), "utf8");
const pkg = JSON.parse(read("package.json"));
const removedAccountWord = ["de", "mo"].join("");
const removedAccountUpperPrefix = ["DE", "MO", "_"].join("");
const removedModeVariable = ["de", "mo", "Mode"].join("");
const removedPublicFlag = ["NEXT", "PUBLIC", "DE", "MO", "MODE"].join("_");
const removedClinicPath = ["/api/clinic/", removedAccountWord].join("");
const legacyBackendEnv = ["DENTY", "API", "URL"].join("_");
const removedAccountPattern = new RegExp(
  `(?:@/shared/${removedAccountWord}|\\b${removedAccountUpperPrefix}[A-Z0-9_]+\\b|\\bINITIAL_ALERTS\\b|\\b${removedModeVariable}\\b|\\b${removedAccountWord}\\b)`,
  "i",
);

assert.ok(pkg.dependencies?.["@supabase/supabase-js"], "Stage 3 requires @supabase/supabase-js");
assert.ok(pkg.dependencies?.["@supabase/ssr"], "Stage 3 requires @supabase/ssr");

const forbiddenEnvText = [
  read(".env.example"),
  read("src/shared/config/env.ts"),
  read("vercel.json"),
].join("\n");
assert.equal(
  forbiddenEnvText.includes(legacyBackendEnv),
  false,
  "legacy backend env flag must be removed",
);
assert.equal(
  forbiddenEnvText.includes(removedPublicFlag),
  false,
  "removed account env flag must be removed",
);

const srcRoot = resolve(root, "src");
const sourceFiles = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full);
    else if (/\.(?:ts|tsx|js|jsx)$/.test(name) && !/\.test\./.test(name) && !/__tests__/.test(full))
      sourceFiles.push(full);
  }
}
walk(srcRoot);

const runtime = sourceFiles.map((file) => [relative(root, file), readFileSync(file, "utf8")]);
for (const [file, text] of runtime) {
  assert.doesNotMatch(text, removedAccountPattern, `${file}: removed account/runtime residue`);
  assert.equal(text.includes(removedPublicFlag), false, `${file}: removed account toggle residue`);
  assert.equal(text.includes(legacyBackendEnv), false, `${file}: legacy backend residue`);
}
assert.ok(
  !existsSync(resolve(root, `src/shared/${removedAccountWord}`)),
  "removed account fixture directory must be deleted",
);
const patientAssetsDir = resolve(root, "public/assets/patients");
if (existsSync(patientAssetsDir)) {
  for (const name of readdirSync(patientAssetsDir)) {
    assert.equal(
      name.toLowerCase().includes(removedAccountWord),
      false,
      `patient asset residue: ${name}`,
    );
  }
}

const publicRuntimeFiles = [
  "public/games/js/app.js",
  "public/games/js/core/server-session.js",
  "public/games/styles.css",
  "messages/es.json",
  "src/shared/api/legacy-api-routes.json",
  "docs/legacy-api-routes.json",
];
for (const file of publicRuntimeFiles) {
  if (!existsSync(resolve(root, file))) continue;
  const text = read(file);
  assert.equal(text.includes(removedPublicFlag), false, `${file}: removed account toggle residue`);
  assert.equal(text.includes(legacyBackendEnv), false, `${file}: legacy backend residue`);
  assert.equal(text.includes(removedClinicPath), false, `${file}: removed account route residue`);
  assert.doesNotMatch(text, removedAccountPattern, `${file}: removed account residue`);
}
assert.ok(
  !existsSync(resolve(root, "src/shared/api/events.ts")),
  "legacy EventSource transport must be deleted",
);
assert.doesNotMatch(
  runtime.map(([, t]) => t).join("\n"),
  /new\s+EventSource\s*\(/,
  "SSE/EventSource must not be used for application realtime",
);

const webStorageAllow = new Set([
  "src/app/layout.tsx",
  "src/app/_components/shell/time-color-scheme-provider.tsx",
  "src/shared/ui/density-provider.tsx",
  // Site selection is a UI preference; identity and permissions still come from Auth.
  "src/shared/tenancy/active-context.tsx",
]);
const tenantContext =
  runtime.find(([file]) => file === "src/shared/tenancy/active-context.tsx")?.[1] ?? "";
assert.match(tenantContext, /activeClinicId:\s*sessionQuery\.data\?\.actor\.clinicId/);
assert.match(tenantContext, /permissions:\s*sessionQuery\.data\?\.actor\.permissions/);
assert.doesNotMatch(
  tenantContext,
  /(?:localStorage|sessionStorage)\.(?:getItem|setItem)\((?!ACTIVE_SITE_STORAGE_KEY)/,
);
for (const [file, text] of runtime) {
  if (!webStorageAllow.has(file)) {
    assert.doesNotMatch(
      text,
      /\b(?:localStorage|sessionStorage|indexedDB)\b/,
      `${file}: operational data cannot use browser storage`,
    );
  }
}

const requestHandler = read("src/server/denty-api/request-handler.ts");
assert.doesNotMatch(
  requestHandler,
  /proxyToConfiguredBackend|API_UNREACHABLE/,
  "Denty route handler cannot fall back to a second backend",
);
assert.equal(requestHandler.includes(legacyBackendEnv), false, "legacy backend env residue");
assert.match(
  requestHandler,
  /SUPABASE_ROUTE_NOT_IMPLEMENTED/,
  "unimplemented Supabase routes must fail explicitly",
);

const bridge = read("src/shared/query/realtime-bridge.tsx");
assert.match(bridge, /\.channel\(/, "Realtime bridge must use a Supabase channel");
assert.match(bridge, /broadcast/, "Realtime bridge must consume Broadcast events");
assert.doesNotMatch(
  bridge,
  /openBrowserDentyEventStream|EventSource/,
  "Realtime bridge must not use legacy SSE",
);

const keys = read("src/shared/query/keys.ts");
for (const domain of [
  "patients",
  "appointments",
  "clinical",
  "documents",
  "prescriptions",
  "laboratory",
  "finance",
  "alerts",
  "analytics",
  "dashboard",
  "staff",
  "portal",
  "communications",
  "campaigns",
  "settings",
  "treatmentCatalog",
]) {
  assert.match(keys, new RegExp(`\\b${domain}\\s*:`), `query-key factory missing ${domain}`);
}
for (const [file, text] of runtime) {
  if (file === "src/shared/query/keys.ts") continue;
  assert.doesNotMatch(
    text,
    /queryKey\s*:\s*\[/,
    `${file}: query key must come from dentyQueryKeys`,
  );
}

const analytics = read("src/shared/api/schemas/analytics.ts");
assert.doesNotMatch(
  analytics,
  /\.passthrough\(\)|\.catchall\(/,
  "analytics outputs must reject unspecified fields",
);

const offlinePolicyPath = "docs/architecture/data-authority-and-offline-policy.md";
assert.ok(
  existsSync(resolve(root, offlinePolicyPath)),
  "Stage 3 requires an explicit data-authority/offline policy",
);
const offlinePolicy = read(offlinePolicyPath);
assert.match(offlinePolicy, /Supabase\/PostgreSQL is the canonical source of truth/i);
assert.match(offlinePolicy, /online-first with local presentation caches/i);
assert.match(offlinePolicy, /durable encrypted outbox/i);

const stage3Migration = read(
  "supabase/migrations/20260928030000_stage3_realtime_single_source.sql",
);
assert.match(
  stage3Migration,
  /realtime\.broadcast_changes\(/,
  "database changes must broadcast through Supabase Realtime",
);
assert.match(stage3Migration, /clinic_members/, "Realtime authorization must be clinic-scoped");

assert.ok(
  existsSync(resolve(root, "src/shared/tenancy/active-context.tsx")),
  "canonical clinic/site context is required",
);
const context = read("src/shared/tenancy/active-context.tsx");
assert.match(context, /activeClinicId/);
assert.match(context, /activeSiteId/);

console.log("stage3-single-source-contract: ok");

const agendaData = read("src/features/agenda/agenda-data.ts");
assert.match(
  agendaData,
  /appointments\.day\(date,\s*siteId\)/,
  "agenda cache key must include site",
);
assert.match(
  agendaData,
  /appointments\.list\(date,\s*siteId(?:\s*\?\?\s*undefined)?\)/,
  "agenda request must include site",
);

const coreResource = read("src/shared/api/resources/core.ts");
assert.match(
  coreResource,
  /appointments:[\s\S]*list:\s*\(date\?: string, siteId\?: string/,
  "appointment resource must accept site scope",
);

for (const required of [
  ["alerts", ["dentyQueryKeys.alerts.root", "dentyQueryKeys.dashboard.root"]],
  [
    "payments",
    [
      "dentyQueryKeys.finance.root",
      "dentyQueryKeys.analytics.root",
      "dentyQueryKeys.dashboard.root",
    ],
  ],
  [
    "lab_works",
    [
      "dentyQueryKeys.laboratory.root",
      "dentyQueryKeys.finance.root",
      "dentyQueryKeys.analytics.root",
      "dentyQueryKeys.dashboard.root",
    ],
  ],
]) {
  const [table, keys] = required;
  const line = bridge.split("\n").find((entry) => entry.includes(`${table}:`)) ?? "";
  for (const key of keys) assert.ok(line.includes(key), `${table} must invalidate ${key}`);
}
