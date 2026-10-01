import { expect, test } from "vitest";
import { SupabaseRestClient } from "../../supabase/rest-client";
import { PrescriptionRepository } from "../prescription-repository";
const item = {
  activeIngredient: "Ibuprofeno",
  strength: "400 mg",
  pharmaceuticalForm: "Comprimidos",
  unitsPerDose: "1",
  frequency: "Cada 8 horas",
  duration: "3 días",
};
test.each(["create", "update", "validate", "issue"] as const)(
  "blocks %s before writes with current allergy profile",
  async (action) => {
    let writes = 0;
    const client = new SupabaseRestClient(
      { url: "https://example.supabase.co", key: "test" },
      async (input, init) => {
        const url = new URL(String(input));
        if (url.pathname.includes("/rpc/")) {
          writes++;
          return Response.json({ id: "rx", patient_id: "p", version: 1 });
        }
        if (url.pathname.endsWith("/prescription_items"))
          return Response.json([{ ...item, active_ingredient: item.activeIngredient }]);
        if (url.pathname.endsWith("/prescriptions"))
          return Response.json([{ id: "rx", patient_id: "p", version: 1 }]);
        if (url.pathname.endsWith("/patients") && url.searchParams.get("clinic_id") === "eq.clinic")
          return Response.json([{ medical_profile: { allergies: ["AINEs"] } }]);
        return Response.json(
          { message: `Unexpected ${url.pathname} ${init?.method}` },
          { status: 500 },
        );
      },
    );
    const repo = new PrescriptionRepository(client, "clinic");
    const operation =
      action === "create"
        ? repo.create({ patientId: "p", prescriberStaffId: "s", items: [item] })
        : action === "update"
          ? repo.update("rx", { items: [item] })
          : repo[action]("rx");
    await expect(operation).rejects.toThrow(/alergia.*AINEs/i);
    expect(writes).toBe(0);
  },
);
