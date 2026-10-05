// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

const create = vi.fn().mockResolvedValue({});
vi.mock("@/shared/api/browser", () => ({ getBrowserApi: () => ({ tasks: { create } }) }));

import { useLabCallPatientTaskMutation } from "../laboratory-data";

describe("useLabCallPatientTaskMutation", () => {
  it("crea una tarea de llamada vinculada al paciente y al trabajo", async () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useLabCallPatientTaskMutation(), { wrapper });
    result.current.mutate({
      workId: "w1",
      patientId: "p1",
      patientName: "Ana Ruiz",
      title: "Corona 36",
    });
    await waitFor(() => expect(create).toHaveBeenCalledOnce());
    expect(create.mock.calls[0]?.[0]).toMatchObject({
      patientId: "p1",
      sourceType: "lab_work_received",
      sourceId: "w1",
      taskType: "lab_received_call",
      title: expect.stringContaining("Ana Ruiz"),
    });
  });
});
