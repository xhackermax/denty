import { describe, expect, it, vi } from "vitest";

import { ApiClient } from "../../client";
import { createBillingResource } from "../billing";

describe("draft budget API", () => {
  it("updates a draft through the budget endpoint", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      Response.json({
        budget: {
          id: "budget-1",
          code: "P-1-R2",
          status: "DRAFT",
          totalCents: 9500,
          version: 2,
          revision: 2,
          createdAt: "2026-10-05T10:00:00.000Z",
          scope: "primary",
          title: "Revisión",
          items: [
            {
              id: "item-1",
              description: "Obturación",
              tooth: "46",
              unitPriceCents: 9500,
              quantity: 1,
              totalCents: 9500,
            },
          ],
        },
      }),
    );
    const api = createBillingResource(new ApiClient({ baseUrl: "https://denty.test", fetchImpl }));

    await expect(
      api.budgets.updateDraft("budget-1", {
        patientId: "patient-1",
        expectedVersion: 1,
        title: "Revisión",
        items: [{ id: "item-1", unitPriceCents: 9500 }],
      }),
    ).resolves.toMatchObject({ budget: { id: "budget-1", version: 2 } });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://denty.test/api/budgets/budget-1",
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("deletes only the requested patient draft and version", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => Response.json({ deleted: true }));
    const api = createBillingResource(new ApiClient({ baseUrl: "https://denty.test", fetchImpl }));

    await expect(api.budgets.deleteDraft("budget-1", "patient-1", 3)).resolves.toEqual({
      deleted: true,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://denty.test/api/budgets/budget-1?patientId=patient-1&expectedVersion=3",
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});
