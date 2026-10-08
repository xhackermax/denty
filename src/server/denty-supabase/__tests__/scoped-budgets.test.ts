import { describe, expect, it, vi } from "vitest";

import type { SupabaseRestClient } from "../../supabase/rest-client";
import { ClinicalRepository } from "../clinical-repository";

const budgetRow = (overrides: Record<string, unknown> = {}) => ({
  id: "b-phase-1",
  clinical_plan_id: "plan-1",
  code: "P-1-R2",
  status: "DRAFT",
  total_cents: 9000,
  source_plan_version: 3,
  revision: 2,
  version: 1,
  scope: "primary",
  title: "Fase 1",
  ...overrides,
});

function repositoryWith(tables: Record<string, Record<string, unknown>[]>) {
  const rpc = vi.fn(async (functionName: string) => {
    if (functionName === "update_draft_budget") return { status: "updated" };
    if (functionName === "delete_draft_budget") return { status: "deleted" };
    if (functionName === "create_clinical_plan_branch")
      return { id: "branch-1", budget_id: "b-phase-1" };
    return budgetRow();
  });
  const select = vi.fn(async (table: string, query: Record<string, unknown> = {}) => {
    const rows = tables[table] ?? [];
    const id = typeof query.id === "string" ? query.id.replace(/^eq\./, "") : undefined;
    return id ? rows.filter((row) => row.id === id) : rows;
  });
  const client = { rpc, select } as unknown as SupabaseRestClient;
  return { repository: new ClinicalRepository(client, "clinic-1"), rpc, select };
}

describe("scoped budgets", () => {
  it("lists every budget scoped to the patient, across clinical plans", async () => {
    const { repository, select } = repositoryWith({
      budgets: [
        budgetRow({ id: "b-new", clinical_plan_id: "plan-2", revision: 1 }),
        budgetRow({ id: "b-old", clinical_plan_id: "plan-1", revision: 3 }),
      ],
    });

    const result = await repository.listPatientBudgets("patient-1");

    expect(select).toHaveBeenCalledWith(
      "budgets",
      expect.objectContaining({
        clinic_id: "eq.clinic-1",
        patient_id: "eq.patient-1",
        order: "created_at.desc,revision.desc",
      }),
    );
    expect(result.items.map((budget) => budget?.id)).toEqual(["b-new", "b-old"]);
  });

  it("creates a phase budget from the chosen plan items", async () => {
    const { repository, rpc } = repositoryWith({
      budgets: [budgetRow()],
      budget_items: [
        {
          id: "bi-1",
          budget_id: "b-phase-1",
          clinical_plan_item_id: "item-1",
          description: "Obturación",
          tooth: "46",
          unit_price_cents: 9000,
          total_cents: 9000,
        },
      ],
    });

    const result = await repository.createBudgetFromPlanItems("patient-1", {
      scope: "primary",
      title: "Fase 1",
      clinicalPlanItemIds: ["item-1"],
    });

    expect(rpc).toHaveBeenCalledWith("create_budget_from_plan_items", {
      p_patient_id: "patient-1",
      p_item_ids: ["item-1"],
      p_scope: "primary",
      p_title: "Fase 1",
    });
    expect(result.budget).toMatchObject({
      id: "b-phase-1",
      scope: "primary",
      title: "Fase 1",
      totalCents: 9000,
      items: [{ clinicalPlanItemId: "item-1", tooth: "46" }],
    });
  });

  it("reads budgets saved before scopes existed as whole-plan budgets", async () => {
    const { repository } = repositoryWith({
      budgets: [budgetRow({ id: "b-old", scope: undefined, title: undefined })],
      budget_items: [],
    });
    const sync = await repository.syncBudgetFromPlan("patient-1").catch(() => null);
    expect(sync).toBeNull();
    const budget = await (
      repository as unknown as { getBudget(id: string): Promise<Record<string, unknown> | null> }
    ).getBudget("b-old");
    expect(budget).toMatchObject({ id: "b-old", scope: "plan", title: null });
  });

  it("keeps the plan-in-step check on the whole-plan budget, not on a phase draft", async () => {
    const { repository } = repositoryWith({
      dental_entities: [{ status: "caries_pending", created_at: "2026-10-05", version: 3 }],
      odontogram_snapshots: [],
      clinical_plans: [{ id: "plan-1", version: 4, source_odontogram_version: 3 }],
      budgets: [
        budgetRow({ id: "phase", scope: "primary", revision: 5, source_plan_version: 1 }),
        budgetRow({ id: "whole", scope: "plan", revision: 4, source_plan_version: 4 }),
      ],
      clinical_plan_items: [],
    });
    const sync = await repository.getClinicalSync("patient-1");
    expect(sync.budget).toMatchObject({ id: "whole", outdated: false });
  });

  it("remembers a signed custom Plan B as the accepted current budget", async () => {
    const { repository } = repositoryWith({
      dental_entities: [{ status: "caries_pending", created_at: "2026-10-05", version: 3 }],
      odontogram_snapshots: [],
      clinical_plans: [{ id: "plan-1", version: 4, source_odontogram_version: 3 }],
      budgets: [
        budgetRow({
          id: "whole",
          scope: "plan",
          status: "DRAFT",
          revision: 5,
          source_plan_version: 4,
          created_at: "2026-10-05T09:00:00.000Z",
        }),
        budgetRow({
          id: "plan-b",
          scope: "custom",
          title: "Conservar el diente",
          status: "SIGNED",
          revision: 1,
          source_plan_version: 4,
          created_at: "2026-10-05T10:00:00.000Z",
        }),
      ],
      budget_items: [
        {
          id: "bi-b",
          budget_id: "plan-b",
          clinical_plan_item_id: "item-b",
          description: "Endodoncia",
          tooth: "46",
          billing_mode: "separate",
          quantity: 1,
          unit_price_cents: 25000,
          total_cents: 25000,
        },
      ],
      clinical_plan_items: [{ id: "item-b", status: "PLANNED" }],
    });

    const sync = await repository.getClinicalSync("patient-1");

    expect(sync.budget).toMatchObject({
      id: "plan-b",
      status: "SIGNED",
      scope: "custom",
      title: "Conservar el diente",
      selectedPlanItemIds: ["item-b"],
      outdated: false,
    });
  });

  it("updates only the selected patient's draft with an optimistic version", async () => {
    const { repository, rpc } = repositoryWith({
      budgets: [budgetRow({ created_at: "2026-10-05T10:00:00.000Z" })],
      budget_items: [
        {
          id: "bi-1",
          budget_id: "b-phase-1",
          clinical_plan_item_id: "item-1",
          description: "Obturación",
          tooth: "46",
          billing_mode: "separate",
          quantity: 1,
          unit_price_cents: 9000,
          total_cents: 9000,
        },
      ],
    });

    const result = await repository.updateDraftBudget("patient-1", "b-phase-1", {
      expectedVersion: 1,
      title: "Fase 1 revisada",
      items: [{ id: "bi-1", unitPriceCents: 9500 }],
    });

    expect(rpc).toHaveBeenCalledWith("update_draft_budget", {
      p_budget_id: "b-phase-1",
      p_patient_id: "patient-1",
      p_expected_version: 1,
      p_title: "Fase 1 revisada",
      p_items: [{ id: "bi-1", unit_price_cents: 9500 }],
    });
    expect(result).toMatchObject({
      status: "updated",
      budget: {
        id: "b-phase-1",
        revision: 2,
        createdAt: "2026-10-05T10:00:00.000Z",
        items: [{ id: "bi-1", quantity: 1, unitPriceCents: 9000 }],
      },
    });
  });

  it("creates an isolated branch with shared procedures and one exclusive prosthesis", async () => {
    const { repository, rpc } = repositoryWith({
      budgets: [budgetRow({ id: "b-phase-1", scope: "custom", title: "Removible" })],
      budget_items: [{
        id: "bi-perio", budget_id: "b-phase-1", clinical_plan_item_id: "perio",
        description: "Raspado y alisado", tooth: null, unit_price_cents: 12000, total_cents: 12000,
      }],
      clinical_plan_branches: [{
        id: "branch-1", budget_id: "b-phase-1",
        shared_item_ids: ["perio"], advantages: "Sin cirugía implantológica",
        disadvantages: "Requiere retirar y limpiar", source_plan_version: 3,
      }],
    });
    const result = await repository.createClinicalPlanBranch("patient-1", {
      expectedPlanVersion: 3,
      title: "Removible",
      sharedPlanItemIds: ["perio"],
      exclusiveTreatments: [{ catalogId: "removable", tooth: "arcada inferior" }],
      advantages: "Sin cirugía implantológica",
      disadvantages: "Requiere retirar y limpiar",
    });
    expect(rpc).toHaveBeenCalledWith("create_clinical_plan_branch", {
      p_patient_id: "patient-1",
      p_expected_plan_version: 3,
      p_title: "Removible",
      p_shared_item_ids: ["perio"],
      p_exclusive_items: [{ catalog_id: "removable", tooth: "arcada inferior" }],
      p_advantages: "Sin cirugía implantológica",
      p_disadvantages: "Requiere retirar y limpiar",
    });
    expect(result.budget).toMatchObject({
      id: "b-phase-1",
      branch: { sharedPlanItemIds: ["perio"], advantages: "Sin cirugía implantológica" },
    });
  });

  it("deletes a patient's draft only with the confirmed version", async () => {
    const { repository, rpc } = repositoryWith({});
    const result = await repository.deleteDraftBudget("patient-1", "b-phase-1", 3);

    expect(rpc).toHaveBeenCalledWith("delete_draft_budget", {
      p_budget_id: "b-phase-1",
      p_patient_id: "patient-1",
      p_expected_version: 3,
    });
    expect(result).toEqual({ status: "deleted" });
  });
});
