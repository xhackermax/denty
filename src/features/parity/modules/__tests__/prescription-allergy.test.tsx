// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { PrescriptionLinesEditor } from "../prescription-line-editor";
import { emptyPrescriptionLine } from "@/domain/prescriptions/dental-vademecum";
afterEach(cleanup);
test("blocks manual NSAID and disables incompatible protocols for allergic patient", () => {
  const onChange = vi.fn();
  const props = {
    lines: [{ ...emptyPrescriptionLine(), activeIngredient: "Ibuprofeno" }],
    onChange,
    medicalProfile: { allergies: ["AINEs"] },
  };
  render(
    <MantineProvider>
      <PrescriptionLinesEditor {...props} />
    </MantineProvider>,
  );
  expect(screen.getByRole("alert")).toHaveTextContent(/alergia.*AINEs/i);
  expect(screen.getByRole("button", { name: "Dolor" })).toBeDisabled();
  fireEvent.change(screen.getByRole("combobox", { name: "1. Medicamento" }), { target: { value: "Naproxeno" } });
  expect(onChange).not.toHaveBeenCalled();
});
