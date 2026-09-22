import { describe, expect, it } from "vitest";

import {
  ENDODONTIC_DECISION_NOTICE,
  endodonticConsistency,
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
    expect(ENDODONTIC_DECISION_NOTICE).toContain("decisión diagnóstica");
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
});
