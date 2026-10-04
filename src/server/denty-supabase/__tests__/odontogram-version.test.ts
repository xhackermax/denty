import { describe, expect, it, vi } from "vitest";

import { currentOdontogramVersion } from "../odontogram-version";

function clientReturning(rows: { version: number }[]) {
  return { select: vi.fn(async () => rows) };
}

describe("currentOdontogramVersion", () => {
  it("reads the highest version across active and deactivated rows", async () => {
    const client = clientReturning([{ version: 4 }]);
    await expect(currentOdontogramVersion(client, "p-1")).resolves.toBe(4);
    const [table, query] = client.select.mock.calls[0] as unknown as [
      string,
      Record<string, unknown>,
    ];
    expect(table).toBe("dental_entities");
    // Emptying the chart deactivates every row; ignoring them would rewind the version.
    expect(query).not.toHaveProperty("active");
    expect(query).toMatchObject({ patient_id: "eq.p-1", order: "version.desc", limit: 1 });
  });

  it("starts at version 1 for a patient with no chart yet", async () => {
    await expect(currentOdontogramVersion(clientReturning([]), "p-1")).resolves.toBe(1);
  });

  it("propagates read failures instead of guessing a version", async () => {
    const client = { select: vi.fn(async () => Promise.reject(new Error("offline"))) };
    await expect(currentOdontogramVersion(client, "p-1")).rejects.toThrow("offline");
  });
});
