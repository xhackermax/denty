/**
 * Import patients from CSV backup file to Supabase
 * Usage: npx tsx scripts/import-patients-from-csv.ts <csv-file-path>
 */

import { parse } from "csv-parse/sync";
import * as fs from "fs";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error("❌ SUPABASE_URL and SUPABASE_SECRET_KEY must be set");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY);

interface CSVRow {
  IDCONTACTO: string;
  ESTADO: string;
  NUM: string;
  NOMBRE: string;
  APELLIDOS: string;
  SEXO: string;
  "F. NACIMIENTO": string;
  "TELF. MOVIL": string;
  "TELF. FIJO": string;
  EMAIL: string;
  DNI: string;
  [key: string]: string;
}

interface PatientInput {
  recordNumber: string;
  firstName: string;
  lastName: string;
  birthDate: string | null;
  phone: string | null;
  email: string | null;
  dni: string | null;
}

function parseDate(dateStr: string): string | null {
  if (!dateStr || dateStr.trim() === "") return null;
  try {
    const [day, month, year] = dateStr.split("/");
    if (day && month && year) {
      return `${year}-${month}-${day}`;
    }
  } catch {
    return null;
  }
  return null;
}

function normalizePhone(phone: string): string | null {
  if (!phone || phone.trim() === "") return null;
  return phone.trim();
}

function normalizeEmail(email: string): string | null {
  if (!email || email.trim() === "") return null;
  const trimmed = email.trim().toLowerCase();
  if (trimmed.includes("@")) return trimmed;
  return null;
}

async function importPatients(csvPath: string) {
  console.log(`📖 Reading CSV file: ${csvPath}`);

  const content = fs.readFileSync(csvPath, "utf-8");
  const records = parse(content, {
    columns: true,
    delimiter: ";",
    skip_empty_lines: true,
  }) as CSVRow[];

  console.log(`📊 Found ${records.length} records in CSV`);

  let imported = 0;
  let skipped = 0;
  const errors: Array<{ record: number; error: string }> = [];

  for (let i = 0; i < records.length; i++) {
    const row = records[i];

    // Skip if no name or number
    if (!row.NOMBRE?.trim() || !row.NUM?.trim()) {
      skipped++;
      continue;
    }

    // Skip if not active
    if (row.ESTADO !== "Activo") {
      skipped++;
      continue;
    }

    const patient: PatientInput = {
      recordNumber: row.NUM.trim(),
      firstName: row.NOMBRE.trim(),
      lastName: row.APELLIDOS?.trim() || "Unknown",
      birthDate: parseDate(row["F. NACIMIENTO"] || ""),
      phone: normalizePhone(row["TELF. MOVIL"] || row["TELF. FIJO"] || ""),
      email: normalizeEmail(row.EMAIL || ""),
      dni: row.DNI?.trim() || null,
    };

    try {
      const { error } = await supabase.from("patients").insert([
        {
          record_number: patient.recordNumber,
          first_name: patient.firstName,
          last_name: patient.lastName,
          birth_date: patient.birthDate,
          phone: patient.phone,
          email: patient.email,
          dni: patient.dni,
        },
      ]);

      if (error) {
        if (error.code === "23505") {
          // Unique constraint violation (patient already exists)
          skipped++;
        } else {
          errors.push({ record: i + 1, error: error.message });
        }
      } else {
        imported++;
        if (imported % 50 === 0) {
          console.log(`  ✓ Imported ${imported} patients...`);
        }
      }
    } catch (error) {
      errors.push({
        record: i + 1,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  console.log("\n📈 Import Summary:");
  console.log(`  ✅ Imported: ${imported}`);
  console.log(`  ⏭️  Skipped: ${skipped}`);
  console.log(`  ❌ Errors: ${errors.length}`);

  if (errors.length > 0) {
    console.log("\n⚠️  Errors encountered:");
    errors.slice(0, 10).forEach(({ record, error }) => {
      console.log(`  Row ${record}: ${error}`);
    });
    if (errors.length > 10) {
      console.log(`  ... and ${errors.length - 10} more errors`);
    }
  }
}

const csvPath = process.argv[2];
if (!csvPath) {
  console.error("❌ Please provide a CSV file path as argument");
  console.error("   Usage: npx tsx scripts/import-patients-from-csv.ts <path-to-csv>");
  process.exit(1);
}

importPatients(csvPath)
  .then(() => {
    console.log("\n✨ Import complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Import failed:", error);
    process.exit(1);
  });
