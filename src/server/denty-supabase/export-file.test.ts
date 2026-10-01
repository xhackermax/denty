import { strFromU8, unzipSync } from "fflate";
import { expect, test } from "vitest";
import { exportFile } from "./export-file";

test.each(["=1+1", "+cmd", "-cmd", "@SUM(A1)", " \t=1+1"])("CSV neutralizes %s", async (value) => {
  const csv = await exportFile({ headers: ["Valor"], rows: [[value]] }, "csv");
  expect(csv).toContain(`"'${value}"`);
});
test("CSV preserves zeros and negative numbers and escapes multiline fields", async () => {
  expect(
    await exportFile(
      {
        headers: ["Número", "Texto", "Vacío"],
        rows: [
          [0, 'Hola, "Ana"\nAdiós', null],
          [-2, "normal", ""],
        ],
      },
      "csv",
    ),
  ).toBe('\uFEFF"Número","Texto","Vacío"\r\n"0","Hola, ""Ana""\nAdiós",""\r\n"-2","normal",""');
});
test("empty CSV still contains column headers", async () => {
  expect(await exportFile({ headers: ["ID"], rows: [] }, "csv")).toBe('\uFEFF"ID"');
});
test("XLSX preserves numbers, nulls and formula-like strings as data", async () => {
  const result = await exportFile(
    { headers: ["Texto", "Número", "Vacío"], rows: [["=1+1", 0, null]] },
    "xlsx",
  );
  expect(result).toBeInstanceOf(Uint8Array);
  const files = unzipSync(result as Uint8Array);
  const sheet = strFromU8(files["xl/worksheets/sheet1.xml"]!);
  expect(sheet).toContain("<v>0</v>");
  expect(sheet).not.toContain("<f>");
});
