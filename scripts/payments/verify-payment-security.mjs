import fs from "node:fs";
import path from "node:path";
const read = (p) => fs.readFileSync(p, "utf8");
const fail = (m) => {
  console.error(`PAYMENTS SECURITY FAIL: ${m}`);
  process.exitCode = 1;
};
const migration = read("supabase/migrations/20260927210000_payment_providers.sql");
for (const token of [
  "payment_attempts",
  "payment_attempts_clinic_provider_idempotency_idx",
  "enable row level security",
])
  if (!migration.toLowerCase().includes(token)) fail(`missing ${token}`);
const files = [];
function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(ts|tsx|js|mjs)$/.test(e.name)) files.push(p);
  }
}
walk("src");
for (const f of files) {
  const s = read(f);
  if (/NEXT_PUBLIC_(STRIPE|SUMUP)_(SECRET|API|KEY)/.test(s))
    fail(`public payment secret reference in ${f}`);
}
const route = read("src/app/api/denty/[...path]/route.ts");
if (/body\.connectedAccountId/.test(route)) fail("client controls Stripe connected account");
if (!process.exitCode) console.log("payment security gate: OK");
