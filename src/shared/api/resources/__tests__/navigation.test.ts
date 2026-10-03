import { expect, test, vi } from "vitest";

import { ApiClient } from "../../client";
import { createNavigationResource } from "../navigation";

const layouts = { available: true, clinic: { pinned: ["agenda"] }, user: null };

test("reads both layouts and saves the member's or the clinic's order with PUT", async () => {
  const fetchImpl = vi.fn(async () => Response.json(layouts));
  const api = createNavigationResource(new ApiClient({ baseUrl: "", fetchImpl }));
  expect(await api.layouts()).toEqual(layouts);
  await api.saveMine(["tasks", "home"]);
  await api.saveClinic(null);
  const [, mine] = fetchImpl.mock.calls[1] as unknown as [string, RequestInit];
  expect(fetchImpl.mock.calls.map((call) => String((call as unknown[])[0]))).toEqual([
    "/api/navigation/layout",
    "/api/navigation/layout/me",
    "/api/navigation/layout/clinic",
  ]);
  expect(mine.method).toBe("PUT");
  expect(JSON.parse(String(mine.body))).toEqual({ pinned: ["tasks", "home"] });
});

test("refuses an invalid order before calling the server", async () => {
  const fetchImpl = vi.fn();
  const api = createNavigationResource(new ApiClient({ baseUrl: "", fetchImpl }));
  expect(() => api.saveMine([])).toThrow();
  expect(fetchImpl).not.toHaveBeenCalled();
});
