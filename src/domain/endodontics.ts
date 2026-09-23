export const PULPAL_DIAGNOSES = [
  "Pulpa normal",
  "Pulpitis reversible",
  "Pulpitis irreversible sintomÃ¡tica",
  "Pulpitis irreversible sintomática",
  "Pulpitis irreversible sintomatica",
  "Pulpitis irreversible asintomÃ¡tica",
  "Pulpitis irreversible asintomática",
  "Pulpitis irreversible asintomatica",
  "Necrosis pulpar",
  "Previamente tratado",
  "Tratamiento previamente iniciado",
] as const;

export const APICAL_DIAGNOSES = [
  "Tejidos apicales normales",
  "Periodontitis apical sintomÃ¡tica",
  "Periodontitis apical sintomática",
  "Periodontitis apical sintomatica",
  "Periodontitis apical asintomÃ¡tica",
  "Periodontitis apical asintomática",
  "Periodontitis apical asintomatica",
  "Absceso apical agudo",
  "Absceso apical crÃ³nico",
  "Absceso apical crónico",
  "Absceso apical cronico",
  "OsteÃ­tis condensante",
  "Osteitis condensante",
] as const;

export type PulpalDiagnosis = (typeof PULPAL_DIAGNOSES)[number];
export type ApicalDiagnosis = (typeof APICAL_DIAGNOSES)[number];
export type DiagnosticConfidence = "HIGH" | "MODERATE" | "LOW";
export type EndodonticComplexity = "LOW" | "MODERATE" | "HIGH";
export type Restorability = "FAVORABLE" | "GUARDED" | "UNFAVORABLE" | "NON_RESTORABLE";
export type PercussionFinding = "NEGATIVE" | "POSITIVE" | "TENDER";
export type EndodonticVisualCode =
  | "normal_apex"
  | "symptomatic_apical_periodontitis"
  | "asymptomatic_apical_periodontitis"
  | "acute_apical_abscess"
  | "chronic_apical_abscess"
  | "condensing_osteitis";

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

export interface EndodonticVisualMark {
  code: EndodonticVisualCode;
  label: string;
  severity: "neutral" | "info" | "warning" | "danger";
  svgPath: string;
}

export type EndodonticNoticeCode =
  "ADVANCED_PULPAL_PATTERN" | "APICAL_COMPONENT" | "NECROSIS_COLD_RESPONSE_CONFLICT";

export interface EndodonticNotice {
  code: EndodonticNoticeCode;
  severity: "INFO" | "WARNING";
  message: string;
}

export const ENDODONTIC_DECISION_NOTICE =
  "Denty organiza hallazgos y comprueba coherencia; " +
  "la decision diagnostica sigue siendo del odontologo.";

export const ENDODONTIC_VISUAL_MARKS: Record<EndodonticVisualCode, EndodonticVisualMark> = {
  normal_apex: {
    code: "normal_apex",
    label: "Apice normal",
    severity: "neutral",
    svgPath: "M28 76 H36",
  },
  symptomatic_apical_periodontitis: {
    code: "symptomatic_apical_periodontitis",
    label: "Periodontitis apical sintomatica",
    severity: "warning",
    svgPath: "M24 75 C30 70 36 70 42 75",
  },
  asymptomatic_apical_periodontitis: {
    code: "asymptomatic_apical_periodontitis",
    label: "Periodontitis apical asintomatica",
    severity: "info",
    svgPath: "M24 75 C30 73 36 73 42 75",
  },
  acute_apical_abscess: {
    code: "acute_apical_abscess",
    label: "Absceso apical agudo",
    severity: "danger",
    svgPath: "M22 74 C26 66 38 66 42 74 C39 82 25 82 22 74",
  },
  chronic_apical_abscess: {
    code: "chronic_apical_abscess",
    label: "Absceso apical cronico",
    severity: "warning",
    svgPath: "M23 75 C25 67 39 67 41 75 C39 83 25 83 23 75 M41 75 C48 72 50 67 53 62",
  },
  condensing_osteitis: {
    code: "condensing_osteitis",
    label: "Osteitis condensante",
    severity: "info",
    svgPath: "M22 75 H42 M25 70 H39 M27 80 H37",
  },
};

type ApicalDiagnosisAlias =
  | "Periodontitis apical sintomática"
  | "Periodontitis apical asintomática"
  | "Absceso apical crónico"
  | "Absceso apical cronico";

export function endodonticVisualCodeForApicalDiagnosis(
  diagnosis: ApicalDiagnosis | ApicalDiagnosisAlias,
): EndodonticVisualCode {
  if (diagnosis === "Tejidos apicales normales") return "normal_apex";
  if (
    diagnosis === "Periodontitis apical sintomatica" ||
    diagnosis === "Periodontitis apical sintomÃ¡tica" ||
    diagnosis === "Periodontitis apical sintomática"
  ) {
    return "symptomatic_apical_periodontitis";
  }
  if (
    diagnosis === "Periodontitis apical asintomatica" ||
    diagnosis === "Periodontitis apical asintomÃ¡tica" ||
    diagnosis === "Periodontitis apical asintomática"
  ) {
    return "asymptomatic_apical_periodontitis";
  }
  if (diagnosis === "Absceso apical agudo") return "acute_apical_abscess";
  if (
    diagnosis === "Absceso apical cronico" ||
    diagnosis === "Absceso apical crÃ³nico" ||
    diagnosis === "Absceso apical crónico"
  ) {
    return "chronic_apical_abscess";
  }
  return "condensing_osteitis";
}

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
      message: "Los hallazgos descritos siguen un patron pulpar avanzado.",
    });
  }

  if (findings.percussion && findings.percussion !== "NEGATIVE") {
    notices.push({
      code: "APICAL_COMPONENT",
      severity: "INFO",
      message: "La percusion no negativa indica un componente apical que debe valorarse.",
    });
  }

  if (assessment.pulpalDiagnosis === "Necrosis pulpar" && findings.coldResponsePresent === true) {
    notices.push({
      code: "NECROSIS_COLD_RESPONSE_CONFLICT",
      severity: "WARNING",
      message: "Necrosis pulpar y respuesta al frio registrada requieren comprobar coherencia.",
    });
  }

  return notices;
}
