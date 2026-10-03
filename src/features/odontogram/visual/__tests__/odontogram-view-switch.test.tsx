// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { OdontogramViewSwitch } from "../odontogram-view-switch";

afterEach(cleanup);

function Draft() {
  const [value, setValue] = useState("");
  return (
    <input aria-label="Borrador" value={value} onChange={(event) => setValue(event.target.value)} />
  );
}

function mount() {
  render(
    <MantineProvider env="test">
      <OdontogramViewSwitch
        editor={<Draft />}
        visual={(openEditor) => (
          <button type="button" onClick={openEditor}>
            Abrir en el editor
          </button>
        )}
      />
    </MantineProvider>,
  );
}

describe("OdontogramViewSwitch", () => {
  it("starts on the editor and offers the visual view", () => {
    mount();
    expect(screen.getByLabelText("Borrador")).toBeVisible();
    expect(screen.getByRole("radio", { name: "Editor" })).toBeChecked();
    expect(screen.queryByRole("button", { name: "Abrir en el editor" })).toBeNull();
  });

  it("keeps unsaved editor work while the visual view is open and returns to it", () => {
    mount();
    fireEvent.change(screen.getByLabelText("Borrador"), { target: { value: "caries 16" } });
    fireEvent.click(screen.getByRole("radio", { name: "Vista visual" }));
    expect(screen.getByText(/muestra lo guardado/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Borrador")).not.toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Abrir en el editor" }));
    expect(screen.getByLabelText("Borrador")).toBeVisible();
    expect(screen.getByLabelText("Borrador")).toHaveValue("caries 16");
  });
});
