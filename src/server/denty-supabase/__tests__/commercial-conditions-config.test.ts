import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../../../..");

describe("commercial conditions configuration", () => {
  it("defines social tariffs and an insurance plan with explicit non-stacking", async () => {
    const raw = await readFile(resolve(root, "config/commercial-conditions.example.json"), "utf8");
    const config = JSON.parse(raw) as {
      socialTariffs: Array<{ code: string; stackingPolicy: string }>;
      insurancePlans: Array<{ code: string; requiresAuthorization: boolean }>;
    };

    expect(config.socialTariffs.map((tariff) => tariff.code)).toEqual([
      "SOCIAL_MONOPARENTAL",
      "SOCIAL_FAMILIA_NUMEROSA",
    ]);
    expect(config.socialTariffs.every((tariff) => tariff.stackingPolicy === "BEST_PRICE")).toBe(
      true,
    );
    expect(config.insurancePlans).toContainEqual(
      expect.objectContaining({ code: "SEGURO_DENTAL_GENERAL", requiresAuthorization: true }),
    );
  });

  it("keeps social pricing, insurance coverage and patient eligibility separate in Supabase", async () => {
    const sql = await readFile(
      resolve(root, "supabase/migrations/20261027110000_commercial_conditions.sql"),
      "utf8",
    );

    expect(sql).toContain("create table if not exists public.commercial_tariffs");
    expect(sql).toContain("create table if not exists public.insurance_plans");
    expect(sql).toContain("create table if not exists public.patient_commercial_benefits");
    expect(sql).toContain("patient_commercial_benefits_kind_source_check");
    expect(sql).toContain("commercial_tariffs_admin_write");
  });

  it("enforces clinic ownership and a single benefit source when the migration runs", async () => {
    const db = new PGlite();
    try {
      await db.exec(`
        create schema auth;
        create schema private;
        create table auth.users (id uuid primary key);
        create table public.clinics (id uuid primary key);
        create table public.patients (id uuid primary key, clinic_id uuid not null references public.clinics(id));
        create function gen_random_uuid() returns uuid language sql as $$ select '00000000-0000-0000-0000-000000000099'::uuid $$;
        create function private.is_clinic_staff(uuid) returns boolean language sql as $$ select true $$;
        create function private.is_clinic_admin(uuid) returns boolean language sql as $$ select true $$;
        create function private.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at := now(); return new; end $$;
        create function private.audit_sensitive_mutation() returns trigger language plpgsql as $$ begin return null; end $$;
        create role authenticated;
        create role anon;
      `);
      await db.exec(
        await readFile(
          resolve(root, "supabase/migrations/20261027110000_commercial_conditions.sql"),
          "utf8",
        ),
      );
      await db.exec(`
        insert into public.clinics values
          ('00000000-0000-0000-0000-0000000000c1'),
          ('00000000-0000-0000-0000-0000000000c2');
        insert into public.patients values
          ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1');
        insert into public.commercial_tariffs(clinic_id, code, name, eligibility_label)
          values ('00000000-0000-0000-0000-0000000000c1', 'SOCIAL_MONOPARENTAL', 'Tarifa monoparental', 'Acreditación vigente');
        insert into public.insurance_plans(clinic_id, code, carrier_name, name)
          values ('00000000-0000-0000-0000-0000000000c1', 'SEGURO_GENERAL', 'Aseguradora', 'Plan general');
      `);
      const ids = await db.query<{ tariff_id: string; insurance_plan_id: string }>(`
        select
          (select id::text from public.commercial_tariffs limit 1) as tariff_id,
          (select id::text from public.insurance_plans limit 1) as insurance_plan_id
      `);
      const { tariff_id, insurance_plan_id } = ids.rows[0]!;
      await expect(
        db.query(
          `insert into public.patient_commercial_benefits(
             clinic_id, patient_id, kind, tariff_id, insurance_plan_id, status, verified_at
           ) values ($1, $2, 'SOCIAL_TARIFF', $3, $4, 'VERIFIED', now())`,
          [
            "00000000-0000-0000-0000-0000000000c1",
            "00000000-0000-0000-0000-0000000000a1",
            tariff_id,
            insurance_plan_id,
          ],
        ),
      ).rejects.toThrow(/patient_commercial_benefits_kind_source_check/);
      await expect(
        db.query(
          `insert into public.patient_commercial_benefits(
             clinic_id, patient_id, kind, tariff_id, status, verified_at
           ) values ($1, $2, 'SOCIAL_TARIFF', $3, 'VERIFIED', now())`,
          [
            "00000000-0000-0000-0000-0000000000c2",
            "00000000-0000-0000-0000-0000000000a1",
            tariff_id,
          ],
        ),
      ).rejects.toThrow();
    } finally {
      await db.close();
    }
  });
});
