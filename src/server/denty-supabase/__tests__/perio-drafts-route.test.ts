import { expect, test } from "vitest";
import { handlePerioDraftsRoute } from "../perio-drafts-route";
import { SupabaseRestClient } from "../../supabase/rest-client";
import { createPerioExam } from "@/domain/periodontal/exam";
import { createPerioSession } from "@/domain/periodontal/entry-cursor";
import { deriveMouthState } from "@/domain/odontogram/mouth-state";
const parts = ["api", "patients", "p", "perio-draft"];
const req = (body: unknown, suffix = "") =>
  new Request("https://denty.example/api/patients/p/perio-draft" + suffix, {
    method: "POST",
    body: JSON.stringify(body),
  });
test.each([null, "PATIENT", "RECEPTION"])(
  "rejects draft access for %s before database work",
  async (role) => {
    const client = new SupabaseRestClient(
      { url: "https://example.supabase.co", key: "test" },
      async () => {
        throw Error("Unexpected");
      },
    );
    const result = await handlePerioDraftsRoute(
      req({}),
      parts,
      role ? { actor: { role, clinicId: "c" }, restClient: client } : null,
    );
    expect(result.status).toBe(role ? 403 : 401);
  },
);
test("draft save never creates an exam and finalization sends one reconciled exam", async () => {
  const calls: string[] = [];
  const mouth = deriveMouthState([]),
    data = createPerioSession(
      createPerioExam(mouth, [{ tooth: "36", site: "MV", probingDepth: 4 }]),
      mouth,
    );
  const client = new SupabaseRestClient(
    { url: "https://example.supabase.co", key: "test" },
    async (input) => {
      const url = new URL(String(input));
      calls.push(url.pathname);
      if (url.pathname.endsWith("/patients")) {
        expect(url.searchParams.get("clinic_id")).toBe("eq.c");
        return Response.json([{ birth_date: null }]);
      }
      if (url.pathname.endsWith("/dental_entities")) return Response.json([]);
      if (url.pathname.endsWith("/periodontal_drafts"))
        return Response.json([{ version: 1, data }]);
      if (url.pathname.endsWith("/save_periodontal_draft"))
        return Response.json({ version: 1, data, updatedAt: "2026-10-01" });
      if (url.pathname.endsWith("/finish_periodontal_draft"))
        return Response.json({ examId: "exam" });
      throw Error("Unexpected");
    },
  );
  const identity = { actor: { role: "DENTIST", clinicId: "c" }, restClient: client };
  expect(
    (await handlePerioDraftsRoute(req({ expectedVersion: 0, data }), parts, identity)).status,
  ).toBe(200);
  expect(calls.some((p) => p.includes("save_periodontal_exam"))).toBe(false);
  expect(
    (await handlePerioDraftsRoute(req({ expectedVersion: 1 }), [...parts, "finish"], identity))
      .status,
  ).toBe(201);
  await expect(
    handlePerioDraftsRoute(req({ expectedVersion: 2 }), [...parts, "finish"], identity),
  ).rejects.toMatchObject({ status: 409 });
});
