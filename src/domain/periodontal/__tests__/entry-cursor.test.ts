import { expect, test } from "vitest";
import { deriveMouthState } from "@/domain/odontogram/mouth-state";
import { createPerioExam, examToReadings, examToSites, examToVisualReadings, perioSummary } from "../exam";
import {
  createPerioSession,
  applyPerioCommand,
  entryPath,
  reconcileSessionMouth,
} from "../entry-cursor";
const mouth = deriveMouthState([
  { id: "missing", tooth: "17", entityType: "MISSING", status: "missing", active: true },
]);
test("clinical path follows four faces and skips absent teeth", () => {
  const path = entryPath(mouth);
  expect(path[0]).toMatchObject({ tooth: "18", face: "vestibular" });
  expect(path[1]?.tooth).toBe("16");
  expect(path.some((p) => p.tooth === "17")).toBe(false);
  expect(path.find((p) => p.face === "palatal")).toMatchObject({ tooth: "28" });
  expect(path.find((p) => p.face === "lingual")).toMatchObject({ tooth: "38" });
  expect(path.at(-1)).toMatchObject({ tooth: "38", face: "vestibular" });
});
test("triplet entry advances, flags refer to last trio and undo restores exact prior state", () => {
  const first = createPerioSession(createPerioExam(mouth), mouth);
  const entered = applyPerioCommand(first, { type: "triplet", values: [3, 2, 3] }, mouth);
  expect(entered.cursor.tooth).toBe("16");
  expect(entered.exam.teeth["18"]?.sites.MV.pd).toBe(3);
  const bleed = applyPerioCommand(entered, { type: "bleeding", sites: ["mesial"] }, mouth);
  expect(bleed.exam.teeth["18"]?.sites.MV.bop).toBe(true);
  expect(bleed.exam.teeth["18"]?.sites.V.bop).toBe(false);
  const margin = applyPerioCommand(bleed, { type: "margin", values: [-1, 0, -1] }, mouth);
  expect(margin.exam.teeth["18"]?.sites.MV.gm).toBe(-1);
  expect(
    examToReadings(margin.exam).find((r) => r.tooth === "18" && r.site === "MV"),
  ).toMatchObject({ recession: 1, probingDepth: 3 });
  expect(perioSummary(margin.exam)).toMatchObject({ meanPD: 2.67, meanCAL: 3.33, siteCount: 3 });
  const undone = applyPerioCommand(margin, { type: "undo" }, mouth);
  expect(undone.exam).toEqual(bleed.exam);
});
test("navigation supports back/goTo and rejects absent or invalid ranges without changing state", () => {
  const session = createPerioSession(createPerioExam(mouth), mouth);
  expect(() => applyPerioCommand(session, { type: "goTo", tooth: "17" }, mouth)).toThrow(/ausente/);
  expect(() => applyPerioCommand(session, { type: "triplet", values: [16, 3, 2] }, mouth)).toThrow(
    /rango/,
  );
  const lower = applyPerioCommand(session, { type: "goTo", tooth: "36", face: "lingual" }, mouth);
  expect(lower.cursor).toMatchObject({ tooth: "36", face: "lingual" });
  const previous = applyPerioCommand(lower, { type: "back" }, mouth);
  expect(previous.cursor.tooth).toBe("37");
});
test("legacy recession is adapted to margin without mutating saved readings", () => {
  const readings = [{ tooth: "16", site: "MV" as const, probingDepth: 5, recession: 2 }];
  const exam = createPerioExam(mouth, readings);
  expect(exam.teeth["16"]?.sites.MV.gm).toBe(-2);
  expect(examToReadings(exam)[0]).toMatchObject(readings[0]!);
  expect(readings[0]?.recession).toBe(2);
});
test("mobility/furcation and missing/implant commands share a bounded undo history", () => {
  let session = createPerioSession(createPerioExam(mouth), mouth);
  session = applyPerioCommand(session, { type: "mobility", value: 2 }, mouth);
  session = applyPerioCommand(session, { type: "furcation", value: 1 }, mouth);
  expect(session.exam.teeth["18"]?.mobility).toBe(2);
  expect(session.exam.teeth["18"]?.furcation.b).toBe(1);
  session = applyPerioCommand(session, { type: "missing" }, mouth);
  expect(session.exam.teeth["18"]?.missing).toBe(true);
  expect(session.cursor.tooth).toBe("16");
  session = applyPerioCommand(session, { type: "implant" }, mouth);
  expect(session.exam.teeth["16"]?.implant).toBe(true);
  for (let i = 0; i < 35; i++)
    session = applyPerioCommand(session, { type: "mobility", value: 1 }, mouth);
  expect(session.past.length).toBeLessThanOrEqual(30);
});
test("full exam finishes without zeros for missing sites; final flags and correction remain available", () => {
  let session = createPerioSession(createPerioExam(mouth), mouth);
  for (let i = 0; i < entryPath(mouth).length; i++)
    session = applyPerioCommand(session, { type: "triplet", values: [3, 3, 3] }, mouth);
  expect(session.cursor.finished).toBe(true);
  expect(perioSummary(session.exam)).toMatchObject({ remainingSites: 0, calSiteCount: 0 });
  const marked = applyPerioCommand(session, { type: "bleeding" }, mouth);
  expect(marked.exam.teeth["38"]?.sites.MV.bop).toBe(true);
  const margin = applyPerioCommand(marked, { type: "margin", values: [-2, -2, -2] }, mouth);
  expect(perioSummary(margin.exam).meanCAL).toBe(5);
  expect(applyPerioCommand(margin, { type: "back" }, mouth).cursor.finished).toBe(false);
});
test("alternate order is explicit, reversible, persisted and carries per-entry furcation", () => {
  let s = createPerioSession(createPerioExam(mouth), mouth);
  s = applyPerioCommand(s, { type: "order", order: "vestibular_first" }, mouth);
  expect(s.order).toBe("vestibular_first");
  expect(entryPath(mouth, s.order).filter((c) => c.face === "palatal")[0]?.tooth).toBe("28");
  s = applyPerioCommand(s, { type: "goTo", tooth: "36" }, mouth);
  s = applyPerioCommand(s, { type: "furcation", value: 2, entry: "m" }, mouth);
  expect(s.exam.teeth["36"]?.furcation.m).toBe(2);
  expect(
    applyPerioCommand(s, { type: "undo" }, mouth).exam.teeth["36"]?.furcation.m,
  ).toBeUndefined();
});
test("summary ignores unmeasured values, preserves known zero margins and reconciles changed mouth", () => {
  const exam = createPerioExam(mouth, [
    {
      tooth: "36",
      site: "MV",
      probingDepth: 6,
      recession: 0,
      bleeding: true,
      plaque: true,
      suppuration: true,
      mobility: 2,
      furcation: 1,
    },
  ]);
  expect(perioSummary(exam)).toMatchObject({
    meanPD: 6,
    meanCAL: 6,
    bleedingPct: 100,
    plaquePct: 100,
    sitesAtLeast4: 1,
    sitesAtLeast5: 1,
    sitesAtLeast6: 1,
    quadrants: [3],
  });
  expect(examToReadings(exam)[0]).toMatchObject({ mobility: 2, furcation: 1 });
  const changed = deriveMouthState([
    { id: "36", tooth: "36", entityType: "MISSING", status: "missing", active: true },
  ]);
  const state = reconcileSessionMouth(createPerioSession(exam, mouth), changed);
  expect(state.exam.teeth["36"]?.missing).toBe(true);
  expect(examToSites(state.exam)).toHaveLength(0);
  expect(
    examToSites(createPerioExam(mouth, [{ tooth: "36", site: "V", probingDepth: 3 }]))[0],
  ).not.toHaveProperty("recession");
});
test("temporary loss of retained primary tooth keeps measurements for a later undo", () => {
  const present = deriveMouthState([
    { id: "55", tooth: "55", entityType: "PEDIATRIC", status: "retained", active: true },
  ]);
  const exam = createPerioExam(present, [
    { tooth: "55", site: "MV", probingDepth: 6, recession: 2 },
  ]);
  const absent = deriveMouthState([
    { id: "55", tooth: "55", entityType: "MISSING", status: "missing", active: true },
  ]);
  const removed = reconcileSessionMouth(createPerioSession(exam, present), absent);
  expect(examToSites(removed.exam).some((r) => r.tooth === "55")).toBe(false);
  const restored = reconcileSessionMouth(removed, present);
  expect(restored.exam.teeth["55"]?.sites.MV).toMatchObject({ pd: 6, gm: -2 });
});

test("main chart includes BOP and suppuration before measuring PD, without changing finalized sites", () => {
  let session = createPerioSession(createPerioExam(mouth), mouth);
  session = applyPerioCommand(session, {
    type: "site", tooth: "16", site: "MV", patch: { bop: true },
  }, mouth);
  session = applyPerioCommand(session, {
    type: "site", tooth: "16", site: "DP", patch: { suppuration: true },
  }, mouth);
  expect(examToSites(session.exam)).toHaveLength(0);
  expect(examToVisualReadings(session.exam)).toEqual([
    { tooth: "16", site: "MV", bleeding: true, suppuration: false, plaque: false },
    { tooth: "16", site: "DP", bleeding: false, suppuration: true, plaque: false },
  ]);
  session = applyPerioCommand(session, {
    type: "site", tooth: "16", site: "V", patch: { pd: 4 },
  }, mouth);
  expect(examToVisualReadings(session.exam).find((reading) => reading.site === "V"))
    .toMatchObject({ tooth: "16", probingDepth: 4 });
  expect(examToVisualReadings(session.exam).find((reading) => reading.site === "V"))
    .not.toHaveProperty("recession");
  session = applyPerioCommand(session, { type: "missing" }, mouth);
  expect(session.exam.teeth["18"]?.missing).toBe(true);
});
