// @vitest-environment jsdom

import { MantineProvider } from "@mantine/core";
import { act, render, renderHook, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PrintNotice, usePrintNotice } from "./print-notice";

describe("usePrintNotice", () => {
  it("stores the message of a failed print job", async () => {
    const { result } = renderHook(() => usePrintNotice());
    await act(() =>
      result.current.run(async () => {
        throw new Error("Bloqueado");
      }),
    );
    expect(result.current.error).toBe("Bloqueado");
  });

  it("clears the previous error when a job succeeds", async () => {
    const { result } = renderHook(() => usePrintNotice());
    await act(() => result.current.run(() => Promise.reject(new Error("Mal"))));
    await act(() => result.current.run(() => Promise.resolve()));
    expect(result.current.error).toBeNull();
  });

  it("reports synchronous throws and exposes a manual fail", async () => {
    const { result } = renderHook(() => usePrintNotice());
    await act(() =>
      result.current.run(() => {
        throw new Error("Sync");
      }),
    );
    expect(result.current.error).toBe("Sync");
    act(() => result.current.fail("Falta la plantilla."));
    expect(result.current.error).toBe("Falta la plantilla.");
  });
});

describe("PrintNotice", () => {
  it("renders nothing without an error and an alert with one", () => {
    const { rerender } = render(
      <MantineProvider>
        <PrintNotice error={null} onClose={() => undefined} />
      </MantineProvider>,
    );
    expect(screen.queryByRole("alert")).toBeNull();
    rerender(
      <MantineProvider>
        <PrintNotice error="No se pudo imprimir" onClose={() => undefined} />
      </MantineProvider>,
    );
    expect(screen.getByRole("alert").textContent).toContain("No se pudo imprimir");
  });
});
