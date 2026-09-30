// @vitest-environment jsdom

import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

let pathname = "/app/patients/p2";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

import type { AssistantContext } from "../assistant-types";
import {
  AssistantContextProvider,
  useAssistantContext,
  useAssistantContextPatch,
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
});
