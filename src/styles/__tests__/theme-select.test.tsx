// @vitest-environment jsdom
import { MantineProvider, Select } from "@mantine/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, expect, test } from "vitest";

import { dentyTheme } from "../theme";

afterEach(cleanup);

function ToothPicker() {
  const [tooth, setTooth] = useState<string | null>("44");
  return (
    <>
      <Select label="Diente" value={tooth} onChange={setTooth} data={["44", "45"]} />
      <output>{tooth ?? "vacío"}</output>
    </>
  );
}

test("choosing the option that is already selected keeps it instead of clearing the field", () => {
  render(
    <MantineProvider theme={dentyTheme} env="test">
      <ToothPicker />
    </MantineProvider>,
  );
  fireEvent.click(screen.getAllByLabelText("Diente")[0]!);
  fireEvent.click(screen.getByRole("option", { name: "44" }));
  expect(screen.getByRole("status")).toHaveTextContent("44");
});
