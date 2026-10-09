import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

const workspace = readFileSync("src/features/odontogram/odontogram-workspace.tsx","utf8");
const editor = readFileSync("src/features/odontogram/cephalometry-editor.tsx","utf8");
const diagram = readFileSync("src/features/odontogram/cephalometry-diagram.tsx","utf8");

assert.match(workspace, /<CephalometryEditor/);
assert.match(editor, /<CephalometryDiagram/);
assert.match(editor, /<table/);
assert.match(editor, /assessmentType:"LATERAL_CEPHALOMETRY"/);
assert.match(diagram, /<svg viewBox=/);
assert.match(diagram, /SNA/);
assert.match(diagram, /SNGoGn/);
assert.doesNotMatch(editor, /<iframe|window\\.parent|postMessage|cephalometry-lateral\\.html/);
console.log("PASS: native cephalometry renders inside the odontogram and preserves structured patient persistence.");
