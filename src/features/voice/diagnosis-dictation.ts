import { diagnosisInputSchema, type DiagnosisInput } from "@/domain/diagnosis";
export function parseDiagnosisDictation(
  raw: string,
): { input: DiagnosisInput } | { error: string } | null {
  const text = raw
    .split(/\bnota\s*:?/i)[0]!
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (!/\bdiagnostico\b|^\s*periodontitis\b|^\s*bruxismo\b/.test(text)) return null;
  const justification = raw.match(/\bnota\s*:?\s*(.+)$/i)?.[1]?.trim() ?? "";
  let input: unknown;
  if (/\bbruxismo\b/.test(text)) {
    const signs = [];
    if (/desgaste/.test(text)) signs.push("wear");
    if (/maseter/.test(text)) signs.push("masseter_hypertrophy");
    if (/dolor.*(?:articular|atm)/.test(text)) signs.push("tmj_pain");
    if (/fractur/.test(text)) signs.push("fractures");
    if (/linea alba/.test(text)) signs.push("linea_alba");
    if (/lengua.*(?:festone|marcas)/.test(text)) signs.push("tongue_scalloping");
    input = {
      category: "bruxism",
      value: /sin bruxismo|no bruxismo/.test(text) ? "no_bruxism" : "bruxism",
      justification,
      detail: {
        type: /ambos|vigilia.*sueno|sueno.*vigilia/.test(text)
          ? "both"
          : /vigilia/.test(text)
            ? "awake"
            : "sleep",
        certainty: /definitivo/.test(text)
          ? "definite"
          : /posible/.test(text)
            ? "possible"
            : "probable",
        signs,
      },
    };
  } else {
    const value = /periodontitis/.test(text)
      ? "periodontitis"
      : /gingivitis/.test(text)
        ? "gingivitis"
        : /encia sana|sano|sana/.test(text)
          ? "healthy"
          : null;
    if (!value) return { error: "Especifica encía sana, gingivitis o periodontitis." };
    const stages: Record<string, string> = {
      "1": "I",
      uno: "I",
      i: "I",
      "2": "II",
      dos: "II",
      ii: "II",
      "3": "III",
      tres: "III",
      iii: "III",
      "4": "IV",
      cuatro: "IV",
      iv: "IV",
    };
    const stage =
      stages[text.match(/estadio\s+(cuatro|tres|dos|uno|iv|iii|ii|i|[1-4])\b/)?.[1] ?? ""];
    const grade = text.match(/grado\s+([abc])\b/)?.[1]?.toUpperCase();
    const extent = /generalizada/.test(text)
      ? "generalized"
      : /localizada/.test(text)
        ? "localized"
        : /molar.*incisivo/.test(text)
          ? "molar_incisor"
          : undefined;
    input = {
      category: "periodontal",
      value,
      justification,
      detail: {
        ...(stage ? { stage } : {}),
        ...(grade ? { grade } : {}),
        ...(extent ? { extent } : {}),
      },
    };
  }
  const parsed = diagnosisInputSchema.safeParse(input);
  return parsed.success
    ? { input: parsed.data }
    : { error: parsed.error.issues[0]?.message ?? "Diagnóstico incompleto." };
}
