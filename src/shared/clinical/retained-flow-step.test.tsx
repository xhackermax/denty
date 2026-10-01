// @vitest-environment jsdom
import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { RetainedFlowStep } from "./retained-flow-step";
afterEach(cleanup);
test("mounts only on first visit and preserves a draft when returning", () => {
  const view = render(
    <RetainedFlowStep active={false}>
      <input aria-label="Borrador" defaultValue="Inicial" />
    </RetainedFlowStep>,
  );
  expect(screen.queryByRole("textbox")).toBeNull();
  view.rerender(
    <RetainedFlowStep active>
      <input aria-label="Borrador" defaultValue="Inicial" />
    </RetainedFlowStep>,
  );
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "Editado" } });
  view.rerender(
    <RetainedFlowStep active={false}>
      <input aria-label="Borrador" defaultValue="Inicial" />
    </RetainedFlowStep>,
  );
  expect(screen.queryByRole("textbox")).toBeNull();
  view.rerender(
    <RetainedFlowStep active>
      <input aria-label="Borrador" defaultValue="Inicial" />
    </RetainedFlowStep>,
  );
  expect(screen.getByRole("textbox")).toHaveValue("Editado");
});
