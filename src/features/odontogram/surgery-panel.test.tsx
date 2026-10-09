// @vitest-environment jsdom

import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { dentyTheme } from "@/styles/theme";
import { SurgeryPanel } from "./surgery-panel";
import { surgicalVisualsForTooth } from "./surgery-visuals";

afterEach(cleanup);

describe("SurgeryPanel", () => {
  it("commits the selected tooth through the shared batch path", () => {
    const onCommitBatch = vi.fn();
    render(
      <MantineProvider theme={dentyTheme}>
        <SurgeryPanel
          selectedTooth="26"
          entities={[]}
          readOnly={false}
          onCommitBatch={onCommitBatch}
          onWarning={() => undefined}
        />
      </MantineProvider>,
    );

    expect(screen.getByText(/Cirugía · pieza 26/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Registrar" }));
    expect(onCommitBatch).toHaveBeenCalledWith([
      expect.objectContaining({ tooth: "26", entityType: "SURGERY", status: "extraction_simple" }),
    ]);
  }, 15_000);

  it("exposes restrained text equivalents for surgical SVG marks", () => {
    const marks = surgicalVisualsForTooth("16", [
      {
        id: "implant-16",
        tooth: "16",
        entityType: "IMPLANT",
        status: "implant_planned",
        active: true,
      },
      {
        id: "graft-16",
        tooth: "16",
        entityType: "BONE_GRAFT",
        status: "socket_preservation",
        active: true,
      },
    ]);
    expect(marks.map((mark) => mark.ariaLabel)).toEqual([
      "Implante planificado en 16",
      "Regeneración ósea en 16",
    ]);
  });
});

it.each(["Gingivectomía", "Regularización ósea", "Férula quirúrgica guiada", "Malla de titanio", "Regeneración ósea guiada (ROG)", "Injerto de tejido conectivo", "Pinhole technique", "Coronectomía", "Exodoncia compleja / 3er molar", "Elevación de seno interna"])(
  "offers %s in procedure selector",
  (label) => {
    const view = render(
      <MantineProvider>
        <SurgeryPanel
          selectedTooth="16"
          entities={[]}
          readOnly={false}
          onCommitBatch={() => {}}
          onWarning={() => {}}
        />
      </MantineProvider>,
    );
    fireEvent.click(view.getByRole("combobox", { name: "Procedimiento" }));
    expect(view.getByRole("option", { name: label })).toBeInTheDocument();
    view.unmount();
  },
);

it("registers an extra treatment on the same tooth in one batch", () => {
  const onCommitBatch = vi.fn();
  const view = render(
    <MantineProvider>
      <SurgeryPanel
        selectedTooth="16"
        entities={[]}
        readOnly={false}
        onCommitBatch={onCommitBatch}
        onWarning={() => {}}
      />
    </MantineProvider>,
  );
  fireEvent.click(
    view.getAllByLabelText("Tratamientos adicionales").find((el) => el.tagName === "INPUT")!,
  );
  fireEvent.click(view.getByRole("option", { name: "Injerto óseo" }));
  fireEvent.click(view.getByRole("button", { name: "Registrar" }));
  expect(onCommitBatch.mock.calls[0]?.[0].map((e: { status: string }) => e.status)).toEqual([
    "extraction_simple",
    "bone_graft",
  ]);
  view.unmount();
}, 15_000);
