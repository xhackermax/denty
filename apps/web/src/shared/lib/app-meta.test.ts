import { describe, expect, it } from "vitest";

import { APP_NAME, APP_VERSION, buildLabel } from "./app-meta";

describe("app metadata", () => {
  it("keeps one explicit v3 version source", () => {
    expect(APP_NAME).toBe("Denty");
    expect(APP_VERSION).toBe("3.0.0");
    expect(buildLabel(APP_VERSION)).toBe("Denty v3.0.0");
  });
});
