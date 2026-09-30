import { beforeEach, describe, expect, it, vi } from "vitest";

import { DentyApiError } from "@/shared/api/errors";

import type { LocalVoicePlan } from "../local-nlu";

const api = {
  clinical: {
    odontogram: { get: vi.fn(), batch: vi.fn() },
    sync: { plan: vi.fn() },
  },
};

vi.mock("@/shared/api/browser", () => ({ getBrowserApi: () => api }));

import { executeVoicePlan } from "../voice-executor";

const plan: LocalVoicePlan = {
  raw: "añadir restauración 35",
  actions: [
    {
      type: "clinical.add_item",
      patientRef: "",
      tooth: "35",
      treatmentCode: "restoration",
      label: "Restauración",
      surfaces: [],
    },
  ],
  ambiguities: [],
  requiresConfirmation: false,
  readback: "",
  confidence: 0.94,
  contextPatientId: "p1",
  source: "rules",
};

describe("executeVoicePlan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.clinical.odontogram.get.mockResolvedValue({ version: 1, entities: [] });
    api.clinical.odontogram.batch.mockResolvedValue({ version: 2, entities: [] });
    api.clinical.sync.plan.mockResolvedValue({});
  });

  it("saves the merged odontogram and syncs the plan", async () => {
    const result = await executeVoicePlan(plan);

    expect(result.executed).toEqual(["clinical.add_item"]);
    expect(api.clinical.odontogram.batch).toHaveBeenCalledOnce();
    expect(api.clinical.sync.plan).toHaveBeenCalledWith("p1");
  });

  it("names the odontogram step and HTTP status when saving fails", async () => {
    api.clinical.odontogram.batch.mockRejectedValue(
      new DentyApiError("unavailable", "Denty API devolvió 500.", { status: 500 }),
    );

    await expect(executeVoicePlan(plan)).rejects.toThrow(/odontograma.*500/i);
    expect(api.clinical.sync.plan).not.toHaveBeenCalled();
  });

  it("keeps the odontogram write and reports a plan sync failure separately", async () => {
    api.clinical.sync.plan.mockRejectedValue(
      new DentyApiError("unavailable", "Denty API devolvió 502.", { status: 502 }),
    );

    await expect(executeVoicePlan(plan)).rejects.toThrow(/guardado en el odontograma.*plan.*502/i);
    expect(api.clinical.odontogram.batch).toHaveBeenCalledOnce();
  });
});
