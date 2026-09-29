import fs from "node:fs";
import assert from "node:assert/strict";
const ui = fs.readFileSync("src/features/parity/modules/laboratory-module.tsx", "utf8");
for (const token of [
  "useLaboratoriesQuery",
  "useCreateLaboratoryMutation",
  "useUpdateLaboratoryMutation",
  "useLaboratoryBalancesQuery",
  "laboratoryId",
  "Adjuntar archivo",
  "Saldo pendiente",
]) {
  assert.ok(ui.includes(token), `Stage 10 UI missing: ${token}`);
}
assert.ok(!ui.includes("Proveedores detectados"), "Legacy analytics supplier UI must be removed");
assert.ok(
  !ui.includes("El CRUD de maestros de laboratorio se completa"),
  "Stage 10 must not leave the master CRUD placeholder",
);
console.log("Stage 10 laboratory UI contract PASS");
