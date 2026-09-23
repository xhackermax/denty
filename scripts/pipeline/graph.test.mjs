import { describe, expect, it } from "vitest";

import { stages, targets } from "./catalog.mjs";
import { planStages, validateGraph } from "./graph.mjs";

describe("pipeline graph", () => {
  it("has no cycles or unknown dependencies", () => {
    expect(() => validateGraph(stages)).not.toThrow();
  });

  it("plans dependencies before their consumers exactly once", () => {
    const plan = planStages(stages, ["build"], ["install", "lock-bootstrap"]);
    expect(plan.at(-1)).toBe("build");
    expect(new Set(plan).size).toBe(plan.length);
    expect(plan.indexOf("typecheck")).toBeLessThan(plan.indexOf("build"));
    expect(plan.indexOf("unit")).toBeLessThan(plan.indexOf("build"));
  });

  it("forces test and production environments at the stage boundary", () => {
    expect(stages.unit.env.NODE_ENV).toBe("test");
    expect(stages.coverage.env.NODE_ENV).toBe("test");
    expect(stages.build.env.NODE_ENV).toBe("production");
    expect(stages.e2e.env.NODE_ENV).toBe("production");
  });

  it("does not let the delivery format stage mutate source", () => {
    expect(stages.format.command).toMatchObject({ kind: "bin", name: "prettier" });
    expect(stages.format.command.args).toEqual(["--check", "."]);
  });

  it("keeps Vercel install and build as explicit targets", () => {
    expect(targets["vercel-install"].roots).toContain("capture-lock");
    expect(targets["vercel-build"].roots).toContain("vercel-build-final");
  });

  it("never reaches a source-mutating formatter during Vercel build", () => {
    const plan = planStages(
      stages,
      targets["vercel-build"].roots,
      targets["vercel-build"].assume ?? [],
    );
    const mutatingFormatter = plan.find((stageId) => {
      const command = stages[stageId]?.command;
      return (
        command?.kind === "bin" && command.name === "prettier" && command.args?.includes("--write")
      );
    });
    expect(mutatingFormatter).toBeUndefined();
  });
});
