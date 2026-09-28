import { readFile } from "node:fs/promises";

const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const nvm = (await readFile(new URL("../.nvmrc", import.meta.url), "utf8")).trim();
const nodeVersion = (await readFile(new URL("../.node-version", import.meta.url), "utf8")).trim();
const vercel = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));

const failures = [];
if (pkg.engines?.node !== "24.x") failures.push(`package.json engines.node=${pkg.engines?.node ?? "missing"}`);
if (nvm !== "24") failures.push(`.nvmrc=${nvm || "empty"}`);
if (nodeVersion !== "24") failures.push(`.node-version=${nodeVersion || "empty"}`);
if (vercel.installCommand !== "npm ci") failures.push(`vercel installCommand=${vercel.installCommand ?? "missing"}`);
if (!String(vercel.buildCommand ?? "").includes("vercel-build")) failures.push("Vercel buildCommand must use the verified vercel-build pipeline");

if (failures.length) {
  console.error(`Node 24 release configuration: FAIL\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("Node 24 release configuration: OK");
