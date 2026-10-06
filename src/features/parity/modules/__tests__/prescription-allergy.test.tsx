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
  fireEvent.change(screen.getByRole("combobox", { name: "1. Medicamento" }), {
    target: { value: "Naproxeno" },
  });
  expect(onChange).not.toHaveBeenCalled();
});

test("quick alternatives do not add a second paracetamol-containing medicine", () => {
  const onChange = vi.fn();
  const props = {
    lines: [{ ...emptyPrescriptionLine(), activeIngredient: "Paracetamol" }],
    onChange,
    medicalProfile: { allergies: ["AINEs"] },
  };
  render(
    <MantineProvider>
      <PrescriptionLinesEditor {...props} />
    </MantineProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Dolor intenso · alergia a AINEs" }));
  expect(screen.getByRole("alert")).toHaveTextContent(/alternativa/i);
  expect(onChange).not.toHaveBeenCalled();
});

test("explains why a manually typed NSAID is blocked", () => {
  const props = {
    lines: [emptyPrescriptionLine()],
    onChange: vi.fn(),
    medicalProfile: { allergies: ["AINEs"] },
  };
  render(
    <MantineProvider>
      <PrescriptionLinesEditor {...props} />
    </MantineProvider>,
  );
  fireEvent.change(screen.getByRole("combobox", { name: "1. Medicamento" }), {
    target: { value: "Naproxeno" },
  });
  expect(screen.getByRole("alert")).toHaveTextContent(/alergia.*AINEs/i);
});

test("adds a pediatric paracetamol line from weight and birth date", () => {
  const onChange = vi.fn();
  render(
    <MantineProvider>
      <PrescriptionLinesEditor
        lines={[emptyPrescriptionLine()]}
        onChange={onChange}
        patientBirthDate="2020-10-06"
      />
    </MantineProvider>,
  );

  fireEvent.change(screen.getByRole("textbox", { name: "Peso kg" }), {
    target: { value: "18" },
  });
  fireEvent.change(screen.getByRole("textbox", { name: "Altura cm" }), {
    target: { value: "110" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Paracetamol pediátrico" }));

  expect(onChange).toHaveBeenCalledWith([
    expect.objectContaining({
      activeIngredient: "Paracetamol",
      strength: "270 mg (2,7 ml de 100 mg/ml)",
      frequency: "Cada 6 horas",
    }),
  ]);
});
