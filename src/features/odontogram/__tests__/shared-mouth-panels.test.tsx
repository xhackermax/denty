// @vitest-environment jsdom
import { useState } from "react";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { deriveMouthState } from "@/domain/odontogram/mouth-state";
import type { DentalEntity } from "@/domain/odontogram";
import { MouthStateProvider } from "../mouth-state-context";
import { EndodonticPanel } from "../endodontic-panel";
vi.mock("@/shared/clinical/clinical-data", () => ({
  useCreatePeriodontalExamMutation: () => ({ mutateAsync: vi.fn() }),
}));
afterEach(cleanup);
function Harness() {
  const [entities, setEntities] = useState<DentalEntity[]>([]);
  return (
    <MouthStateProvider state={deriveMouthState(entities)}>
      <button onClick={() => setEntities([])}>Deshacer ausencia</button>
      {/* Periodontics marks absence through the shared mouth (covered in perio-chart.test). */}
      <button
        onClick={() =>
          setEntities([
            { id: "missing", tooth: "36", entityType: "MISSING", status: "missing", active: true },
          ])
        }
      >
        Marcar 36 ausente
      </button>
      <EndodonticPanel selectedTooth="36" readOnly={false} onCommit={() => {}} />
    </MouthStateProvider>
  );
}
test("an absent tooth in the shared mouth immediately blocks endodontics; undo restores it", () => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MantineProvider>
        <Harness />
      </MantineProvider>
    </QueryClientProvider>,
  );
  expect(screen.getByRole("button", { name: "Guardar y dibujar en 36" })).not.toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Marcar 36 ausente" }));
  expect(screen.getByRole("button", { name: "Guardar y dibujar en 36" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Deshacer ausencia" }));
  expect(screen.getByRole("button", { name: "Guardar y dibujar en 36" })).not.toBeDisabled();
}, 20000);
