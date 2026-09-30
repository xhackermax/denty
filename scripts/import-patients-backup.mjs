import fs from "node:fs";
import path from "node:path";

const DEFAULT_BACKUP_PATH =
  "C:/Users/isaac pc masterrace/Downloads/BACKUP_CONTACTOS_2026-09-29.csv";
const env = { ...loadEnv(path.resolve(".env.production.local")), ...process.env };
const supabaseUrl = requireEnv("SUPABASE_URL");
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY;
const dryRun = !process.argv.includes("--apply");
const backupPath = process.argv.find((arg) => arg.endsWith(".csv")) ?? DEFAULT_BACKUP_PATH;

if (!supabaseKey) {
  throw new Error(
    "Falta SUPABASE_SERVICE_ROLE_KEY o SUPABASE_SECRET_KEY en .env.production.local.",
  );
}

const headers = {
  apikey: supabaseKey,
  authorization: `Bearer ${supabaseKey}`,
  accept: "application/json",
  "content-type": "application/json",
};

const clinic = await first("clinics", { select: "id,name", limit: 1 });
if (!clinic) throw new Error("No hay ninguna clinica en Supabase.");

const rows = parseCsv(fs.readFileSync(backupPath, "utf8"));
const contacts = rows.map(normalizeContact).filter(Boolean);
const existing = await selectAll("patients", {
  select: "id,legacy_id,record_number,dni",
  clinic_id: `eq.${clinic.id}`,
});

const seenLegacy = new Set(existing.map((row) => String(row.legacy_id ?? "")).filter(Boolean));
const seenRecord = new Set(existing.map((row) => normalizeKey(row.record_number)).filter(Boolean));
const seenDni = new Set(existing.map((row) => normalizeKey(row.dni)).filter(Boolean));
const seenImportKeys = new Set();
const pending = [];
const skipped = [];

for (const contact of contacts) {
  const importKey = `${contact.legacy_id || ""}:${normalizeKey(contact.record_number)}:${normalizeKey(contact.dni)}`;
  const duplicate =
    (contact.legacy_id && seenLegacy.has(String(contact.legacy_id))) ||
    (contact.record_number && seenRecord.has(normalizeKey(contact.record_number))) ||
    (contact.dni && seenDni.has(normalizeKey(contact.dni))) ||
    seenImportKeys.has(importKey);

  if (duplicate) {
    skipped.push(contact);
    continue;
  }

  seenImportKeys.add(importKey);
  if (contact.legacy_id) seenLegacy.add(String(contact.legacy_id));
  if (contact.record_number) seenRecord.add(normalizeKey(contact.record_number));
  if (contact.dni) seenDni.add(normalizeKey(contact.dni));
  pending.push({
    clinic_id: clinic.id,
    legacy_id: contact.legacy_id,
    record_number: contact.record_number,
    first_name: contact.first_name,
    last_name: contact.last_name,
    dni: contact.dni,
    phone: contact.phone,
    email: contact.email,
    birth_date: contact.birth_date,
    declared_source: contact.declared_source,
    declared_source_detail: contact.declared_source_detail,
    medical_profile: contact.medical_profile,
    archived_at: contact.archived_at,
  });
}

let inserted = 0;
if (!dryRun) {
  for (const chunk of chunks(pending, 250)) {
    const response = await fetch(new URL("/rest/v1/patients", supabaseUrl), {
      method: "POST",
      headers: { ...headers, prefer: "return=minimal" },
      body: JSON.stringify(chunk),
    });
    if (!response.ok) {
      throw new Error(`Supabase rechazo un lote: ${response.status} ${await response.text()}`);
    }
    inserted += chunk.length;
  }
}

const report = {
  mode: dryRun ? "dry-run" : "applied",
  backupPath,
  clinic,
  csvRows: rows.length,
  validContacts: contacts.length,
  existingPatients: existing.length,
  pendingPatients: pending.length,
  skippedDuplicates: skipped.length,
  insertedPatients: inserted,
  generatedAt: new Date().toISOString(),
};

const reportPath = path.resolve(".artifacts", `patients-import-${Date.now()}.json`);
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ...report, reportPath }, null, 2));

function requireEnv(name) {
  const value = env[name];
  if (!value) throw new Error(`Falta ${name} en .env.production.local.`);
  return value;
}

function loadEnv(file) {
  const result = {};
  if (!fs.existsSync(file)) return result;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    result[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
  return result;
}

async function first(table, query) {
  return (await selectAll(table, query))[0] ?? null;
}

async function selectAll(table, query) {
  const pageSize = 1000;
  const rows = [];
  for (let offset = 0; ; offset += pageSize) {
    const url = new URL(`/rest/v1/${table}`, supabaseUrl);
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, String(value));
    const response = await fetch(url, {
      headers: {
        ...headers,
        Range: `${offset}-${offset + pageSize - 1}`,
        Prefer: "count=exact",
      },
      cache: "no-store",
    });
    if (!response.ok)
      throw new Error(`Supabase error ${response.status}: ${await response.text()}`);
    const page = await response.json();
    rows.push(...page);
    if (page.length < pageSize || query.limit) break;
  }
  return rows;
}

function parseCsv(text) {
  const records = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ";") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      records.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field || row.length) {
    row.push(field);
    records.push(row);
  }

  const [header, ...body] = records.filter((record) => record.some((cell) => cell.trim()));
  const keys = header.map(cleanHeader);
  return body.map((record) =>
    Object.fromEntries(keys.map((key, index) => [key, cleanText(record[index] ?? "")])),
  );
}

function normalizeContact(row) {
  const firstName = cleanPersonName(row.nombre);
  const lastName = cleanPersonName(row.apellidos);
  if (!firstName && !lastName) return null;

  const mobile = digits(row.telf_movil);
  const phone = mobile || digits(row.telf_fijo) || digits(row.telf_adicional) || null;
  const email = normalizeEmail(row.email);
  const birthDate = parseDate(row.f_nacimiento);
  const createdAt = parseDateTime(row.alta);
  const legacyId = Number.parseInt(row.idcontacto, 10);
  const recordNumber = cleanText(row.num);
  const dni = cleanText(row.dni).toUpperCase() || null;
  const notes = cleanText(row.notas);
  const pathology = cleanText(row.patologia);

  return {
    legacy_id: Number.isFinite(legacyId) ? legacyId : null,
    record_number: recordNumber || (Number.isFinite(legacyId) ? `GESDEN-${legacyId}` : null),
    first_name: firstName || "Paciente",
    last_name: lastName || "Sin apellidos",
    dni,
    phone,
    email,
    birth_date: birthDate,
    declared_source: mapSource(row.nos_conoce_por || row.nos_contacta_por),
    declared_source_detail:
      cleanText(row.mas_informacion || row.motivo || row.nos_conoce_por) || null,
    archived_at:
      row.estado && row.estado.toLowerCase() !== "activo" ? new Date().toISOString() : null,
    medical_profile: {
      importedFrom: "GESDEN_CONTACTOS",
      importedAt: new Date().toISOString(),
      sex: cleanText(row.sexo) || null,
      pathology: pathology || null,
      profession: cleanText(row.profesion) || null,
      hobbies: cleanText(row.aficiones) || null,
      address: {
        street: cleanText(row.domicilio) || null,
        postalCode: cleanText(row.cp) || null,
        city: cleanText(row.poblacion) || null,
        province: cleanText(row.provincia) || null,
        country: cleanText(row.pais || row.pais_origen) || null,
      },
      family: {
        fatherName: cleanText(row.nombre_padre) || null,
        fatherDni: cleanText(row.dni_padre) || null,
        fatherPhone: digits(row.telf_padre) || null,
        motherName: cleanText(row.nombre_madre) || null,
        motherDni: cleanText(row.dni_madre) || null,
        motherPhone: digits(row.telf_madre) || null,
        siblingsOrChildren: cleanText(row.hermanos_o_hijos) || null,
      },
      gdpr: yesNo(row.rgpd),
      advertisingConsent: yesNo(row.publicidad),
      whatsappConsent: yesNo(row.whatsapp),
      delinquent: yesNo(row.moroso),
      lateArrivalRisk: yesNo(row.impuntual),
      insurance: cleanText(row.mutua) || null,
      bankAccountPresent: Boolean(cleanText(row.num_cuenta)),
      legacyNotes: notes || null,
      legacyCreatedAt: createdAt,
    },
  };
}

function cleanHeader(value) {
  return cleanText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¿?]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function cleanText(value) {
  return repairEncoding(String(value ?? ""))
    .replace(/\s+/g, " ")
    .trim();
}

function repairEncoding(value) {
  if (!/[ÃÂ]/.test(value)) return value;
  return Buffer.from(value, "latin1").toString("utf8");
}

function cleanPersonName(value) {
  return cleanText(value).replace(/\s+/g, " ").trim();
}

function normalizeEmail(value) {
  const email = cleanText(value).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function normalizeKey(value) {
  return cleanText(value).toUpperCase();
}

function digits(value) {
  return cleanText(value).replace(/[^\d+]/g, "") || null;
}

function yesNo(value) {
  const normalized = cleanText(value).toUpperCase();
  if (normalized === "SI" || normalized === "SÍ" || normalized === "YES") return true;
  if (normalized === "NO") return false;
  return null;
}

function parseDate(value) {
  const text = cleanText(value);
  if (!text) return null;
  const match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (!match) return null;
  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function parseDateTime(value) {
  const date = parseDate(value);
  return date ? `${date}T00:00:00.000Z` : null;
}

function mapSource(value) {
  const source = cleanText(value);
  if (!source) return null;
  const normalized = source.toLowerCase();
  if (normalized.includes("google") || normalized.includes("web")) return "web";
  if (
    normalized.includes("instagram") ||
    normalized.includes("facebook") ||
    normalized.includes("red")
  )
    return "social";
  if (normalized.includes("recomend")) return "referral";
  return "other";
}

function chunks(items, size) {
  const result = [];
  for (let index = 0; index < items.length; index += size)
    result.push(items.slice(index, index + size));
  return result;
}
