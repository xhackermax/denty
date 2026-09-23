import { readFile } from "node:fs/promises";

function fail(message) {
  throw new Error(`Supabase link gate: ${message}`);
}

const envSource = await readFile(".env.example", "utf8");
const serverEnv = await readFile("src/shared/config/env.ts", "utf8");
const healthRoute = await readFile("src/app/api/health/supabase/route.ts", "utf8");
const docs = await readFile("docs/FINAL-R6-DEPLOY-AND-SAAS-AUDIT.md", "utf8");

for (const name of [
  "SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
]) {
  if (!envSource.includes(name)) fail(`.env.example no documenta ${name}`);
  if (!serverEnv.includes(name)) fail(`env.ts no valida ${name}`);
}

if (!healthRoute.includes("/rest/v1/")) fail("healthcheck no comprueba PostgREST");
if (!healthRoute.includes("cache-control")) fail("healthcheck debe ser no-store");

const combinedSources = envSource + serverEnv + healthRoute;
const jwtPrefix = ["ey", "J"].join("");
const knownSecretCanary = ["Funcional", "2020"].join("");

if (
  combinedSources.includes(jwtPrefix) ||
  combinedSources.includes(knownSecretCanary) ||
  /service_role_[A-Za-z0-9]/u.test(combinedSources)
) {
  fail("se detecto un secreto hardcodeado");
}

if (!docs.includes("/api/health/supabase"))
  fail("la auditoria debe documentar el healthcheck Supabase");

console.log("Supabase link gate OK");
