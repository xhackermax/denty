// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { MouthStateProvider } from "@/features/odontogram/mouth-state-context";
import { deriveMouthState } from "@/domain/odontogram/mouth-state";
import { dispatchPerioVoice } from "../perio-voice-session";
import { PerioChart } from "../perio-chart";
const api = { perioDrafts: { get: vi.fn(), save: vi.fn(), finish: vi.fn() } };
vi.mock("@/shared/api/browser", () => ({ getBrowserApi: () => api }));
vi.mock("@/shared/clinical/clinical-data", () => ({
  useClinicalWorkflowQuery: () => ({ data: { periodontalExams: [] }, isLoading: false }),
}));
afterEach(cleanup);
beforeEach(() => {
  api.perioDrafts.get.mockResolvedValue(null);
  api.perioDrafts.save.mockImplementation(async (_id, data, version) => ({
    data,
    version: version + 1,
  }));
  api.perioDrafts.finish.mockResolvedValue({ examId: "exam" });
  vi.clearAllMocks();
});
function mount() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MantineProvider>
        <MouthStateProvider state={deriveMouthState([])}>
          <PerioChart patientId="p" active readOnly={false} />
        </MouthStateProvider>
      </MantineProvider>
    </QueryClientProvider>,
  );
}
test("keyboard, manual grid and voice share one draft; arrows focus and finalization is a single exam", async () => {
  mount();
  const command = screen.getByLabelText("Trío o comando");
  await waitFor(() => expect(command).not.toBeDisabled());
  fireEvent.change(command, { target: { value: "tres dos tres" } });
  fireEvent.keyDown(command, { key: "Enter" });
  expect(screen.getByLabelText("18 MV sondaje")).toHaveValue(3);
  const input = screen.getByLabelText("18 MV sondaje");
  fireEvent.keyDown(input, { key: "ArrowRight" });
  expect(screen.getByLabelText("18 MV margen")).toHaveFocus();
  const unsaved = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(unsaved);
  expect(unsaved.defaultPrevented).toBe(true);
  fireEvent.change(screen.getByLabelText("18 MV margen"), { target: { value: "-1" } });
  dispatchPerioVoice("p", { type: "site", tooth: "18", site: "MV", patch: { pd: 5 } });
  await waitFor(() => expect(screen.getByLabelText("18 MV sondaje")).toHaveValue(5));
  fireEvent.click(screen.getByRole("button", { name: "Guardar examen parcial" }));
  await waitFor(() => expect(api.perioDrafts.finish).toHaveBeenCalledTimes(1));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Guardar examen parcial" })).toBeDisabled(),
  );
  const saved = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(saved);
  expect(saved.defaultPrevented).toBe(false);
  expect(api.perioDrafts.save.mock.calls.at(-1)?.[1].exam.teeth["18"].sites.MV).toMatchObject({
    pd: 5,
    gm: -1,
  });
}, 20000);
test("failed finalization retains measurements and reports error", async () => {
  api.perioDrafts.finish.mockRejectedValueOnce(new Error("Servidor no disponible"));
  mount();
  await waitFor(() => expect(screen.getByLabelText("Trío o comando")).not.toBeDisabled());
  fireEvent.change(screen.getByLabelText("18 MV sondaje"), { target: { value: "4" } });
  fireEvent.click(screen.getByRole("button", { name: "Guardar examen parcial" }));
  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent("Servidor no disponible"),
  );
  expect(screen.getByLabelText("18 MV sondaje")).toHaveValue(4);
}, 20000);
