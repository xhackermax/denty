import { beforeEach, describe, expect, it, vi } from "vitest";

const api = {
  clinical: {
    odontogram: { get: vi.fn(), batch: vi.fn() },
    sync: { plan: vi.fn() },
  },
};

vi.mock("@/shared/api/browser", () => ({ getBrowserApi: () => api }));

import { evaluateAssistantCall } from "../tools/assistant-policy";
import { executeAssistantTool } from "../tools/assistant-tool-executor";

const call = (name: string, args: Record<string, unknown> = {}) => ({
  id: "1",
  name,
  args,
  source: "LOCAL_NLU" as const,
});

const args = { patientId: "p1", tooth: "27", treatmentCode: "extraction", surfaces: [] };

describe("treatment tools policy", () => {
  it.each(["clinical.add_item", "clinical.mark_unsatisfactory"])(
    "allows %s for clinicians with an open patient",
    (name) => {
      expect(evaluateAssistantCall(call(name), { role: "DENTIST", patientId: "p1" }).decision).toBe(
        "ALLOW",
      );
    },
  );

  it("asks for confirmation before recording a treatment as done", () => {
    expect(
      evaluateAssistantCall(call("clinical.complete_item"), { role: "DENTIST", patientId: "p1" })
        .decision,
    ).toBe("CONFIRM");
  });

  it("blocks treatments without an open patient", () => {
    expect(evaluateAssistantCall(call("clinical.add_item"), { role: "DENTIST" }).decision).toBe(
      "BLOCK",
    );
  });
});

describe("treatment tools execution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.clinical.odontogram.get.mockResolvedValue({ version: 1, entities: [] });
    api.clinical.odontogram.batch.mockResolvedValue({ version: 2, entities: [] });
    api.clinical.sync.plan.mockResolvedValue({});
  });

  it("draws a planned extraction on the odontogram and syncs the plan", async () => {
    await executeAssistantTool(call("clinical.add_item", args));

    expect(api.clinical.odontogram.batch).toHaveBeenCalledWith(
      "p1",
      expect.objectContaining({
        entities: [expect.objectContaining({ tooth: "27", entityType: "EXTRACTION" })],
      }),
    );
    expect(api.clinical.sync.plan).toHaveBeenCalledWith("p1");
  });

  it("records a completed extraction as a missing tooth and lets the plan follow it", async () => {
    await executeAssistantTool(call("clinical.complete_item", args));

    expect(api.clinical.odontogram.batch).toHaveBeenCalledWith(
      "p1",
      expect.objectContaining({
        entities: [expect.objectContaining({ tooth: "27", entityType: "MISSING" })],
      }),
    );
    // The plan sync closes a planned extraction instead of leaving it pending.
    expect(api.clinical.sync.plan).toHaveBeenCalledOnce();
  });

  it("keeps the odontogram write when the plan sync fails", async () => {
    api.clinical.sync.plan.mockRejectedValue(new Error("boom"));

    await expect(executeAssistantTool(call("clinical.add_item", args))).resolves.toEqual({
      type: "NONE",
    });
    expect(api.clinical.odontogram.batch).toHaveBeenCalledOnce();
  });

  it("rejects a treatment that cannot be drawn", async () => {
    await expect(
      executeAssistantTool(call("clinical.add_item", { ...args, treatmentCode: "prophylaxis" })),
    ).rejects.toThrow();
    expect(api.clinical.odontogram.batch).not.toHaveBeenCalled();
  });
});
