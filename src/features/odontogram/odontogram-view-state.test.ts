import { describe, expect, it } from "vitest";

import {
  applyViewPreset,
  createOdontogramViewPreference,
  createInitialOdontogramViewState,
  isToothStatusVisible,
  restoreOdontogramViewPreference,
  resetOdontogramView,
  toggleOdontogramLayer,
  toggleOdontogramSubfilter,
  toggleShowAllLayers,
  type OdontogramLayerId,
} from "./odontogram-view-state";

describe("odontogram visual view state", () => {
  it("starts with the approved exploration preset without changing clinical data", () => {
    const state = createInitialOdontogramViewState();

    expect(state.visibleLayerIds).toEqual(["general"]);
    expect(state.presetId).toBe("exploration");
    expect(state.mode).toBe("normal");
  });

  it("combines layer toggles without hiding other active layers", () => {
    const state = toggleOdontogramLayer(createInitialOdontogramViewState(), "perio");

    expect(state.visibleLayerIds).toEqual(["general", "perio"]);
  });

  it("captures the prior view once, allows adjustments, and restores the original view", () => {
    const before = toggleOdontogramLayer(createInitialOdontogramViewState(), "endo");
    const all = toggleShowAllLayers(before);
    const adjusted = toggleOdontogramLayer(all, "ortho");

    expect(all.mode).toBe("all");
    expect(all.preAllView).toEqual({
      visibleLayerIds: before.visibleLayerIds,
      subfiltersByLayer: before.subfiltersByLayer,
      presetId: before.presetId,
    });
    expect(adjusted.mode).toBe("all_adjusted");
    expect(adjusted.preAllView).toEqual(all.preAllView);
    expect(toggleShowAllLayers(adjusted)).toEqual(before);
  });

  it("does not select a treatment plan when enabling the proposal layer", () => {
    const state = toggleOdontogramLayer(createInitialOdontogramViewState(), "proposal");

    expect(state.visibleLayerIds).toContain("proposal");
    expect(state.scenarioId).toBeNull();
  });

  it("updates only the selected subfilter and retains other layer filters", () => {
    const initial = createInitialOdontogramViewState();
    const state = toggleOdontogramSubfilter(initial, "perio", "placa");

    expect(state.subfiltersByLayer.perio).not.toContain("placa");
    expect(state.subfiltersByLayer.general).toEqual(initial.subfiltersByLayer.general);
    expect(state.mode).toBe("normal");
  });

  it("applies a preset explicitly and discards a temporary show-all session", () => {
    const state = toggleShowAllLayers(
      toggleOdontogramLayer(createInitialOdontogramViewState(), "endo"),
    );
    const preset = applyViewPreset(state, "periodontal_review");

    expect(preset.mode).toBe("normal");
    expect(preset.preAllView).toBeNull();
    expect(preset.visibleLayerIds).toEqual(["general", "perio"]);
    expect(preset.subfiltersByLayer.perio).toContain("sondaje");
    expect(preset.subfiltersByLayer.perio).not.toContain("placa");
  });

  it("retains every layer id in its catalog", () => {
    const all = toggleShowAllLayers(createInitialOdontogramViewState());

    expect(all.visibleLayerIds).toEqual(
      expect.arrayContaining<OdontogramLayerId>([
        "general",
        "perio",
        "ortho",
        "endo",
        "surgery",
        "prosthetics",
        "replacement",
        "proposal",
      ]),
    );
  });

  it("persists the normal view, not a temporary show-all session", () => {
    const normal = toggleOdontogramLayer(createInitialOdontogramViewState(), "endo");
    const temporary = toggleShowAllLayers(normal);
    const restored = restoreOdontogramViewPreference(createOdontogramViewPreference(temporary));

    expect(restored.visibleLayerIds).toEqual(normal.visibleLayerIds);
    expect(restored.mode).toBe("normal");
    expect(restored.preAllView).toBeNull();
  });

  it("ignores unknown layers and subfilters in stored preferences", () => {
    const restored = restoreOdontogramViewPreference({
      visibleLayerIds: ["general", "unknown"],
      subfiltersByLayer: { general: ["caries", "inventado"] },
      presetId: "not-a-preset",
    });

    expect(restored.visibleLayerIds).toEqual(["general"]);
    expect(restored.subfiltersByLayer.general).toEqual(["caries"]);
    expect(restored.presetId).toBeNull();
  });

  it("resets visual settings without changing the selected plan scenario", () => {
    const state = {
      ...createInitialOdontogramViewState(),
      scenarioId: "scenario-1",
    };

    expect(resetOdontogramView(toggleOdontogramLayer(state, "perio"))).toMatchObject({
      visibleLayerIds: ["general"],
      presetId: "exploration",
      scenarioId: "scenario-1",
    });
  });

  it("filters only visual tooth marks and keeps anatomical presence visible", () => {
    const state = createInitialOdontogramViewState();
    const withoutCaries = toggleOdontogramSubfilter(state, "general", "caries");

    expect(isToothStatusVisible("caries", withoutCaries)).toBe(false);
    expect(isToothStatusVisible("filling", withoutCaries)).toBe(true);
    expect(isToothStatusVisible("missing", withoutCaries)).toBe(true);
  });
});
