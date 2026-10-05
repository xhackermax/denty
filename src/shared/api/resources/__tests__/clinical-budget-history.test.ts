import { expect, test, vi } from "vitest";

import { ApiClient } from "../../client";
import { createClinicalResource } from "../clinical";

test("lists full budget history for a single patient", async () => {
  const response = {
    items: [
      {
        id: "budget-1",
        code: "P-1-R2",
        status: "DRAFT",
        totalCents: 12_500,
        revision: 2,
        version: 1,
        scope: "primary",
        title: "Fase 1",
        items: [],
      },
    ],
  };
  const fetchImpl = vi.fn(async (_input: RequestInfo | URL) => Response.json(response));
  const api = createClinicalResource(new ApiClient({ baseUrl: "", fetchImpl }));

  await expect(api.budgets.listForPatient("patient/1")).resolves.toMatchObject(response);
  expect(fetchImpl).toHaveBeenCalledOnce();
  expect(fetchImpl.mock.calls[0]?.[0]).toBe("/api/patients/patient%2F1/budgets");
});
