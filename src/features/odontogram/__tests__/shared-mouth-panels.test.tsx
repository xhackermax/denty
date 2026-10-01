// @vitest-environment jsdom
import { useState } from "react";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { deriveMouthState } from "@/domain/odontogram/mouth-state";
import type { DentalEntity } from "@/domain/odontogram";
import { MouthStateProvider } from "../mouth-state-context";
import { PeriodontogramPanel } from "../periodontogram-panel";
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
      <PeriodontogramPanel
        patientId="p"
        readOnly={false}
        onMarkMissing={(tooth) =>
          setEntities([
            { id: "missing", tooth, entityType: "MISSING", status: "missing", active: true },
          ])
        }
      />
      <EndodonticPanel selectedTooth="36" readOnly={false} onCommit={() => {}} />
    </MouthStateProvider>
  );
}
test("marking absent in periodontics immediately prevents probing and endodontics; undo restores both", () => {
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
  expect(screen.queryByLabelText("36 MV probing")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Deshacer ausencia" }));
  expect(screen.getByRole("button", { name: "Guardar y dibujar en 36" })).not.toBeDisabled();
}, 20000);
