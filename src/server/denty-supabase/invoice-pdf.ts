type Line = {
  description: string;
  quantity?: number;
  taxRateBps?: number;
  exemptionCode?: string | null;
  lineSubtotalCents?: number;
  taxCents?: number;
  totalCents: number;
};
type Invoice = {
  id: string;
  fullNumber?: string | null;
  customerName: string;
  customerTaxId?: string | null;
  customerAddress?: string | null;
  issuerTaxId?: string | null;
  issuerLegalName?: string | null;
  issuerAddress?: string | null;
  subtotalCents?: number;
  taxCents?: number;
  totalCents: number;
  issuedAt?: string | null;
  dueAt?: string | null;
  lines?: Line[];
};
const esc = (value: string) =>
  value
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)")
    .replaceAll(/[^\x20-\x7E]/g, "?");
const money = (cents?: number) => `${((cents ?? 0) / 100).toFixed(2)} EUR`;

export function buildInvoicePdf(invoice: Invoice): Uint8Array {
  const lineRows = (invoice.lines ?? []).map(
    (line) =>
      `${line.description} x${line.quantity ?? 1} ${money(line.lineSubtotalCents ?? line.totalCents)} ` +
      `IVA ${(line.taxRateBps ?? 0) / 100}% ${line.exemptionCode ?? ""}`,
  );
  const lines = [
    `${invoice.issuerLegalName ?? "Denty"}${invoice.issuerTaxId ? ` - NIF ${invoice.issuerTaxId}` : ""}`,
    invoice.issuerAddress ?? "",
    `FACTURA ${invoice.fullNumber ?? invoice.id}`,
    `Fecha emision: ${invoice.issuedAt ?? "BORRADOR"}`,
    invoice.dueAt ? `Vencimiento: ${invoice.dueAt}` : "",
    `${invoice.customerName}${invoice.customerTaxId ? ` - NIF ${invoice.customerTaxId}` : ""}`,
    invoice.customerAddress ?? "",
    ...lineRows,
    `BASE: ${money(invoice.subtotalCents)}`,
    `IMPUESTOS: ${money(invoice.taxCents)}`,
    `TOTAL: ${money(invoice.totalCents)}`,
  ].filter(Boolean);
  const text = lines.map((line, index) => `${index ? "T* " : ""}(${esc(line)}) Tj`).join(" ");
  const stream = `BT /F1 10 Tf 45 800 Td 13 TL ${text} ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let output = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(output.length);
    output += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = output.length;
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  output += offsets
    .slice(1)
    .map((value) => `${String(value).padStart(10, "0")} 00000 n \n`)
    .join("");
  output += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(output);
}
