import { expect, test } from "vitest";
import {
  deriveMouthState,
  isProbeable,
  isEndoCandidate,
  isSurgicalSite,
  teethForChart,
} from "../mouth-state";
import type { DentalEntity } from "../index";
const entity = (
  entityType: DentalEntity["entityType"],
  status: string,
  attributes: Record<string, unknown> = {},
): DentalEntity => ({ id: "e", tooth: "36", entityType, status, attributes, active: true });
test.each([
  entity("MISSING", "missing"),
  entity("TOOTH_STATE", "missing"),
  entity("EXTRACTION", "extraction", { lifecycle: "REALIZADO" }),
  entity("PEDIATRIC", "congenitally_missing"),
])("recognizes missing tooth $entityType", (e) => {
  const state = deriveMouthState([e]);
  expect(state.teeth["36"]?.presence).toBe("missing");
  expect(isProbeable(state, "36")).toBe(false);
  expect(isEndoCandidate(state, "36")).toBe(false);
  expect(isSurgicalSite(state, "36", "implant")).toBe(true);
  expect(isSurgicalSite(state, "36", "extraction")).toBe(false);
});
test("planned extraction still has a natural tooth; inactive findings do not remove it", () => {
  const state = deriveMouthState([
    entity("EXTRACTION", "extraction", { lifecycle: "PLANIFICADO" }),
    { ...entity("MISSING", "missing"), active: false },
  ]);
  expect(state.teeth["36"]?.presence).toBe("extracted_planned");
  expect(isProbeable(state, "36")).toBe(true);
});
test("only completed implant replaces missing tooth", () => {
  const missing = entity("MISSING", "missing");
  const planned = entity("IMPLANT", "implant_pending");
  expect(isProbeable(deriveMouthState([missing, planned]), "36")).toBe(false);
  const state = deriveMouthState([missing, entity("IMPLANT", "implant")]);
  expect(state.teeth["36"]?.presence).toBe("implant");
  expect(isProbeable(state, "36")).toBe(true);
  expect(isEndoCandidate(state, "36")).toBe(false);
});
test("completed bridge pontics and unerupted teeth are not probeable", () => {
  const state = deriveMouthState([
    {
      id: "bridge",
      entityType: "BRIDGE",
      status: "bridge_completed",
      active: true,
      attributes: { pontics: ["36"] },
    } as DentalEntity,
    entity("PEDIATRIC", "unerupted"),
  ]);
  expect(isProbeable(state, "36")).toBe(false);
  expect(teethForChart(state, "perio")).toContain("36");
  expect(isProbeable(state, "99")).toBe(false);
});
test("mixed dentition includes primary teeth and explicit clinical presence overrides age suggestion", () => {
  const state = deriveMouthState([{ ...entity("PEDIATRIC", "healthy"), tooth: "14" }], {
    birthDate: "2017-01-01",
    today: "2026-10-01",
  });
  expect(state.dentition).toBe("mixed");
  expect(state.teeth["55"]?.presence).toBe("deciduous");
  expect(state.teeth["14"]?.presence).toBe("present");
  const child = deriveMouthState([], { birthDate: "2023-01-01", today: "2026-10-01" });
  expect(child.dentition).toBe("deciduous");
  expect(isProbeable(child, "16")).toBe(false);
});
