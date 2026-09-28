import type { CreatePatient } from "@/shared/api";

export interface ParsedPatientRow {
  firstName: string;
  lastName: string;
  dni?: string;
  phone?: string;
  email?: string;
  birthDate?: string;
  legacyRecordNumber?: string;
}

export interface PatientImportIssue {
  row: number;
  field: string;
  message: string;
}

const HEADER_ALIASES = {
  firstName: ["nombre", "firstname", "first_name", "first name"],
  lastName: ["apellidos", "apellido", "lastname", "last_name", "last name"],
  dni: ["dni", "nif", "nie", "documento"],
  phone: ["telefono", "teléfono", "phone", "movil", "móvil"],
  email: ["email", "correo", "e-mail"],
  birthDate: ["fecha nacimiento", "fecha de nacimiento", "birthdate", "birth_date", "nacimiento"],
  recordNumber: ["ficha", "numero de ficha", "número de ficha", "recordnumber", "record_number", "record number"],
} as const;

export function parsePatientCsv(text: string): readonly ParsedPatientRow[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const sample = lines.slice(0, 4).join("\n");
  const separators = [";", ",", "\t"] as const;
  const delimiter = separators.reduce((best, candidate) => {
    const bestCount = sample.split(best).length;
    const candidateCount = sample.split(candidate).length;
    return candidateCount > bestCount ? candidate : best;
  }, separators[0]);

  return rowsFromMatrix(lines.map((line) => splitCsvLine(line, delimiter)));
}

export function parsePatientJson(text: string): readonly ParsedPatientRow[] {
  const parsed: unknown = JSON.parse(text.replace(/^\uFEFF/, ""));
  const source = Array.isArray(parsed)
    ? parsed
    : isRecord(parsed) && Array.isArray(parsed.patients)
      ? parsed.patients
      : isRecord(parsed) && Array.isArray(parsed.items)
        ? parsed.items
        : [];

  return source.flatMap((value) => {
    if (!isRecord(value)) return [];
    const normalized = new Map(
      Object.entries(value).map(([key, item]) => [normalizeHeader(key), scalarToString(item)]),
    );
    return rowFromReader((...names) => readNormalized(normalized, names));
  });
}

export async function parsePatientXlsx(input: ArrayBuffer): Promise<readonly ParsedPatientRow[]> {
  const entries = await readZipEntries(input);
  const workbook = entries.get("xl/workbook.xml");
  const relationships = entries.get("xl/_rels/workbook.xml.rels");
  let sheetPath = "xl/worksheets/sheet1.xml";

  if (workbook && relationships) {
    const relationId = /<sheet\b[^>]*\br:id="([^"]+)"/i.exec(workbook)?.[1];
    if (relationId) {
      const relPattern = new RegExp(`<Relationship\\b[^>]*\\bId="${escapeRegExp(relationId)}"[^>]*\\bTarget="([^"]+)"`, "i");
      const target = relPattern.exec(relationships)?.[1];
      if (target) sheetPath = normalizeWorkbookTarget(target);
    }
  }

  const sheet = entries.get(sheetPath) ?? entries.get("xl/worksheets/sheet1.xml");
  if (!sheet) throw new Error("El XLSX no contiene una hoja de cálculo legible.");

  const sharedStrings = parseSharedStrings(entries.get("xl/sharedStrings.xml") ?? "");
  const dateStyleIndexes = parseDateStyleIndexes(entries.get("xl/styles.xml") ?? "");
  const date1904 = /<workbookPr\b[^>]*\bdate1904="(?:1|true)"/i.test(workbook ?? "");
  const matrix = parseWorksheetMatrix(sheet, sharedStrings, dateStyleIndexes, date1904);
  return rowsFromMatrix(matrix);
}

export async function parsePatientImportFile(file: File): Promise<readonly ParsedPatientRow[]> {
  const name = file.name.toLocaleLowerCase("es");
  if (name.endsWith(".json") || file.type === "application/json") {
    return parsePatientJson(await file.text());
  }
  if (name.endsWith(".xlsx") || file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
    return parsePatientXlsx(await file.arrayBuffer());
  }
  if (name.endsWith(".csv") || name.endsWith(".txt") || name.endsWith(".tsv") || file.type.includes("csv") || file.type.startsWith("text/")) {
    return parsePatientCsv(await file.text());
  }
  throw new Error("Formato no compatible. Usa CSV, JSON o XLSX.");
}

export function validatePatientImportRows(rows: readonly ParsedPatientRow[]): readonly PatientImportIssue[] {
  const issues: PatientImportIssue[] = [];
  const seenRecords = new Map<string, number>();

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    if (!row.firstName.trim()) issues.push({ row: rowNumber, field: "firstName", message: "Falta el nombre." });
    if (!row.lastName.trim()) issues.push({ row: rowNumber, field: "lastName", message: "Faltan los apellidos." });
    if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
      issues.push({ row: rowNumber, field: "email", message: "Correo no válido." });
    }
    if (row.birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(row.birthDate)) {
      issues.push({ row: rowNumber, field: "birthDate", message: "La fecha debe usar YYYY-MM-DD." });
    }
    const record = row.legacyRecordNumber?.trim();
    if (record) {
      const key = record.toLocaleLowerCase("es");
      const firstSeen = seenRecords.get(key);
      if (firstSeen !== undefined) {
        issues.push({ row: rowNumber, field: "recordNumber", message: `Ficha duplicada en el archivo (también fila ${firstSeen}).` });
      } else {
        seenRecords.set(key, rowNumber);
      }
    }
  });

  return issues;
}

export function createPatientPayload(row: ParsedPatientRow): CreatePatient {
  return {
    firstName: row.firstName.trim(),
    lastName: row.lastName.trim(),
    ...(row.legacyRecordNumber?.trim() ? { recordNumber: row.legacyRecordNumber.trim() } : {}),
    ...(row.dni?.trim() ? { dni: row.dni.trim() } : {}),
    ...(row.phone?.trim() ? { phone: row.phone.trim() } : {}),
    ...(row.email?.trim() ? { email: row.email.trim() } : {}),
    ...(row.birthDate?.trim() ? { birthDate: row.birthDate.trim() } : {}),
    declaredSource: "OTHER",
    declaredSourceDetail: "Importación de pacientes",
  };
}

function rowsFromMatrix(matrix: readonly (readonly string[])[]): readonly ParsedPatientRow[] {
  if (matrix.length < 2) return [];
  const headers = (matrix[0] ?? []).map(normalizeHeader);
  return matrix.slice(1).flatMap((values) => {
    const read = (...names: string[]) => {
      const normalizedNames = names.map(normalizeHeader);
      const index = headers.findIndex((header) => normalizedNames.includes(header));
      return index >= 0 ? (values[index] ?? "").trim() : "";
    };
    return rowFromReader(read);
  });
}

function rowFromReader(read: (...names: string[]) => string): readonly ParsedPatientRow[] {
  const firstName = read(...HEADER_ALIASES.firstName);
  const lastName = read(...HEADER_ALIASES.lastName);
  if (!firstName && !lastName) return [];

  const dni = read(...HEADER_ALIASES.dni);
  const phone = read(...HEADER_ALIASES.phone);
  const email = read(...HEADER_ALIASES.email);
  const birthDate = normalizeImportedDate(read(...HEADER_ALIASES.birthDate));
  const legacyRecordNumber = read(...HEADER_ALIASES.recordNumber);

  return [{
    firstName,
    lastName,
    ...(dni ? { dni } : {}),
    ...(phone ? { phone } : {}),
    ...(email ? { email } : {}),
    ...(birthDate ? { birthDate } : {}),
    ...(legacyRecordNumber ? { legacyRecordNumber } : {}),
  }];
}

function normalizeImportedDate(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const es = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/.exec(trimmed);
  if (es) {
    const [, day = "", month = "", year = ""] = es;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return trimmed;
}

function normalizeHeader(value: string): string {
  return value.trim().toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function readNormalized(map: ReadonlyMap<string, string>, names: readonly string[]): string {
  for (const name of names) {
    const value = map.get(normalizeHeader(name));
    if (value) return value;
  }
  return "";
}

function scalarToString(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  return "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

async function readZipEntries(input: ArrayBuffer): Promise<Map<string, string>> {
  const bytes = new Uint8Array(input);
  const view = new DataView(input);
  const eocd = findSignature(bytes, 0x06054b50, Math.max(0, bytes.length - 65_557));
  if (eocd < 0) throw new Error("XLSX inválido: no se encontró el directorio ZIP.");
  const entryCount = view.getUint16(eocd + 10, true);
  let cursor = view.getUint32(eocd + 16, true);
  const decoder = new TextDecoder("utf-8");
  const result = new Map<string, string>();

  for (let index = 0; index < entryCount; index += 1) {
    if (view.getUint32(cursor, true) !== 0x02014b50) break;
    const method = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const name = decoder.decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength));

    if (name.startsWith("xl/") && (name.endsWith(".xml") || name.endsWith(".rels"))) {
      const localNameLength = view.getUint16(localOffset + 26, true);
      const localExtraLength = view.getUint16(localOffset + 28, true);
      const dataStart = localOffset + 30 + localNameLength + localExtraLength;
      const compressed = bytes.slice(dataStart, dataStart + compressedSize);
      const raw = await inflateZipEntry(compressed, method);
      result.set(name, decoder.decode(raw));
    }
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return result;
}

async function inflateZipEntry(bytes: Uint8Array, method: number): Promise<Uint8Array> {
  if (method === 0) return bytes;
  if (method !== 8) throw new Error(`XLSX usa un método ZIP no compatible (${method}).`);
  const body = new Uint8Array(bytes).buffer;
  const stream = new Blob([body]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function findSignature(bytes: Uint8Array, signature: number, start: number): number {
  for (let index = bytes.length - 4; index >= start; index -= 1) {
    if (
      bytes[index] === (signature & 0xff) &&
      bytes[index + 1] === ((signature >>> 8) & 0xff) &&
      bytes[index + 2] === ((signature >>> 16) & 0xff) &&
      bytes[index + 3] === ((signature >>> 24) & 0xff)
    ) return index;
  }
  return -1;
}

function parseSharedStrings(xml: string): string[] {
  return [...xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/gi)].map((match) =>
    [...String(match[1] ?? "").matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/gi)]
      .map((part) => decodeXml(part[1] ?? ""))
      .join(""),
  );
}

function parseWorksheetMatrix(
  xml: string,
  sharedStrings: readonly string[],
  dateStyleIndexes: ReadonlySet<number>,
  date1904: boolean,
): string[][] {
  const rows: string[][] = [];
  for (const rowMatch of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/gi)) {
    const values: string[] = [];
    for (const cellMatch of String(rowMatch[1] ?? "").matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/gi)) {
      const attrs = cellMatch[1] ?? "";
      const body = cellMatch[2] ?? "";
      const ref = /\br="([A-Z]+)\d+"/i.exec(attrs)?.[1] ?? "A";
      const column = columnIndex(ref);
      const type = /\bt="([^"]+)"/i.exec(attrs)?.[1] ?? "n";
      const styleIndex = Number(/\bs="(\d+)"/i.exec(attrs)?.[1] ?? "-1");
      const inline = /<t\b[^>]*>([\s\S]*?)<\/t>/i.exec(body)?.[1];
      const raw = /<v\b[^>]*>([\s\S]*?)<\/v>/i.exec(body)?.[1] ?? "";
      let value = decodeXml(inline ?? raw);
      if (type === "s") value = sharedStrings[Number(raw)] ?? "";
      else if (type === "n" && dateStyleIndexes.has(styleIndex) && raw) {
        value = excelSerialToIsoDate(Number(raw), date1904);
      }
      values[column] = value;
    }
    rows.push(values.map((value) => value ?? ""));
  }
  return rows;
}

function parseDateStyleIndexes(xml: string): Set<number> {
  const customDateFormatIds = new Set<number>();
  for (const match of xml.matchAll(/<numFmt\b[^>]*\bnumFmtId="(\d+)"[^>]*\bformatCode="([^"]+)"/gi)) {
    const id = Number(match[1]);
    const format = decodeXml(match[2] ?? "").replace(/"[^"]*"/g, "").toLowerCase();
    if (/[dmy]/.test(format)) customDateFormatIds.add(id);
  }
  const builtInDateFormats = new Set([14,15,16,17,18,19,20,21,22,27,28,29,30,31,32,33,34,35,36,45,46,47,50,51,52,53,54,55,56,57,58]);
  const dateStyles = new Set<number>();
  const cellXfs = /<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/i.exec(xml)?.[1] ?? "";
  let index = 0;
  for (const match of cellXfs.matchAll(/<xf\b([^>]*)\/?>(?:<\/xf>)?/gi)) {
    const numFmtId = Number(/\bnumFmtId="(\d+)"/i.exec(match[1] ?? "")?.[1] ?? "0");
    if (builtInDateFormats.has(numFmtId) || customDateFormatIds.has(numFmtId)) dateStyles.add(index);
    index += 1;
  }
  return dateStyles;
}

function excelSerialToIsoDate(serial: number, date1904: boolean): string {
  if (!Number.isFinite(serial)) return "";
  const wholeDays = Math.floor(serial);
  const epoch = date1904 ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, 30);
  const date = new Date(epoch + wholeDays * 86_400_000);
  return date.toISOString().slice(0, 10);
}

function columnIndex(label: string): number {
  return label.toUpperCase().split("").reduce((value, char) => value * 26 + char.charCodeAt(0) - 64, 0) - 1;
}

function normalizeWorkbookTarget(target: string): string {
  const clean = target.replace(/^\//, "");
  if (clean.startsWith("xl/")) return clean;
  if (clean.startsWith("../")) return clean.replace(/^\.\.\//, "");
  return `xl/${clean.replace(/^\.\//, "")}`;
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
