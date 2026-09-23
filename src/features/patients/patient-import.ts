import type { CreatePatient } from "@/shared/api";

export interface ParsedPatientRow {
  firstName: string;
  lastName: string;
  dni?: string;
  phone?: string;
  email?: string;
  legacyRecordNumber?: string;
}

export function parsePatientCsv(text: string): readonly ParsedPatientRow[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter(Boolean);
  if (lines.length < 2) return [];

  const sample = lines.slice(0, 4).join("\n");
  const separators = [";", ",", "\t"] as const;
  const delimiter = separators.reduce((best, candidate) => {
    const bestCount = sample.split(best).length;
    const candidateCount = sample.split(candidate).length;
    return candidateCount > bestCount ? candidate : best;
  }, separators[0]);

  const headers = splitCsvLine(lines[0] ?? "", delimiter).map(normalizeHeader);
  return lines.slice(1).flatMap((line) => {
    const values = splitCsvLine(line, delimiter).map((value) => value.trim());
    const read = (...names: string[]) => {
      const index = headers.findIndex((header) => names.includes(header));
      return index >= 0 ? (values[index] ?? "") : "";
    };

    const firstName = read("nombre", "firstname", "first_name");
    const lastName = read("apellidos", "lastname", "last_name");
    if (!firstName && !lastName) return [];

    const dni = read("dni", "nif", "nie");
    const phone = read("telefono", "teléfono", "phone", "movil", "móvil");
    const email = read("email", "correo");
    const legacyRecordNumber = read(
      "ficha",
      "numero de ficha",
      "número de ficha",
      "recordnumber",
      "record_number",
    );

    return [
      {
        firstName: firstName || "Paciente",
        lastName: lastName || "Importado",
        ...(dni ? { dni } : {}),
        ...(phone ? { phone } : {}),
        ...(email ? { email } : {}),
        ...(legacyRecordNumber ? { legacyRecordNumber } : {}),
      },
    ];
  });
}

export function createPatientPayload(row: ParsedPatientRow): CreatePatient {
  return {
    firstName: row.firstName,
    lastName: row.lastName,
    ...(row.dni ? { dni: row.dni } : {}),
    ...(row.phone ? { phone: row.phone } : {}),
    ...(row.email ? { email: row.email } : {}),
    declaredSource: "OTHER",
    declaredSourceDetail: "Importación CSV",
  };
}

function normalizeHeader(value: string): string {
  return value.trim().toLocaleLowerCase("es");
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index] ?? "";
    const next = line[index + 1] ?? "";
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === delimiter && !quoted) {
      values.push(current);
      current = "";
      continue;
    }
    current += char;
  }

  values.push(current);
  return values;
}
