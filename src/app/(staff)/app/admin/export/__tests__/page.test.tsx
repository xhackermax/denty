import { isValidElement } from "react";
import { expect, test } from "vitest";
import AdminExportRoute from "../page";

test("export page exposes the admin export panel", () => {
  const element = AdminExportRoute();
  expect(isValidElement(element)).toBe(true);
  expect(element.props.section).toBe("export");
});
