// @vitest-environment jsdom

import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";

import type { TradeoffClassifiable } from "@/domain/plan";
import { TradeoffPhrasePicker } from "../tradeoff-phrase-picker";

afterEach(cleanup);

function Harness({ treatments }: { treatments: TradeoffClassifiable[] }) {
  const [advantages, setAdvantages] = useState("Valorado en consulta.");
  const [disadvantages, setDisadvantages] = useState("");
  return (
    <MantineProvider>
      <TradeoffPhrasePicker
        treatments={treatments}
        advantages={advantages}
        disadvantages={disadvantages}
        onAdvantagesChange={setAdvantages}
        onDisadvantagesChange={setDisadvantages}
      />
      <output aria-label="Ventajas escritas">{advantages}</output>
      <output aria-label="Desventajas escritas">{disadvantages}</output>
    </MantineProvider>
  );
}

const implant = [{ treatmentCode: "IMPLANT", label: "Implante", tooth: "36" }];

describe("TradeoffPhrasePicker", () => {
  it("adds and removes a ticked phrase in the plan's free text", () => {
    render(<Harness treatments={implant} />);
    const pros = screen.getByRole("group", { name: "Ventajas · Implante unitario" });
    const phrase = within(pros).getByRole("checkbox", {
      name: "No requiere tallar los dientes vecinos.",
    });

    fireEvent.click(phrase);
    expect(screen.getByLabelText("Ventajas escritas").textContent).toBe(
      "Valorado en consulta.\n• No requiere tallar los dientes vecinos.",
    );
    expect(phrase).toBeChecked();

    fireEvent.click(phrase);
    expect(screen.getByLabelText("Ventajas escritas").textContent).toBe("Valorado en consulta.");
  });

  it("keeps pros and cons apart", () => {
    render(<Harness treatments={implant} />);
    const cons = screen.getByRole("group", { name: "Desventajas · Implante unitario" });
    fireEvent.click(
      within(cons).getByRole("checkbox", { name: "Requiere cirugía y soporte óseo." }),
    );
    expect(screen.getByLabelText("Desventajas escritas").textContent).toBe(
      "• Requiere cirugía y soporte óseo.",
    );
    expect(screen.getByLabelText("Ventajas escritas").textContent).toBe("Valorado en consulta.");
    expect(screen.getByText("1 elegidas")).toBeInTheDocument();
  });

  it("shows the clinical cautions that cannot be dismissed", () => {
    render(<Harness treatments={implant} />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Paciente en crecimiento");
    expect(alert).toHaveTextContent("Datos diagnósticos insuficientes");
    expect(within(alert).queryByRole("button")).toBeNull();
  });

  it("renders nothing when no catalog row fits", () => {
    const { container } = render(
      <Harness treatments={[{ treatmentCode: "CONSULT", label: "Valoración" }]} />,
    );
    expect(container.querySelector('[role="checkbox"], input[type="checkbox"]')).toBeNull();
  });
});
