import { describe, expect, it } from "vitest";
import { attributedInvoicedCents } from "../doctor-invoice-attribution";

describe("auditable doctor revenue", () => {
  it("sums only posted invoices with a plan-item link", () => {
    const sums = attributedInvoicedCents([
      { id:"inv1",status:"ISSUED",type:"STANDARD" },
      { id:"inv2",status:"DRAFT",type:"STANDARD" },
      { id:"inv3",status:"ISSUED",type:"RECTIFYING" },
    ], [
      { invoiceId:"inv1",planItemId:"item1",subtotalCents:40000 },
      { invoiceId:"inv1",planItemId:"item1",subtotalCents:10000 },
      { invoiceId:"inv2",planItemId:"item1",subtotalCents:90000 },
      { invoiceId:"inv3",planItemId:"item1",subtotalCents:-15000 },
      { invoiceId:"inv1",planItemId:null,subtotalCents:45000 },
    ]);
    expect(sums.get("item1")).toBe(35000);
    expect(sums.has("item2")).toBe(false);
  });

  it("excludes ambiguous credit notes rather than inflating the ticket", () => {
    const sums = attributedInvoicedCents([
      { id:"original",status:"RECTIFIED",type:"STANDARD" },
      { id:"credit",status:"ISSUED",type:"RECTIFYING" },
    ], [
      { invoiceId:"original",planItemId:"item1",subtotalCents:90000 },
      { invoiceId:"credit",planItemId:"item1",subtotalCents:40000 },
    ]);
    expect(sums.has("item1")).toBe(false);
  });

  it("keeps a genuine posted zero-euro line distinct from missing attribution", () => {
    const sums = attributedInvoicedCents([
      { id:"issued",status:"ISSUED",type:"SIMPLIFIED" },
    ], [
      { invoiceId:"issued",planItemId:"item1",subtotalCents:0 },
      { invoiceId:"issued",planItemId:"item2",subtotalCents:null },
    ]);
    expect(sums.get("item1")).toBe(0);
    expect(sums.has("item2")).toBe(false);
  });
});
