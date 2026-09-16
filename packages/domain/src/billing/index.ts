import { createHash } from "node:crypto";

export interface MoneyLine { quantity: number; unitPriceCents: number; taxRateBps?: number; discountCents?: number; }
export interface CalculatedLine extends MoneyLine { subtotalCents: number; taxCents: number; totalCents: number; }
export interface InvoiceCalculationOptions { allowNegative?: boolean; }
export function calculateLine(line: MoneyLine,options:InvoiceCalculationOptions={}): CalculatedLine {
  const raw = line.quantity * line.unitPriceCents;
  const discounted = raw - (line.discountCents ?? 0);
  const subtotalCents = options.allowNegative ? discounted : Math.max(0, discounted);
  const taxCents = Math.round(subtotalCents * (line.taxRateBps ?? 0) / 10_000);
  return { ...line, subtotalCents, taxCents, totalCents: subtotalCents + taxCents };
}
export function calculateInvoice(lines: MoneyLine[],options:InvoiceCalculationOptions={}) {
  const calculated = lines.map(line=>calculateLine(line,options));
  return calculated.reduce((a,l)=>({ subtotalCents:a.subtotalCents+l.subtotalCents, taxCents:a.taxCents+l.taxCents, totalCents:a.totalCents+l.totalCents }),{subtotalCents:0,taxCents:0,totalCents:0});
}
export function canonicalFiscalJson(value: unknown): string {
  const stable = (v: any): any => Array.isArray(v) ? v.map(stable) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])) : v;
  return JSON.stringify(stable(value));
}
export function fiscalHash(value: unknown, previousHash = ""): string {
  return createHash("sha256").update(previousHash).update("\n").update(canonicalFiscalJson(value)).digest("hex");
}
