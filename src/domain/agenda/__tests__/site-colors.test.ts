import { describe, expect, it } from "vitest";

import { SITE_COLOR_COUNT, siteColorSlots } from "../site-colors";

describe("colores de sede", () => {
  it("asigna un color distinto a cada sede según su orden", () => {
    const slots = siteColorSlots(["centro", "norte", "sur"]);
    expect([...slots.entries()]).toEqual([
      ["centro", 1],
      ["norte", 2],
      ["sur", 3],
    ]);
  });

  it("repite la paleta cuando hay más sedes que colores", () => {
    const ids = Array.from({ length: SITE_COLOR_COUNT + 2 }, (_, index) => `sede-${index}`);
    const slots = siteColorSlots(ids);
    expect(slots.get(`sede-${SITE_COLOR_COUNT}`)).toBe(1);
    expect(slots.get(`sede-${SITE_COLOR_COUNT + 1}`)).toBe(2);
  });

  it("ignora ids repetidos y listas vacías", () => {
    expect(siteColorSlots(["a", "a", "b"]).get("b")).toBe(2);
    expect(siteColorSlots([]).size).toBe(0);
  });
});
