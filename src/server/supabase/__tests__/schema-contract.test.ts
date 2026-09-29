import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, test } from "vitest";

function readMigrationSql(): string {
  const migrationsDir = resolve(process.cwd(), "supabase", "migrations");
  if (!existsSync(migrationsDir)) return "";

  return readdirSync(migrationsDir)
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort()
    .map((fileName) => readFileSync(join(migrationsDir, fileName), "utf8"))
    .join("\n");
}

function createdTables(sql: string): string[] {
  return Array.from(
    sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-z_]+)/gi),
  ).flatMap((match) => (match[1] ? [match[1]] : []));
}

function tableBody(sql: string, tableName: string): string {
  const match = new RegExp(
    `create\\s+table\\s+(?:if\\s+not\\s+exists\\s+)?(?:public\\.)?${tableName}\\s*\\(([\\s\\S]*?)\\);`,
    "i",
  ).exec(sql);

  return match?.[1] ?? "";
}

describe("Supabase schema contract", () => {
  test("creates one shared clinical state without a surgery-only database", () => {
    const sql = readMigrationSql();
    const tables = createdTables(sql);

    expect(tables).toEqual(
      expect.arrayContaining(["patients", "dental_entities", "clinical_history_events"]),
    );
    expect(tables).not.toEqual(expect.arrayContaining(["surgery_odontograms", "surgery_patients"]));
  });

  test("persists periodontal measurements and historical odontogram snapshots", () => {
    const sql = readMigrationSql();
    const tables = createdTables(sql);

    expect(tables).toEqual(
      expect.arrayContaining(["periodontal_measurements", "odontogram_snapshots"]),
    );
    expect(tableBody(sql, "periodontal_measurements")).toMatch(/probing_depth\s+integer/i);
    expect(tableBody(sql, "odontogram_snapshots")).toMatch(/payload_json\s+jsonb\s+not\s+null/i);
  });

  test("stores implant planning BOM and immutable signed budget snapshots", () => {
    const sql = readMigrationSql();
    const tables = createdTables(sql);

    expect(tables).toEqual(
      expect.arrayContaining([
        "clinical_plans",
        "clinical_plan_items",
        "clinical_plan_dependencies",
        "budgets",
        "budget_items",
        "budget_signed_snapshots",
      ]),
    );
    expect(tableBody(sql, "clinical_plan_items")).toMatch(/component_type\s+text/i);
    expect(tableBody(sql, "budget_items")).toMatch(/billing_mode\s+text\s+not\s+null/i);
    expect(tableBody(sql, "budget_signed_snapshots")).toMatch(
      /snapshot_json\s+jsonb\s+not\s+null/i,
    );
    expect(sql).toMatch(/create\s+trigger\s+budget_signed_snapshots_immutable/i);
  });

  test("supports consent and appointment gates", () => {
    const sql = readMigrationSql();
    const tables = createdTables(sql);

    expect(tables).toEqual(
      expect.arrayContaining([
        "staff_members",
        "sites",
        "cabinets",
        "document_templates",
        "documents",
        "consent_requirements",
        "appointments",
      ]),
    );
    expect(tableBody(sql, "documents")).toMatch(/signed_at\s+timestamptz/i);
    expect(tableBody(sql, "consent_requirements")).toMatch(
      /clinical_plan_item_id\s+uuid\s+references\s+public\.clinical_plan_items/i,
    );
    expect(tableBody(sql, "appointments")).toMatch(
      /budget_signed_snapshot_id\s+uuid\s+references\s+public\.budget_signed_snapshots/i,
    );
  });

  test("cuts identity over to Supabase Auth memberships and app sessions", () => {
    const sql = readMigrationSql();
    const tables = createdTables(sql);

    expect(tables).toEqual(
      expect.arrayContaining(["profiles", "clinic_members", "patient_accounts", "app_sessions"]),
    );
    expect(sql).toMatch(/drop\s+table\s+if\s+exists\s+public\.denty_users/i);
    expect(sql).toMatch(
      /clinic_members_role_check[\s\S]*RECEPTION[\s\S]*DENTIST[\s\S]*ASSISTANT[\s\S]*PATIENT/i,
    );
    expect(sql).toMatch(/create\s+unique\s+index[\s\S]*staff_members[\s\S]*profile_id/i);
    expect(tableBody(sql, "app_sessions")).toMatch(
      /profile_id\s+uuid\s+not\s+null\s+references\s+public\.profiles/i,
    );
  });

  test("enables row level security for clinical and financial tables", () => {
    const sql = readMigrationSql();
    const protectedTables = [
      "patients",
      "dental_entities",
      "clinical_history_events",
      "periodontal_measurements",
      "odontogram_snapshots",
      "clinical_plans",
      "clinical_plan_items",
      "budgets",
      "budget_items",
      "budget_signed_snapshots",
      "documents",
      "consent_requirements",
      "appointments",
    ];

    for (const tableName of protectedTables) {
      expect(sql).toMatch(
        new RegExp(
          `alter\\s+table\\s+public\\.${tableName}\\s+enable\\s+row\\s+level\\s+security`,
          "i",
        ),
      );
    }
  });
});
