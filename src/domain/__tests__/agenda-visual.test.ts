import { describe, expect, it } from "vitest";
import {
  addDaysYMD,
  appointmentCardSize,
  clinicalGlyphFor,
  currentTimeOffset,
  rangeStartFor,
  shiftRange,
  shortPatientName,
  visibleDates,
} from "../agenda";

describe("clinicalGlyphFor", () => {
  it("usa el estado del odontograma para una caries distal del 26", () => {
    expect(
      clinicalGlyphFor({ treatmentCode: "CARIES", tooth: "26", surfaces: ["d"] }),
    ).toMatchObject({
      tooth: "26",
      state: "caries",
      surfaces: ["D"],
      urgent: false,
      label: "",
    });
  });

  it("no ofrece como trabajo pendiente una obturación ya realizada", () => {
    const glyph = clinicalGlyphFor({
      treatmentCode: "FILLING",
      tooth: "36",
      surfaces: ["M", "O", "D"],
      completed: true,
    });
    expect(glyph).toBeNull();
  });

  it("marca el implante indicado en toda la pieza", () => {
    const glyph = clinicalGlyphFor({ treatmentCode: "IMPLANT", tooth: "16", surfaces: ["O"] });
    expect(glyph).toMatchObject({ tooth: "16", state: "implant_indicated", surfaces: [] });
  });

  it("detecta una urgencia con dolor y la pieza del texto", () => {
    const glyph = clinicalGlyphFor({ label: "Urgencia dolor endodoncia 46" });
    expect(glyph).toMatchObject({ tooth: "46", state: "endo_indicated", urgent: true });
  });

  it("no inventa una pieza a partir de números sin tratamiento", () => {
    expect(clinicalGlyphFor({ label: "Revisión 12 meses" })?.tooth).toBeNull();
  });

  it("representa una revisión general sin inventar un diente", () => {
    expect(clinicalGlyphFor({ label: "Revisión" })).toMatchObject({
      family: "review",
      tooth: null,
    });
  });

  it("descarta superficies desconocidas", () => {
    const glyph = clinicalGlyphFor({ treatmentCode: "FILLING", tooth: "11", surfaces: ["X", "V"] });
    expect(glyph?.surfaces).toEqual(["V"]);
  });
});

describe("agenda view helpers", () => {
  it("empieza la semana en lunes", () => {
    // 2026-10-01 is a Thursday.
    expect(rangeStartFor("2026-10-01", 7)).toBe("2026-09-28");
    expect(rangeStartFor("2026-10-01", 3)).toBe("2026-10-01");
  });

  it("genera días consecutivos cruzando el cambio de hora", () => {
    expect(visibleDates("2026-10-24", 3)).toEqual(["2026-10-24", "2026-10-25", "2026-10-26"]);
    expect(addDaysYMD("2026-03-28", 1)).toBe("2026-03-29");
  });

  it("navega por bloques del tamaño de la vista", () => {
    expect(shiftRange("2026-10-01", 5, 1)).toBe("2026-10-06");
    expect(shiftRange("2026-10-01", 1, -1)).toBe("2026-09-30");
  });

  it("sitúa la línea de hora actual solo dentro del horario visible", () => {
    expect(currentTimeOffset("2026-10-01T10:30:00+02:00", 8, 21)).toBe(150);
    expect(currentTimeOffset("2026-10-01T07:00:00+02:00", 8, 21)).toBeNull();
    expect(currentTimeOffset("2026-10-01T22:00:00+02:00", 8, 21)).toBeNull();
  });

  it("decide cuánto muestra la tarjeta según su altura", () => {
    expect(appointmentCardSize(30)).toBe("small");
    expect(appointmentCardSize(60)).toBe("medium");
    expect(appointmentCardSize(120)).toBe("large");
  });

  it("acorta nombres sin perder al paciente", () => {
    expect(shortPatientName("Fernando García López")).toBe("Fernando G.");
    expect(shortPatientName("Esther")).toBe("Esther");
  });
});
