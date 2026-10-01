// @vitest-environment jsdom

import { MantineProvider } from "@mantine/core";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ActionErrorAlert } from "./action-error-alert";

function renderAlert(errors: unknown[]) {
  return render(
    <MantineProvider>
      <ActionErrorAlert errors={errors} />
    </MantineProvider>,
  );
}

describe("ActionErrorAlert", () => {
  afterEach(cleanup);

  it("renders nothing when there are no errors", () => {
    renderAlert([null, undefined]);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows the first error message", () => {
    renderAlert([null, new Error("Factura bloqueada"), new Error("otro")]);
    expect(screen.getByRole("alert").textContent).toContain("Factura bloqueada");
  });

  it("falls back to a generic message for non-Error values", () => {
    renderAlert(["boom"]);
    expect(screen.getByRole("alert").textContent).toContain("No se pudo completar la acción");
  });
});
