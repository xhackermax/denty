import writeXlsxFile from "write-excel-file/node";
import type { ExportTable } from "./export-repository";

export async function exportFile(table: ExportTable, format: "csv" | "xlsx") {
  if (format === "xlsx") {
    const data = [table.headers, ...table.rows].map((row, index) =>
      row.map((value) => ({
        value: value ?? "",
        type: typeof value === "number" ? Number : String,
        ...(index === 0 ? { fontWeight: "bold" as const } : {}),
      })),
    );
    const buffer = await writeXlsxFile(data, { sheet: "Datos", stickyRowsCount: 1 }).toBuffer();
    return new Uint8Array(buffer);
  }
  const escape = (value: string | number | null) => {
    const text = String(value ?? "");
    // Quoting alone does not stop spreadsheet applications from evaluating formulas.
    const safe =
      typeof value === "string" && /^[\s\u0000-\u001f]*[=+@-]/.test(text) ? `'${text}` : text;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  return (
    "\uFEFF" + [table.headers, ...table.rows].map((row) => row.map(escape).join(",")).join("\r\n")
  );
}
