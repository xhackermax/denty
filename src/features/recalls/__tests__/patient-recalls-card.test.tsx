// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  permissions: ["recalls.read"] as string[],
  items: [] as Array<Record<string, unknown>>,
  calls: [] as unknown[][],
}));

vi.mock("@/shared/tenancy/active-context", () => ({
  useActiveTenant: () => ({ permissions: state.permissions }),
}));
vi.mock("../recalls-data", () => ({
  useRecallListQuery: (...args: unknown[]) => {
    state.calls.push(args);
    return { data: { items: state.items }, isError: false, isLoading: false };
  },
}));

import { PatientRecallsCard } from "../patient-recalls-card";

const renderCard = () =>
  render(
    <MantineProvider env="test">
      <PatientRecallsCard patientId="p-1" />
    </MantineProvider>,
  );

afterEach(() => {
  cleanup();
  state.calls = [];
});

describe("PatientRecallsCard", () => {
  it("lista los recalls abiertos del paciente", () => {
    state.permissions = ["recalls.read"];
    state.items = [
      { id: "r1", templateName: "Higiene", dueAt: "2026-11-02T08:00:00.000Z", state: "PROXIMO" },
    ];
    renderCard();
    expect(screen.getByRole("region", { name: "Recalls del paciente" })).toHaveTextContent(
      "Higiene",
    );
    expect(screen.getByText("Próximo")).toBeInTheDocument();
    expect(state.calls[0]).toEqual([{ patientId: "p-1", pageSize: 10 }, true]);
  });

  it("no consulta ni muestra nada sin permiso", () => {
    state.permissions = [];
    renderCard();
    expect(screen.queryByRole("region", { name: "Recalls del paciente" })).not.toBeInTheDocument();
    expect(state.calls[0]?.[1]).toBe(false);
  });
});
