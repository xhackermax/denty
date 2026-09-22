import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const MANIFEST = path.join(ROOT, "docs", "legacy-api-routes.json");
const RESOURCE_DIR = path.join(ROOT, "src", "shared", "api", "resources");
const EVENTS_FILE = path.join(ROOT, "src", "shared", "api", "events.ts");

function normalizeTemplate(value) {
  return value
    .replace(/\$\{encodeId\((\w+)\)\}/g, ":$1")
    .replace(/\$\{(\w+)\}/g, ":$1");
}

function genericRoute(method, route) {
  return `${method.toUpperCase()} ${route.replace(/:[A-Za-z0-9_]+/g, ":param")}`;
}

function readBalancedCall(source, start) {
  const open = source.indexOf("(", start);
  if (open < 0) return "";
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let index = open; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "(") depth += 1;
    if (char === ")") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  return source.slice(start);
}

function extractClientRoutes(source) {
  const routes = [];
  const callPattern = /client\.(requestBlob|requestText|request|mutation)\s*\(/g;
  for (const match of source.matchAll(callPattern)) {
    const call = readBalancedCall(source, match.index ?? 0);
    const routeMatch = call.match(/([`"'])((?:\/api\/|\/health)[^`"']*)\1/s);
    if (!routeMatch) continue;
    const methodOverride = call.match(/method:\s*["'](GET|POST|PATCH|PUT|DELETE)["']/);
    const method = methodOverride?.[1] ?? (match[1] === "mutation" ? "POST" : "GET");
    routes.push(genericRoute(method, normalizeTemplate(routeMatch[2])));
  }
  return routes;
}

const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
const files = (await readdir(RESOURCE_DIR)).filter((file) => file.endsWith(".ts"));
const current = new Set();
for (const file of files) {
  const source = await readFile(path.join(RESOURCE_DIR, file), "utf8");
  for (const route of extractClientRoutes(source)) current.add(route);
}

const eventSource = await readFile(EVENTS_FILE, "utf8");
const eventMatch = eventSource.match(/DENTY_EVENTS_PATH\s*=\s*["']([^"']+)["']/);
if (eventMatch) current.add(genericRoute("GET", eventMatch[1]));

const expected = new Set();
const forbidden = new Set();
for (const route of manifest.routes) {
  if (route.kind === "server_only") {
    forbidden.add(genericRoute(route.method, route.path));
    continue;
  }
  const effectivePath = route.kind === "legacy_bug" ? route.correctedPath : route.path;
  expected.add(genericRoute(route.method, effectivePath));
}

const missing = [...expected].filter((route) => !current.has(route)).sort();
const leakedServerOnly = [...forbidden].filter((route) => current.has(route)).sort();
const extras = [...current].filter((route) => !expected.has(route)).sort();

if (missing.length || leakedServerOnly.length || extras.length) {
  const lines = ["API parity gate failed."];
  if (missing.length) lines.push(`Missing: ${missing.join(", ")}`);
  if (leakedServerOnly.length) {
    lines.push(`Server-only routes exposed to browser client: ${leakedServerOnly.join(", ")}`);
  }
  if (extras.length) lines.push(`Unverified browser routes: ${extras.join(", ")}`);
  throw new Error(lines.join("\n"));
}

console.log(
  `API parity gate OK: ${expected.size}/${expected.size} browser contracts represented; ` +
    `${forbidden.size} server-only routes excluded.`,
);
