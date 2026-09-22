import { describe, expect, it } from "vitest";

import {
  ENDODONTIC_DECISION_NOTICE,
  ENDODONTIC_VISUAL_MARKS,
  endodonticConsistency,
  endodonticVisualCodeForApicalDiagnosis,
  type EndodonticAssessment,
} from "../endodontics";

const BASE_ASSESSMENT: EndodonticAssessment = {
  pulpalDiagnosis: "Pulpa normal",
  apicalDiagnosis: "Tejidos apicales normales",
  confidence: "HIGH",
  complexity: "LOW",
  restorability: "FAVORABLE",
  findings: { percussion: "NEGATIVE" },
};

describe("endodontic consistency", () => {
  it("flags the historical advanced pulpal pattern without making a diagnosis", () => {
    const notices = endodonticConsistency({
      ...BASE_ASSESSMENT,
      findings: { spontaneousPain: true, lingeringColdSeconds: 12, percussion: "NEGATIVE" },
    });
    expect(notices.some((notice) => notice.code === "ADVANCED_PULPAL_PATTERN")).toBe(true);
    expect(ENDODONTIC_DECISION_NOTICE).toContain("decision diagnostica");
  });

  it("flags an apical component when percussion is not negative", () => {
    const notices = endodonticConsistency({
      ...BASE_ASSESSMENT,
      findings: { percussion: "POSITIVE" },
    });
    expect(notices.some((notice) => notice.code === "APICAL_COMPONENT")).toBe(true);
  });

  it("warns when necrosis and cold response are recorded together", () => {
    const notices = endodonticConsistency({
      ...BASE_ASSESSMENT,
      pulpalDiagnosis: "Necrosis pulpar",
      findings: { coldResponsePresent: true, percussion: "NEGATIVE" },
    });
    expect(notices.some((notice) => notice.code === "NECROSIS_COLD_RESPONSE_CONFLICT")).toBe(true);
  });

  it("asigna codigos visuales estables a diagnosticos apicales", () => {
    expect(endodonticVisualCodeForApicalDiagnosis("Tejidos apicales normales")).toBe(
      "normal_apex",
    );
    expect(endodonticVisualCodeForApicalDiagnosis("Absceso apical cronico")).toBe(
      "chronic_apical_abscess",
    );
    expect(endodonticVisualCodeForApicalDiagnosis("Absceso apical crÃ³nico")).toBe(
      "chronic_apical_abscess",
    );
  });

  it("define una marca SVG propia para absceso apical cronico", () => {
    expect(ENDODONTIC_VISUAL_MARKS.chronic_apical_abscess).toMatchObject({
      label: "Absceso apical cronico",
      severity: "warning",
    });
    expect(ENDODONTIC_VISUAL_MARKS.chronic_apical_abscess.svgPath).toContain("C");
  });
});
