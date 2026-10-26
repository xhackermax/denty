import { describe, expect, it } from "vitest";

import { supplierInvoiceDocumentMimeType } from "../storage-repository";

const docx = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

describe("supplierInvoiceDocumentMimeType", () => {
  it("accepts PDF and DOCX scans", () => {
    expect(
      supplierInvoiceDocumentMimeType(new File(["x"], "f.pdf", { type: "application/pdf" })),
    ).toBe("application/pdf");
    expect(supplierInvoiceDocumentMimeType(new File(["x"], "f.docx", { type: docx }))).toBe(docx);
  });

  it("falls back to the extension when the browser sends no type", () => {
    expect(supplierInvoiceDocumentMimeType(new File(["x"], "Factura.DOCX"))).toBe(docx);
    expect(supplierInvoiceDocumentMimeType(new File(["x"], "factura.pdf"))).toBe("application/pdf");
  });

  it("rejects other formats and empty files", () => {
    expect(
      supplierInvoiceDocumentMimeType(new File(["x"], "f.png", { type: "image/png" })),
    ).toBeNull();
    expect(supplierInvoiceDocumentMimeType(new File(["x"], "f.doc"))).toBeNull();
    expect(
      supplierInvoiceDocumentMimeType(new File([], "f.pdf", { type: "application/pdf" })),
    ).toBeNull();
  });
});
