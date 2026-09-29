import fs from "node:fs";
import assert from "node:assert/strict";
const storage = fs.readFileSync("src/server/storage/storage-repository.ts", "utf8");
assert.ok(
  storage.includes("file.name.toLowerCase()"),
  "lab attachment validation must inspect filename for generic binary uploads",
);
assert.ok(
  storage.includes('mimeType === "application/octet-stream"') &&
    storage.includes('endsWith(".stl")'),
  "generic binary uploads must be limited to STL",
);
console.log("stage10 laboratory attachment security contract: PASS");
