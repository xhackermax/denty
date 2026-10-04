import type { z } from "zod";

import type { planSyncResultSchema } from "@/shared/api/schemas/clinical";

export type PlanSyncResult = z.infer<typeof planSyncResultSchema>;

const CLOSED_ITEM = new Set(["CANCELLED", "SUPERSEDED", "COMPLETED"]);

/**
 * A draft budget follows the plan while there is treatment to do. A signed budget that still
 * matches the plan is never touched; once the plan changes, the server opens a new draft
 * revision and keeps the signed one as it was.
 */
export function budgetNeedsSync(result: PlanSyncResult): boolean {
  const pending = (result.plan?.items ?? []).some((item) => !CLOSED_ITEM.has(item.status));
  if (!pending) return false;
  const budget = result.sync.budget;
  return !(budget?.status === "SIGNED" && !budget.outdated);
}

export type ClinicalAutoSyncOutcome =
  { ok: true; budgetUpdated: boolean } | { ok: false; error: unknown };

export interface ClinicalAutoSyncDeps {
  syncPlan: () => Promise<PlanSyncResult>;
  syncBudget: () => Promise<unknown>;
  onDone: (outcome: ClinicalAutoSyncOutcome) => void;
}

/**
 * Runs plan → budget after each odontogram save. Saves that land while a pass is running
 * collapse into a single follow-up pass, so a burst of edits never queues one sync per edit.
 */
export function createClinicalAutoSync(deps: ClinicalAutoSyncDeps) {
  let running: Promise<void> | null = null;
  let again = false;

  async function pass() {
    try {
      const plan = await deps.syncPlan();
      const budgetUpdated = budgetNeedsSync(plan);
      if (budgetUpdated) await deps.syncBudget();
      deps.onDone({ ok: true, budgetUpdated });
    } catch (error) {
      deps.onDone({ ok: false, error });
    }
  }

  async function loop() {
    do {
      again = false;
      await pass();
    } while (again);
    running = null;
  }

  return {
    request(): Promise<void> {
      if (running) {
        again = true;
        return running;
      }
      running = loop();
      return running;
    },
    idle(): Promise<void> {
      return running ?? Promise.resolve();
    },
  };
}
