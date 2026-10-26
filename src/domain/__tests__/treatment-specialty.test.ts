import { describe, expect, it } from "vitest";
import { specialtyLabel, treatmentSpecialty } from "../treatment-specialty";

describe("treatmentSpecialty", () => {
  it.each([
    [{ category: "RESTORATION", treatmentCode: "FILLING" }, "conservative"],
    [{ category: "ENDODONTICS", treatmentCode: "ROOT_CANAL" }, "endodontics"],
    [{ category: "PREVENTION", specialty: "PERIODONTICS", treatmentCode: "HYGIENE" }, "prevention"],
    [{ category: "PERIODONTICS", treatmentCode: "SRP" }, "periodontics"],
    [{ category: "SURGERY", treatmentCode: "EXTRACTION" }, "surgery"],
    [{ category: "IMPLANTOLOGY", treatmentCode: "IMPLANT" }, "implants"],
    [{ category: "PROSTHESIS", treatmentCode: "CROWN_ON_IMPLANT" }, "prosthesis"],
    [{ category: "SPLINT", treatmentCode: "SPLINT" }, "prosthesis"],
    [{ category: "ORTHODONTICS", treatmentCode: "ALIGNERS" }, "orthodontics"],
    [{ category: "AESTHETICS", treatmentCode: "WHITENING" }, "aesthetics"],
  ] as const)("uses the frozen catalogue category %o", (item, expected) => {
    expect(treatmentSpecialty(item)).toBe(expected);
  });

  it("falls back to the catalogue specialty, then to the treatment name", () => {
    expect(treatmentSpecialty({ category: "UNSPECIFIED", specialty: "ENDODONTICS" })).toBe(
      "endodontics",
    );
    expect(
      treatmentSpecialty({ category: "UNCLASSIFIED", label: "Raspado y alisado radicular" }),
    ).toBe("periodontics");
    expect(treatmentSpecialty({ category: "UNSPECIFIED", label: "Corona sobre implante" })).toBe(
      "prosthesis",
    );
    expect(treatmentSpecialty({ category: "UNSPECIFIED", label: "Empaste composite" })).toBe(
      "conservative",
    );
  });

  it("classifies work on primary teeth and paediatric procedures as paediatrics", () => {
    expect(treatmentSpecialty({ category: "ENDODONTICS", tooth: "75" })).toBe("pediatrics");
    expect(
      treatmentSpecialty({
        category: "RESTORATION",
        treatmentCode: "PEDIATRIC_CROWN",
        tooth: "16",
      }),
    ).toBe("pediatrics");
    expect(treatmentSpecialty({ category: "RESTORATION", tooth: "36" })).toBe("conservative");
  });

  it("puts anything unknown under other", () => {
    expect(treatmentSpecialty({ category: "UNCLASSIFIED", treatmentCode: "X1" })).toBe("other");
    expect(treatmentSpecialty({})).toBe("other");
  });

  it("labels specialties in Spanish", () => {
    expect(specialtyLabel("conservative")).toBe("General / conservadora");
    expect(specialtyLabel("unknown")).toBe("unknown");
  });
});
