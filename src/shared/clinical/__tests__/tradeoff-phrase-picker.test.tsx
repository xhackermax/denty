// @vitest-environment jsdom

import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { tradeoffEntry, type ArgumentOverride, type TradeoffClassifiable } from "@/domain/plan";
import { TradeoffPhrasePicker } from "../tradeoff-phrase-picker";

afterEach(cleanup);

function Harness({
  treatments,
  overrides,
}: {
  treatments: TradeoffClassifiable[];
  overrides?: ArgumentOverride[];
}) {
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
        {...(overrides ? { overrides } : {})}
      />
      <output aria-label="Ventajas escritas">{advantages}</output>
      <output aria-label="Desventajas escritas">{disadvantages}</output>
    </MantineProvider>
  );
}

const implant = [{ treatmentCode: "IMPLANT", label: "Implante", tooth: "36" }];

describe("TradeoffPhrasePicker", () => {
  it("uses the clinic's wording and leaves out the phrases it hid", () => {
    const [first, second] = tradeoffEntry("b.implante-unitario")!.advantages;
    const base = { entryId: "b.implante-unitario", kind: "advantage" as const, position: null };
    render(
      <Harness
        treatments={implant}
        overrides={[
          {
            ...base,
            phraseId: first!.id,
            text: "Diente fijo sin tocar los vecinos.",
            hidden: false,
            custom: false,
          },
          { ...base, phraseId: second!.id, text: null, hidden: true, custom: false },
        ]}
      />,
    );
    const pros = screen.getByRole("group", { name: "Ventajas · Implante unitario" });
    expect(
      within(pros).getByRole("checkbox", { name: "Diente fijo sin tocar los vecinos." }),
    ).toBeInTheDocument();
    expect(within(pros).queryByRole("checkbox", { name: first!.text })).toBeNull();
    expect(within(pros).queryByRole("checkbox", { name: second!.text })).toBeNull();
  });

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
