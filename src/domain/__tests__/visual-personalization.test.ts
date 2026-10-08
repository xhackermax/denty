import { describe, expect, it } from "vitest";

import {
  DEFAULT_VISUAL_PREFERENCES,
  VISUAL_PALETTES,
  VISUAL_WALLPAPERS,
  parseVisualPreferences,
} from "../visual-personalization";

describe("Hostinger visual palette catalog", () => {
  it("contains the nine requested numbered themes, without replacing Denty", () => {
    expect(VISUAL_PALETTES.map((palette) => palette.number)).toEqual([
      null, 27, 25, 22, 19, 17, 15, 14, 10, 6,
    ]);
    const map = new Map(VISUAL_PALETTES.map((palette) => [palette.id, palette.colors]));
    expect(map.get("27")).toEqual(["#FFFFFF", "#FF5841", "#C53678"]);
    expect(map.get("25")).toEqual(["#0C1A1A", "#6ACFC7"]);
    expect(map.get("22")).toEqual(["#FFFFFF", "#4F0341"]);
    expect(map.get("19")).toEqual(["#002349", "#957C3D"]);
    expect(map.get("17")).toEqual(["#0A1828", "#178582", "#BFA181"]);
    expect(map.get("15")).toEqual(["#96C2DB", "#E5EDF1", "#FFFFFF"]);
    expect(map.get("14")).toEqual(["#CD9C8A", "#FF5100", "#FFFFFF"]);
    expect(map.get("10")).toEqual(["#E1B0AC", "#F2D4D6", "#213F99"]);
    expect(map.get("6")).toEqual(["#00DD00", "#FFFFFF"]);
    expect(VISUAL_WALLPAPERS).toHaveLength(4);
  });

  it("defaults safely when the preference is corrupted or unknown", () => {
    expect(parseVisualPreferences("not json")).toEqual(DEFAULT_VISUAL_PREFERENCES);
    expect(parseVisualPreferences('{"palette":"evil","wallpaper":"url(http://bad)","animations":0}'))
      .toEqual(DEFAULT_VISUAL_PREFERENCES);
    expect(parseVisualPreferences(null)).toEqual(DEFAULT_VISUAL_PREFERENCES);
    expect(parseVisualPreferences("[]")).toEqual(DEFAULT_VISUAL_PREFERENCES);
    expect(parseVisualPreferences("0")).toEqual(DEFAULT_VISUAL_PREFERENCES);
  });

  it("reads valid independent choices without losing other settings", () => {
    expect(parseVisualPreferences('{"palette":"19","wallpaper":"mesh","animations":false}'))
      .toEqual({ palette: "19", wallpaper: "mesh", animations: false });
    expect(parseVisualPreferences('{"palette":"14"}'))
      .toEqual({ palette: "14", wallpaper: "none", animations: true });
  });
});
