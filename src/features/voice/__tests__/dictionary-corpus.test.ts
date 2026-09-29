import { describe, expect, it } from "vitest";

import { planLocalVoiceCommand, type LocalVoiceAction } from "../local-nlu";
import { buildCorpus, type CorpusCase } from "./dictionary-corpus";

function matches(action: LocalVoiceAction, expected: CorpusCase["expected"]): boolean {
  if (action.type !== expected.type) return false;
  if (!("tooth" in action) || action.tooth !== expected.tooth) return false;
  if (expected.status && (!("status" in action) || action.status !== expected.status)) return false;
  if (
    expected.treatmentCode &&
    (!("treatmentCode" in action) || action.treatmentCode !== expected.treatmentCode)
  )
    return false;
  if (expected.surfaces) {
    const got = "surfaces" in action ? [...(action.surfaces ?? [])].sort().join("") : "";
    if (got !== [...expected.surfaces].sort().join("")) return false;
  }
  return true;
}

export function evaluateCorpus() {
  const corpus = buildCorpus();
  const byIntent = new Map<string, { ok: number; total: number; misses: string[] }>();
  for (const item of corpus) {
    const plan = planLocalVoiceCommand(item.utterance, {
      patientId: "p1",
      ...(item.selectedTooth ? { selectedTooth: item.selectedTooth } : {}),
    });
    const ok = plan.actions.some((action) => matches(action, item.expected));
    const stats = byIntent.get(item.intent) ?? { ok: 0, total: 0, misses: [] };
    stats.total += 1;
    if (ok) stats.ok += 1;
    else if (stats.misses.length < 4) stats.misses.push(item.utterance);
    byIntent.set(item.intent, stats);
  }
  const total = corpus.length;
  const ok = [...byIntent.values()].reduce((sum, stats) => sum + stats.ok, 0);
  return { total, ok, accuracy: ok / total, byIntent };
}

describe("NLU dictionary corpus (odontogram)", () => {
  it("understands real dental speech from the dictionary", () => {
    const result = evaluateCorpus();
    const lines = [...result.byIntent.entries()].map(
      ([intent, stats]) =>
        `${intent}: ${stats.ok}/${stats.total}${stats.misses.length ? `  ej. fallo: ${stats.misses.join(" | ")}` : ""}`,
    );
    process.stdout.write(
      `\nCORPUS ${result.ok}/${result.total} = ${(result.accuracy * 100).toFixed(1)}%\n${lines.join("\n")}\n`,
    );
    expect(result.total).toBeGreaterThan(300);
    // Baseline before the dictionary: 57/513 (11.1%).
    expect(result.accuracy).toBeGreaterThanOrEqual(0.97);
  });
});
