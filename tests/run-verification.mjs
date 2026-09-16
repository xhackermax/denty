import { readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const self = "run-verification.mjs";
const files = readdirSync(here)
  .filter((name) => name.startsWith("verify_") && name.endsWith(".mjs") && name !== self)
  .sort();

let failures = 0;
for (const name of files) {
  const result = spawnSync(process.execPath, ["--experimental-strip-types", resolve(here, name)], { stdio: "inherit", env: process.env });
  if (result.status !== 0) failures += 1;
}
if (failures) {
  console.error(`Verification failed: ${failures}/${files.length} file(s) failed.`);
  process.exit(1);
}
console.log(`Verification complete: ${files.length}/${files.length} files passed.`);
