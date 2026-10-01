import type { PerioCommand } from "@/domain/periodontal/entry-cursor";
const numbers: Record<string, number> = {
  cero: 0,
  uno: 1,
  una: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
  once: 11,
  doce: 12,
  trece: 13,
  catorce: 14,
  quince: 15,
  dieciseis: 16,
  veinte: 20,
};
const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[.,;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
function values(text: string): number[] | null {
  const tokens = text.split(" ");
  const result: number[] = [];
  let negative = false;
  for (const token of tokens) {
    if (token === "menos") {
      if (negative) return null;
      negative = true;
      continue;
    }
    const value = /^-?\d+$/.test(token) ? Number(token) : numbers[token];
    if (value === undefined) return null;
    result.push(negative ? -value : value);
    negative = false;
  }
  return negative ? null : result;
}
export function parsePerioDictation(raw: string): { command: PerioCommand } | { error: string } {
  const text = normalize(raw);
  const fail = { error: "No se entendió un comando periodontal válido. Repite." };
  const fixed: Record<string, PerioCommand> = {
    ausente: { type: "missing" },
    implante: { type: "implant" },
    atras: { type: "back" },
    corrige: { type: "undo" },
    deshacer: { type: "undo" },
    "cara palatina": { type: "face", face: "palatal" },
    "cara lingual": { type: "face", face: "lingual" },
    "cara vestibular": { type: "face", face: "vestibular" },
  };
  if (fixed[text]) return { command: fixed[text] };
  const flag = text.match(
    /^(sangra|sangrado|placa|supura|supuracion)(?:\s+(mesial|distal|central|medio))?$/,
  );
  if (flag) {
    const type = flag[1]!.startsWith("sang")
      ? "bleeding"
      : flag[1] === "placa"
        ? "plaque"
        : "suppuration";
    return {
      command: {
        type,
        ...(flag[2]
          ? {
              sites: [flag[2] === "mesial" ? "mesial" : flag[2] === "distal" ? "distal" : "middle"],
            }
          : {}),
      },
    };
  }
  const scalar = text.match(/^(movilidad|furca|furcacion)\s+(.+)$/);
  if (scalar) {
    const parsed = values(scalar[2]!);
    return parsed?.length === 1 && parsed[0]! >= 0 && parsed[0]! <= 3
      ? {
          command: {
            type: scalar[1] === "movilidad" ? "mobility" : "furcation",
            value: parsed[0]!,
          },
        }
      : fail;
  }
  const go = text.match(/^(?:ir|ve)\s+(?:al|a|a la)\s+(?:diente\s+|pieza\s+)?(.+)$/);
  if (go) {
    const target = go[1]!
      .replace(/\b(?:y|i)\b/g, "")
      .replace(/\s+/g, " ")
      .trim();
    const tens: Record<string, number> = {
      diez: 10,
      veinte: 20,
      treinta: 30,
      cuarenta: 40,
      cincuenta: 50,
      sesenta: 60,
      setenta: 70,
      ochenta: 80,
    };
    const tokens = target.split(" ");
    const tooth = /^\d{2}$/.test(target)
      ? target
      : String(
          (tens[tokens[0]!] ?? NaN) + (tokens.length === 2 ? (numbers[tokens[1]!] ?? NaN) : 0),
        );
    if (/^([1-4][1-8]|[5-8][1-5])$/.test(tooth)) return { command: { type: "goTo", tooth } };
    return fail;
  }
  const margin = text.startsWith("margen ");
  const parsed = values(margin ? text.slice(7) : text.replace(/^sondaje\s+/, ""));
  if (
    !parsed ||
    parsed.length !== 3 ||
    parsed.some((v) => !Number.isInteger(v) || v < (margin ? -15 : 0) || v > (margin ? 5 : 15))
  )
    return fail;
  return {
    command: { type: margin ? "margin" : "triplet", values: parsed as [number, number, number] },
  };
}
