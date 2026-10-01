import { expect, test } from "vitest";
import { SupabaseRestClient } from "./rest-client";

test("selectAll follows the exact count when the server caps requested pages", async () => {
  const rows = Array.from({ length: 250 }, (_, id) => ({ id }));
  const fetchImpl: typeof fetch = async (_input, init) => {
    const start = Number(new Headers(init?.headers).get("range")?.split("-")[0]);
    const page = rows.slice(start, start + 100);
    return Response.json(page, {
      headers: { "content-range": `${start}-${start + page.length - 1}/${rows.length}` },
    });
  };
  const client = new SupabaseRestClient(
    { url: "https://example.supabase.co", key: "test" },
    fetchImpl,
  );
  expect(await client.selectAll("patients")).toEqual(rows);
});
test("selectAll stops on an empty page even if the reported count is stale", async () => {
  const client = new SupabaseRestClient(
    { url: "https://example.supabase.co", key: "test" },
    async () => Response.json([], { headers: { "content-range": "*/100" } }),
  );
  expect(await client.selectAll("patients")).toEqual([]);
});
