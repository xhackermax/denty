import { describe, expect, it } from "vitest";

import { resolveRouteTransition } from "./route-transition";

describe("resolveRouteTransition", () => {
  it("glides between top-level modules in navigation order", () => {
    expect(resolveRouteTransition("/app/patients", "/app/agenda")).toEqual({
      kind: "glide",
      direction: 1,
    });
    expect(resolveRouteTransition("/app/agenda", "/app/patients")).toEqual({
      kind: "glide",
      direction: -1,
    });
  });

  it("lifts when opening a deeper route in the same module", () => {
    expect(resolveRouteTransition("/app/patients", "/app/patients/p-1")).toEqual({
      kind: "lift",
      direction: 1,
    });
  });

  it("settles when returning or moving between same-depth internal routes", () => {
    expect(resolveRouteTransition("/app/patients/p-1", "/app/patients")).toEqual({
      kind: "settle",
      direction: -1,
    });
    expect(resolveRouteTransition("/app/patients/p-1", "/app/patients/p-2")).toEqual({
      kind: "settle",
      direction: 1,
    });
  });

  it("settles for unknown utility routes", () => {
    expect(resolveRouteTransition("/app/tools/import", "/app/help")).toEqual({
      kind: "settle",
      direction: 1,
    });
  });
});
