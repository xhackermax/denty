import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const ids = {
  budget: "00000000-0000-0000-0000-000000000001",
  patient: "00000000-0000-0000-0000-000000000002",
  clinic: "00000000-0000-0000-0000-000000000003",
  separateItem: "00000000-0000-0000-0000-000000000004",
  includedItem: "00000000-0000-0000-0000-000000000005",
};
const migration = readFileSync(
  resolve("supabase/migrations/20261005120000_manage_draft_budgets.sql"),
  "utf8",
);
let db: PGlite;

async function resultStatus(query: string, params: unknown[]) {
  const result = await db.query<{ result: { status: string } }>(query, params);
  return result.rows[0]?.result.status;
}

describe("draft budget SQL migration", () => {
  beforeEach(async () => {
    db = new PGlite();
    await db.exec(`
      create role authenticated;
      create role anon;
      create schema private;
      create function private.is_clinic_staff(uuid) returns boolean
        language sql as $$ select true $$;
      create table public.budgets (
        id uuid primary key,
        patient_id uuid not null,
        clinic_id uuid not null,
        version integer not null,
        status text not null,
        title text,
        total_cents integer not null
      );
      create table public.budget_items (
        id uuid primary key,
        budget_id uuid not null references public.budgets(id) on delete cascade,
        billing_mode text not null,
        quantity integer not null,
        unit_price_cents integer not null,
        total_cents integer not null
      );
      create table public.budget_signed_snapshots (budget_id uuid not null);
      create table public.invoices (budget_id uuid not null);
      create table public.payments (budget_id uuid not null);
      create table public.payment_allocations (budget_id uuid not null);
      alter default privileges in schema public grant execute on functions to anon;
      insert into public.budgets values (
        '${ids.budget}', '${ids.patient}', '${ids.clinic}', 1, 'DRAFT', 'Plan inicial', 2000
      );
      insert into public.budget_items values
        ('${ids.separateItem}', '${ids.budget}', 'separate', 2, 1000, 2000),
        ('${ids.includedItem}', '${ids.budget}', 'included', 1, 5000, 0);
    `);
    await db.exec(migration);
  });

  afterEach(async () => {
    await db.close();
  });

  it("updates only a matching draft and recalculates billable totals", async () => {
    const status = await resultStatus(
      "select public.update_draft_budget($1,$2,$3,$4,$5::jsonb) result",
      [
        ids.budget,
        ids.patient,
        1,
        "Plan revisado",
        JSON.stringify([
          { id: ids.separateItem, unit_price_cents: 1250 },
          { id: ids.includedItem, unit_price_cents: 6000 },
        ]),
      ],
    );

    expect(status).toBe("updated");
    const budget = await db.query<{ title: string; total_cents: number; version: number }>(
      "select title,total_cents,version from public.budgets where id=$1",
      [ids.budget],
    );
    expect(budget.rows[0]).toEqual({ title: "Plan revisado", total_cents: 2500, version: 2 });
    const items = await db.query<{ billing_mode: string; total_cents: number }>(
      "select billing_mode,total_cents from public.budget_items where budget_id=$1 order by billing_mode",
      [ids.budget],
    );
    expect(items.rows).toEqual([
      { billing_mode: "included", total_cents: 0 },
      { billing_mode: "separate", total_cents: 2500 },
    ]);
  });

  it("deletes an unlinked draft and cascades only its budget items", async () => {
    const status = await resultStatus("select public.delete_draft_budget($1,$2,$3) result", [
      ids.budget, ids.patient, 1,
    ]);
    expect(status).toBe("deleted");
    const budgets = await db.query<{ count: number }>(
      "select count(*)::integer as count from public.budgets where id=$1", [ids.budget],
    );
    const items = await db.query<{ count: number }>(
      "select count(*)::integer as count from public.budget_items where budget_id=$1", [ids.budget],
    );
    expect(budgets.rows[0]?.count).toBe(0);
    expect(items.rows[0]?.count).toBe(0);
  });

  it("does not expose budget mutation RPCs to anonymous users", async () => {
    const acl = await db.query<{ delete_exec: boolean; update_exec: boolean; staff_exec: boolean }>(`
      select
        has_function_privilege('anon','public.delete_draft_budget(uuid,uuid,integer)','EXECUTE') delete_exec,
        has_function_privilege('anon','public.update_draft_budget(uuid,uuid,integer,text,jsonb)','EXECUTE') update_exec,
        has_function_privilege('authenticated','public.delete_draft_budget(uuid,uuid,integer)','EXECUTE') staff_exec
    `);
    expect(acl.rows[0]).toEqual({
      delete_exec: false,
      update_exec: false,
      staff_exec: true,
    });
  });

  it("rejects stale, linked, or non-draft records without deleting them", async () => {
    const stale = await resultStatus(
      "select public.update_draft_budget($1,$2,$3,$4,$5::jsonb) result",
      [ids.budget, ids.patient, 2, "Stale", JSON.stringify([])],
    );
    expect(stale).toBe("version_conflict");

    await db.exec(`insert into public.invoices values ('${ids.budget}')`);
    const linked = await resultStatus("select public.delete_draft_budget($1,$2,$3) result", [
      ids.budget,
      ids.patient,
      1,
    ]);
    expect(linked).toBe("linked");

    await db.exec(
      `delete from public.invoices where budget_id='${ids.budget}'; update public.budgets set status='SIGNED' where id='${ids.budget}';`,
    );
    const signed = await resultStatus("select public.delete_draft_budget($1,$2,$3) result", [
      ids.budget,
      ids.patient,
      1,
    ]);
    expect(signed).toBe("not_editable");
  });

  it("rejects a budget requested for another patient", async () => {
    const status = await resultStatus("select public.delete_draft_budget($1,$2,$3) result", [
      ids.budget,
      "00000000-0000-0000-0000-000000000099",
      1,
    ]);

    expect(status).toBe("not_found");
  });
});
