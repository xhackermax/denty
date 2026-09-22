import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const manifestUrl = new URL("./games/legacy-hashes.json", import.meta.url);
const manifest = JSON.parse(await readFile(manifestUrl, "utf8"));

for (const [relativePath, expectedHash] of Object.entries(manifest)) {
  const bytes = await readFile(new URL(`../${relativePath}`, import.meta.url));
  const actualHash = createHash("sha256").update(bytes).digest("hex");
  if (actualHash !== expectedHash) {
    throw new Error(`Denty Games integrity gate: ${relativePath} changed`);
  }
}

console.log(`Denty Games integrity gate OK: ${Object.keys(manifest).length} assets verified.`);
