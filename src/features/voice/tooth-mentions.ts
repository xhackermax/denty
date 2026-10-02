import { PERMANENT_FDI, PRIMARY_FDI } from "@/domain/odontogram/dentition";

const FDI_TEETH: ReadonlySet<string> = new Set<string>([...PERMANENT_FDI, ...PRIMARY_FDI]);

export function isFdiTooth(code: string): boolean {
  return FDI_TEETH.has(code);
}

// Words that make a two-digit number a tooth reference rather than an amount or a date.
const DENTAL_CUE =
  /\b(?:diente|pieza|muela|caries|ausente|sano|sana|endodon\w*|corona|implante|extracci\w*|exodon\w*|obtura\w*|empaste|restaura\w*|reconstru\w*|perno|carilla|sellador|bolsa|sondaje|movilidad|mesial|distal|oclusal|incisal|vestibular|lingual|palatin[oa])\b/;

const MONTHS =
  "enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre";

function isNotATooth(text: string, start: number, end: number): boolean {
  const before = text.slice(Math.max(0, start - 24), start);
  const after = text.slice(end, end + 16);
  return (
    /\ba\s+las?\s*$/.test(before) ||
    /\b(?:ficha|expediente|historia|paciente)\s+(?:n[uú]mero\s+)?$/.test(before) ||
    /^\s*:\s*\d/.test(after) ||
    /^\s*(?:a[nñ]os?|€|euros?|%|minutos?|horas?)\b/.test(after) ||
    new RegExp(`^\\s+de\\s+(?:${MONTHS})\\b`).test(after) ||
    /[/.-]\s*$/.test(before) ||
    /^\s*[/.-]\s*\d/.test(after)
  );
}

/** Two-digit numbers used as teeth that do not exist in FDI (e.g. "el 19"). */
export function findInvalidToothMentions(text: string): string[] {
  const folded = text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  if (!DENTAL_CUE.test(folded)) return [];
  const invalid: string[] = [];
  for (const match of folded.matchAll(/(?<![\d.,:/-])\b(\d{2})\b(?![\d.,:/-]\d)/g)) {
    const value = match[1];
    const start = match.index ?? 0;
    if (!value || isFdiTooth(value) || isNotATooth(folded, start, start + value.length)) continue;
    if (!invalid.includes(value)) invalid.push(value);
  }
  return invalid;
}
