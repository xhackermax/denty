import { expect, it, vi } from "vitest";
import { AgendaRepository } from "../agenda-repository";
import type { SupabaseRestClient } from "../../supabase/rest-client";

const appointmentRow = {
  id: "appointment",
  clinic_id: "clinic",
  patient_id: "patient",
  staff_id: "staff",
  site_id: "site",
  cabinet_id: null,
  clinical_plan_item_id: null,
  starts_at: "2026-10-08T08:00:00.000Z",
  ends_at: "2026-10-08T08:30:00.000Z",
  status: "PLANNED",
  title: "Revisión",
  reason: null,
  version: 1,
  created_at: "2026-10-08T07:00:00.000Z",
  updated_at: "2026-10-08T07:00:00.000Z",
};

it("envia confirmacion explicita de solape al crear una cita", async () => {
  const rpc = vi.fn(async () => appointmentRow);
  const repo = new AgendaRepository({ rpc } as unknown as SupabaseRestClient, "clinic");

  await repo.createAppointment({
    patientId: "patient",
    staffId: "staff",
    siteId: "site",
    startsAt: "2026-10-08T08:00:00.000Z",
    endsAt: "2026-10-08T08:30:00.000Z",
    title: "Revisión",
    allowOverlap: true,
  });

  expect(rpc).toHaveBeenCalledWith(
    "book_appointment",
    expect.objectContaining({ p_allow_overlap: true }),
  );
});

it("envia el parametro de solape tambien cuando no esta confirmado", async () => {
  const rpc = vi.fn(async () => appointmentRow);
  const repo = new AgendaRepository({ rpc } as unknown as SupabaseRestClient, "clinic");

  await repo.updateAppointment("appointment", {
    expectedVersion: 1,
    startsAt: "2026-10-08T08:00:00.000Z",
    endsAt: "2026-10-08T08:30:00.000Z",
  });

  expect(rpc).toHaveBeenCalledWith(
    "update_appointment",
    expect.objectContaining({ p_allow_overlap: false }),
  );
});
