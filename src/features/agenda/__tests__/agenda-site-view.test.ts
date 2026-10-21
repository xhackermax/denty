// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useAgendaSiteView } from "../agenda-site-view";

describe("vista de sedes de la agenda", () => {
  it("muestra la sede activa por defecto", () => {
    const { result } = renderHook(() => useAgendaSiteView("centro", vi.fn()));
    expect(result.current.viewSiteId).toBe("centro");
    expect(result.current.allSites).toBe(false);
  });

  it("muestra todas las sedes aunque la sede activa siga fijada", () => {
    const setActiveSiteId = vi.fn();
    const { result } = renderHook(() => useAgendaSiteView("centro", setActiveSiteId));
    act(() => result.current.showAllSites());
    expect(result.current.viewSiteId).toBeNull();
    expect(result.current.allSites).toBe(true);
    expect(setActiveSiteId).not.toHaveBeenCalled();
  });

  it("al elegir una sede sale de la vista conjunta y la activa", () => {
    const setActiveSiteId = vi.fn();
    const { result, rerender } = renderHook(
      ({ active }) => useAgendaSiteView(active, setActiveSiteId),
      { initialProps: { active: "centro" } },
    );
    act(() => result.current.showAllSites());
    act(() => result.current.showSite("norte"));
    expect(setActiveSiteId).toHaveBeenCalledWith("norte");
    rerender({ active: "norte" });
    expect(result.current.viewSiteId).toBe("norte");
    expect(result.current.allSites).toBe(false);
  });
});
