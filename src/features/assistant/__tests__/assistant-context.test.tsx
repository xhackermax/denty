// @vitest-environment jsdom

import { act, render } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

let pathname = "/app/patients/p2";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

import type { AssistantContext } from "../assistant-types";
import {
  AssistantContextProvider,
  useAssistantContext,
  useAssistantContextPatch,
  useOptionalAssistantContextPatch,
} from "../assistant-context";

const probe = {} as {
  context: AssistantContext;
  patch: ReturnType<typeof useAssistantContextPatch>;
};

function Probe() {
  probe.context = useAssistantContext();
  probe.patch = useAssistantContextPatch();
  return null;
}

function mount() {
  return render(
    <AssistantContextProvider>
      <Probe />
    </AssistantContextProvider>,
  );
}

afterEach(() => {
  pathname = "/app/patients/p2";
});

describe("assistant context patient", () => {
  it("infers the open patient from the URL", () => {
    mount();

    expect(probe.context.patientId).toBe("p2");
  });

  it("falls back to the URL patient when a screen clears its own patient", () => {
    mount();

    act(() => probe.patch({ patientId: "p1", selectedTooth: "14" }));
    expect(probe.context.patientId).toBe("p1");

    act(() => probe.patch({ patientId: undefined, selectedTooth: undefined }));
    expect(probe.context.patientId).toBe("p2");
    expect(probe.context.selectedTooth).toBeUndefined();
  });

  it("follows the patient when the user navigates manually after a cleared patch", () => {
    const view = mount();
    act(() => probe.patch({ patientId: undefined }));

    pathname = "/app/patients/p3";
    view.rerender(
      <AssistantContextProvider>
        <Probe />
      </AssistantContextProvider>,
    );

    expect(probe.context.patientId).toBe("p3");
  });

  it("has no patient outside a patient page", () => {
    pathname = "/app/agenda";
    mount();

    expect(probe.context.patientId).toBeUndefined();
  });

  it("keeps the patch function stable so screens can depend on it in effects", () => {
    // The odontogram patches the selected tooth in an effect that lists the patch function as a
    // dependency; a new function per render re-ran it forever and froze navigation.
    let renders = 0;
    function SelectedTooth() {
      const patch = useOptionalAssistantContextPatch();
      useEffect(() => {
        renders += 1;
      });
      useEffect(() => {
        patch({ patientId: "p2", selectedTooth: "36" });
        return () => patch({ patientId: undefined, selectedTooth: undefined });
      }, [patch]);
      return null;
    }
    render(
      <AssistantContextProvider>
        <SelectedTooth />
        <Probe />
      </AssistantContextProvider>,
    );
    const first = probe.patch;
    expect(renders).toBeLessThan(5);
    expect(probe.context.selectedTooth).toBe("36");
    act(() => probe.patch({ selectedTooth: "36" }));
    expect(probe.patch).toBe(first);
    expect(renders).toBeLessThan(5);
  });
});
