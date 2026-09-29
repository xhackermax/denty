import { describe, expect, it } from "vitest";

import { requiredConsentTemplates } from "../consent-requirements";

describe("surgical consent requirements", () => {
  it.each([
    ["IMPLANT_PLACEMENT", "CONSENT_IMPLANT"],
    ["EXTRACTION_SURGICAL", "CONSENT_EXTRACTION"],
    ["BONE_GRAFT", "CONSENT_BONE_GRAFT"],
    ["GUIDED_BONE_REGENERATION", "CONSENT_BONE_REGEN"],
    ["APICOECTOMY", "CONSENT_PERIAPICAL"],
    ["BIOPSY", "CONSENT_BIOPSY"],
  ] as const)("maps %s deterministically to %s", (treatmentCode, consentCode) => {
    expect(requiredConsentTemplates([{ treatmentCode }]).map((item) => item.code)).toContain(
      consentCode,
    );
  });
});
