import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { recoveryWorklistSchema } from "@/shared/api/schemas/engagement";

const sql = readFileSync(
  new URL("../../../supabase/migrations/20261011010000_recovery_worklist_phase1.sql", import.meta.url),
  "utf8",
);

describe("recuperación de pacientes, fase 1A", () => {
  it("mantiene un contrato tipado y una sola ficha por paciente", () => {
    const result = recoveryWorklistSchema.parse({
      items: [{
        patientId: "00000000-0000-4000-8000-000000000001",
        patientName: "Paciente de prueba",
        recordNumber: "P-1", phone: null,
        kind: "RECALL",
        referenceId: "00000000-0000-4000-8000-000000000002",
        label: "NO_SHOW",
        dueAt: "2026-10-11T09:00:00+02:00",
        amountCents: null,
        kinds: ["RECALL", "PLAN"],
      }],
      counts: { RECALL: 1, PLAN: 1 },
      total: 1, page: 1, pageSize: 25,
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.kinds).toEqual(["RECALL", "PLAN"]);
  });

  it("no incluye borradores, planes no firmados o tratamientos con cita", () => {
    expect(sql).toContain("r.status in ('pending','contacted')");
    expect(sql).toContain("item.status='PLANNED'");
    expect(sql).toContain("b.status='SIGNED'");
    expect(sql).toContain("a.clinical_plan_item_id=item.id");
    expect(sql).toContain("a.starts_at>=now()");
    expect(sql).toContain("b.status in ('PRESENTED','SENT')");
    expect(sql).toContain("b.sent_at is not null or b.presented_at is not null");
    expect(sql).not.toContain("coalesce(b.sent_at,b.presented_at,b.created_at)");
  });

  it("deduplica por paciente, pagina y evita filtrar otra clínica", () => {
    expect(sql).toContain("partition by s.patient_id");
    expect(sql).toContain("where row_no=1");
    expect(sql).toContain("limit p_page_size offset (p_page-1)*p_page_size");
    expect(sql).toContain("p.clinic_id=p_clinic_id");
    expect(sql).toContain("p.archived_at is null");
    expect(sql).toContain("p_page_size > 50");
  });

  it("restringe RPC y exige permiso de comunicaciones", () => {
    expect(sql).toContain("private.stage11_has_permission(p_clinic_id,'communications.read')");
    expect(sql).toContain("revoke all on function public.recovery_worklist");
    expect(sql).toContain("grant execute on function public.recovery_worklist");
  });
});
