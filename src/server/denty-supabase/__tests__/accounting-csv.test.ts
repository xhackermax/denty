import { expect, test } from "vitest";
import { buildAccountingCsv } from "../accounting-csv";

const names = new Map([["p1", "Ana Pérez"]]);

test("orders rows chronologically with readable columns and euro amounts", () => {
  const csv = buildAccountingCsv(
    [
      {
        issued_at: "2026-10-03T10:00:00Z",
        full_number: "F-2",
        customer_name: "Ana Pérez",
        patient_id: "p1",
        subtotal_cents: 10000,
        tax_cents: 2100,
        total_cents: 12100,
        status: "ISSUED",
      },
    ],
    [
      {
        paid_at: "2026-10-01T09:00:00Z",
        id: "pay1",
        patient_id: "p1",
        amount_cents: 5000,
        method: "CASH",
      },
    ],
    names,
  );
  const lines = csv.replace("\uFEFF", "").trim().split("\r\n");
  expect(lines[0]).toBe(
    '"Fecha";"Tipo";"Documento";"Paciente";"Base (€)";"Impuesto (€)";"Total (€)";"Método";"Referencia";"Estado"',
  );
  expect(lines[1]).toBe('"01/10/2026";"Cobro";"pay1";"Ana Pérez";"";"";"50,00";"CASH";"";""');
  expect(lines[2]).toBe(
    '"03/10/2026";"Factura";"F-2";"Ana Pérez";"100,00";"21,00";"121,00";"";"";"ISSUED"',
  );
});

test("neutralizes formulas and keeps headers when empty", () => {
  expect(buildAccountingCsv([], [], names)).toContain('"Fecha"');
  const csv = buildAccountingCsv(
    [],
    [
      {
        paid_at: "2026-10-01T09:00:00Z",
        id: "x",
        patient_id: "z",
        amount_cents: 1,
        method: "=1+1",
      },
    ],
    names,
  );
  expect(csv).toContain(`"'=1+1"`);
});
