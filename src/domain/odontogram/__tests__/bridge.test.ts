import { describe, expect, it } from "vitest";

import { bridgeTeethFromEndpoints, createBridgeEntities } from "../index";

describe("odontogram bridges", () => {
  it.each([
    ["14", "16", ["14", "15", "16"]],
    ["16", "14", ["16", "15", "14"]],
    ["54", "52", ["54", "53", "52"]],
    ["64", "52", ["64", "63", "62", "61", "51", "52"]],
    ["82", "84", ["82", "83", "84"]],
  ])("builds an ordered bridge range from %s to %s", (from, to, expected) => {
    expect(bridgeTeethFromEndpoints(from, to)).toEqual(expected);
  });

  it.each([
    ["14", "34"],
    ["54", "74"],
    ["14", "54"],
    ["54", "14"],
  ])("rejects bridge endpoints across arches or dentitions: %s to %s", (from, to) => {
    expect(() => bridgeTeethFromEndpoints(from, to)).toThrow(RangeError);
  });

  // Mixed dentition: the chart row puts primary and permanent teeth side by side.
  const mixedRows = {
    upper: ["16", "55", "54", "53", "12", "11", "21", "22", "63", "64", "65", "26"],
    lower: ["46", "85", "84", "83", "42", "41", "31", "32", "73", "74", "75", "36"],
  };

  it.each([
    ["16", "54", ["16", "55", "54"]],
    ["53", "12", ["53", "12"]],
    ["75", "36", ["75", "36"]],
  ])("follows the mixed-dentition row from %s to %s", (from, to, expected) => {
    expect(bridgeTeethFromEndpoints(from, to, mixedRows)).toEqual(expected);
  });

  it("still rejects a mixed-dentition bridge across arches or off the row", () => {
    expect(() => bridgeTeethFromEndpoints("16", "46", mixedRows)).toThrow(RangeError);
    expect(() => bridgeTeethFromEndpoints("16", "14", mixedRows)).toThrow(RangeError);
  });

  it("creates a mixed-dentition bridge along the chart row", () => {
    const entities = createBridgeEntities("16", "54", "prosthesis_pending", mixedRows);
    expect(
      entities.filter((entity) => entity.entityType === "PONTIC").map((entity) => entity.tooth),
    ).toEqual(["55"]);
  });

  it("creates a primary bridge with correctly linked pillars and pontics", () => {
    const entities = createBridgeEntities("54", "52");
    const bridge = entities.find((entity) => entity.entityType === "BRIDGE");

    expect(bridge).toMatchObject({
      id: "bridge-54-52",
      attributes: {
        from: "54",
        to: "52",
        teeth: ["54", "53", "52"],
        pillars: ["54", "52"],
        pontics: ["53"],
      },
    });
    expect(entities.filter((entity) => entity.entityType === "PROSTHESIS")).toHaveLength(2);
    expect(entities.find((entity) => entity.entityType === "PONTIC")).toMatchObject({
      id: "pontic-54-52-53",
      tooth: "53",
      parentId: "bridge-54-52",
    });
  });
});
