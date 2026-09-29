import { describe, expect, it } from "vitest";

import { surfaceMapLayout } from "./tooth-geometry";

describe("mapa de caras del odontograma", () => {
  it("16: vestibular arriba, palatino abajo y mesial hacia la línea media (derecha)", () => {
    expect(surfaceMapLayout("16")).toEqual({
      top: "V",
      bottom: "P",
      left: "D",
      right: "M",
      center: "O",
    });
  });

  it("21: mesial a la izquierda (línea media) e incisal en el centro", () => {
    expect(surfaceMapLayout("21")).toMatchObject({ left: "M", right: "D", center: "I" });
  });

  it("mandíbula: lingual hacia el plano oclusal y vestibular abajo", () => {
    expect(surfaceMapLayout("36")).toEqual({
      top: "L",
      bottom: "V",
      left: "M",
      right: "D",
      center: "O",
    });
    expect(surfaceMapLayout("46")).toMatchObject({ left: "D", right: "M", top: "L" });
  });

  it("temporales: el lado derecho del paciente (55, 85) tiene mesial a la derecha", () => {
    expect(surfaceMapLayout("55")).toMatchObject({ left: "D", right: "M", top: "V" });
    expect(surfaceMapLayout("85")).toMatchObject({ left: "D", right: "M", top: "L" });
    expect(surfaceMapLayout("65")).toMatchObject({ left: "M", right: "D" });
    expect(surfaceMapLayout("75")).toMatchObject({ left: "M", right: "D" });
  });
});
