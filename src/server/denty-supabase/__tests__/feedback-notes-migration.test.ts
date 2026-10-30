import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const clinic = "00000000-0000-0000-0000-0000000000c1";
const otherClinic = "00000000-0000-0000-0000-0000000000c2";
const staff = "00000000-0000-0000-0000-00000000000a";
const admin = "00000000-0000-0000-0000-00000000000b";
const migration = readFileSync(
  resolve("supabase/migrations/20261030150000_feedback_notes.sql"),
  "utf8",
);
let db: PGlite;

const as = (userId: string) => db.exec(`select set_config('test.uid', '${userId}', false)`);

async function createNote(clinicId: string, kind: string, message: string, page: string | null) {
  const result = await db.query<{ r: Record<string, unknown> }>(
    "select to_jsonb(public.create_feedback_note($1, $2, $3, $4)) as r",
    [clinicId, kind, message, page],
  );
  return result.rows[0]!.r;
}

describe("feedback_notes SQL migration", () => {
  beforeEach(async () => {
    db = new PGlite();
    await db.exec(`
      create role authenticated;
      create role anon;
      create schema private;
      create schema auth;
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
      create table public.clinics (id uuid primary key);
      create table public.profiles (
        id uuid primary key, first_name text not null default '', last_name text not null default '',
        email text
      );
      create table private.members (clinic_id uuid, profile_id uuid, is_admin boolean);
      create function private.is_clinic_staff(uuid) returns boolean language sql as
        $$ select exists (select 1 from private.members where clinic_id = $1 and profile_id = auth.uid()) $$;
      create function private.is_clinic_admin(uuid) returns boolean language sql as
        $$ select exists (select 1 from private.members where clinic_id = $1 and profile_id = auth.uid() and is_admin) $$;
      insert into public.clinics values ('${clinic}'), ('${otherClinic}');
      insert into public.profiles values ('${staff}', 'Ana', 'Pérez', 'ana@example.com'),
        ('${admin}', '', '', 'admin@example.com');
      insert into private.members values ('${clinic}', '${staff}', false), ('${clinic}', '${admin}', true);
    `);
    await db.exec(migration);
  });

  afterEach(async () => {
    await db.close();
  });

  it("stores the note with the author's name and trims the text", async () => {
    await as(staff);
    const note = await createNote(clinic, "BUG", "  No guarda la cita  ", " /app/agenda ");
    expect(note).toMatchObject({
      clinic_id: clinic,
      kind: "BUG",
      message: "No guarda la cita",
      page_path: "/app/agenda",
      status: "NEW",
      author_id: staff,
      author_name: "Ana Pérez",
    });
  });

  it("falls back to the email when the profile has no name", async () => {
    await as(admin);
    const note = await createNote(clinic, "IDEA", "Añadir modo oscuro", null);
    expect(note.author_name).toBe("admin@example.com");
    expect(note.page_path).toBeNull();
  });

  it("rejects notes for a clinic the user does not belong to", async () => {
    await as(staff);
    await expect(createNote(otherClinic, "BUG", "Hola mundo", null)).rejects.toThrow("FORBIDDEN");
  });

  it("rejects too-short notes and unknown kinds", async () => {
    await as(staff);
    await expect(createNote(clinic, "BUG", "  a ", null)).rejects.toThrow();
    await expect(createNote(clinic, "SPAM", "Texto válido", null)).rejects.toThrow();
  });

  it("lets only admins change the status", async () => {
    await as(staff);
    const note = await createNote(clinic, "BUG", "No guarda la cita", null);
    await expect(
      db.query("select public.update_feedback_note_status($1, 'DONE')", [note.id]),
    ).rejects.toThrow("FORBIDDEN");

    await as(admin);
    const result = await db.query<{ status: string }>(
      "select (public.update_feedback_note_status($1, 'DONE')).status",
      [note.id],
    );
    expect(result.rows[0]!.status).toBe("DONE");
    await expect(
      db.query("select public.update_feedback_note_status($1, 'BORRADA')", [note.id]),
    ).rejects.toThrow();
  });
});
