import { expect, test } from "vitest";
import { ClinicalRepository } from "../clinical-repository";
import { SupabaseRestClient } from "../../supabase/rest-client";
test.each(["measurement", "exam"] as const)(
  "rejects %s on missing tooth before SQL mutation",
  async (action) => {
    let writes = 0;
    const client = new SupabaseRestClient(
      { url: "https://example.supabase.co", key: "test" },
      async (input, init) => {
        const url = new URL(String(input));
        if (url.pathname.endsWith("/patients")) return Response.json([{ birth_date: null }]);
        if (url.pathname.endsWith("/dental_entities"))
          return Response.json([
            {
              id: "e",
              tooth: "36",
              entity_type: "MISSING",
              status: "missing",
              active: true,
              attributes_json: {},
            },
          ]);
        if (init?.method === "POST") {
          writes++;
          return Response.json({ exam: {}, measurements: [] });
        }
        return Response.json([]);
      },
    );
    const repo = new ClinicalRepository(client, "clinic");
    const site = { tooth: "36", site: "MV" as const, probingDepth: 3 };
    await expect(
      action === "measurement"
        ? repo.savePeriodontalMeasurement("p", site)
        : repo.createPeriodontalExam("p", { sites: [site] }),
    ).rejects.toMatchObject({ status: 422 });
    expect(writes).toBe(0);
  },
);
