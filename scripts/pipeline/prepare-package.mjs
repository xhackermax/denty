import { access, cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const destination = path.join(root, ".artifacts", "vercel-package", "root");
const excludedTopLevel = new Set([
  ".git",
  ".vercel",
  ".next",
  ".artifacts",
  "node_modules",
  "coverage",
  "playwright-report",
  "test-results",
]);

await access(path.join(root, "package-lock.json"));
await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });

for (const entry of await readdir(root, { withFileTypes: true })) {
  if (excludedTopLevel.has(entry.name)) continue;
  await cp(path.join(root, entry.name), path.join(destination, entry.name), { recursive: true });
}


const vercelPath = path.join(destination, "vercel.json");
const vercel = JSON.parse(await readFile(vercelPath, "utf8"));
vercel.installCommand = "npm ci";
vercel.buildCommand = "node scripts/pipeline/run.mjs vercel-build";
await writeFile(vercelPath, `${JSON.stringify(vercel, null, 2)}\n`);

console.log(`Prepared verified Vercel root at ${path.relative(root, destination)}`);
