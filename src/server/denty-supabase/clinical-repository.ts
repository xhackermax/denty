import { assertProbeable } from "./mouth-guard";
import { currentOdontogramVersion } from "./odontogram-version";
import { odontogramSnapshotSchema } from "@/shared/api/schemas/clinical";
import type {
  ClinicalSyncState,
  CreateOdontogramSnapshot,
  PeriodontalExamInput,
  PeriodontalMeasurementInput,
} from "@/shared/api/schemas/clinical";

import { SupabaseRestError, type SupabaseRestClient } from "../supabase/rest-client";

interface SnapshotRow {
  id: string;
  label: string | null;
  payload_json: unknown;
  created_at: string;
  version: number;
}

interface TreatmentCatalogRow {
  id: string;
  clinic_id: string;
  code: string;
  name: string;
  specialty: string | null;
  category: string | null;
  default_price_cents: number;
  base_cost_cents: number;
  default_duration_min: number | null;
  requires_lab: boolean;
  active: boolean;
  metadata: Record<string, unknown>;
  version: number;
  created_at: string;
  updated_at: string;
}

interface PlanRow {
  id: string;
  patient_id: string;
  status: string;
  source_odontogram_version: number | null;
  version: number;
  created_at: string;
  updated_at: string;
}

interface PlanItemRow {
  diagnosis_id?: string | null;
  id: string;
  plan_id: string;
  tooth: string | null;
  treatment_catalog_id: string | null;
  treatment_code: string;
  treatment_code_snapshot: string | null;
  label: string;
  label_snapshot: string | null;
  patient_label: string | null;
  clinical_reason: string | null;
  phase: number;
  priority: number;
  status: string;
  price_cents: number | null;
  price_snapshot_cents: number | null;
  cost_snapshot_cents: number | null;
  is_ad_hoc: boolean;
  version: number;
}

interface DependencyRow {
  id: string;
  item_id: string;
  depends_on_id: string;
  reason: string | null;
}

interface BudgetRow {
  id: string;
  clinical_plan_id: string | null;
  code: string;
  status: string;
  total_cents: number;
  source_plan_version: number | null;
  revision: number;
  version: number;
  // Absent until migration 20261005100000 runs; such budgets cover the whole plan.
  scope?: BudgetScope | null;
  title?: string | null;
}

export type BudgetScope = "plan" | "primary" | "secondary" | "custom";

export interface CreateScopedBudgetInput {
  scope: Exclude<BudgetScope, "plan">;
  title?: string | undefined;
  clinicalPlanItemIds: string[];
}

interface BudgetItemRow {
  id: string;
  budget_id: string;
  clinical_plan_item_id: string | null;
  description: string;
  tooth: string | null;
  unit_price_cents: number;
  total_cents: number;
}

interface ConsentRequirementRow {
  id: string;
  clinical_plan_item_id: string | null;
  consent_code: string;
  status: string;
  required_before: string;
  template_id: string | null;
  satisfied_by_document_id: string | null;
  rule_version: number;
}

interface PeriodontalExamRow {
  metadata?: Record<string, unknown>;
  id: string;
  patient_id: string;
  version: number;
  title: string;
  summary_json: Record<string, unknown>;
  diagnosis: string | null;
  stage: string | null;
  grade: string | null;
  extent: string | null;
  measured_at: string;
}

interface PeriodontalMeasurementRow {
  id: string;
  exam_id: string | null;
  exam_version: number | null;
  tooth: string;
  site: string;
  probing_depth: number | null;
  recession: number | null;
  bleeding: boolean | null;
  plaque: boolean | null;
  suppuration: boolean | null;
  mobility: number | null;
  furcation: number | null;
  measured_at: string;
}

interface PeriodontalRpcResult {
  exam?: PeriodontalExamRow;
  measurements?: Array<{
    id: string;
    tooth: string;
    site: string;
    probing_depth: number | null;
    recession: number | null;
    bleeding: boolean | null;
    plaque: boolean | null;
    mobility: number | null;
    furcation: number | null;
    suppuration: boolean | null;
    measured_at: string;
  }>;
}

interface FinalizeBudgetSignatureInput {
  expectedVersion: number;
  signerName: string;
  signatureData: string;
}

interface FinalizeBudgetSignatureRpcResult {
  conflict?: boolean;
  currentVersion?: number;
  budget?: BudgetRow;
  snapshot?: {
    id: string;
    budget_id: string;
    revision: number;
    signed_at: string;
  };
}

export interface TreatmentCatalogInput {
  code: string;
  name: string;
  specialty?: string | null;
  category?: string | null;
  defaultPriceCents?: number;
  baseCostCents?: number;
  defaultDurationMin?: number | null;
  requiresLab?: boolean;
  active?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ClinicalPlanItemInput {
  treatmentCatalogId?: string;
  treatmentCode: string;
  label: string;
  tooth?: string;
  patientLabel?: string;
  clinicalReason?: string;
  phase?: number;
  priority?: number;
  priceCents?: number;
  adHoc?: boolean;
}

export class ClinicalRepository {
  constructor(
    private readonly client: SupabaseRestClient,
    private readonly clinicId: string,
  ) {}

  async getClinicalSync(patientId: string): Promise<ClinicalSyncState> {
    const [entities, snapshots, plans, budgets, odontogramVersion] = await Promise.all([
      this.client.select<{ status: string; created_at: string }>("dental_entities", {
        select: "status,created_at",
        patient_id: `eq.${patientId}`,
        active: "eq.true",
        order: "created_at.desc",
      }),
      this.client.select<{ id: string }>("odontogram_snapshots", {
        select: "id",
        patient_id: `eq.${patientId}`,
      }),
      this.client.select<PlanRow>("clinical_plans", {
        select: "*",
        patient_id: `eq.${patientId}`,
        order: "updated_at.desc",
        limit: 1,
      }),
      this.client.select<BudgetRow>("budgets", {
        select: "*",
        patient_id: `eq.${patientId}`,
        order: "revision.desc",
      }),
      currentOdontogramVersion(this.client, patientId),
    ]);
    const plan = plans[0];
    // Plan and budget stay in step through the whole-plan budget; phase and custom budgets are
    // snapshots of a selection and are regenerated on request.
    const budget = budgets.find((row) => (row.scope ?? "plan") === "plan");
    const planItems = plan
      ? await this.client.select<{ id: string; status: string }>("clinical_plan_items", {
          select: "id,status",
          plan_id: `eq.${plan.id}`,
        })
      : [];
    const planOutdated = !plan || plan.source_odontogram_version !== odontogramVersion;
    const budgetOutdated = planOutdated || !budget || budget.source_plan_version !== plan?.version;
    return {
      patientId,
      odontogram: {
        version: odontogramVersion,
        updatedAt: entities[0]?.created_at ?? new Date(0).toISOString(),
        historyCount: snapshots.length,
        suggestionCount: entities.filter((row) => /pending|indicated|planned/i.test(row.status))
          .length,
      },
      plan: {
        version: plan?.version ?? 1,
        sourceOdontogramVersion: plan?.source_odontogram_version ?? null,
        outdated: planOutdated,
        itemCount: planItems.filter((item) => !["CANCELLED", "SUPERSEDED"].includes(item.status))
          .length,
      },
      budget: budget
        ? {
            id: budget.id,
            code: budget.code,
            status: budget.status,
            totalCents: budget.total_cents,
            sourcePlanVersion: budget.source_plan_version,
            version: budget.version,
            outdated: budgetOutdated,
          }
        : null,
      nextAction: planOutdated ? "SYNC_PLAN" : budgetOutdated ? "SYNC_BUDGET" : "READY",
    };
  }

  async syncPlanFromOdontogram(patientId: string) {
    const before = await this.getClinicalSync(patientId);
    const result = await this.client.rpc<
      PlanRow & {
        summary?: { added?: number; linked?: number; superseded?: number; completed?: number };
      }
    >("sync_clinical_plan", { p_patient_id: patientId });
    const counts = result.summary ?? {};
    const plan = await this.getClinicalPlan(patientId);
    const activeItems =
      plan?.items.filter((item) => !["CANCELLED", "SUPERSEDED", "COMPLETED"].includes(item.status))
        .length ?? 0;
    return {
      plan,
      summary: {
        updated: before.plan.outdated ? 1 : 0,
        added: counts.added ?? 0,
        linked: counts.linked ?? 0,
        superseded: counts.superseded ?? 0,
        completed: counts.completed ?? 0,
        coveredByExisting: Math.max(0, activeItems - (counts.added ?? 0)),
      },
      sync: await this.getClinicalSync(patientId),
    };
  }

  async setPlanItemPrice(itemId: string, priceCents: number) {
    const row = await this.client.rpc<PlanItemRow>("set_clinical_plan_item_price", {
      p_item_id: itemId,
      p_price_cents: priceCents,
    });
    return mapPlanItem(row);
  }

  async syncBudgetFromPlan(patientId: string) {
    const row = await this.client.rpc<BudgetRow>("sync_budget_from_plan", {
      p_patient_id: patientId,
    });
    const budget = await this.getBudget(row.id);
    if (!budget)
      throw new SupabaseRestError("No se pudo reconstruir el presupuesto sincronizado.", 502, row);
    return { budget, sync: await this.getClinicalSync(patientId) };
  }

  /** A phase or custom budget built from a selection of the current plan's items. */
  async createBudgetFromPlanItems(patientId: string, input: CreateScopedBudgetInput) {
    const row = await this.client.rpc<BudgetRow>("create_budget_from_plan_items", {
      p_patient_id: patientId,
      p_item_ids: input.clinicalPlanItemIds,
      p_scope: input.scope,
      p_title: input.title ?? null,
    });
    const budget = await this.getBudget(row.id);
    if (!budget) throw new SupabaseRestError("No se pudo leer el presupuesto creado.", 502, row);
    return { budget, sync: await this.getClinicalSync(patientId) };
  }

  async finalizeBudgetSignature(budgetId: string, input: FinalizeBudgetSignatureInput) {
    const result = await this.client.rpc<FinalizeBudgetSignatureRpcResult>(
      "finalize_budget_signature",
      {
        p_budget_id: budgetId,
        p_expected_version: input.expectedVersion,
        p_signer_name: input.signerName,
        p_signature_data: input.signatureData,
        p_snapshot_json: {},
      },
    );
    if (result.conflict) {
      return {
        conflict: true as const,
        currentVersion: result.currentVersion ?? input.expectedVersion,
      };
    }
    if (!result.budget || !result.snapshot) {
      throw new SupabaseRestError("La firma no devolvió un snapshot válido.", 502, result);
    }
    return {
      budget: {
        id: result.budget.id,
        code: result.budget.code,
        status: result.budget.status,
        totalCents: result.budget.total_cents,
        sourcePlanVersion: result.budget.source_plan_version,
        revision: result.budget.revision,
        version: result.budget.version,
      },
      snapshot: {
        id: result.snapshot.id,
        budgetId: result.snapshot.budget_id,
        revision: result.snapshot.revision,
        signedAt: result.snapshot.signed_at,
      },
    };
  }

  async getClinicalPlan(patientId: string) {
    const plans = await this.client.select<PlanRow>("clinical_plans", {
      select: "*",
      patient_id: `eq.${patientId}`,
      order: "updated_at.desc",
      limit: 1,
    });
    const plan = plans[0];
    if (!plan) return null;
    const [items, dependencies, budgets] = await Promise.all([
      this.client.select<PlanItemRow>("clinical_plan_items", {
        select: "*",
        plan_id: `eq.${plan.id}`,
        order: "phase.asc,priority.desc",
      }),
      this.client.select<DependencyRow>("clinical_plan_dependencies", {
        select: "*",
        clinic_id: `eq.${this.clinicId}`,
      }),
      this.client.select<BudgetRow>("budgets", {
        select: "*",
        clinical_plan_id: `eq.${plan.id}`,
        order: "revision.desc",
      }),
    ]);
    const mappedItems = items.map(mapPlanItem);
    const mappedBudgets = await Promise.all(budgets.map((budget) => this.getBudget(budget.id)));
    return {
      id: plan.id,
      patientId: plan.patient_id,
      status: plan.status,
      version: plan.version,
      sourceOdontogramVersion: plan.source_odontogram_version,
      items: mappedItems,
      dependencies: dependencies
        .filter((row) => items.some((item) => item.id === row.item_id))
        .map((row) => ({
          id: row.id,
          itemId: row.item_id,
          dependsOnId: row.depends_on_id,
          reason: row.reason,
        })),
      route: mappedItems,
      budgets: mappedBudgets.filter(Boolean),
    };
  }

  async addClinicalPlanItem(patientId: string, input: ClinicalPlanItemInput) {
    const row = await this.client.rpc<PlanItemRow>("add_clinical_plan_item", {
      p_patient_id: patientId,
      p_treatment_catalog_id: input.treatmentCatalogId ?? null,
      p_treatment_code: input.treatmentCode,
      p_label: input.label,
      p_tooth: input.tooth ?? null,
      p_patient_label: input.patientLabel ?? null,
      p_clinical_reason: input.clinicalReason ?? null,
      p_phase: input.phase ?? 1,
      p_priority: input.priority ?? 0,
      p_price_cents: input.priceCents ?? null,
      p_is_ad_hoc: input.adHoc ?? false,
    });
    return mapPlanItem(row);
  }

  async listConsentRequirements(patientId: string) {
    const rows = await this.client.select<ConsentRequirementRow>("consent_requirements", {
      select: "*",
      patient_id: `eq.${patientId}`,
      order: "created_at.asc",
    });
    return {
      items: rows.map((row) => ({
        id: row.id,
        clinicalPlanItemId: row.clinical_plan_item_id,
        consentCode: row.consent_code,
        status: row.status,
        requiredBefore: row.required_before,
        templateId: row.template_id,
        satisfiedByDocumentId: row.satisfied_by_document_id,
        ruleVersion: row.rule_version,
      })),
    };
  }

  async getClinicalWorkflow(patientId: string) {
    const [exams, measurements] = await Promise.all([
      this.client.select<PeriodontalExamRow>("periodontal_exams", {
        select: "*",
        patient_id: `eq.${patientId}`,
        order: "version.desc",
      }),
      this.client.select<PeriodontalMeasurementRow>("periodontal_measurements", {
        select: "*",
        patient_id: `eq.${patientId}`,
        order: "measured_at.desc",
      }),
    ]);
    return {
      problems: [],
      endodonticAssessments: [],
      periodontalExams: exams.map((exam) =>
        mapPeriodontalExam(
          exam,
          measurements.filter((row) => row.exam_id === exam.id),
        ),
      ),
      encounters: [],
    };
  }

  async createPeriodontalExam(patientId: string, input: PeriodontalExamInput) {
    await assertProbeable(this.client, this.clinicId, patientId, input.sites);
    const result = await this.client.rpc<PeriodontalRpcResult>("save_periodontal_exam", {
      p_patient_id: patientId,
      p_exam: input,
    });
    if (!result.exam)
      throw new SupabaseRestError(
        "La revisión periodontal no devolvió el examen creado.",
        502,
        result,
      );
    return mapPeriodontalExam(result.exam, result.measurements ?? []);
  }

  async savePeriodontalMeasurement(patientId: string, input: PeriodontalMeasurementInput) {
    await assertProbeable(this.client, this.clinicId, patientId, [input]);
    const result = await this.client.rpc<PeriodontalRpcResult>("save_periodontal_exam", {
      p_patient_id: patientId,
      p_exam: { sites: [input] },
    });
    const row = result.measurements?.[0];
    if (!row)
      throw new SupabaseRestError(
        "La revisión periodontal no devolvió la medición creada.",
        502,
        result,
      );
    return {
      id: row.id,
      tooth: row.tooth,
      site: row.site,
      probingDepth: row.probing_depth ?? undefined,
      recession: row.recession ?? undefined,
      bleeding: row.bleeding ?? undefined,
      plaque: row.plaque ?? undefined,
      suppuration: row.suppuration ?? undefined,
      mobility: row.mobility ?? undefined,
      furcation: row.furcation ?? undefined,
      measuredAt: row.measured_at,
    };
  }

  async listSnapshots(patientId: string) {
    const [rows, currentVersion] = await Promise.all([
      this.client.select<SnapshotRow>("odontogram_snapshots", {
        select: "*",
        patient_id: `eq.${patientId}`,
        order: "created_at.desc",
      }),
      currentOdontogramVersion(this.client, patientId),
    ]);
    return {
      items: rows.map(mapSnapshot),
      currentVersion,
    };
  }

  async createSnapshot(patientId: string, input: CreateOdontogramSnapshot) {
    const row = await this.client.rpc<SnapshotRow>("create_odontogram_snapshot", {
      p_patient_id: patientId,
      p_label: input.label ?? null,
    });
    return mapSnapshot(row);
  }

  async listTreatmentCatalog() {
    const rows = await this.client.select<TreatmentCatalogRow>("treatment_catalog", {
      select: "*",
      clinic_id: `eq.${this.clinicId}`,
      order: "name.asc",
    });
    return { items: rows.map(mapTreatmentCatalog) };
  }

  async createTreatmentCatalogItem(input: TreatmentCatalogInput) {
    const row = await this.client.insert<TreatmentCatalogRow>("treatment_catalog", {
      clinic_id: this.clinicId,
      code: input.code.trim().toUpperCase(),
      name: input.name.trim(),
      specialty: input.specialty ?? null,
      category: input.category ?? null,
      default_price_cents: input.defaultPriceCents ?? 0,
      base_cost_cents: input.baseCostCents ?? 0,
      default_duration_min: input.defaultDurationMin ?? null,
      requires_lab: input.requiresLab ?? false,
      active: input.active ?? true,
      metadata: input.metadata ?? {},
    });
    return mapTreatmentCatalog(row);
  }

  async updateTreatmentCatalogItem(
    id: string,
    input: Partial<TreatmentCatalogInput> & { expectedVersion: number },
  ) {
    const body: Record<string, unknown> = { version: input.expectedVersion + 1 };
    if (input.code !== undefined) body.code = input.code.trim().toUpperCase();
    if (input.name !== undefined) body.name = input.name.trim();
    if (input.specialty !== undefined) body.specialty = input.specialty;
    if (input.category !== undefined) body.category = input.category;
    if (input.defaultPriceCents !== undefined) body.default_price_cents = input.defaultPriceCents;
    if (input.baseCostCents !== undefined) body.base_cost_cents = input.baseCostCents;
    if (input.defaultDurationMin !== undefined)
      body.default_duration_min = input.defaultDurationMin;
    if (input.requiresLab !== undefined) body.requires_lab = input.requiresLab;
    if (input.active !== undefined) body.active = input.active;
    if (input.metadata !== undefined) body.metadata = input.metadata;
    const row = await this.client.patch<TreatmentCatalogRow>(
      "treatment_catalog",
      {
        id: `eq.${id}`,
        clinic_id: `eq.${this.clinicId}`,
        version: `eq.${input.expectedVersion}`,
      },
      body,
    );
    return mapTreatmentCatalog(row);
  }

  private async getBudget(id: string) {
    const budgets = await this.client.select<BudgetRow>("budgets", {
      select: "*",
      id: `eq.${id}`,
      limit: 1,
    });
    const budget = budgets[0];
    if (!budget) return null;
    const items = await this.client.select<BudgetItemRow>("budget_items", {
      select: "*",
      budget_id: `eq.${budget.id}`,
      order: "created_at.asc",
    });
    return {
      id: budget.id,
      code: budget.code,
      status: budget.status,
      totalCents: budget.total_cents,
      sourcePlanVersion: budget.source_plan_version,
      version: budget.version,
      scope: budget.scope ?? "plan",
      title: budget.title ?? null,
      items: items.map((item) => ({
        id: item.id,
        clinicalPlanItemId: item.clinical_plan_item_id,
        description: item.description,
        tooth: item.tooth,
        unitPriceCents: item.unit_price_cents,
        totalCents: item.total_cents,
      })),
    };
  }
}

function mapPeriodontalExam(
  exam: PeriodontalExamRow,
  rows: readonly Omit<PeriodontalMeasurementRow, "exam_id" | "exam_version">[],
) {
  return {
    id: exam.id,
    metadata: exam.metadata ?? {},
    title: exam.title,
    measuredAt: exam.measured_at,
    summaryJson: exam.summary_json ?? {},
    diagnosis: exam.diagnosis,
    stage: exam.stage,
    grade: exam.grade,
    extent: exam.extent,
    version: exam.version,
    sites: rows.map((row) => ({
      tooth: row.tooth,
      site: row.site,
      probingDepth: row.probing_depth ?? undefined,
      recession: row.recession ?? undefined,
      mobility: row.mobility ?? undefined,
      furcation: row.furcation ?? undefined,
      bleeding: row.bleeding ?? undefined,
      plaque: row.plaque ?? undefined,
      suppuration: row.suppuration ?? undefined,
    })),
  };
}

function mapSnapshot(row: SnapshotRow) {
  const parsed = odontogramSnapshotSchema.safeParse({
    id: row.id,
    label: row.label,
    payloadJson: row.payload_json,
    createdAt: row.created_at,
    version: row.version,
  });
  if (!parsed.success)
    throw new SupabaseRestError("Snapshot clínico incompatible.", 502, {
      snapshotId: row.id,
      issues: parsed.error.issues,
    });
  return parsed.data;
}

function mapPlanItem(row: PlanItemRow) {
  return {
    id: row.id,
    tooth: row.tooth,
    treatmentCatalogId: row.treatment_catalog_id,
    treatmentCode: row.treatment_code_snapshot ?? row.treatment_code,
    label: row.label_snapshot ?? row.label,
    patientLabel: row.patient_label,
    clinicalReason: row.clinical_reason,
    diagnosisId: row.diagnosis_id ?? null,
    phase: row.phase,
    priority: row.priority,
    status: row.status,
    priceCents: row.price_snapshot_cents ?? row.price_cents,
    costCents: row.cost_snapshot_cents,
    adHoc: row.is_ad_hoc,
    version: row.version,
  };
}

function mapTreatmentCatalog(row: TreatmentCatalogRow) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    specialty: row.specialty,
    category: row.category,
    defaultPriceCents: row.default_price_cents,
    baseCostCents: row.base_cost_cents,
    defaultDurationMin: row.default_duration_min,
    requiresLab: row.requires_lab,
    active: row.active,
    metadata: row.metadata,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
