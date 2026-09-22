export const PULPAL_DIAGNOSES = [
  "Pulpa normal",
  "Pulpitis reversible",
  "Pulpitis irreversible sintomática",
  "Pulpitis irreversible asintomática",
  "Necrosis pulpar",
  "Previamente tratado",
  "Tratamiento previamente iniciado",
] as const;

export const APICAL_DIAGNOSES = [
  "Tejidos apicales normales",
  "Periodontitis apical sintomática",
  "Periodontitis apical asintomática",
  "Absceso apical agudo",
  "Absceso apical crónico",
  "Osteítis condensante",
] as const;

export type PulpalDiagnosis = (typeof PULPAL_DIAGNOSES)[number];
export type ApicalDiagnosis = (typeof APICAL_DIAGNOSES)[number];
export type DiagnosticConfidence = "HIGH" | "MODERATE" | "LOW";
export type EndodonticComplexity = "LOW" | "MODERATE" | "HIGH";
export type Restorability = "FAVORABLE" | "GUARDED" | "UNFAVORABLE" | "NON_RESTORABLE";
export type PercussionFinding = "NEGATIVE" | "POSITIVE" | "TENDER";

export interface EndodonticFindings {
  spontaneousPain?: boolean;
  nocturnalPain?: boolean;
  lingeringColdSeconds?: number;
  coldResponsePresent?: boolean;
  percussion?: PercussionFinding;
}

export interface EndodonticAssessment {
  pulpalDiagnosis: PulpalDiagnosis;
  apicalDiagnosis: ApicalDiagnosis;
  confidence: DiagnosticConfidence;
  complexity: EndodonticComplexity;
  restorability: Restorability;
  findings: EndodonticFindings;
}

export type EndodonticNoticeCode =
  | "ADVANCED_PULPAL_PATTERN"
  | "APICAL_COMPONENT"
  | "NECROSIS_COLD_RESPONSE_CONFLICT";

export interface EndodonticNotice {
  code: EndodonticNoticeCode;
  severity: "INFO" | "WARNING";
  message: string;
}

export const ENDODONTIC_DECISION_NOTICE =
  "Denty organiza hallazgos y comprueba coherencia; " +
  "la decisión diagnóstica sigue siendo del odontólogo.";

export function endodonticConsistency(assessment: EndodonticAssessment): EndodonticNotice[] {
  const notices: EndodonticNotice[] = [];
  const findings = assessment.findings;
  const advancedPulpalPattern =
    findings.spontaneousPain === true ||
    findings.nocturnalPain === true ||
    (findings.lingeringColdSeconds ?? 0) >= 10;

  if (advancedPulpalPattern) {
    notices.push({
      code: "ADVANCED_PULPAL_PATTERN",
      severity: "INFO",
      message: "Los hallazgos descritos siguen un patrón pulpar avanzado.",
    });
  }

  if (findings.percussion && findings.percussion !== "NEGATIVE") {
    notices.push({
      code: "APICAL_COMPONENT",
      severity: "INFO",
      message: "La percusión no negativa indica un componente apical que debe valorarse.",
    });
  }

  if (assessment.pulpalDiagnosis === "Necrosis pulpar" && findings.coldResponsePresent === true) {
    notices.push({
      code: "NECROSIS_COLD_RESPONSE_CONFLICT",
      severity: "WARNING",
      message: "Necrosis pulpar y respuesta al frío registrada requieren comprobar coherencia.",
    });
  }

  return notices;
}
