// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ActiveTenantProvider } from "@/shared/tenancy/active-context";

import { VoiceCommandBar } from "../voice-command-bar";

const ANA_LOPEZ = { id: "p-ana-lopez", firstName: "Ana", lastName: "López", recordNumber: "120" };
const ANA_MARTIN = { id: "p-ana-martin", firstName: "Ana", lastName: "Martín", recordNumber: "77" };
const OPEN_ID = "11111111-1111-4111-8111-111111111111";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  agenda: vi.fn(),
  interpret: vi.fn(),
  list: vi.fn(),
  get: vi.fn(),
  push: vi.fn(),
  pathname: { value: "/app/agenda" },
  execute: vi.fn(),
}));

vi.mock("@/shared/api/browser", () => ({
  getBrowserApi: () => ({
    auth: { session: mocks.session },
    agenda: { context: mocks.agenda },
    voice: { interpret: mocks.interpret },
    patients: { list: mocks.list, get: mocks.get },
  }),
}));
// The first page the app keeps in memory has neither Ana: search must ask the server.
vi.mock("@/shared/patients/patient-data", () => ({
  usePatientsQuery: () => ({ data: { items: [] } }),
}));
vi.mock("@/shared/ui/device-permissions", () => ({ requestMediaPermission: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname.value,
  useRouter: () => ({ push: mocks.push }),
}));
vi.mock("@/features/assistant/tools/assistant-tool-executor", () => ({
  executeAssistantCalls: mocks.execute,
}));

let client: QueryClient;

function page(items: unknown[]) {
  return { items, total: items.length, page: 1, pageSize: 20 };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.pathname.value = "/app/agenda";
  mocks.session.mockResolvedValue({
    actor: { role: "RECEPTION", clinicId: "clinic", permissions: [] },
  });
  mocks.agenda.mockImplementation(() => new Promise(() => {}));
  mocks.interpret.mockRejectedValue(new Error("Claude must not be needed"));
  mocks.execute.mockResolvedValue({ effects: [], pendingConfirmation: false });
  mocks.list.mockImplementation(async ({ search }: { search?: string }) => {
    const term = (search ?? "").toLowerCase();
    return page(
      [ANA_LOPEZ, ANA_MARTIN].filter((patient) =>
        [patient.firstName, patient.lastName, patient.recordNumber].some((value) =>
          value.toLowerCase().includes(term),
        ),
      ),
    );
  });
  mocks.get.mockResolvedValue({
    id: OPEN_ID,
    firstName: "Luis",
    lastName: "Pérez",
    recordNumber: "9",
  });
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

afterEach(() => {
  cleanup();
  client.clear();
});

async function interpret(command: string) {
  render(
    <QueryClientProvider client={client}>
      <MantineProvider env="test">
        <ActiveTenantProvider>
          <VoiceCommandBar />
        </ActiveTenantProvider>
      </MantineProvider>
    </QueryClientProvider>,
  );
  fireEvent.click(await screen.findByRole("button", { name: "Escribir comando para Denty" }));
  const field = await screen.findByRole("textbox", { name: "Escribe o dicta una instrucción" });
  fireEvent.change(field, { target: { value: command } });
  fireEvent.click(screen.getByRole("button", { name: "Interpretar" }));
  return field;
}

describe("VoiceCommandBar patient resolution", () => {
  it("lists every match for a search instead of opening one", async () => {
    await interpret("Busca a Ana");
    const lopez = await screen.findByRole("button", { name: "Abrir Ana López · ficha 120" });
    expect(screen.getByRole("button", { name: "Abrir Ana Martín · ficha 77" })).toBeInTheDocument();
    expect(mocks.push).not.toHaveBeenCalled();
    expect(mocks.list).toHaveBeenCalledWith(expect.objectContaining({ search: "ana" }));
    fireEvent.click(lopez);
    expect(mocks.push).toHaveBeenCalledWith(`/app/patients/${ANA_LOPEZ.id}`);
    expect(mocks.interpret).not.toHaveBeenCalled();
  });

  it("opens the chart directly only for one exact match found on the server", async () => {
    await interpret("Abre la ficha de Ana López");
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith(`/app/patients/${ANA_LOPEZ.id}`));
  });

  it("asks which patient when the name is ambiguous", async () => {
    await interpret("Abre la ficha de Ana");
    expect(
      await screen.findByRole("button", { name: "Abrir Ana Martín · ficha 77" }),
    ).toBeInTheDocument();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("says when nobody matches", async () => {
    await interpret("Abre la ficha de Zoe Quintana");
    expect(await screen.findByRole("alert")).toHaveTextContent("No encuentro al paciente");
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("names the open patient in the confirmation even outside the cached page", async () => {
    mocks.pathname.value = `/app/patients/${OPEN_ID}`;
    await interpret("Marca caries en el 16");
    expect(await screen.findByText("Luis Pérez · ficha 9")).toBeInTheDocument();
    expect(mocks.get).toHaveBeenCalledWith(OPEN_ID);
  });

  it("refuses an impossible tooth without asking the AI", async () => {
    mocks.pathname.value = `/app/patients/${OPEN_ID}`;
    const field = await interpret("Marca caries en el 19");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "la pieza 19 no existe en la numeración FDI",
    );
    expect(mocks.interpret).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Confirmar" })).toBeNull();
    expect(field).toHaveValue("Marca caries en el 19");
  });
});
