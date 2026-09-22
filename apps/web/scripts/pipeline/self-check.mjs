import path from "node:path";

import { stages, targets } from "./catalog.mjs";
import { planStages, validateGraph } from "./graph.mjs";

const validKinds = new Set(["node", "npm", "bin"]);

validateGraph(stages);

for (const [targetId, target] of Object.entries(targets)) {
  planStages(stages, target.roots, target.assume ?? []);
  for (const assumed of target.assume ?? []) {
    if (!stages[assumed]) throw new Error(`Target ${targetId} assumes unknown stage ${assumed}`);
  }
}

for (const [id, stage] of Object.entries(stages)) {
  if (!stage.description || typeof stage.description !== "string") {
    throw new Error(`Stage ${id} must declare a description`);
  }
  if (!Number.isFinite(stage.timeoutMs) || stage.timeoutMs <= 0) {
    throw new Error(`Stage ${id} must declare a positive timeoutMs`);
  }
  if (!stage.command || !validKinds.has(stage.command.kind)) {
    throw new Error(`Stage ${id} must declare a supported command kind`);
  }
  if (stage.cwd && path.isAbsolute(stage.cwd)) {
    throw new Error(`Stage ${id} cwd must stay relative to the repository root`);
  }
  for (const [key, value] of Object.entries(stage.env ?? {})) {
    if (typeof value !== "string") {
      throw new Error(`Stage ${id} env ${key} must be a string`);
    }
  }
  if (stage.retry) {
    if (stage.retry.attempts < 2 || stage.retry.attempts > 3) {
      throw new Error(`Stage ${id} retry attempts must stay bounded to 2-3`);
    }
    if (!Array.isArray(stage.retry.outputIncludes) || stage.retry.outputIncludes.length === 0) {
      throw new Error(`Stage ${id} retries need explicit transient output markers`);
    }
  }
}

if (stages.unit.env?.NODE_ENV !== "test" || stages.coverage.env?.NODE_ENV !== "test") {
  throw new Error("Unit and coverage stages must force NODE_ENV=test");
}
if (
  stages.build.env?.NODE_ENV !== "production" ||
  stages["vercel-build-final"].env?.NODE_ENV !== "production" ||
  stages.e2e.env?.NODE_ENV !== "production"
) {
  throw new Error("Build, Vercel build and E2E stages must force NODE_ENV=production");
}
if (!targets["vercel-build"].roots.includes("vercel-build-final")) {
  throw new Error("vercel-build target must execute vercel-build-final");
}
if (stages.format.command.kind !== "bin" || stages.format.command.args[0] !== "--check") {
  throw new Error("Delivery pipeline may check formatting but must not auto-write source");
}

const vercelBuildPlan = planStages(
  stages,
  targets["vercel-build"].roots,
  targets["vercel-build"].assume ?? [],
);
for (const stageId of vercelBuildPlan) {
  const command = stages[stageId]?.command;
  if (
    command?.kind === "bin" &&
    command.name === "prettier" &&
    command.args?.includes("--write")
  ) {
    throw new Error(`Vercel build cannot mutate source via ${stageId}`);
  }
}

console.log("Pipeline self-check OK");
