// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MouthStateProvider } from "./mouth-state-context";
import { EndodonticPanel } from "./endodontic-panel";

afterEach(cleanup);

it("records the chosen endodontic treatment type", () => {
  const onCommit = vi.fn();
  render(
    <MantineProvider>
      <MouthStateProvider state={{ teeth: { "16": { presence: "present" } } } as never}>
        <EndodonticPanel selectedTooth="16" readOnly={false} onCommit={onCommit} />
      </MouthStateProvider>
    </MantineProvider>,
  );
  fireEvent.click(screen.getByRole("combobox", { name: "Tipo de tratamiento" }));
  fireEvent.click(screen.getByRole("option", { name: "Reendodoncia" }));
  fireEvent.click(screen.getByRole("button", { name: /Registrar tratamiento/ }));
  expect(onCommit).toHaveBeenCalledWith(
    expect.objectContaining({ entityType: "ENDO", status: "retreatment", tooth: "16" }),
  );
}, 15_000);
