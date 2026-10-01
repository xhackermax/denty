// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { AdminExportPanel } from "./admin-export-panel";

let overviewStatus = 200;
let holdDownload: (() => void) | undefined;
let holdOverview = false;
const fetchApi = async (input: string | URL | Request) => {
  const path = String(input);
  if (path.includes("/overview")) {
    if (holdOverview) return new Promise<Response>(() => {});
    return Response.json(
      overviewStatus === 200
        ? { patientCount: 12, appointmentCount: 8, treatmentCount: 3 }
        : { message: "Sin permiso" },
      { status: overviewStatus },
    );
  }
  return new Promise<Response>((resolve) => {
    holdDownload = () => resolve(new Response("content"));
  });
};
function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <MantineProvider>
      <QueryClientProvider client={client}>
        <AdminExportPanel />
      </QueryClientProvider>
    </MantineProvider>,
  );
}
beforeEach(() => {
  overviewStatus = 200;
  holdOverview = false;
  holdDownload = undefined;
  vi.stubGlobal("fetch", fetchApi);
  vi.stubGlobal(
    "URL",
    class extends URL {
      static override createObjectURL = () => "blob:test";
      static override revokeObjectURL = () => {};
    },
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test("shows unavailable counts while overview is loading", () => {
  holdOverview = true;
  mount();
  expect(screen.queryByText("0 pacientes en el sistema")).not.toBeInTheDocument();
  expect(
    screen
      .getAllByRole("button", { name: "Descargar" })
      .every((button) => button.hasAttribute("disabled")),
  ).toBe(true);
});
test("shows treatment counts without labelling them completed", async () => {
  mount();
  expect(await screen.findByText("3 tratamientos registrados")).toBeInTheDocument();
});
test("disables downloads when the overview is forbidden", async () => {
  overviewStatus = 403;
  mount();
  await screen.findByRole("alert");
  expect(
    screen
      .getAllByRole("button", { name: "Descargar" })
      .every((button) => button.hasAttribute("disabled")),
  ).toBe(true);
});
test("locks format during downloads and uses the Madrid date in the filename", async () => {
  vi.spyOn(Date.prototype, "toISOString").mockReturnValue("2026-10-01T22:30:00.000Z");
  vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-10-01T22:30:00Z"));
  const downloaded: string[] = [];
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    downloaded.push(this.download);
  });
  mount();
  await screen.findByText("12 pacientes en el sistema");
  fireEvent.click(screen.getByRole("button", { name: "Excel" }));
  fireEvent.click(screen.getAllByRole("button", { name: "Descargar" })[0]!);
  await waitFor(() => expect(holdDownload).toBeDefined());
  expect(screen.getByRole("button", { name: "CSV" })).toBeDisabled();
  holdDownload!();
  await waitFor(() => expect(downloaded).toEqual(["patients-2026-10-02.xlsx"]));
});
