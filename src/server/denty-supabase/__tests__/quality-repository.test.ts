import { describe, expect, it, vi } from "vitest";
import type { SupabaseRestClient } from "@/server/supabase/rest-client";
import { QualityRepository } from "../quality-repository";

type Row = Record<string, unknown>;
const rows: Record<string, Row[]> = {
  staff_members: [
    {id:"dr1",role:"DENTIST",display_name:"Dra. Ejemplo",active:true},
    {id:"rec1",role:"RECEPTION",display_name:"Recepción",active:true},
  ],
  appointments: [
    {id:"a1",staff_id:"dr1",site_id:"site1",patient_id:"p1",
      status:"COMPLETED",starts_at:"2026-10-09T09:00:00+02:00"},
    {id:"a2",staff_id:"dr1",site_id:"site1",patient_id:"p1",
      status:"IN_CHAIR",starts_at:"2026-10-09T10:00:00+02:00"},
  ],
  clinical_treatment_executions: [
    {id:"e1",appointment_id:"a1",clinical_plan_item_id:"plan1",
      doctor_id:"dr1",patient_id:"p1",treatment_category:"ENDODONTICS",
      attributed_revenue_cents:null,executed_at:"2026-10-09T09:30:00+02:00"},
    {id:"e2",appointment_id:"a2",clinical_plan_item_id:"plan2",
      doctor_id:"dr1",patient_id:"p1",treatment_category:"RESTORATION",
      attributed_revenue_cents:null,executed_at:"2026-10-09T10:30:00+02:00"},
  ],
  clinical_incidents: [],
  implant_placement_outcomes: [
    {appointment_id:"a1",doctor_id:"dr1",outcome:"PLACED",
      failure_kind:null,recorded_at:"2026-10-09T09:30:00+02:00"},
    {appointment_id:"a2",doctor_id:"dr1",outcome:"FAILED",
      failure_kind:"PLACEMENT_ATTEMPT",recorded_at:"2026-10-09T10:30:00+02:00"},
  ],
  attendance_punches: [
    {id:"in",staff_member_id:"dr1",punch_type:"IN",
      corrects_punch_id:null,occurred_at:"2026-10-09T08:00:00+02:00"},
    {id:"out",staff_member_id:"dr1",punch_type:"OUT",
      corrects_punch_id:null,occurred_at:"2026-10-09T16:00:00+02:00"},
  ],
  invoice_lines: [
    {invoice_id:"invoice1",clinical_plan_item_id:"plan1",line_subtotal_cents:95000},
    {invoice_id:"invoice2",clinical_plan_item_id:"plan1",line_subtotal_cents:80000},
  ],
  invoices: [
    {id:"invoice1",status:"ISSUED",type:"STANDARD"},
    {id:"invoice2",status:"DRAFT",type:"STANDARD"},
  ],
};
function repository() {
  const client = {
    select: vi.fn(async (table: string) => rows[table] ?? []),
    selectAll: vi.fn(async (table: string) => rows[table] ?? []),
  } as unknown as SupabaseRestClient;
  return new QualityRepository(client, "clinic1");
}

describe("Supabase doctor analytics integration", () => {
  it("counts only completed original appointments and posted invoice lines", async () => {
    const result = await repository().scorecards(
      "2026-10-09T00:00:00+02:00", "2026-10-10T00:00:00+02:00");
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      completedVisits:1,uniquePatients:1,recordedExecutions:1,
      treatmentCounts:{ENDODONTICS:1},
      attributedRevenueCents:95000,attributedRevenueCoverage:1,
      averageTicketCents:95000,
      placedImplants:1,failedPlacementAttempts:0,
      attendanceHours:8,
    });
  });
});


describe("doctor analytics period and clinic scope", () => {
  const start = "2026-10-09T00:00:00+02:00";
  const end = "2026-10-10T00:00:00+02:00";

  it("passes date boundaries into Supabase instead of loading an unbounded history", async () => {
    const selectAll = vi.fn(async (table: string, _query: Record<string, string | number> = {}) => rows[table] ?? []);
    const select = vi.fn(async (table: string) => rows[table] ?? []);
    const client = { selectAll, select } as unknown as SupabaseRestClient;
    await new QualityRepository(client, "clinic1").scorecards(start, end, "site1");
    const appointmentQuery = selectAll.mock.calls.find(([name]) => name === "appointments");
    // The repository query must apply upper and lower bounds before pagination.
    expect(appointmentQuery?.[1]).toMatchObject({
      clinic_id: "eq.clinic1", site_id: "eq.site1",
      and: `(starts_at.gte.${start},starts_at.lt.${end})`,
    });
  });

  it("does not attribute whole-clinic attendance to a single site", async () => {
    const result = await repository().scorecards(start, end, "site1");
    expect(result.items[0]?.attendanceHours).toBeNull();
    expect(result.items[0]?.attendanceNote).toContain("sede");
  });

  it("retains historical metrics of doctors who are no longer active", async () => {
    const client = {
      select: vi.fn(async (table: string) => table === "staff_members"
        ? rows.staff_members!.map(r => r.role === "DENTIST" ? { ...r, active: false } : r)
        : rows[table] ?? []),
      selectAll: vi.fn(async (table: string) => rows[table] ?? []),
    } as unknown as SupabaseRestClient;
    const result = await new QualityRepository(client, "clinic1").scorecards(start, end);
    expect(result.items[0]?.doctorName).toContain("(inactivo)");
    expect(result.items[0]?.completedVisits).toBe(1);
  });
});
