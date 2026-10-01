// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { ActiveTenantProvider } from "@/shared/tenancy/active-context";
import { VoiceCommandBar } from "../voice-command-bar";
const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  agenda: vi.fn(),
  permission: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  abort: vi.fn(),
}));
vi.mock("@/shared/api/browser", () => ({
  getBrowserApi: () => ({ auth: { session: mocks.session }, agenda: { context: mocks.agenda } }),
}));
vi.mock("@/shared/patients/patient-data", () => ({ usePatientsQuery: () => ({ data: [] }) }));
vi.mock("@/shared/ui/device-permissions", () => ({ requestMediaPermission: mocks.permission }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/app/agenda",
  useRouter: () => ({ push: vi.fn() }),
}));
class Recognition {
  onstart: (() => void) | null = null;
  start() {
    mocks.start();
    this.onstart?.();
  }
  stop() {
    mocks.stop();
  }
  abort() {
    mocks.abort();
  }
}
let client: QueryClient;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockResolvedValue({
    actor: { role: "DENTIST", clinicId: "clinic", permissions: [] },
  });
  mocks.agenda.mockImplementation(() => new Promise(() => {}));
  mocks.permission.mockResolvedValue(undefined);
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
      <MantineProvider>
        <ActiveTenantProvider>
          <VoiceCommandBar />
        </ActiveTenantProvider>
      </MantineProvider>
    </QueryClientProvider>,
  );
}
test("microphone remains visible and starts dictation while agenda configuration is pending", async () => {
  mount();
  const microphone = await screen.findByRole("button", { name: "Escuchar comando" });
  expect(microphone).toBeVisible();
  expect(mocks.agenda).toHaveBeenCalledTimes(1);
  fireEvent.click(microphone);
  await waitFor(() => expect(mocks.start).toHaveBeenCalledTimes(1));
  expect(mocks.permission).toHaveBeenCalledWith("microphone");
  const stop = await screen.findByRole("button", { name: "Detener escucha" });
  fireEvent.click(stop);
  expect(mocks.stop).toHaveBeenCalled();
});
test("microphone stays hidden until an internal user has been identified", async () => {
  mocks.session.mockResolvedValue({
    actor: { role: "PATIENT", clinicId: "clinic", permissions: [] },
  });
  mount();
  expect(screen.queryByRole("button", { name: "Escuchar comando" })).toBeNull();
  await waitFor(() => expect(mocks.agenda).toHaveBeenCalledTimes(1));
  expect(screen.queryByRole("button", { name: "Escuchar comando" })).toBeNull();
  expect(mocks.permission).not.toHaveBeenCalled();
});
