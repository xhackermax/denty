import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("Denty Games static runtime", () => {
  it("passes the patient record number into the server session bootstrap", () => {
    const app = readFileSync(join(root, "public/games/js/app.js"), "utf8");
    const session = readFileSync(join(root, "public/games/js/core/server-session.js"), "utf8");

    expect(app).toMatch(/params\.get\('recordNumber'\)/);
    expect(app).toMatch(/DG\.serverSession\.init\([^)]*patientId[^)]*recordNumber/s);
    expect(session).toMatch(/function init\(id,\s*recordNumber\)/);
    expect(session).toMatch(/fallbackRecordLabel/);
  });
});
