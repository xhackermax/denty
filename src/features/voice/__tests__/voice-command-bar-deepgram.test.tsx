// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ActiveTenantProvider } from "@/shared/tenancy/active-context";

import type { DictationEvents } from "../dictation/deepgram-dictation";
import { VoiceCommandBar } from "../voice-command-bar";

const PATIENT_ID = "11111111-1111-4111-8111-111111111111";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  agenda: vi.fn(),
  permission: vi.fn(),
  permissionState: vi.fn(),
  push: vi.fn(),
  pathname: { value: "/app/agenda" },
  execute: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  cancel: vi.fn(),
  recognitionStart: vi.fn(),
  events: { current: null as DictationEvents | null },
}));

vi.mock("@/shared/api/browser", () => ({
  getBrowserApi: () => ({
    auth: { session: mocks.session },
    agenda: { context: mocks.agenda },
    voice: { interpret: vi.fn() },
  }),
}));
vi.mock("@/shared/patients/patient-data", () => ({ usePatientsQuery: () => ({ data: [] }) }));
vi.mock("@/shared/ui/device-permissions", () => ({
  queryMediaPermission: mocks.permissionState,
  requestMediaPermission: mocks.permission,
  mediaPermissionErrorMessage: (_kind: string, cause: unknown) =>
    cause instanceof Error ? cause.message : "No se pudo acceder al micrófono.",
}));
vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname.value,
  useRouter: () => ({ push: mocks.push }),
}));
vi.mock("@/features/assistant/tools/assistant-tool-executor", () => ({
  executeAssistantCalls: mocks.execute,
}));
vi.mock("../dictation/browser-deepgram", () => ({
  isDeepgramCaptureSupported: () => true,
  createBrowserDeepgramDeps: () => ({}),
}));
vi.mock("../dictation/deepgram-dictation", async (importOriginal) => {
  const original = await importOriginal<typeof import("../dictation/deepgram-dictation")>();
  return { ...original, startDeepgramDictation: mocks.start };
});

class Recognition {
  onstart: (() => void) | null = null;
  onresult = null;
  onerror = null;
  onend = null;
  start() {
    mocks.recognitionStart();
    this.onstart?.();
  }
  stop() {}
  abort() {}
}

let client: QueryClient;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.pathname.value = "/app/agenda";
  mocks.session.mockResolvedValue({
    actor: { role: "DENTIST", clinicId: "clinic", permissions: [] },
  });
  mocks.agenda.mockImplementation(() => new Promise(() => {}));
  mocks.permissionState.mockResolvedValue("prompt");
  mocks.permission.mockResolvedValue(undefined);
  mocks.execute.mockResolvedValue({
    executed: ["odontogram.set_state"],
    skipped: [],
    failures: [],
    effects: [],
  });
  mocks.start.mockImplementation(async (_deps: unknown, events: DictationEvents) => {
    mocks.events.current = events;
    events.onStatus("connecting");
    return { stop: mocks.stop, cancel: mocks.cancel };
  });
  vi.stubGlobal("SpeechRecognition", Recognition);
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

afterEach(() => {
  cleanup();
  client.clear();
  vi.unstubAllGlobals();
});

function mount() {
  return render(
    <QueryClientProvider client={client}>
      <MantineProvider env="test">
        <ActiveTenantProvider>
          <VoiceCommandBar />
        </ActiveTenantProvider>
      </MantineProvider>
    </QueryClientProvider>,
  );
}

async function startListening() {
  fireEvent.click(await screen.findByRole("button", { name: "Escuchar comando" }));
  await waitFor(() => expect(mocks.start).toHaveBeenCalledTimes(1));
  return screen.findByRole("textbox", { name: "Escribe o dicta una instrucción" });
}

describe("VoiceCommandBar with Deepgram", () => {
  it("shows partial text, keeps final segments once and never executes", async () => {
    mount();
    const field = await startListening();
    expect(screen.getByRole("status")).toHaveTextContent("Conectando");
    act(() => mocks.events.current?.onStatus("listening"));
    expect(screen.getByRole("status")).toHaveTextContent("Escuchando");
    act(() => mocks.events.current?.onInterim("oye denty marca"));
    expect(field).toHaveValue("marca");
    act(() => mocks.events.current?.onFinal("Oye Denty, marca caries"));
    act(() => mocks.events.current?.onInterim("en el"));
    act(() => mocks.events.current?.onFinal("en el 16."));
    expect(field).toHaveValue("marca caries en el 16.");

    fireEvent.click(screen.getByRole("button", { name: "Detener micrófono" }));
    expect(mocks.stop).toHaveBeenCalledTimes(1);
    act(() => mocks.events.current?.onStatus("finalizing"));
    expect(screen.getByRole("status")).toHaveTextContent("Finalizando transcripción");
    act(() => mocks.events.current?.onEnd({ graceful: true, heardSpeech: true }));
    expect(field).toHaveValue("marca caries en el 16.");
    expect(screen.getByRole("status")).toHaveTextContent("Disponible");
    expect(mocks.execute).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("applies a clear odontogram finding and keeps listening for the next one", async () => {
    mocks.pathname.value = `/app/patients/${PATIENT_ID}/odontogram`;
    mount();
    await startListening();
    act(() => mocks.events.current?.onStatus("listening"));

    act(() => mocks.events.current?.onFinal("Oye Denty, marca caries en el 16"));
    act(() => mocks.events.current?.onSpeechFinal?.());

    await waitFor(() => expect(mocks.execute).toHaveBeenCalledTimes(1));

    act(() => mocks.events.current?.onFinal("marca caries en el 17"));
    act(() => mocks.events.current?.onSpeechFinal?.());

    await waitFor(() => expect(mocks.execute).toHaveBeenCalledTimes(2));
    for (const [, options] of mocks.execute.mock.calls as Array<
      [unknown, { confirmedCallIds: ReadonlySet<string> }]
    >) {
      expect(options.confirmedCallIds.size).toBe(0);
    }
    expect(mocks.stop).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("Escuchando");
    expect(screen.queryByRole("button", { name: "Confirmar" })).toBeNull();
  });

  it("keeps what was typed before dictating", async () => {
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "Escribir comando para Denty" }));
    const field = await screen.findByRole("textbox", { name: "Escribe o dicta una instrucción" });
    fireEvent.change(field, { target: { value: "Ana López:" } });
    fireEvent.click(screen.getByRole("button", { name: "Micrófono" }));
    await waitFor(() => expect(mocks.start).toHaveBeenCalled());
    act(() => mocks.events.current?.onFinal("abre su odontograma"));
    expect(field).toHaveValue("Ana López: abre su odontograma");
  });

  it("falls back to the browser recognizer when Deepgram is not configured", async () => {
    const { DictationError } = await import("../dictation/deepgram-dictation");
    mocks.start.mockRejectedValue(new DictationError("NOT_CONFIGURED"));
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "Escuchar comando" }));
    await waitFor(() => expect(mocks.recognitionStart).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows a dropped connection next to the field and keeps the text", async () => {
    mount();
    const field = await startListening();
    const { DictationError } = await import("../dictation/deepgram-dictation");
    act(() => mocks.events.current?.onStatus("listening"));
    act(() => mocks.events.current?.onFinal("marca caries"));
    act(() => {
      mocks.events.current?.onError(new DictationError("CONNECTION_LOST"));
      mocks.events.current?.onEnd({ graceful: false, heardSpeech: true });
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Se ha cortado la conexión con Deepgram");
    expect(field).toHaveValue("marca caries");
    expect(mocks.recognitionStart).not.toHaveBeenCalled();
  });

  it("says when no speech was recognized", async () => {
    mount();
    await startListening();
    act(() => mocks.events.current?.onEnd({ graceful: true, heardSpeech: false }));
    expect(screen.getByRole("alert")).toHaveTextContent("No se ha detectado voz reconocible.");
  });

  it("does not open a second session while one is starting", async () => {
    mount();
    await startListening();
    fireEvent.click(screen.getByRole("button", { name: "Detener escucha" }));
    fireEvent.click(screen.getByRole("button", { name: "Detener escucha" }));
    expect(mocks.start).toHaveBeenCalledTimes(1);
  });

  it("releases the microphone when leaving the page", async () => {
    const view = mount();
    await startListening();
    act(() => mocks.events.current?.onStatus("listening"));
    mocks.pathname.value = "/app/patients";
    view.rerender(
      <QueryClientProvider client={client}>
        <MantineProvider env="test">
          <ActiveTenantProvider>
            <VoiceCommandBar />
          </ActiveTenantProvider>
        </MantineProvider>
      </QueryClientProvider>,
    );
    await waitFor(() => expect(mocks.stop).toHaveBeenCalled());
  });

  it("stops a session that was still opening when Detener was pressed", async () => {
    let resolveStart: (session: { stop: () => void; cancel: () => void }) => void = () => {};
    mocks.start.mockImplementation(
      (_deps: unknown, events: DictationEvents) =>
        new Promise((resolve) => {
          mocks.events.current = events;
          resolveStart = resolve;
        }),
    );
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "Escuchar comando" }));
    await waitFor(() => expect(mocks.start).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "Detener escucha" }));
    await act(async () => resolveStart({ stop: mocks.stop, cancel: mocks.cancel }));
    expect(mocks.stop).toHaveBeenCalledTimes(1);
  });

  it("does not switch engines when Detener was pressed before Deepgram failed", async () => {
    const { DictationError } = await import("../dictation/deepgram-dictation");
    let rejectStart: (error: unknown) => void = () => {};
    mocks.start.mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectStart = reject;
        }),
    );
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "Escuchar comando" }));
    await waitFor(() => expect(mocks.start).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "Detener escucha" }));
    await act(async () => rejectStart(new DictationError("NOT_CONFIGURED")));
    expect(mocks.recognitionStart).not.toHaveBeenCalled();
    expect(await screen.findByRole("button", { name: "Escuchar comando" })).toBeInTheDocument();
  });

  it("cancels a session that finishes opening after unmount", async () => {
    let resolveStart: (session: { stop: () => void; cancel: () => void }) => void = () => {};
    mocks.start.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveStart = resolve;
        }),
    );
    const view = mount();
    fireEvent.click(await screen.findByRole("button", { name: "Escuchar comando" }));
    await waitFor(() => expect(mocks.start).toHaveBeenCalled());
    view.unmount();
    await act(async () => resolveStart({ stop: mocks.stop, cancel: mocks.cancel }));
    expect(mocks.cancel).toHaveBeenCalledTimes(1);
  });

  it("cancels the session on unmount", async () => {
    const view = mount();
    await startListening();
    view.unmount();
    expect(mocks.cancel).toHaveBeenCalled();
  });
});
