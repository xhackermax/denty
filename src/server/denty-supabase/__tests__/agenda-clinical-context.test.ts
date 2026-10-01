import { expect, it, vi } from "vitest";
import { AgendaRepository } from "../agenda-repository";
import type { SupabaseRestClient } from "../../supabase/rest-client";

it("resuelve el estado desde el plan y el odontograma sin almacenar datos clínicos en la cita", async () => {
  const rows: Record<string, unknown[]> = {
    appointments: [
      {
        id: "appointment",
        clinical_plan_item_id: "plan-item",
        clinic_id: "clinic",
        patient_id: "patient",
        staff_id: "staff",
        site_id: "site",
        starts_at: "2026-10-01T08:00:00Z",
        ends_at: "2026-10-01T08:30:00Z",
        status: "PLANNED",
        title: "Cita",
        version: 1,
      },
    ],
    clinical_plan_items: [
      {
        id: "plan-item",
        tooth: "26",
        treatment_code: "FILLING",
        label: "Obturación",
        status: "PLANNED",
        dental_entity_id: "entity",
      },
    ],
    dental_entities: [{ id: "entity", surfaces_json: ["M", "O", "D"], status: "filling_bad" }],
  };
  const select = vi.fn(async (table: string) => rows[table] ?? []);
  const repo = new AgendaRepository({ select } as unknown as SupabaseRestClient, "clinic");
  const appointments = await repo.listAppointments();
  expect(appointments[0]?.clinical).toMatchObject({
    tooth: "26",
    surfaces: ["M", "O", "D"],
    planStatus: "PLANNED",
    clinicalStatus: "filling_bad",
  });
  expect(select).toHaveBeenCalledWith(
    "clinical_plan_items",
    expect.objectContaining({ clinic_id: "eq.clinic" }),
  );
  expect(select).toHaveBeenCalledWith(
    "dental_entities",
    expect.objectContaining({ clinic_id: "eq.clinic" }),
  );
});
