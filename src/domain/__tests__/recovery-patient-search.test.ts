import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  recoveryPatientSearchFiltersSchema,
  recoveryPatientSearchResultSchema,
} from "@/shared/api/schemas/engagement";

const sql = readFileSync(
  new URL("../../../supabase/migrations/20261011030000_recovery_patient_search.sql", import.meta.url),
  "utf8",
);

describe("explorador de recuperación y tratamientos", () => {
  it("valida filtros de tiempo, paginación y alcance de búsqueda", () => {
    expect(recoveryPatientSearchFiltersSchema.safeParse({
      patient: "Ana", budgeted: "implante", performed: "corona",
      minDays: 180, maxDays: null, onlyNoVisit: false, page: 1, pageSize: 20,
    }).success).toBe(true);
    expect(recoveryPatientSearchFiltersSchema.safeParse({
      patient: "", budgeted: "", performed: "", minDays: 365,
      maxDays: 90, onlyNoVisit: false, page: 1, pageSize: 20,
    }).success).toBe(false);
    expect(recoveryPatientSearchFiltersSchema.safeParse({
      patient: "", budgeted: "", performed: "", minDays: null,
      maxDays: null, onlyNoVisit: false, page: 1, pageSize: 1000,
    }).success).toBe(false);
  });

  it("distingue entre presupuesto y ejecución, y visita confirmada frente a ausencia", () => {
    expect(sql).toContain("public.budget_items bi");
    expect(sql).toContain("public.budgets b");
    expect(sql).toContain("b.status not in ('CANCELLED','SUPERSEDED')");
    expect(sql).toContain("public.clinical_treatment_executions e");
    expect(sql).toContain("e.executed_at");
    expect(sql).toContain("a.status='COMPLETED'");
    expect(sql).toContain("a.status in ('ARRIVED','IN_CHAIR')");
    expect(sql).toContain("a.arrived_at");
    expect(sql).not.toContain("a.status='PLANNED' and");
  });

  it("restringe resultados por clínica y protege datos financieros y clínicos", () => {
    expect(sql).toContain("p.clinic_id=p_clinic_id and p.archived_at is null");
    expect(sql).toContain("p_budget_query");
    expect(sql).toContain("p_performed_query");
    expect(sql).toContain("v_can_clinical");
    expect(sql).toContain("v_can_finance");
    expect(sql).toContain("CLINICAL_READ_REQUIRED");
    expect(sql).toContain("FINANCE_READ_REQUIRED");
    expect(sql).toContain("private.stage11_has_permission(p_clinic_id,'patients.read')");
    expect(sql).toContain("revoke all on function public.recovery_patient_search");
  });

  it("mantiene la falta de asistencia y los procedimientos con contratos separados", () => {
    const result = recoveryPatientSearchResultSchema.parse({
      items: [{
        patientId: "00000000-0000-4000-8000-000000000001",
        patientName: "Paciente ficticio",
        recordNumber: "A1", phone: null,
        lastVisitAt: null, daysSinceVisit: null, nextAppointmentAt: null,
        budgetedTreatments: [{
          label: "Corona", status: "DRAFT",
          budgetId: "00000000-0000-4000-8000-000000000002", code: "CORONA",
        }],
        performedTreatments: [],
      }],
      total: 1, page: 1, pageSize: 20,
    });
    expect(result.items[0]?.daysSinceVisit).toBeNull();
    expect(result.items[0]?.budgetedTreatments[0]?.status).toBe("DRAFT");
    expect(result.items[0]?.performedTreatments).toHaveLength(0);
  });

  it("la consulta no envía mensajes y se limita a búsquedas de solo lectura", () => {
    expect(sql).not.toContain("queue_communication(");
    expect(sql).not.toContain("insert into public.tasks");
    expect(sql).toContain("limit p_page_size offset (p_page-1)*p_page_size");
  });
});
