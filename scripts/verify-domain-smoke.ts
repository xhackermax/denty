import assert from "node:assert/strict";
import { clinicalPipelineState } from "../src/domain/clinical-pipeline.ts";
import {
  budgetSignatureFingerprint,
  isBudgetSignatureCurrent,
} from "../src/domain/budget-signature.ts";
import { endodonticConsistency } from "../src/domain/endodontics.ts";
import { formatEUR, mulQty, parseEUR, taxFromBps } from "../src/domain/money.ts";
import {
  archForTooth,
  bridgeTeethFromEndpoints,
  compareOdontogramSnapshots,
  createBridgeEntities,
  createEndoPostCrown,
  createImplantStack,
  createRemovable,
  cycleClinicalState,
  normalizeSurfaceForTooth,
  toothType,
  assertNoImplantCariesConflict,
} from "../src/domain/odontogram/index.ts";
import {
  addDependency,
  budgetCategoryForTreatment,
  changePlanItemPhase,
  changePlanItemPriority,
  clinicalPhaseForTreatment,
  friendlyAlternativeLabel,
  orderedPlan,
  removeDependency,
  suggestKennedyClass,
} from "../src/domain/plan/index.ts";
import {
  can,
  canAccessAppointment,
  canAccessPatient,
  decideStaffRouteAccess,
  requiredPermissionForRoute,
  type ActorContext,
} from "../src/domain/permissions.ts";
import { normalizePeriodontalSite, summarizePeriodontal } from "../src/domain/periodontal/index.ts";
import { patientLabel, rewardCents } from "../src/domain/rewards.ts";
import {
  createBoundedHistory,
  createOdontogramEntityState,
  executeOdontogramCommand,
  redoHistory,
  undoHistory,
} from "../src/domain/odontogram/state.ts";

assert.equal(parseEUR("1.234,56"), 123456);
assert.equal(parseEUR("0,005"), 1);
assert.equal(parseEUR("-0,005"), -1);
assert.equal(mulQty(199, 1.5), 299);
assert.equal(taxFromBps(10_000, 2100), 2100);
assert.match(formatEUR(123456), /1234,56/);

assert.equal(archForTooth("55"), "upper");
assert.equal(archForTooth("75"), "lower");
assert.deepEqual(bridgeTeethFromEndpoints("13", "23"), ["13", "12", "11", "21", "22", "23"]);
assert.deepEqual(bridgeTeethFromEndpoints("23", "13"), ["23", "22", "21", "11", "12", "13"]);
assert.equal(
  createBridgeEntities("13", "23").filter((entity) => entity.entityType === "PONTIC").length,
  4,
);
assert.equal(createImplantStack("36")[2]?.parentId, "implant-36-abutment");
assert.equal(cycleClinicalState("implant", "implant"), "implant_review");
assert.equal(cycleClinicalState("implant", "implant_review"), "implant_indicated");
assert.equal(cycleClinicalState("implant", "implant_indicated"), "implant");
assert.equal(toothType("11"), "incisor");
assert.equal(toothType("16"), "molar");
assert.equal(normalizeSurfaceForTooth("11", "O"), "I");
assert.equal(normalizeSurfaceForTooth("46", "P/L"), "L");
assert.equal(createEndoPostCrown("22").length, 3);
assert.equal(createRemovable("upper", ["14", "15"]).entityType, "REMOVABLE");
assert.throws(() => createRemovable("upper", ["14", "34"]), /misma arcada/);
const cariesEntity = {
  id: "caries-46",
  tooth: "46",
  entityType: "TOOTH_STATE" as const,
  status: "caries",
  active: true,
};
assert.throws(
  () => assertNoImplantCariesConflict([cariesEntity], "46", "implant"),
  /incompatibles/,
);

const crownBefore = {
  id: "crown-36",
  tooth: "36",
  entityType: "CROWN" as const,
  status: "crown_pending",
  attributes: { material: "zirconia", shade: "A2" },
  active: true,
};
const snapshotDiff = compareOdontogramSnapshots(
  { entities: [crownBefore] },
  { entities: [{ ...crownBefore, attributes: { shade: "A2", material: "zirconia" } }] },
);
assert.equal(snapshotDiff.changed.length, 0);

const implant = createImplantStack("36")[0];
assert.ok(implant);
let odontogramHistory = createBoundedHistory(createOdontogramEntityState());
odontogramHistory = executeOdontogramCommand(odontogramHistory, {
  type: "UPSERT_ENTITY",
  entity: implant,
});
assert.equal(odontogramHistory.present.entitiesById[implant.id]?.entityType, "IMPLANT");
const undoneOdontogram = undoHistory(odontogramHistory);
assert.equal(undoneOdontogram.present.entitiesById[implant.id], undefined);
assert.equal(redoHistory(undoneOdontogram).present.entitiesById[implant.id]?.entityType, "IMPLANT");

const graph = {
  items: [
    {
      id: "crown",
      treatmentCode: "crown",
      label: "Corona",
      phase: 5 as const,
      priority: 70,
      status: "PLANNED" as const,
    },
    {
      id: "endo",
      treatmentCode: "endo",
      label: "Endodoncia",
      phase: 1 as const,
      priority: 90,
      status: "PLANNED" as const,
    },
  ],
  dependencies: [{ itemId: "crown", dependsOnId: "endo", reason: "Endodoncia previa" }],
};
assert.deepEqual(
  orderedPlan(graph).map((item) => item.id),
  ["endo", "crown"],
);
assert.throws(
  () => addDependency(graph, { itemId: "endo", dependsOnId: "crown", reason: "ciclo" }),
  /circular/,
);
assert.equal(friendlyAlternativeLabel("bridge"), "Reponer con puente");
assert.equal(changePlanItemPhase(graph.items[0]!, 2, "Control de infección").item.phase, 2);
assert.equal(changePlanItemPriority(graph.items[0]!, 80, "Urgencia").item.priority, 80);
assert.equal(
  budgetCategoryForTreatment({ treatmentCode: "implant", label: "Implante" }),
  "Cirugía e implantes",
);
assert.equal(clinicalPhaseForTreatment({ treatmentCode: "caries_restoration" }), 3);
assert.equal(suggestKennedyClass(["18", "17", "28", "27"]), "I");
assert.equal(suggestKennedyClass(["18", "38"]), "UNCLASSIFIED");
assert.equal(
  removeDependency(graph, "crown", "endo", "Endodoncia completada").dependencies.length,
  0,
);

assert.equal(normalizePeriodontalSite("ml"), "MP");
const periodontal = summarizePeriodontal([
  { tooth: "11", site: "MV", probingDepth: 4, recession: 1, bleeding: true },
  { tooth: "11", site: "V", probingDepth: 6, recession: 2, plaque: true },
]);
assert.equal(periodontal.sitesAtLeast4, 2);
assert.equal(periodontal.maxCAL, 8);

const endodonticNotices = endodonticConsistency({
  pulpalDiagnosis: "Necrosis pulpar",
  apicalDiagnosis: "Periodontitis apical sintomática",
  confidence: "MODERATE",
  complexity: "MODERATE",
  restorability: "GUARDED",
  findings: { coldResponsePresent: true, percussion: "POSITIVE" },
});
assert.equal(
  endodonticNotices.some((notice) => notice.code === "NECROSIS_COLD_RESPONSE_CONFLICT"),
  true,
);

assert.equal(
  clinicalPipelineState({
    odontogramVersion: 2,
    plan: { version: 3, sourceOdontogramVersion: 2 },
    budget: { id: "b1", status: "DRAFT", sourcePlanVersion: 3 },
  }).nextAction,
  "READY",
);

const budgetFingerprint = budgetSignatureFingerprint({
  budgetId: "b1",
  totalCents: 185000,
  sourcePlanVersion: 3,
});
assert.equal(
  isBudgetSignatureCurrent(
    { budgetId: "b1", totalCents: 185000, sourcePlanVersion: 3 },
    budgetFingerprint,
  ),
  true,
);
assert.equal(
  isBudgetSignatureCurrent(
    { budgetId: "b1", totalCents: 190000, sourcePlanVersion: 3 },
    budgetFingerprint,
  ),
  false,
);


assert.equal(rewardCents(2), 0);
assert.equal(rewardCents(3), 100);
assert.equal(rewardCents(15), 500);
assert.equal(rewardCents(16), 500);
assert.equal(patientLabel("123456"), "Ficha ••3456");

const actor: ActorContext = { role: "DENTIST", permissions: ["agenda.read.own"] };
assert.equal(can(actor, "agenda.read"), true);
assert.equal(requiredPermissionForRoute("/app/patients/p1?panel=odontogram"), "patients.read");
const ownAgendaActor: ActorContext = {
  role: "DENTIST",
  permissions: ["patients.read", "agenda.read.own"],
  staffId: "d1",
};
assert.equal(canAccessAppointment(ownAgendaActor, { staffId: "d1" }), true);
assert.equal(canAccessAppointment(ownAgendaActor, { staffId: "d2" }), false);
assert.equal(canAccessPatient(ownAgendaActor, "p1"), true);
const patientActor: ActorContext = {
  role: "PATIENT",
  permissions: ["documents.read"],
  patientIds: ["self"],
};
assert.equal(canAccessPatient(patientActor, "self"), true);
assert.equal(canAccessPatient(patientActor, "other"), false);
assert.deepEqual(decideStaffRouteAccess(ownAgendaActor, "/app/patients"), {
  kind: "allow",
});
assert.deepEqual(decideStaffRouteAccess(ownAgendaActor, "/app/admin"), {
  kind: "forbidden",
  required: "users.manage",
});
assert.deepEqual(decideStaffRouteAccess(patientActor, "/app"), {
  kind: "forbidden",
  required: "staff",
});
assert.deepEqual(decideStaffRouteAccess(null, "/app/patients"), {
  kind: "unauthenticated",
});

console.log("Domain smoke OK");
