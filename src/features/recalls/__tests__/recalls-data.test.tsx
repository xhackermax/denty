// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  recalls: {
    list: vi.fn(),
    templates: vi.fn(),
    history: vi.fn(),
    act: vi.fn(),
    bulk: vi.fn(),
    createTemplate: vi.fn(),
    updateTemplate: vi.fn(),
    archiveTemplate: vi.fn(),
    assign: vi.fn(),
    candidates: vi.fn(),
  },
  agenda: { context: vi.fn() },
}));
vi.mock("@/shared/api/browser", () => ({ getBrowserApi: () => api }));

import {
  fetchRecallCandidates,
  useArchiveRecallTemplateMutation,
  useAssignRecallMutation,
  useRecallActionMutation,
  useRecallBulkMutation,
  useRecallHistoryQuery,
  useRecallListQuery,
  useRecallStaffAndSitesQuery,
  useRecallTemplatesQuery,
  useSaveRecallTemplateMutation,
} from "../recalls-data";

let client: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
);

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  for (const fn of Object.values(api.recalls)) fn.mockReset().mockResolvedValue({ items: [] });
});

describe("recalls data hooks", () => {
  it("consulta lista, tipos e historial con sus parámetros", async () => {
    renderHook(() => useRecallListQuery({ state: "VENCIDO" }), { wrapper });
    renderHook(() => useRecallTemplatesQuery(true), { wrapper });
    const history = renderHook(() => useRecallHistoryQuery(null), { wrapper });
    await waitFor(() => expect(api.recalls.list).toHaveBeenCalledWith({ state: "VENCIDO" }));
    expect(api.recalls.templates).toHaveBeenCalledWith(true);
    expect(history.result.current.fetchStatus).toBe("idle");
    expect(api.recalls.history).not.toHaveBeenCalled();
  });

  it("oculta sedes y profesionales inactivos en los selectores", async () => {
    api.agenda.context.mockResolvedValue({
      sites: [
        { id: "s1", name: "Centro", active: true },
        { id: "s2", name: "Cerrada", active: false },
      ],
      staff: [{ id: "d1", displayName: "Dra. Gil" }],
    });
    const { result } = renderHook(() => useRecallStaffAndSitesQuery(), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.sites.map((site) => site.id)).toEqual(["s1"]);
    expect(result.current.data?.staff).toHaveLength(1);
  });

  it("refresca los recalls tras cada cambio", async () => {
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const action = renderHook(() => useRecallActionMutation(), { wrapper });
    const bulk = renderHook(() => useRecallBulkMutation(), { wrapper });
    const archive = renderHook(() => useArchiveRecallTemplateMutation(), { wrapper });
    await act(async () => {
      await action.result.current.mutateAsync({
        recallId: "r1",
        request: { action: "CONTACT" },
      });
      await bulk.result.current.mutateAsync({ ids: ["r1"], action: "CANCEL" });
      await archive.result.current.mutateAsync({ templateId: "t1", archive: true });
    });
    expect(api.recalls.act).toHaveBeenCalledWith("r1", { action: "CONTACT" });
    expect(api.recalls.archiveTemplate).toHaveBeenCalledWith("t1", { archive: true });
    expect(invalidate).toHaveBeenCalledTimes(3);
  });

  it("crea o actualiza el tipo según tenga id", async () => {
    const { result } = renderHook(() => useSaveRecallTemplateMutation(), { wrapper });
    const template = { name: "Higiene" } as never;
    await act(async () => {
      await result.current.mutateAsync({ templateId: null, template });
      await result.current.mutateAsync({
        templateId: "t1",
        template,
        expectedVersion: 3,
        recomputePending: true,
      });
    });
    expect(api.recalls.createTemplate).toHaveBeenCalledWith(template);
    expect(api.recalls.updateTemplate).toHaveBeenCalledWith("t1", {
      template,
      expectedVersion: 3,
      recomputePending: true,
    });
  });

  it("una simulación de asignación no refresca la lista", async () => {
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useAssignRecallMutation(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ templateId: "t1", patientIds: ["p1"], dryRun: true });
    });
    expect(invalidate).not.toHaveBeenCalled();
    await act(async () => {
      await result.current.mutateAsync({ templateId: "t1", patientIds: ["p1"] });
    });
    expect(api.recalls.assign).toHaveBeenLastCalledWith("t1", {
      patientIds: ["p1"],
      dueOverrides: {},
      anchorDate: null,
      idempotencyKey: null,
      dryRun: false,
    });
    expect(invalidate).toHaveBeenCalledTimes(1);
  });

  it("delega la búsqueda de candidatos en la API", async () => {
    await fetchRecallCandidates({ minAge: 18 });
    expect(api.recalls.candidates).toHaveBeenCalledWith({ minAge: 18 });
  });
});
