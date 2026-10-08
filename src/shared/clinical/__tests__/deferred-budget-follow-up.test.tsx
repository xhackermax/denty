// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  listDocuments: vi.fn(),
  createDocument: vi.fn(),
  listTasks: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  signBudget: vi.fn(),
}));

vi.mock("@/shared/api/browser", () => ({
  getBrowserApi: () => ({
    documents: {
      list: api.listDocuments,
      create: api.createDocument,
    },
    tasks: {
      list: api.listTasks,
      create: api.createTask,
      update: api.updateTask,
    },
    billing: {
      budgets: {
        sign: api.signBudget,
      },
    },
  }),
}));

import {
  useDeferBudgetDecisionMutation,
  useSignBudgetMutation,
} from "../clinical-data";

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

describe("useDeferBudgetDecisionMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.listDocuments.mockResolvedValue({ items: [] });
    api.listTasks.mockResolvedValue({ items: [] });
    api.signBudget.mockResolvedValue({ budget: { id: "budget-1", status: "SIGNED" } });
    api.updateTask.mockResolvedValue({});
    api.createDocument.mockResolvedValue({
      id: "doc-1",
      patientId: "patient-1",
      type: "BUDGET",
      title: "Presupuesto P-1 pendiente",
      status: "DRAFT",
      version: 1,
      createdAt: "2026-10-08T08:00:00+02:00",
      data: {},
    });
    api.createTask.mockResolvedValue({
      id: "task-1",
      patientId: "patient-1",
      taskType: "budget_follow_up",
      title: "Llamar a Ana",
      status: "OPEN",
      priority: "NORMAL",
      position: 1,
      durationMin: 15,
      version: 1,
      createdAt: "2026-10-08T08:00:00+02:00",
      updatedAt: "2026-10-08T08:00:00+02:00",
    });
  });

  it("guarda el presupuesto pendiente y crea la tarea de llamada", async () => {
    const { result } = renderHook(() => useDeferBudgetDecisionMutation("patient-1"), { wrapper });

    result.current.mutate({
      budgetId: "budget-1",
      budgetCode: "P-1",
      totalCents: 125000,
      patientName: "Ana Ruiz",
      reason: "THINKING",
    });

    await waitFor(() => expect(api.createTask).toHaveBeenCalledOnce());
    expect(api.createDocument).toHaveBeenCalledWith({
      patientId: "patient-1",
      type: "BUDGET",
      title: "Presupuesto P-1 · pendiente de firma",
      data: {
        budgetId: "budget-1",
        budgetCode: "P-1",
        totalCents: 125000,
        decision: "PENDING_SIGNATURE",
        decisionReason: "THINKING",
        followUpOn: null,
      },
    });
    expect(api.createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        patientId: "patient-1",
        taskType: "budget_follow_up",
        sourceType: "budget_pending_signature",
        sourceId: "budget-1",
        title: expect.stringContaining("Ana Ruiz"),
      }),
    );
  });

  it("programa la llamada para una decisión de tratamiento posterior", async () => {
    const { result } = renderHook(() => useDeferBudgetDecisionMutation("patient-1"), {
      wrapper,
    });
    result.current.mutate({
      budgetId: "budget-1",
      budgetCode: "P-1",
      totalCents: 125000,
      patientName: "Ana Ruiz",
      reason: "LATER",
      followUpOn: "2026-10-15",
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.createDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          decisionReason: "LATER",
          followUpOn: "2026-10-15",
        }),
      }),
    );
    expect(api.createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        scheduledOn: "2026-10-15",
        description: expect.stringContaining("más adelante"),
      }),
    );
  });

  it("cierra la tarea de seguimiento al firmar el mismo presupuesto", async () => {
    api.listTasks.mockResolvedValue({
      items: [
        {
          id: "callback-1",
          patientId: "patient-1",
          status: "OPEN",
          version: 2,
          sourceType: "budget_pending_signature",
          sourceId: "budget-1",
        },
        {
          id: "other-budget",
          patientId: "patient-1",
          status: "OPEN",
          version: 1,
          sourceType: "budget_pending_signature",
          sourceId: "budget-2",
        },
      ],
    });
    const { result } = renderHook(() => useSignBudgetMutation("patient-1"), { wrapper });

    result.current.mutate({
      budgetId: "budget-1",
      expectedVersion: 3,
      signerName: "Ana Ruiz",
      signatureData: "data:image/png;base64,ZmlybWE=",
    });

    await waitFor(() => expect(api.updateTask).toHaveBeenCalledOnce());
    expect(api.signBudget).toHaveBeenCalledWith("budget-1", {
      expectedVersion: 3,
      signerName: "Ana Ruiz",
      signatureData: "data:image/png;base64,ZmlybWE=",
    });
    expect(api.updateTask).toHaveBeenCalledWith("callback-1", {
      status: "DONE",
      expectedVersion: 2,
    });
  });

  it("no duplica documento ni tarea si se repite el seguimiento", async () => {
    api.listDocuments.mockResolvedValue({
      items: [
        {
          id: "doc-existing",
          patientId: "patient-1",
          type: "BUDGET",
          title: "Presupuesto P-1 · pendiente de firma",
          status: "DRAFT",
          version: 1,
          createdAt: "2026-10-08T08:00:00+02:00",
          data: { budgetId: "budget-1", decision: "PENDING_SIGNATURE" },
        },
      ],
    });
    api.listTasks.mockResolvedValue({
      items: [
        {
          id: "task-existing",
          patientId: "patient-1",
          taskType: "budget_follow_up",
          title: "Llamar a Ana Ruiz: presupuesto pendiente",
          status: "OPEN",
          priority: "NORMAL",
          sourceType: "budget_pending_signature",
          sourceId: "budget-1",
          position: 1,
          durationMin: 15,
          version: 1,
          createdAt: "2026-10-08T08:00:00+02:00",
          updatedAt: "2026-10-08T08:00:00+02:00",
        },
      ],
    });

    const { result } = renderHook(() => useDeferBudgetDecisionMutation("patient-1"), { wrapper });
    result.current.mutate({
      budgetId: "budget-1",
      budgetCode: "P-1",
      totalCents: 125000,
      patientName: "Ana Ruiz",
      reason: "THINKING",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.createDocument).not.toHaveBeenCalled();
    expect(api.createTask).not.toHaveBeenCalled();
  });
});
