import crypto from "node:crypto";

import { stages, targets } from "./catalog.mjs";
import { createEventReporter } from "./events.mjs";
import { executeStage } from "./executor.mjs";
import { planStages } from "./graph.mjs";

const root = process.cwd();
const targetId = process.argv[2] ?? "verify";
const planOnly = process.argv.includes("--plan");
const target = targets[targetId];

if (!target) {
  console.error(`Unknown pipeline target: ${targetId}`);
  console.error(`Available targets: ${Object.keys(targets).sort().join(", ")}`);
  process.exit(2);
}

const runId = process.env.DENTY_PIPELINE_RUN_ID ?? crypto.randomUUID();
const plan = planStages(stages, target.roots, target.assume ?? []);
if (planOnly) {
  console.log(plan.join(" -> ") || "(all dependencies assumed)");
  process.exit(0);
}

const reporter = await createEventReporter({ root, runId, target: targetId });
const startedAt = Date.now();
const results = [];

await reporter.emit({
  type: "pipeline:start",
  message: `plan=${plan.join(" -> ") || "(all dependencies assumed)"}`,
});

try {
  for (const stageId of plan) {
    const result = await executeStage({
      root,
      stage: stages[stageId],
      stageId,
      runId,
      emit: reporter.emit,
    });
    results.push(result);
  }

  const durationMs = Date.now() - startedAt;
  await reporter.emit({ type: "pipeline:success", message: `${durationMs} ms` });
  await reporter.finalize({ status: "passed", durationMs, stages: results });
} catch (error) {
  const durationMs = Date.now() - startedAt;
  const failedStage = error.stageId ?? "unknown";
  if (!results.some((result) => result.id === failedStage)) {
    results.push({
      id: failedStage,
      status: "failed",
      attempts: error.stageAttempts ?? 1,
      durationMs: error.stageDurationMs ?? 0,
    });
  }
  await reporter.emit({
    type: "pipeline:failure",
    stage: failedStage,
    message: error instanceof Error ? error.message : String(error),
  });
  await reporter.finalize({ status: "failed", durationMs, stages: results });
  process.exitCode = 1;
}
