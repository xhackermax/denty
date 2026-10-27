import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { computeBudgetTotals } from "@/domain/budget-discounts";

const ids = {
  budget: "00000000-0000-0000-0000-000000000001",
  patient: "00000000-0000-0000-0000-000000000002",
  clinic: "00000000-0000-0000-0000-000000000003",
  item: "00000000-0000-0000-0000-000000000004",
  series: "00000000-0000-0000-0000-000000000005",
};
const migration = readFileSync(
  resolve("supabase/migrations/20261027150000_budget_discounts.sql"),
  "utf8",
);
let db: PGlite;

async function status(args: unknown[]) {
  const result = await db.query<{ result: { status: string } }>(
    "select public.update_budget_discounts($1,$2,$3,$4,$5,$6,$7) result",
    args,
  );
  return result.rows[0]?.result.status;
}

async function budget() {
  const result = await db.query<{
    total_cents: number;
    final_total_cents: number;
    discount_label: string | null;
    early_payment_percent: string | null;
    early_payment_applied: boolean;
    version: number;
  }>(
    `select total_cents, final_total_cents, discount_label, early_payment_percent::text,
            early_payment_applied, version
     from public.budgets where id=$1`,
    [ids.budget],
  );
  return result.rows[0]!;
}

async function enableEarlyPayment(percent = 5) {
  await db.query(
    "select public.update_budget_discount_settings($1,true,$2,'Pago por adelantado',20,'[]'::jsonb)",
    [ids.clinic, percent],
  );
}

describe("budget discounts SQL migration", () => {
  beforeEach(async () => {
    db = new PGlite();
    await db.exec(`
      create role authenticated;
      create role anon;
      create schema private;
      create schema auth;
      create function auth.uid() returns uuid language sql as $$ select null::uuid $$;
      create function private.is_clinic_staff(uuid) returns boolean
        language sql as $$ select true $$;
      create function private.stage11_has_permission(uuid, text) returns boolean
        language sql as $$ select true $$;
      create function private.has_finance_permission(uuid, text) returns boolean
        language sql as $$ select true $$;
      create table public.clinics (id uuid primary key);
      create table public.profiles (id uuid primary key);
      create table public.patients (
        id uuid primary key, clinic_id uuid, first_name text, last_name text, dni text
      );
      create table public.budgets (
        id uuid primary key,
        patient_id uuid not null,
        clinic_id uuid not null,
        version integer not null,
        status text not null,
        total_cents integer not null
      );
      create table public.budget_items (
        id uuid primary key,
        budget_id uuid not null,
        clinical_plan_item_id uuid,
        description text not null,
        billing_mode text not null,
        quantity integer not null,
        unit_price_cents integer not null,
        created_at timestamptz not null default now()
      );
      create table public.budget_signed_snapshots (budget_id uuid not null);
      create table public.invoices (budget_id uuid not null);
      create table public.payments (budget_id uuid not null);
      create table public.payment_allocations (budget_id uuid not null);
      create table public.captured_invoice_lines (lines jsonb);
      create function public.create_invoice_draft(
        uuid, uuid, uuid, uuid, text, text, text, text, p_lines jsonb
      ) returns jsonb language plpgsql as $$
      begin
        insert into public.captured_invoice_lines values (p_lines);
        return p_lines;
      end $$;
      alter default privileges in schema public grant execute on functions to anon;
      insert into public.clinics values ('${ids.clinic}');
      insert into public.patients values ('${ids.patient}', '${ids.clinic}', 'Ana', 'Pérez', null);
      insert into public.budgets values (
        '${ids.budget}', '${ids.patient}', '${ids.clinic}', 1, 'DRAFT', 100000
      );
      insert into public.budget_items values
        ('${ids.item}', '${ids.budget}', null, 'Implante', 'separate', 1, 100000);
    `);
    await db.exec(migration);
  });

  afterEach(async () => {
    await db.close();
  });

  it("keeps existing budgets unchanged: final total equals the gross total", async () => {
    expect(await budget()).toMatchObject({ total_cents: 100000, final_total_cents: 100000 });
  });

  it("applies a discount and early payment exactly like the domain calculation", async () => {
    await enableEarlyPayment(5);
    expect(await status([ids.budget, ids.patient, 1, "Familiar", 10, 0, true])).toBe("updated");
    const row = await budget();
    const expected = computeBudgetTotals({
      subtotalCents: 100000,
      discountPercent: 10,
      earlyPaymentPercent: 5,
      earlyPaymentApplied: true,
    });
    expect(row).toMatchObject({
      final_total_cents: expected.totalCents,
      discount_label: "Familiar",
      early_payment_percent: "5.00",
      early_payment_applied: true,
      version: 2,
    });
  });

  it("re-applies the percentage when the lines change the gross total", async () => {
    await status([ids.budget, ids.patient, 1, null, 20, 0, false]);
    await db.query("update public.budgets set total_cents=50000 where id=$1", [ids.budget]);
    expect((await budget()).final_total_cents).toBe(40000);
  });

  it("ignores early payment while the clinic has it disabled", async () => {
    expect(await status([ids.budget, ids.patient, 1, null, 0, 0, true])).toBe("updated");
    expect(await budget()).toMatchObject({
      final_total_cents: 100000,
      early_payment_percent: null,
      early_payment_applied: false,
    });
  });

  it("rejects discounts above the clinic maximum, stale versions and signed budgets", async () => {
    await enableEarlyPayment();
    expect(await status([ids.budget, ids.patient, 1, null, 25, 0, false])).toBe("invalid_discount");
    expect(await status([ids.budget, ids.patient, 1, null, 0, 20001, false])).toBe(
      "invalid_discount",
    );
    expect(await status([ids.budget, ids.patient, 9, null, 5, 0, false])).toBe("version_conflict");
    await db.query("update public.budgets set status='SIGNED' where id=$1", [ids.budget]);
    expect(await status([ids.budget, ids.patient, 1, null, 5, 0, false])).toBe("not_editable");
  });

  it("validates the discount presets", async () => {
    await expect(
      db.query("select public.update_budget_discount_settings($1,false,5,null,100,$2::jsonb)", [
        ids.clinic,
        JSON.stringify([{ label: "", percent: 10 }]),
      ]),
    ).rejects.toThrow(/INVALID_DISCOUNT_PRESETS/);
    const saved = await db.query<{ result: { discount_presets: unknown } }>(
      "select public.update_budget_discount_settings($1,false,5,null,100,$2::jsonb) result",
      [ids.clinic, JSON.stringify([{ label: "Familiar", percent: 10 }])],
    );
    expect(saved.rows[0]?.result.discount_presets).toEqual([{ label: "Familiar", percent: 10 }]);
  });

  it("drafts invoices with the discounts as negative lines", async () => {
    await enableEarlyPayment(5);
    await status([ids.budget, ids.patient, 1, "Familiar", 10, 0, true]);
    await db.query("update public.budgets set status='SIGNED' where id=$1", [ids.budget]);
    await db.query("select public.create_invoice_from_budget($1,$2)", [ids.budget, ids.series]);
    const captured = await db.query<{
      lines: Array<{ description: string; unitPriceCents: number }>;
    }>("select lines from public.captured_invoice_lines");
    const lines = captured.rows[0]!.lines;
    expect(lines.map((line) => [line.description, line.unitPriceCents])).toEqual([
      ["Implante", 100000],
      ["Descuento: Familiar", -10000],
      ["Descuento por pronto pago (5 %)", -4500],
    ]);
    expect(lines.reduce((sum, line) => sum + line.unitPriceCents, 0)).toBe(
      (await budget()).final_total_cents,
    );
  });

  it("does not expose the RPCs to anonymous users", async () => {
    const acl = await db.query<Record<string, boolean>>(`
      select
        has_function_privilege('anon','public.update_budget_discounts(uuid,uuid,integer,text,numeric,integer,boolean)','EXECUTE') update_exec,
        has_function_privilege('anon','public.update_budget_discount_settings(uuid,boolean,numeric,text,numeric,jsonb)','EXECUTE') settings_exec,
        has_function_privilege('authenticated','public.update_budget_discounts(uuid,uuid,integer,text,numeric,integer,boolean)','EXECUTE') staff_exec
    `);
    expect(acl.rows[0]).toEqual({ update_exec: false, settings_exec: false, staff_exec: true });
  });
});
