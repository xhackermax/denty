import { expect, test, vi } from "vitest";
import { createClinicContactsHttpAPI } from "../clinic-contacts";

test("contacts use the app's HttpOnly session without browser Supabase credentials", async () => {
  const fetchImpl = vi.fn(async () => Response.json([{ id: "contact", total_count: 1 }]));
  const api = createClinicContactsHttpAPI(fetchImpl);
  const result = await api.list("clinic");
  expect(result.totalCount).toBe(1);
  expect(fetchImpl).toHaveBeenCalledWith(
    "/api/clinic-contacts",
    expect.objectContaining({ credentials: "same-origin" }),
  );
});
