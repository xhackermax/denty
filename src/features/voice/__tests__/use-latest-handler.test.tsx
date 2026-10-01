// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useLatestHandler } from "../use-latest-handler";

describe("useLatestHandler", () => {
  it("keeps one stable dispatcher that always reaches the latest handler", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { result, rerender } = renderHook(
      ({ handler }) => {
        const latest = useLatestHandler<[string], void>();
        latest.bind(handler);
        return latest;
      },
      { initialProps: { handler: first } },
    );
    const dispatcher = result.current.dispatch;

    rerender({ handler: second });
    result.current.dispatch("oye denty caries en el 27");

    expect(result.current.dispatch).toBe(dispatcher);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith("oye denty caries en el 27");
  });

  it("does nothing before a handler is bound", () => {
    const { result } = renderHook(() => useLatestHandler<[string], void>());

    expect(result.current.dispatch("x")).toBeUndefined();
  });
});
