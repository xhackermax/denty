import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ROLE_PERMISSIONS, type Role } from "@/domain/permissions";
import { addRecallInterval, deriveRecallState, type RecallStateInput } from "@/domain/recalls";

const clinic = "00000000-0000-4000-8000-0000000000c1";
const otherClinic = "00000000-0000-4000-8000-0000000000c2";
const admin = "00000000-0000-4000-8000-0000000000a1";
const assistant = "00000000-0000-4000-8000-0000000000a2";
const outsider = "00000000-0000-4000-8000-0000000000a3";
const reception = "00000000-0000-4000-8000-0000000000a4";
const site = "00000000-0000-4000-8000-0000000000e1";
const otherSite = "00000000-0000-4000-8000-0000000000e2";
const staff = "00000000-0000-4000-8000-0000000000f1";
const ana = "00000000-0000-4000-8000-000000000101";
const ben = "00000000-0000-4000-8000-000000000102";
const archived = "00000000-0000-4000-8000-000000000103";
const foreign = "00000000-0000-4000-8000-000000000104";

const migration = readFileSync(
  resolve("supabase/migrations/20261027090000_recall_templates.sql"),
  "utf8",
);

// The parts of the live schema the migration builds on (see the Supabase project).
const baseSchema = `
  create schema private; create schema auth;
  create role authenticated; create role anon;
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema private, auth to authenticated;
  create table public.clinics (id uuid primary key);
  create table public.profiles (id uuid primary key, first_name text not null default '', last_name text not null default '');
  create table public.sites (id uuid primary key, clinic_id uuid not null references public.clinics(id), name text not null);
  create table public.staff_members (id uuid primary key, clinic_id uuid not null, display_name text not null, role text not null default 'DENTIST', active boolean not null default true);
  create table public.patients (
    id uuid primary key, clinic_id uuid not null, record_number text not null,
    first_name text not null, last_name text not null, birth_date date, archived_at timestamptz);
  create table public.clinic_members (id uuid primary key default gen_random_uuid(), clinic_id uuid not null, profile_id uuid not null, role text not null, active boolean not null default true);
  create table public.user_permissions (id uuid primary key default gen_random_uuid(), clinic_member_id uuid not null, permission text not null, allowed boolean not null);
  create table public.appointments (
    id uuid primary key default gen_random_uuid(), clinic_id uuid not null, patient_id uuid not null,
    site_id uuid, staff_id uuid, starts_at timestamptz not null, status text not null default 'PLANNED');
  create table public.clinical_treatment_executions (id uuid primary key default gen_random_uuid(), clinic_id uuid, patient_id uuid, treatment_category text, executed_at timestamptz);
  create table public.audit_log (
    id uuid primary key default gen_random_uuid(), clinic_id uuid not null, actor_profile_id uuid,
    patient_id uuid, action text not null, entity_type text not null, entity_id uuid,
    metadata jsonb not null default '{}', before_json jsonb, after_json jsonb,
    created_at timestamptz not null default now());
  create table public.patient_recalls (
    id uuid primary key default gen_random_uuid(), clinic_id uuid not null references public.clinics(id),
    patient_id uuid not null references public.patients(id), due_at timestamptz not null,
    kind text not null, status text not null default 'pending'
      check (status in ('pending','contacted','booked','dismissed','superseded')),
    source_appointment_id uuid, created_at timestamptz not null default now(),
    review_anchor_date date, review_due_date date, booked_appointment_id uuid references public.appointments(id));
  create function private.link_reviews_to_appointment() returns trigger language plpgsql as $$ begin return new; end $$;
  create trigger appointments_link_reviews after insert or update of status, starts_at on public.appointments
    for each row execute function private.link_reviews_to_appointment();

  insert into public.clinics values ('${clinic}'), ('${otherClinic}');
  insert into public.profiles(id, first_name, last_name) values
    ('${admin}', 'Ada', 'Admin'), ('${assistant}', 'Asis', 'Tente'),
    ('${outsider}', 'Otro', 'Centro'), ('${reception}', 'Rita', 'Recepción');
  insert into public.clinic_members(clinic_id, profile_id, role) values
    ('${clinic}', '${admin}', 'ADMIN'), ('${clinic}', '${assistant}', 'ASSISTANT'),
    ('${otherClinic}', '${outsider}', 'ADMIN'), ('${clinic}', '${reception}', 'RECEPTION');
  insert into public.sites values ('${site}', '${clinic}', 'Centro'), ('${otherSite}', '${otherClinic}', 'Fuera');
  insert into public.staff_members(id, clinic_id, display_name) values ('${staff}', '${clinic}', 'Dra. Pérez');
  insert into public.patients values
    ('${ana}', '${clinic}', '101', 'Ana', 'López', '1980-05-01', null),
    ('${ben}', '${clinic}', '102', 'Ben', 'Ruiz', '2015-02-01', null),
    ('${archived}', '${clinic}', '103', 'Carla', 'Archivada', null, now()),
    ('${foreign}', '${otherClinic}', '201', 'Dora', 'Fuera', null, null);
`;

let db: PGlite;

async function as(profile: string) {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [profile]);
}

async function rpc<T>(sql: string, params: unknown[] = []): Promise<T> {
  const result = await db.query<{ value: T }>(`select ${sql} as value`, params);
  return result.rows[0]!.value;
}

const templatePayload = {
  code: "HIGIENE",
  name: "Higiene semestral",
  category: "GENERAL",
  intervalValue: 6,
  intervalUnit: "MESES",
  anchorType: "FECHA_MANUAL",
  leadDays: 14,
  maxAttempts: 3,
  autoRecurrence: true,
  messagingEnabled: false,
  channels: [],
  reminderOffsets: [14, 2],
  defaultSiteId: site,
  defaultStaffId: staff,
};

async function createTemplate(payload: Record<string, unknown> = templatePayload) {
  return rpc<{ id: string; version: number }>("public.recall_template_save($1, null, $2::jsonb)", [
    clinic,
    JSON.stringify(payload),
  ]);
}

async function assign(templateId: string, patients: string[]) {
  return rpc<{ added: number; skipped: { patientId: string; reason: string }[] }>(
    "public.recall_assign_patients($1, $2, $3::uuid[], '2026-03-31'::date, '{}'::jsonb, 'req-1', false)",
    [clinic, templateId, patients],
  );
}

async function recallOf(patient: string) {
  const result = await db.query<{
    id: string;
    status: string;
    due_at: Date;
    version: number;
    close_reason: string | null;
  }>(
    "select id, status, due_at, version, close_reason from public.patient_recalls where patient_id = $1 and status in ('pending','contacted','booked') order by created_at desc limit 1",
    [patient],
  );
  return result.rows[0]!;
}

describe("recall templates migration", () => {
  beforeEach(async () => {
    db = new PGlite();
    await db.exec(baseSchema);
    await db.exec(migration);
    await as(admin);
  });

  afterEach(async () => {
    await db.close();
  });

  it("derives the same display state as the domain module", async () => {
    const now = "2026-10-27T10:00:00Z";
    const cases: RecallStateInput[] = [
      { status: "pending", dueAt: "2026-12-27T08:00:00Z", closeReason: null, pausedUntil: null },
      { status: "pending", dueAt: "2026-11-10T10:00:00Z", closeReason: null, pausedUntil: null },
      { status: "pending", dueAt: "2026-11-10T10:00:01Z", closeReason: null, pausedUntil: null },
      { status: "contacted", dueAt: "2026-10-20T08:00:00Z", closeReason: null, pausedUntil: null },
      { status: "contacted", dueAt: "2026-11-20T08:00:00Z", closeReason: null, pausedUntil: null },
      {
        status: "pending",
        dueAt: "2026-10-01T08:00:00Z",
        closeReason: null,
        pausedUntil: "2026-11-01T00:00:00Z",
      },
      { status: "booked", dueAt: "2026-10-01T08:00:00Z", closeReason: null, pausedUntil: null },
      {
        status: "dismissed",
        dueAt: "2026-10-01T08:00:00Z",
        closeReason: "COMPLETED",
        pausedUntil: null,
      },
      { status: "dismissed", dueAt: "2026-10-01T08:00:00Z", closeReason: null, pausedUntil: null },
      { status: "superseded", dueAt: "2026-10-01T08:00:00Z", closeReason: null, pausedUntil: null },
    ];
    for (const item of cases) {
      const sql = await rpc<string>(
        "private.recall_display_state($1, $2::timestamptz, $3, $4::timestamptz, 14, $5::timestamptz)",
        [item.status, item.dueAt, item.closeReason, item.pausedUntil, now],
      );
      expect(sql, JSON.stringify(item)).toBe(deriveRecallState(item, 14, new Date(now)));
    }
  });

  it("adds intervals like the domain module", async () => {
    const cases: [string, number, "DIAS" | "SEMANAS" | "MESES"][] = [
      ["2026-08-31", 6, "MESES"],
      ["2027-08-31", 6, "MESES"],
      ["2026-12-28", 2, "SEMANAS"],
      ["2026-10-24", 10, "DIAS"],
    ];
    for (const [date, value, unit] of cases) {
      const sql = await rpc<string>("private.recall_add_interval($1::date, $2, $3)::text", [
        date,
        value,
        unit,
      ]);
      expect(sql).toBe(addRecallInterval(date, value, unit));
    }
  });

  it("creates templates with an audit row and rejects duplicate codes", async () => {
    const template = await createTemplate();
    expect(template).toMatchObject({ code: "HIGIENE", openCount: 0, version: 1 });
    await expect(createTemplate()).rejects.toThrow("RECALL_CODE_TAKEN");
    const audit = await db.query<{ action: string }>("select action from public.audit_log");
    expect(audit.rows.map((row) => row.action)).toEqual(["RECALL_TEMPLATE_CREATED"]);
  });

  it("rejects sites or doctors from another clinic", async () => {
    await expect(
      createTemplate({ ...templatePayload, defaultSiteId: otherSite }),
    ).rejects.toThrow();
  });

  it("enforces permissions by clinic and role", async () => {
    await as(outsider);
    await expect(createTemplate()).rejects.toThrow("FORBIDDEN");
    await expect(rpc("public.recall_list($1)", [clinic])).rejects.toThrow("FORBIDDEN");
    await as(assistant);
    await expect(rpc("public.recall_list($1)", [clinic])).resolves.toBeTruthy();
    await expect(createTemplate()).rejects.toThrow("FORBIDDEN");
    await as(reception);
    await expect(createTemplate()).rejects.toThrow("FORBIDDEN");
  });

  it("grants the same role defaults as src/domain/permissions.ts", async () => {
    const members: [string, Role][] = [
      [admin, "ADMIN"],
      [assistant, "ASSISTANT"],
      [reception, "RECEPTION"],
    ];
    for (const [profile, role] of members) {
      await as(profile);
      for (const permission of ["recalls.read", "recalls.manage", "recalls.templates.manage"]) {
        const granted = await rpc<boolean>("private.loyalty_has_permission($1, $2)", [
          clinic,
          permission,
        ]);
        expect(granted, `${role} ${permission}`).toBe(
          (ROLE_PERMISSIONS[role] as readonly string[]).includes(permission),
        );
      }
    }
  });

  it("lets an explicit user permission override the role default", async () => {
    await db.exec(`insert into public.user_permissions(clinic_member_id, permission, allowed)
      select id, 'recalls.read', false from public.clinic_members where profile_id = '${admin}'`);
    await expect(rpc("public.recall_list($1)", [clinic])).rejects.toThrow("FORBIDDEN");
  });

  it("assigns patients once, skipping archived, foreign and already active ones", async () => {
    const template = await createTemplate();
    const preview = await rpc<{ added: number; dryRun: boolean }>(
      "public.recall_assign_patients($1, $2, $3::uuid[], $4::date, '{}'::jsonb, null, true)",
      [clinic, template.id, [ana, ben, archived, foreign], "2026-03-31"],
    );
    expect(preview).toMatchObject({ added: 2, dryRun: true });
    expect(
      (await db.query("select 1 from public.patient_recalls")).rows,
      "dry run writes nothing",
    ).toHaveLength(0);

    const first = await assign(template.id, [ana, ben, archived, foreign, ana]);
    expect(first.added).toBe(2);
    expect(first.skipped).toEqual(
      expect.arrayContaining([
        { patientId: archived, reason: "PATIENT_ARCHIVED" },
        { patientId: foreign, reason: "PATIENT_NOT_FOUND" },
      ]),
    );
    const again = await assign(template.id, [ana, ben]);
    expect(again.added).toBe(0);
    expect(again.skipped.map((item) => item.reason)).toEqual(["ALREADY_ACTIVE", "ALREADY_ACTIVE"]);

    const recall = await recallOf(ana);
    // 31 Mar + 6 months falls back to 30 Sep; 09:00 Madrid (summer time) is 07:00 UTC.
    expect(recall.due_at.toISOString()).toBe("2026-09-30T07:00:00.000Z");
    const kind = await db.query<{ kind: string; site_id: string; assigned_staff_id: string }>(
      "select kind, site_id, assigned_staff_id from public.patient_recalls where patient_id = $1",
      [ana],
    );
    expect(kind.rows[0]).toEqual({
      kind: "RECALL_HIGIENE",
      site_id: site,
      assigned_staff_id: staff,
    });
    const events = await db.query(
      "select 1 from public.recall_events where event_type = 'CREATED'",
    );
    expect(events.rows).toHaveLength(2);
  });

  it("lets a per-patient date win over the template period", async () => {
    const template = await createTemplate();
    await rpc(
      "public.recall_assign_patients($1, $2, $3::uuid[], $4::date, $5::jsonb, null, false)",
      [clinic, template.id, [ana], "2026-03-31", JSON.stringify({ [ana]: "2027-01-15" })],
    );
    expect((await recallOf(ana)).due_at.toISOString()).toBe("2027-01-15T08:00:00.000Z");
  });

  it("freezes the code once the template has been assigned", async () => {
    const template = await createTemplate();
    await rpc("public.recall_template_save($1, $2, $3::jsonb)", [
      clinic,
      template.id,
      JSON.stringify({ ...templatePayload, code: "HIGIENE_6M" }),
    ]);
    await assign(template.id, [ana]);
    await expect(
      rpc("public.recall_template_save($1, $2, $3::jsonb)", [
        clinic,
        template.id,
        JSON.stringify({ ...templatePayload, code: "OTRO" }),
      ]),
    ).rejects.toThrow("RECALL_CODE_LOCKED");
  });

  it("recomputes only pending recalls without their own date when asked", async () => {
    const template = await createTemplate();
    await rpc(
      "public.recall_assign_patients($1, $2, $3::uuid[], $4::date, $5::jsonb, null, false)",
      [clinic, template.id, [ana, ben], "2026-03-31", JSON.stringify({ [ben]: "2027-01-15" })],
    );
    const saved = await rpc<{ recomputed: number }>(
      "public.recall_template_save($1, $2, $3::jsonb, 1)",
      [
        clinic,
        template.id,
        JSON.stringify({ ...templatePayload, intervalValue: 3, recomputePending: true }),
      ],
    );
    expect(saved.recomputed).toBe(1);
    expect((await recallOf(ana)).due_at.toISOString()).toBe("2026-06-30T07:00:00.000Z");
    expect((await recallOf(ben)).due_at.toISOString()).toBe("2027-01-15T08:00:00.000Z");
    await expect(
      rpc("public.recall_template_save($1, $2, $3::jsonb, 1)", [
        clinic,
        template.id,
        JSON.stringify(templatePayload),
      ]),
    ).rejects.toThrow("VERSION_CONFLICT");
  });

  it("follows a recall through contact, booking, cancellation and completion", async () => {
    const template = await createTemplate();
    await assign(template.id, [ana]);
    let recall = await recallOf(ana);

    const contacted = await rpc<{ status: string; contactAttempts: number; version: number }>(
      "public.recall_update($1, $2, 'CONTACT', '{}'::jsonb, $3)",
      [clinic, recall.id, recall.version],
    );
    expect(contacted).toMatchObject({ status: "contacted", contactAttempts: 1 });
    await expect(
      rpc("public.recall_update($1, $2, 'CONTACT', '{}'::jsonb, $3)", [
        clinic,
        recall.id,
        recall.version,
      ]),
    ).rejects.toThrow("VERSION_CONFLICT");

    const appointment = (
      await db.query<{ id: string }>(
        "insert into public.appointments(clinic_id, patient_id, starts_at) values ($1, $2, now() + interval '20 days') returning id",
        [clinic, ana],
      )
    ).rows[0]!.id;
    const listed = await rpc<{ items: { nextAppointment: { id: string } | null }[] }>(
      "public.recall_list($1, $2::jsonb, 1, 25)",
      [clinic, JSON.stringify({ patientId: ana })],
    );
    expect(listed.items[0]!.nextAppointment?.id).toBe(appointment);
    await rpc("public.recall_update($1, $2, 'LINK_APPOINTMENT', $3::jsonb)", [
      clinic,
      recall.id,
      JSON.stringify({ appointmentId: appointment }),
    ]);
    expect((await recallOf(ana)).status).toBe("booked");

    // R05: cancelling the appointment reopens the same recall, no duplicate.
    await db.query("update public.appointments set status = 'CANCELLED' where id = $1", [
      appointment,
    ]);
    recall = await recallOf(ana);
    expect(recall.status).toBe("pending");

    const second = (
      await db.query<{ id: string }>(
        "insert into public.appointments(clinic_id, patient_id, starts_at) values ($1, $2, '2026-12-03T09:00:00Z') returning id",
        [clinic, ana],
      )
    ).rows[0]!.id;
    await rpc("public.recall_update($1, $2, 'LINK_APPOINTMENT', $3::jsonb)", [
      clinic,
      recall.id,
      JSON.stringify({ appointmentId: second }),
    ]);
    await db.query("update public.appointments set status = 'COMPLETED' where id = $1", [second]);
    await db.query("update public.appointments set status = 'COMPLETED' where id = $1", [second]);

    const rows = await db.query<{ status: string; close_reason: string | null; due_at: Date }>(
      "select status, close_reason, due_at from public.patient_recalls where patient_id = $1 order by created_at, due_at",
      [ana],
    );
    expect(rows.rows.map((row) => [row.status, row.close_reason])).toEqual([
      ["dismissed", "COMPLETED"],
      ["pending", null],
    ]);
    // 3 Dec (appointment day) + 6 months, at 09:00 Madrid.
    expect(rows.rows[1]!.due_at.toISOString()).toBe("2027-06-03T07:00:00.000Z");

    const history = await rpc<{ items: { eventType: string; actorName: string | null }[] }>(
      "public.recall_history($1, $2)",
      [clinic, recall.id],
    );
    expect(history.items.map((item) => item.eventType)).toEqual([
      "COMPLETED",
      "APPOINTMENT_LINKED",
      "APPOINTMENT_RELEASED",
      "APPOINTMENT_LINKED",
      "CONTACTED",
      "CREATED",
    ]);
    expect(history.items[0]!.actorName).toBe("Ada Admin");
  });

  it("does not let reception link an appointment of another patient", async () => {
    const template = await createTemplate();
    await assign(template.id, [ana]);
    const recall = await recallOf(ana);
    const appointment = (
      await db.query<{ id: string }>(
        "insert into public.appointments(clinic_id, patient_id, starts_at) values ($1, $2, now() + interval '1 day') returning id",
        [clinic, ben],
      )
    ).rows[0]!.id;
    await expect(
      rpc("public.recall_update($1, $2, 'LINK_APPOINTMENT', $3::jsonb)", [
        clinic,
        recall.id,
        JSON.stringify({ appointmentId: appointment }),
      ]),
    ).rejects.toThrow("APPOINTMENT_NOT_ELIGIBLE");
  });

  it("completes manually, creating the next recall only once, and reopens cancelled ones", async () => {
    const template = await createTemplate();
    await assign(template.id, [ana, ben]);
    const anaRecall = await recallOf(ana);
    await rpc("public.recall_update($1, $2, 'COMPLETE')", [clinic, anaRecall.id]);
    await expect(
      rpc("public.recall_update($1, $2, 'COMPLETE')", [clinic, anaRecall.id]),
    ).rejects.toThrow("RECALL_INVALID_TRANSITION");
    const count = await db.query("select 1 from public.patient_recalls where patient_id = $1", [
      ana,
    ]);
    expect(count.rows).toHaveLength(2);

    const benRecall = await recallOf(ben);
    await rpc("public.recall_update($1, $2, 'CANCEL')", [clinic, benRecall.id]);
    const reopened = await rpc<{ status: string; state: string }>(
      "public.recall_update($1, $2, 'REOPEN')",
      [clinic, benRecall.id],
    );
    expect(reopened.status).toBe("pending");
    const closed = await db.query<{ action: string }>(
      "select action from public.audit_log where action in ('RECALL_CLOSED','RECALL_EDITED') order by created_at",
    );
    expect(closed.rows.map((row) => row.action)).toEqual([
      "RECALL_CLOSED",
      "RECALL_CLOSED",
      "RECALL_EDITED",
    ]);
  });

  it("lists recalls with KPIs, filters and search", async () => {
    const template = await createTemplate();
    await assign(template.id, [ana, ben]);
    await db.query(
      "update public.patient_recalls set due_at = case when patient_id = $1 then now() - interval '2 days' else now() + interval '60 days' end",
      [ben],
    );
    const list = await rpc<{
      total: number;
      kpis: Record<string, number>;
      items: { patientName: string; state: string; templateName: string; siteName: string }[];
    }>("public.recall_list($1, '{}'::jsonb, 1, 25)", [clinic]);
    expect(list.total).toBe(2);
    expect(list.kpis).toMatchObject({ overdue: 1, pending: 1 });
    expect(list.items[0]).toMatchObject({
      patientName: "Ben Ruiz",
      state: "VENCIDO",
      templateName: "Higiene semestral",
      siteName: "Centro",
    });

    const overdue = await rpc<{ total: number }>("public.recall_list($1, $2::jsonb, 1, 25)", [
      clinic,
      JSON.stringify({ state: "VENCIDO" }),
    ]);
    expect(overdue.total).toBe(1);
    const search = await rpc<{ items: { recordNumber: string }[] }>(
      "public.recall_list($1, $2::jsonb, 1, 25)",
      [clinic, JSON.stringify({ search: "ana" })],
    );
    expect(search.items.map((item) => item.recordNumber)).toEqual(["101"]);
    await expect(rpc("public.recall_list($1, '{}'::jsonb, 1, 500)", [clinic])).rejects.toThrow(
      "INVALID_RECALL_FILTER",
    );
  });

  it("reports partial failures of bulk actions", async () => {
    const template = await createTemplate();
    await assign(template.id, [ana, ben]);
    const anaRecall = await recallOf(ana);
    const benRecall = await recallOf(ben);
    await rpc("public.recall_update($1, $2, 'CANCEL')", [clinic, benRecall.id]);
    const result = await rpc<{ updated: number; failed: { id: string; reason: string }[] }>(
      "public.recall_bulk_update($1, $2::uuid[], 'POSTPONE', $3::jsonb)",
      [clinic, [anaRecall.id, benRecall.id], JSON.stringify({ until: "2099-01-01" })],
    );
    expect(result.updated).toBe(1);
    expect(result.failed).toEqual([{ id: benRecall.id, reason: "RECALL_INVALID_TRANSITION" }]);
    const state = await rpc<{ items: { state: string }[] }>(
      "public.recall_list($1, $2::jsonb, 1, 25)",
      [clinic, JSON.stringify({ patientId: ana })],
    );
    expect(state.items[0]!.state).toBe("POSPUESTO");
  });

  it("previews candidates by age and excludes patients already enrolled", async () => {
    const template = await createTemplate();
    await assign(template.id, [ana]);
    const children = await rpc<{ total: number; items: { patientId: string }[] }>(
      "public.recall_candidates($1, $2::jsonb)",
      [clinic, JSON.stringify({ maxAge: 14 })],
    );
    expect(children.items.map((item) => item.patientId)).toEqual([ben]);
    const notEnrolled = await rpc<{ items: { patientId: string }[] }>(
      "public.recall_candidates($1, $2::jsonb)",
      [clinic, JSON.stringify({ excludeTemplateId: template.id })],
    );
    expect(notEnrolled.items.map((item) => item.patientId)).toEqual([ben]);
  });

  it("archives templates without touching their recalls", async () => {
    const template = await createTemplate();
    await assign(template.id, [ana]);
    await rpc("public.recall_template_archive($1, $2, true, 'Ya no se usa')", [
      clinic,
      template.id,
    ]);
    const listed = await rpc<{ items: unknown[] }>("public.recall_templates_list($1)", [clinic]);
    expect(listed.items).toHaveLength(0);
    expect((await recallOf(ana)).status).toBe("pending");
    await expect(assign(template.id, [ben])).rejects.toThrow("RECALL_TEMPLATE_INACTIVE");
  });

  it("keeps templates and history private to members of the clinic", async () => {
    const template = await createTemplate();
    await assign(template.id, [ana]);
    await db.exec("set role authenticated");
    expect((await db.query("select * from public.recall_templates")).rows).toHaveLength(1);
    await as(outsider);
    expect((await db.query("select * from public.recall_templates")).rows).toHaveLength(0);
    expect((await db.query("select * from public.recall_events")).rows).toHaveLength(0);
    await as(admin);
    await expect(
      db.query("update public.recall_templates set name = 'Cambio directo'"),
    ).rejects.toThrow(/permission denied/);
    await db.exec("reset role");
  });
});
