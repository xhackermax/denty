import assert from "node:assert/strict";
import fs from "node:fs";

const restClient = fs.readFileSync("src/server/supabase/rest-client.ts", "utf8");
const repo = fs.readFileSync("src/server/denty-supabase/patient-repository.ts", "utf8");
const routeHandler = fs.readFileSync("src/server/denty-supabase/route-handler.ts", "utf8");

assert.match(
  restClient,
  /async\s+rpc<[^>]+>\s*\(/i,
  "SupabaseRestClient debe exponer rpc<T>() con JWT del usuario",
);
assert.match(restClient, /\/rest\/v1\/rpc\//i, "rpc<T>() debe usar PostgREST RPC");
assert.match(
  repo,
  /this\.client\.rpc<[\s\S]*?>\(\s*["']save_odontogram_batch["']/i,
  "saveOdontogramBatch debe cruzar una única frontera transaccional RPC",
);
assert.doesNotMatch(
  repo,
  /async\s+saveOdontogramBatch[\s\S]*?patchMany\([\s\S]*?dental_entities/i,
  "saveOdontogramBatch no debe encadenar escrituras REST independientes",
);
assert.match(routeHandler, /resolveSupabasePublicCredentials/i);
assert.match(routeHandler, /accessToken/i);

console.log("Stage 2 runtime RPC contract OK.");
