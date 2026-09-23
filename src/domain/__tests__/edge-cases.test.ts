import { describe, expect, it } from "vitest";
import { durationMinutes, layoutDay, snap, waitingVisualState } from "../agenda";
import { clinicalPipelineState } from "../clinical-pipeline";
import { endodonticConsistency, type EndodonticAssessment } from "../endodontics";
import { asCents, mulQty, parseEUR, taxFromBps } from "../money";
import {
  archForTooth,
  bridgeTeethFromEndpoints,
  compareOdontogramSnapshots,
  createRemovable,
  cycleClinicalState,
  normalizeSurfaceForTooth,
  toothType,
  type DentalEntity,
} from "../odontogram";
import {
  applyOdontogramCommand,
  createBoundedHistory,
  createOdontogramEntityState,
  redoHistory,
  undoHistory,
} from "../odontogram/state";
import {
  normalizePeriodontalSite,
  summarizePeriodontal,
  validatePeriodontalReading,
} from "../periodontal";
import {
  addDependency,
  budgetCategoryForTreatment,
  changePlanItemPriority,
  friendlyAlternativeLabel,
  removeDependency,
  suggestKennedyClass,
  validateGraph,
  type TreatmentPlanGraph,
} from "../plan";
import {
  can,
  canAccessAppointment,
  canAccessPatient,
  requiredPermissionForRoute,
  type ActorContext,
} from "../permissions";
import { patientLabel, rewardCents } from "../rewards";
import {
  canIssuePrescription,
  canRetryVerifactu,
  canTransitionLaboratory,
  hasInvoiceBalance,
  isLaboratoryLate,
  maxPaymentAllocation,
} from "../state-machines";

describe("domain edge cases", () => {
  it("rejects invalid monetary inputs and preserves negative rectifications", () => {
    expect(asCents(-125)).toBe(-125);
    expect(() => parseEUR("1,2,3")).toThrow(/no válido/);
    expect(() => mulQty(100, Number.NaN)).toThrow(/finito/);
    expect(() => taxFromBps(100, 21.5)).toThrow(/puntos básicos enteros/);
  });

  it("guards agenda invalid ranges and non-waiting visual states", () => {
    expect(() =>
      durationMinutes({
        startsAt: "2026-09-21T10:00:00+02:00",
        endsAt: "2026-09-21T09:00:00+02:00",
      }),
    ).toThrow(/después/);
    expect(() => snap(10, 0)).toThrow(/válidos/);
    expect(() => layoutDay([], { dayStartMinutes: 600, dayEndMinutes: 500 })).toThrow(/posterior/);
    expect(waitingVisualState({ status: "ARRIVED" })).toBe("neutral");
    expect(
      waitingVisualState({
        status: "ARRIVED",
        arrivedAt: "2026-09-21T09:00:00+02:00",
        now: "2026-09-21T09:15:00+02:00",
      }),
    ).toBe("yellow");
  });

  it("rejects invalid FDI, surfaces, tri-state families and cross-arch bridges", () => {
    expect(() => archForTooth("19")).toThrow(/FDI no válido/);
    expect(toothType("53")).toBe("canine");
    expect(toothType("54")).toBe("molar");
    expect(normalizeSurfaceForTooth("11", "O")).toBe("I");
    expect(() => normalizeSurfaceForTooth("11", "X")).toThrow(/Superficie/);
    expect(() => cycleClinicalState("crown", "caries")).toThrow(/triestado/);
    expect(() => bridgeTeethFromEndpoints("13", "33")).toThrow(/misma arcada/);
    expect(() => bridgeTeethFromEndpoints("53", "63")).toThrow(/permanentes/);
  });

  it("validates removable arches and snapshot add/remove/change branches", () => {
    const removable = createRemovable("upper", ["14", "15"]);
    expect(removable.entityType).toBe("REMOVABLE");
    expect(() => createRemovable("upper", [])).toThrow(/al menos un diente/);
    expect(() => createRemovable("upper", ["14", "34"])).toThrow(/misma arcada/);

    const before: DentalEntity = {
      id: "filling-11",
      tooth: "11",
      entityType: "RESTORATION",
      status: "filling",
      active: true,
    };
    const changed: DentalEntity = { ...before, status: "filling_bad" };
    const added: DentalEntity = {
      id: "endo-21",
      tooth: "21",
      entityType: "ENDO",
      status: "endo_indicated",
      active: true,
    };
    const diff = compareOdontogramSnapshots(
      { entities: [before, { ...added, id: "removed" }] },
      { entities: [changed, added] },
    );
    expect(diff.added).toEqual([added]);
    expect(diff.removed.map((entity) => entity.id)).toEqual(["removed"]);
    expect(diff.changed).toEqual([changed]);
  });

  it("covers odontogram reducer error, deactivate, remove and empty history branches", () => {
    const initial = createOdontogramEntityState([
      {
        id: "endo-11",
        tooth: "11",
        entityType: "ENDO",
        status: "endo_indicated",
        active: true,
      },
    ]);
    const completed = applyOdontogramCommand(initial, {
      type: "SET_ENTITY_STATUS",
      entityId: "endo-11",
      status: "endo",
    });
    expect(completed.entitiesById["endo-11"]?.status).toBe("endo");
    const inactive = applyOdontogramCommand(completed, {
      type: "DEACTIVATE_ENTITY",
      entityId: "endo-11",
    });
    expect(inactive.entitiesById["endo-11"]?.active).toBe(false);
    const removed = applyOdontogramCommand(inactive, {
      type: "REMOVE_ENTITY",
      entityId: "endo-11",
    });
    expect(removed.entitiesById["endo-11"]).toBeUndefined();
    expect(() =>
      applyOdontogramCommand(initial, {
        type: "REMOVE_ENTITY",
        entityId: "missing",
      }),
    ).toThrow(/inexistente/);
    expect(() => createBoundedHistory(initial, 0)).toThrow(/mayor que cero/);
    const history = createBoundedHistory(initial);
    expect(undoHistory(history)).toBe(history);
    expect(redoHistory(history)).toBe(history);
  });

  it("covers periodontal empty, invalid alias and all numeric range guards", () => {
    expect(summarizePeriodontal([]).siteCount).toBe(0);
    expect(() => normalizePeriodontalSite("XX")).toThrow(/no válido/);
    expect(() =>
      validatePeriodontalReading({
        tooth: "16",
        site: "MV",
        probingDepth: 4,
        recession: 16,
      }),
    ).toThrow(/recesión/);
    expect(() =>
      validatePeriodontalReading({
        tooth: "16",
        site: "MV",
        probingDepth: 4,
        recession: 0,
        furcation: -1,
      }),
    ).toThrow(/furca/);
  });

  it("guards treatment-plan graph integrity, categories, labels and Kennedy ambiguity", () => {
    const graph: TreatmentPlanGraph = {
      items: [
        {
          id: "a",
          treatmentCode: "endo",
          label: "Endodoncia",
          phase: 1,
          priority: 50,
          status: "PLANNED",
        },
        {
          id: "b",
          treatmentCode: "crown",
          label: "Corona",
          phase: 5,
          priority: 10,
          status: "PLANNED",
        },
      ],
      dependencies: [],
    };

    expect(() =>
      validateGraph({
        ...graph,
        dependencies: [{ itemId: "a", dependsOnId: "missing", reason: "Motivo" }],
      }),
    ).toThrow(/inexistente/);
    expect(() => addDependency(graph, { itemId: "a", dependsOnId: "a", reason: "Motivo" })).toThrow(
      /sí mismo/,
    );
    expect(() => removeDependency(graph, "a", "b", "Motivo")).toThrow(/no existe/);
    expect(() => changePlanItemPriority(graph.items[0]!, Number.NaN, "Motivo")).toThrow(/0 y 100/);

    expect(budgetCategoryForTreatment({ treatmentCode: "bone_graft", label: "Injerto" })).toBe(
      "Cirugía e implantes",
    );
    expect(friendlyAlternativeLabel("retain tooth")).toBe("Conservar el diente");
    expect(friendlyAlternativeLabel("temporary provisional")).toBe("Alternativa provisional");
    expect(friendlyAlternativeLabel("Sin etiqueta conocida")).toBe("Sin etiqueta conocida");
    expect(suggestKennedyClass([])).toBe("UNCLASSIFIED");
    expect(suggestKennedyClass(["55"])).toBe("UNCLASSIFIED");
  });

  it("covers permission denials, patient isolation and unmapped routes", () => {
    const dentist: ActorContext = {
      role: "DENTIST",
      permissions: ["agenda.read.own"],
      staffId: "d1",
    };
    expect(can(dentist, "finance.read")).toBe(false);
    expect(canAccessAppointment(dentist, { staffId: "d2" })).toBe(false);
    expect(canAccessPatient(dentist, "p1")).toBe(false);
    expect(requiredPermissionForRoute("/app/unknown")).toBeNull();

    const patient: ActorContext = {
      role: "PATIENT",
      permissions: ["documents.read"],
    };
    expect(canAccessPatient(patient, "p1")).toBe(false);
  });

  it("covers operational state-machine negative branches", () => {
    expect(canTransitionLaboratory("PLACED", "SENT")).toBe(false);
    expect(
      isLaboratoryLate("2026-09-20T10:00:00+02:00", "PLACED", "2026-09-21T10:00:00+02:00"),
    ).toBe(false);
    expect(canRetryVerifactu("PENDING")).toBe(false);
    expect(hasInvoiceBalance("DRAFT", 1000, 0)).toBe(false);
    expect(hasInvoiceBalance("ISSUED", 1000, 1000)).toBe(false);
    expect(maxPaymentAllocation(-10, 100)).toBe(0);
    expect(
      canIssuePrescription({
        state: "DRAFT",
        patientId: "p1",
        prescriberId: "d1",
        medicationCount: 1,
      }),
    ).toBe(false);
  });

  it("covers endodontic no-notice and clinical-pipeline missing-data branches", () => {
    const normal: EndodonticAssessment = {
      pulpalDiagnosis: "Pulpa normal",
      apicalDiagnosis: "Tejidos apicales normales",
      confidence: "HIGH",
      complexity: "LOW",
      restorability: "FAVORABLE",
      findings: { percussion: "NEGATIVE", lingeringColdSeconds: 2 },
    };
    expect(endodonticConsistency(normal)).toEqual([]);
    expect(clinicalPipelineState({ odontogramVersion: 1 }).nextAction).toBe("SYNC_PLAN");
    expect(
      clinicalPipelineState({
        odontogramVersion: 1,
        plan: { version: 1, sourceOdontogramVersion: 1 },
      }).nextAction,
    ).toBe("SYNC_BUDGET");
  });

  it("caps rewards and normalizes sparse record numbers", () => {
    expect(rewardCents(-5)).toBe(0);
    expect(rewardCents(Number.NaN)).toBe(0);
    expect(patientLabel("AB-12")).toBe("Ficha ••0012");
  });
});
