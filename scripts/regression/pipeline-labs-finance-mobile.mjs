import assert from "node:assert/strict";
import {
  clinicalPipelineProgress,
  clinicalPipelineHref,
} from "../../../tmp_denty_test/clinical-pipeline-progress.js";
import {
  DEFAULT_PLAN_VISIT_GAP_DAYS,
  normalizePlanVisitGapDays,
  planVisitDates,
  resolvePlanVisitGapDays,
} from "../../../tmp_denty_test/scheduling-preferences.js";
import {
  laboratoryBalances,
  activeLaboratoryOptions,
} from "../../../tmp_denty_test/laboratory-accounts.js";
import {
  projectTreatmentMetrics,
  projectDoctorMetrics,
  projectMonthlyMetrics,
} from "../../../tmp_denty_test/finance-analytics.js";

{
  const r = clinicalPipelineProgress({
    patientId: "juan-perez",
    odontogramVersion: 1,
    diagnosisCount: 0,
    activePlanItemCount: 0,
    plan: null,
    budget: null,
    futureAppointmentCount: 0,
  });
  assert.deepEqual([...r.completed], ["odontogram"]);
  assert.equal(r.current, "diagnosis");
  assert.equal(
    clinicalPipelineHref("diagnosis", "juan-perez"),
    "/app/patients/juan-perez/odontogram?section=diagnosis",
  );
  assert.equal(
    clinicalPipelineHref("appointments", "juan-perez"),
    "/app/agenda?patientId=juan-perez",
  );
}
{
  assert.equal(DEFAULT_PLAN_VISIT_GAP_DAYS, 7);
  assert.deepEqual(planVisitDates("2026-10-01", 4, 7), [
    "2026-10-01",
    "2026-10-08",
    "2026-10-15",
    "2026-10-22",
  ]);
  assert.equal(normalizePlanVisitGapDays(181), 180);
  assert.equal(normalizePlanVisitGapDays(-4), 0);
  assert.equal(resolvePlanVisitGapDays({ itemGapDays: 3, defaultGapDays: 7 }), 3);
}
{
  const accounts = [
    { id: "lab-a", name: "A", active: true },
    { id: "lab-b", name: "B", active: true },
    { id: "inactive", name: "I", active: false },
  ];
  const works = [
    { id: "w1", labId: "lab-a", costCents: 100000, reworkCostCents: 50000 },
    { id: "w2", labId: "lab-b", costCents: 30000 },
  ];
  const payments = [{ id: "p1", labId: "lab-a", amountCents: 50000 }];
  const b = laboratoryBalances(accounts, works, payments);
  assert.deepEqual(
    b.find((x) => x.labId === "lab-a"),
    {
      labId: "lab-a",
      name: "A",
      active: true,
      accruedCents: 150000,
      paidCents: 50000,
      outstandingCents: 100000,
      workCount: 1,
    },
  );
  assert.equal(b.find((x) => x.labId === "lab-b")?.outstandingCents, 30000);
  assert.equal(
    activeLaboratoryOptions(accounts).some((x) => x.value === "inactive"),
    false,
  );
}
{
  const treatment = projectTreatmentMetrics([
    { treatment: "Implante", producedCents: 95000, collectedCents: 40000 },
  ])[0];
  assert.equal(treatment?.producedCents, 95000);
  assert.equal(treatment?.collectedCents, 40000);
  assert.equal(projectTreatmentMetrics([{ label: "X", producedCents: "abc" }]).length, 0);
  assert.equal(
    projectDoctorMetrics([{ producedCents: 50000 }])[0]?.name,
    "Sin profesional asignado",
  );
  assert.equal(
    projectMonthlyMetrics([{ month: "2026-09", producedCents: 1000, collectedCents: 700 }])[0]
      ?.month,
    "2026-09",
  );
}
console.log("pipeline/labs/finance domain regression: PASS");
