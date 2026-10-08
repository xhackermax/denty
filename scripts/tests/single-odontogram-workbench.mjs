import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workspace = readFileSync("src/features/odontogram/odontogram-workspace.tsx", "utf8");
const ortho = readFileSync("src/features/odontogram/orthodontic-panel.tsx", "utf8");
const pediatric = readFileSync("src/features/odontogram/pediatric-panel.tsx", "utf8");
const controls = readFileSync("src/features/odontogram/odontogram-layer-controls.tsx", "utf8");
const styles = readFileSync("src/features/odontogram/odontogram.module.css", "utf8");

const occurrences = (source, text) => source.split(text).length - 1;

assert.equal(occurrences(workspace, "renderArch(arches.upper)"), 1, "Only one maxillary arch is allowed");
assert.equal(occurrences(workspace, "renderArch(arches.lower)"), 1, "Only one mandibular arch is allowed");
assert.ok(!workspace.includes("<OdontogramViewSwitch"), "Never render a duplicate standalone full-mouth visual");
assert.ok(!workspace.includes("<OdontogramVisual"), "Only the common editor is mounted");
assert.ok(!ortho.includes("renderArch(arches.upper)"), "No second orthodontic arch");
assert.ok(!ortho.includes("renderArch(arches.lower)"), "No second orthodontic arch");
assert.ok(!pediatric.includes("renderMixedArch("), "No second mixed-dentition mouth");
assert.ok(!pediatric.includes("<PediatricTooth "), "No duplicate pediatric tooth diagram");
assert.ok(workspace.includes("selectedTooth={selectedTooth}"), "Clinical tools must use the central selected tooth");
assert.ok(workspace.includes("focusedLayer={inspectorLayer}"), "Inspector focus is independent from visible overlays");
assert.ok(workspace.includes('inspectorLayer === "perio"'), "Periodontal editor must be focused, not duplicated");
assert.ok(workspace.includes('inspectorLayer === "ortho"'), "Orthodontic editor must be focused, not duplicated");
assert.ok(workspace.includes("styles.inspectorScroll"), "Tools must live in bounded scrollable panel");
assert.ok(controls.includes("onToggle(layerId)"), "Buttons must toggle overlays");
assert.ok(controls.includes("onFocus(layerId)"), "Editing a layer must not remove other layers");
assert.ok(styles.includes("max-height: min(66dvh, 720px)"), "Inspector must stay bounded");
console.log("Unified odontogram contract OK: one chart, multi-layer overlays, focused clinical editors");
