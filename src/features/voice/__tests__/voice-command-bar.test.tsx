// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ActiveTenantProvider } from "@/shared/tenancy/active-context";

import { VoiceCommandBar } from "../voice-command-bar";

const PATIENT_ID = "11111111-1111-4111-8111-111111111111";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  agenda: vi.fn(),
  interpret: vi.fn(),
  permission: vi.fn(),
  push: vi.fn(),
  pathname: { value: "/app/agenda" },
  execute: vi.fn(),
  recognition: { current: null as null | { emit: (text: string, final: boolean) => void } },
}));

vi.mock("@/shared/api/browser", () => ({
  getBrowserApi: () => ({
    auth: { session: mocks.session },
    agenda: { context: mocks.agenda },
    voice: { interpret: mocks.interpret },
  }),
}));
vi.mock("@/shared/patients/patient-data", () => ({
  usePatientsQuery: () => ({
    data: {
      items: [{ id: PATIENT_ID, firstName: "Ana", lastName: "López", recordNumber: "120" }],
    },
  }),
}));
vi.mock("@/shared/ui/device-permissions", () => ({ requestMediaPermission: mocks.permission }));
vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname.value,
  useRouter: () => ({ push: mocks.push }),
}));
vi.mock("@/features/assistant/tools/assistant-tool-executor", () => ({
  executeAssistantCalls: mocks.execute,
}));

class Recognition {
  lang = "";
  continuous = false;
  interimResults = false;
  onstart: (() => void) | null = null;
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onend: (() => void) | null = null;
  private results: { 0: { transcript: string }; isFinal: boolean; length: number }[] = [];
  start() {
    mocks.recognition.current = {
      emit: (text, final) => {
        this.results = [
          ...this.results.filter((r) => r.isFinal),
          { 0: { transcript: text }, isFinal: final, length: 1 },
        ];
        this.onresult?.({ resultIndex: 0, results: this.results });
      },
    };
    this.onstart?.();
  }
  stop() {
    this.onend?.();
  }
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
  mocks.permission.mockResolvedValue(undefined);
  mocks.interpret.mockRejectedValue(new Error("not used"));
  mocks.execute.mockResolvedValue({ effects: [], pendingConfirmation: false });
  vi.stubGlobal("SpeechRecognition", Recognition);
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

afterEach(() => {
  cleanup();
  client.clear();
  vi.unstubAllGlobals();
});

function mount() {
  render(
    <QueryClientProvider client={client}>
      <MantineProvider env="test">
        <ActiveTenantProvider>
          <VoiceCommandBar />
        </ActiveTenantProvider>
      </MantineProvider>
    </QueryClientProvider>,
  );
}

async function openPanel() {
  fireEvent.click(await screen.findByRole("button", { name: "Escribir comando para Denty" }));
  return screen.findByRole("textbox", { name: "Escribe o dicta una instrucción" });
}

describe("VoiceCommandBar", () => {
  it("puts dictated speech in the editable field without executing it", async () => {
    mocks.pathname.value = `/app/patients/${PATIENT_ID}`;
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "Escuchar comando" }));
    await waitFor(() => expect(mocks.recognition.current).not.toBeNull());
    mocks.recognition.current?.emit("Oye Denty marca caries", false);
    mocks.recognition.current?.emit("Oye Denty marca caries en el 16", true);
    const field = await screen.findByRole("textbox", { name: "Escribe o dicta una instrucción" });
    await waitFor(() => expect(field).toHaveValue("marca caries en el 16"));
    fireEvent.click(screen.getByRole("button", { name: "Detener micrófono" }));
    expect(mocks.execute).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Confirmar" })).toBeNull();
  });

  it("navigates after Interpretar without a confirmation step", async () => {
    mount();
    const field = await openPanel();
    fireEvent.change(field, { target: { value: "Abre la agenda" } });
    fireEvent.click(screen.getByRole("button", { name: "Interpretar" }));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/app/agenda"));
    expect(mocks.interpret).not.toHaveBeenCalled();
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it("asks for confirmation before a clinical change and runs it once", async () => {
    mocks.pathname.value = `/app/patients/${PATIENT_ID}`;
    mount();
    const field = await openPanel();
    fireEvent.change(field, { target: { value: "Marca caries en el dieciséis" } });
    fireEvent.click(screen.getByRole("button", { name: "Interpretar" }));
    const confirm = await screen.findByRole("button", { name: "Confirmar" });
    expect(screen.getByText("Ana López · ficha 120")).toBeInTheDocument();
    expect(screen.getByText("Caries (hallazgo)")).toBeInTheDocument();
    expect(mocks.execute).not.toHaveBeenCalled();
    expect(mocks.interpret).not.toHaveBeenCalled();
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    await waitFor(() => expect(mocks.execute).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(field).toHaveValue(""));
  });

  it("keeps the text and shows the error when execution fails", async () => {
    mocks.pathname.value = `/app/patients/${PATIENT_ID}`;
    mocks.execute.mockRejectedValue(new Error("Conflicto de versión del odontograma."));
    mount();
    const field = await openPanel();
    fireEvent.change(field, { target: { value: "Marca caries en el dieciséis" } });
    fireEvent.click(screen.getByRole("button", { name: "Interpretar" }));
    fireEvent.click(await screen.findByRole("button", { name: "Confirmar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Conflicto de versión del odontograma.",
    );
    expect(field).toHaveValue("Marca caries en el dieciséis");
  });

  it("clears the field, the preview and the messages with Limpiar", async () => {
    mocks.pathname.value = `/app/patients/${PATIENT_ID}`;
    mount();
    const field = await openPanel();
    fireEvent.change(field, { target: { value: "Marca caries en el dieciséis" } });
    fireEvent.click(screen.getByRole("button", { name: "Interpretar" }));
    await screen.findByRole("button", { name: "Confirmar" });
    fireEvent.click(screen.getByRole("button", { name: "Limpiar" }));
    expect(field).toHaveValue("");
    expect(screen.queryByRole("button", { name: "Confirmar" })).toBeNull();
  });
});
