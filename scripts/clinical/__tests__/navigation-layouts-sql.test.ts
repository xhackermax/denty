import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { expect, test } from "vitest";

const clinic = "00000000-0000-4000-8000-000000000001";
const otherClinic = "00000000-0000-4000-8000-000000000011";
const dentist = "00000000-0000-4000-8000-000000000003";
const admin = "00000000-0000-4000-8000-000000000004";

test("navigation layouts: admins set the clinic default, each member only their own", async () => {
  const db = new PGlite();
  try {
    await db.exec(await readFile("scripts/clinical/fixtures/clinical-core.sql", "utf8"));
    await db.exec(`reset role;
      create table profiles(id uuid primary key);
      insert into profiles values('${dentist}'),('${admin}');
      insert into clinics values('${otherClinic}');
      insert into clinic_members values('${clinic}','${admin}',true,'ADMIN');
      create table clinic_settings(clinic_id uuid primary key references clinics(id),default_plan_visit_gap_days int not null default 7,updated_at timestamptz not null default now());
      create function private.is_clinic_admin(uuid) returns boolean language sql security definer as $$ select exists(select 1 from public.clinic_members where clinic_id=$1 and profile_id=auth.uid() and active and role='ADMIN') $$;
      grant select on clinic_settings to authenticated;`);
    await db.exec(
      await readFile("supabase/migrations/20261003100000_navigation_layouts.sql", "utf8"),
    );
    const as = (profile: string) =>
      db.exec(
        `reset role; select set_config('request.jwt.claim.sub','${profile}',false); set role authenticated;`,
      );
    const layout = (pinned: unknown) => JSON.stringify({ pinned });

    await as(dentist);
    await expect(
      db.query("select set_clinic_navigation_layout($1,$2::jsonb)", [clinic, layout(["agenda"])]),
    ).rejects.toThrow("FORBIDDEN");
    await db.query("select set_my_navigation_layout($1,$2::jsonb)", [
      clinic,
      layout(["tasks", "agenda"]),
    ]);
    await expect(
      db.query("select set_my_navigation_layout($1,$2::jsonb)", [otherClinic, layout(["home"])]),
    ).rejects.toThrow("FORBIDDEN");
    for (const invalid of ['{"pinned":[]}', '{"pinned":"home"}', "[]", layout(Array(9).fill("x"))])
      await expect(
        db.query("select set_my_navigation_layout($1,$2::jsonb)", [clinic, invalid]),
      ).rejects.toThrow("INVALID_LAYOUT");

    await as(admin);
    await db.query("select set_clinic_navigation_layout($1,$2::jsonb)", [
      clinic,
      layout(["agenda", "home"]),
    ]);
    await db.query("select set_my_navigation_layout($1,$2::jsonb)", [clinic, layout(["admin"])]);
    // Row security: an admin sees their own personal layout, never a colleague's.
    expect((await db.query("select profile_id from member_navigation_layouts")).rows).toEqual([
      { profile_id: admin },
    ]);
    await expect(db.exec("delete from member_navigation_layouts")).rejects.toThrow();

    await as(dentist);
    expect(
      (
        await db.query<{ navigation_layout: unknown }>(
          "select navigation_layout from clinic_settings",
        )
      ).rows,
    ).toEqual([{ navigation_layout: { pinned: ["agenda", "home"] } }]);
    expect((await db.query("select layout from member_navigation_layouts")).rows).toEqual([
      { layout: { pinned: ["tasks", "agenda"] } },
    ]);
    await db.query("select set_my_navigation_layout($1,null)", [clinic]);
    expect((await db.query("select * from member_navigation_layouts")).rows).toHaveLength(0);

    await as(admin);
    await db.query("select set_clinic_navigation_layout($1,null)", [clinic]);
    expect((await db.query("select navigation_layout from clinic_settings")).rows).toEqual([
      { navigation_layout: null },
    ]);
  } finally {
    await db.close();
  }
});
