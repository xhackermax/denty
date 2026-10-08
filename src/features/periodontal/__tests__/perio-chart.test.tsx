// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { MouthStateProvider } from "@/features/odontogram/mouth-state-context";
import { deriveMouthState } from "@/domain/odontogram/mouth-state";
import { dispatchPerioVoice } from "../perio-voice-session";
import { useState } from "react";
import { createPerioDraftOwner } from "../draft-owner";
import { createPerioExam } from "@/domain/periodontal/exam";
import { createPerioSession } from "@/domain/periodontal/entry-cursor";
import type { DentalEntity } from "@/domain/odontogram";
import type { PeriodontalReading } from "@/domain/periodontal";
import { PerioChart } from "../perio-chart";
const workflowData = vi.hoisted(() => ({
  periodontalExams: [] as {
    id: string;
    sites: Partial<PeriodontalReading>[];
    metadata?: Record<string, unknown>;
  }[],
}));
const api = { perioDrafts: { get: vi.fn(), save: vi.fn(), finish: vi.fn() } };
vi.mock("@/shared/api/browser", () => ({ getBrowserApi: () => api }));
vi.mock("@/shared/clinical/clinical-data", () => ({
  useClinicalWorkflowQuery: () => ({ data: workflowData, isLoading: false }),
}));
afterEach(cleanup);
beforeEach(() => {
  workflowData.periodontalExams = [];
  api.perioDrafts.get.mockResolvedValue(null);
  api.perioDrafts.save.mockImplementation(async (_id, data, version) => ({
    id: "00000000-0000-4000-8000-000000000020",
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
test("manual six-site entry updates the main chart feed without requiring gingival margin", async () => {
  const onSiteReadingsChange = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MantineProvider>
        <MouthStateProvider state={deriveMouthState([])}>
          <PerioChart
            patientId="p"
            active
            readOnly={false}
            selectedTooth="16"
            onSiteReadingsChange={onSiteReadingsChange}
          />
        </MouthStateProvider>
      </MantineProvider>
    </QueryClientProvider>,
  );
  const input = screen.getByRole("spinbutton", { name: "Entrada manual 16 MV sondaje" });
  await waitFor(() => expect(input).not.toBeDisabled());
  fireEvent.change(input, { target: { value: "6" } });
  expect(screen.getByLabelText("16 MV sondaje")).toHaveValue(6);
  await waitFor(() => {
    expect(onSiteReadingsChange).toHaveBeenLastCalledWith(
      expect.arrayContaining([expect.objectContaining({
        tooth: "16", site: "MV", probingDepth: 6,
      })]),
    );
  });
  const latest = onSiteReadingsChange.mock.calls.at(-1)?.[0] as Partial<PeriodontalReading>[];
  const site = latest.find((reading) => reading.tooth === "16" && reading.site === "MV");
  expect(site).not.toHaveProperty("recession");
  fireEvent.change(input, { target: { value: "" } });
  await waitFor(() => {
    const readings = onSiteReadingsChange.mock.calls.at(-1)?.[0] as Partial<PeriodontalReading>[];
    expect(readings.find((reading) => reading.tooth === "16" && reading.site === "MV")).toBeUndefined();
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
test("patient draft owner survives a version remount with an outgoing save delayed", async () => {
  const owner = createPerioDraftOwner(),
    mouth = deriveMouthState([]),
    client = new QueryClient();
  const data = createPerioSession(
    createPerioExam(mouth, [{ tooth: "18", site: "MV", probingDepth: 3 }]),
    mouth,
  );
  let server = { id: "00000000-0000-4000-8000-000000000020", version: 1, data },
    release!: () => void;
  const delayed = new Promise<void>((resolve) => {
    release = resolve;
  });
  let writes = 0;
  api.perioDrafts.get.mockImplementation(async () => ({ ...server }));
  api.perioDrafts.save.mockImplementation(async (_id, next, version) => {
    if (++writes === 1) await delayed;
    if (version !== server.version) throw new Error("VERSION_CONFLICT");
    server = { ...server, version: version + 1, data: next };
    return { ...server };
  });
  const view = (key: number) => (
    <QueryClientProvider client={client}>
      <MantineProvider>
        <MouthStateProvider state={mouth}>
          <PerioChart key={key} owner={owner} patientId="p" active readOnly={false} />
        </MouthStateProvider>
      </MantineProvider>
    </QueryClientProvider>
  );
  const { rerender } = render(view(1));
  try {
    await waitFor(() => expect(screen.getByLabelText("18 MV sondaje")).not.toBeDisabled());
    fireEvent.change(screen.getByLabelText("18 MV sondaje"), { target: { value: "5" } });
    await waitFor(() => expect(api.perioDrafts.save).toHaveBeenCalled(), { timeout: 3000 });
    rerender(view(2));
    await waitFor(() => expect(screen.getByLabelText("18 MV sondaje")).not.toBeDisabled());
    expect(screen.getByLabelText("18 MV sondaje")).toHaveValue(5);
    expect(api.perioDrafts.get).toHaveBeenCalledTimes(1);
  } finally {
    release();
  }
}, 20000);
test("prior measurements are displayed as saved; an explicit new exam starts blank", async () => {
  const old = createPerioExam(deriveMouthState([]), [
    { tooth: "18", site: "MV", probingDepth: 6, recession: 2 },
  ]);
  workflowData.periodontalExams = [{ id: "previous", sites: [], metadata: { perioExam: old } }];
  mount();
  const fresh = await screen.findByRole("button", { name: "Nuevo examen" });
  expect(screen.getByLabelText("18 MV sondaje")).toBeDisabled();
  expect(api.perioDrafts.save).not.toHaveBeenCalled();
  fireEvent.click(fresh);
  expect(screen.getByLabelText("18 MV sondaje")).toHaveValue(null);
  expect(screen.getByLabelText("18 MV sondaje")).not.toBeDisabled();
}, 20000);
test("undo after marking absent restores presence and keeps the preceding triplet", async () => {
  function Harness() {
    const [entities, setEntities] = useState<DentalEntity[]>([]);
    return (
      <MouthStateProvider state={deriveMouthState(entities)}>
        <PerioChart
          patientId="p"
          active
          readOnly={false}
          onPresenceChange={(tooth, presence) => {
            const applied: DentalEntity = {
              id: `${presence}-${tooth}`,
              tooth,
              entityType: presence === "missing" ? "MISSING" : "IMPLANT",
              status: presence,
              active: true,
            };
            const previous = entities.find((e) => e.id === applied.id) ?? null;
            setEntities([...entities.filter((e) => e.id !== applied.id), applied]);
            return { tooth, entityId: applied.id, previous, applied };
          }}
          onPresenceRestore={(change) => {
            const restored = [
              ...entities.filter((e) => e.id !== change.entityId),
              ...(change.previous ? [change.previous] : []),
            ];
            setEntities(restored);
            return deriveMouthState(restored);
          }}
        />
      </MouthStateProvider>
    );
  }
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MantineProvider>
        <Harness />
      </MantineProvider>
    </QueryClientProvider>,
  );
  const command = screen.getByLabelText("Trío o comando");
  await waitFor(() => expect(command).not.toBeDisabled());
  fireEvent.change(command, { target: { value: "tres dos tres" } });
  fireEvent.keyDown(command, { key: "Enter" });
  fireEvent.click(screen.getByRole("button", { name: "Marcar ausente" }));
  fireEvent.click(screen.getByRole("button", { name: "Deshacer" }));
  expect(screen.getByLabelText("18 MV sondaje")).toHaveValue(3);
  expect(screen.getByLabelText("17 MV sondaje")).not.toBeDisabled();
}, 20000);
test("a lost successful finish response retries the same exam without recreating a deleted draft", async () => {
  let active = true,
    completed = false;
  api.perioDrafts.save.mockImplementation(async (_id, data, version) => {
    if (!active) throw new Error("VERSION_CONFLICT");
    return { id: "00000000-0000-4000-8000-000000000020", data, version: version + 1 };
  });
  api.perioDrafts.finish.mockImplementation(async () => {
    if (!completed) {
      completed = true;
      active = false;
      throw new Error("Respuesta perdida");
    }
    return { examId: "only-exam" };
  });
  mount();
  await waitFor(() => expect(screen.getByLabelText("Trío o comando")).not.toBeDisabled());
  fireEvent.change(screen.getByLabelText("18 MV sondaje"), { target: { value: "4" } });
  fireEvent.click(screen.getByRole("button", { name: "Guardar examen parcial" }));
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Respuesta perdida"));
  fireEvent.click(
    screen.getByRole("button", { name: /Guardar examen parcial|Reintentar finalización/ }),
  );
  await waitFor(() => expect(api.perioDrafts.finish).toHaveBeenCalledTimes(2));
  expect(api.perioDrafts.save).toHaveBeenCalledTimes(1);
}, 20000);
