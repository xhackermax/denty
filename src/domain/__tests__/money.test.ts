import { describe, expect, it } from "vitest";
import { asCents, formatEUR, mulQty, parseEUR, taxFromBps } from "../money";

describe("money", () => {
  it("parsea formato es-ES y redondea una sola vez", () => {
    expect(parseEUR("1.234,56")).toBe(123456);
    expect(parseEUR("0,005")).toBe(1);
    expect(parseEUR("-0,005")).toBe(-1);
  });

  it("rechaza NaN y céntimos fraccionarios", () => {
    expect(() => asCents(Number.NaN)).toThrow();
    expect(() => asCents(1.2)).toThrow();
  });

  it("multiplica cantidades y calcula impuestos en bps", () => {
    expect(mulQty(199, 1.5)).toBe(299);
    expect(taxFromBps(10000, 2100)).toBe(2100);
    expect(taxFromBps(-10000, 2100)).toBe(-2100);
  });

  it("formatea EUR en es-ES", () => {
    expect(formatEUR(123456)).toContain("1234,56");
  });
});
