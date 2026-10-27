import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ROLE_PERMISSIONS, type Role } from "@/domain/permissions";
import { deriveRewardState, type RewardStateInput } from "@/domain/referrals";

const clinic = "00000000-0000-4000-8000-0000000000c1";
const otherClinic = "00000000-0000-4000-8000-0000000000c2";
const admin = "00000000-0000-4000-8000-0000000000a1";
const reception = "00000000-0000-4000-8000-0000000000a2";
const dentist = "00000000-0000-4000-8000-0000000000a3";
const outsider = "00000000-0000-4000-8000-0000000000a4";
const patientUser = "00000000-0000-4000-8000-0000000000a5";
const site = "00000000-0000-4000-8000-0000000000e1";
const ana = "00000000-0000-4000-8000-000000000101";
const ben = "00000000-0000-4000-8000-000000000102";
const cris = "00000000-0000-4000-8000-000000000103";
const dani = "00000000-0000-4000-8000-000000000104";
const archived = "00000000-0000-4000-8000-000000000105";
const foreign = "00000000-0000-4000-8000-000000000201";
const invoice = "00000000-0000-4000-8000-000000000301";
const foreignInvoice = "00000000-0000-4000-8000-000000000302";

const migration = readFileSync(
  resolve("supabase/migrations/20261027120000_patient_referrals.sql"),
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
  create table public.patients (
    id uuid primary key, clinic_id uuid not null, record_number text not null,
    first_name text not null, last_name text not null, archived_at timestamptz);
  create table public.clinic_members (id uuid primary key default gen_random_uuid(), clinic_id uuid not null, profile_id uuid not null, role text not null, active boolean not null default true);
  create table public.user_permissions (id uuid primary key default gen_random_uuid(), clinic_member_id uuid not null, permission text not null, allowed boolean not null);
  create table public.appointments (
    id uuid primary key default gen_random_uuid(), clinic_id uuid not null, patient_id uuid not null,
    starts_at timestamptz not null, status text not null default 'PLANNED');
  create table public.invoices (id uuid primary key, clinic_id uuid not null, patient_id uuid, status text);
  create table public.budgets (id uuid primary key, clinic_id uuid not null, patient_id uuid, status text);
  create table public.audit_log (
    id uuid primary key default gen_random_uuid(), clinic_id uuid not null, actor_profile_id uuid,
    patient_id uuid, action text not null, entity_type text not null, entity_id uuid,
    metadata jsonb not null default '{}', before_json jsonb, after_json jsonb,
    created_at timestamptz not null default now());

  insert into public.clinics values ('${clinic}'), ('${otherClinic}');
  insert into public.profiles(id) values ('${admin}'), ('${reception}'), ('${dentist}'), ('${outsider}'), ('${patientUser}');
  insert into public.clinic_members(clinic_id, profile_id, role) values
    ('${clinic}', '${admin}', 'ADMIN'), ('${clinic}', '${reception}', 'RECEPTION'),
    ('${clinic}', '${dentist}', 'DENTIST'), ('${otherClinic}', '${outsider}', 'ADMIN'),
    ('${clinic}', '${patientUser}', 'PATIENT');
  insert into public.sites values ('${site}', '${clinic}', 'Centro');
  insert into public.patients values
    ('${ana}', '${clinic}', '101', 'Ana', 'López', null),
    ('${ben}', '${clinic}', '102', 'Ben', 'Ruiz', null),
    ('${cris}', '${clinic}', '103', 'Cris', 'Gil', null),
    ('${dani}', '${clinic}', '104', 'Dani', 'Mora', null),
    ('${archived}', '${clinic}', '105', 'Eva', 'Archivada', now()),
    ('${foreign}', '${otherClinic}', '201', 'Fede', 'Fuera', null);
  insert into public.invoices values ('${invoice}', '${clinic}', '${ana}', 'ISSUED'),
    ('${foreignInvoice}', '${otherClinic}', '${foreign}', 'ISSUED');
`;

let db: PGlite;

async function as(profile: string) {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [profile]);
}

async function rpc<T>(sql: string, params: unknown[] = []): Promise<T> {
  const result = await db.query<{ value: T }>(`select ${sql} as value`, params);
  return result.rows[0]!.value;
}

interface ReferralJson {
  id: string;
  status: string;
  version: number;
  rewardCount: number;
}
interface RewardJson {
  id: string;
  state: string;
  status: string;
  remainingCents: number | null;
  beneficiaryRole: string;
  beneficiary: { id: string };
  expiresAt: string | null;
  version: number;
}

const programPayload = {
  name: "Recomienda y gana",
  qualification: "APROBACION_MANUAL",
  referrerReward: { kind: "CREDIT", valueCents: 3000 },
  referredReward: { kind: "SERVICE", description: "Limpieza" },
  maxReferralsPerReferrer: 2,
  validityDays: 90,
  terms: "Condiciones aprobadas por la clínica.",
};

async function createProgram(payload: Record<string, unknown> = programPayload) {
  return rpc<{ id: string; active: boolean; version: number }>(
    "public.referral_program_save($1, null, $2::jsonb)",
    [clinic, JSON.stringify(payload)],
  );
}

async function link(referrer: string, referred: string, extra: Record<string, unknown> = {}) {
  return rpc<ReferralJson>("public.referral_create($1, $2::jsonb)", [
    clinic,
    JSON.stringify({
      referrerPatientId: referrer,
      referredPatientId: referred,
      source: "DECLARADO_EN_RECEPCION",
      ...extra,
    }),
  ]);
}

async function rewardsOf(patient: string) {
  const list = await rpc<{ items: RewardJson[] }>("public.referral_reward_list($1, $2::jsonb)", [
    clinic,
    JSON.stringify({ patientId: patient }),
  ]);
  return list.items;
}

async function activeProgram(payload: Record<string, unknown> = programPayload) {
  return createProgram({ ...payload, active: true });
}

describe("patient referrals migration", () => {
  beforeEach(async () => {
    db = new PGlite();
    await db.exec(baseSchema);
    await db.exec(migration);
    await as(admin);
  });

  afterEach(async () => {
    await db.close();
  });

  it("grants the same role defaults as src/domain/permissions.ts", async () => {
    const members: [string, Role][] = [
      [admin, "ADMIN"],
      [reception, "RECEPTION"],
      [dentist, "DENTIST"],
      [patientUser, "PATIENT"],
    ];
    const keys = [
      "referrals.read",
      "referrals.manage",
      "referral_programs.manage",
      "referral_rewards.read",
      "referral_rewards.approve",
      "referral_rewards.redeem",
      "referral_rewards.reverse",
    ];
    for (const [profile, role] of members) {
      await as(profile);
      for (const permission of keys) {
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

  it("matches deriveRewardState for every reward situation", async () => {
    const now = "2026-10-27T10:00:00Z";
    const cases: RewardStateInput[] = [];
    for (const status of ["PENDING", "EARNED", "EXPIRED", "CANCELLED"] as const) {
      for (const kind of ["CREDIT", "SERVICE"] as const) {
        for (const [appliedCents, appliedCount] of [
          [0, 0],
          [1000, 1],
          [3000, 2],
        ] as const) {
          for (const expiresAt of [null, "2026-10-27T09:00:00Z", "2026-11-27T09:00:00Z"]) {
            cases.push({
              status,
              kind,
              valueCents: kind === "CREDIT" ? 3000 : null,
              appliedCents: kind === "CREDIT" ? appliedCents : 0,
              appliedCount,
              expiresAt,
            });
          }
        }
      }
    }
    for (const input of cases) {
      const sql = await rpc<string>("private.referral_reward_state($1, $2, $3, $4, $5, $6, $7)", [
        input.status,
        input.kind,
        input.valueCents,
        input.appliedCents,
        input.appliedCount,
        input.expiresAt,
        now,
      ]);
      expect(sql, JSON.stringify(input)).toBe(deriveRewardState(input, now));
    }
  });

  it("creates programs inactive and rejects amounts that do not fit the reward kind", async () => {
    const program = await createProgram();
    expect(program.active).toBe(false);
    await expect(
      createProgram({ ...programPayload, referrerReward: { kind: "CREDIT" } }),
    ).rejects.toThrow("referral_programs_referrer_reward_check");
    await expect(
      createProgram({
        ...programPayload,
        referredReward: { kind: "DISCOUNT_PERCENT", percentBps: 20000 },
      }),
    ).rejects.toThrow("referral_programs_referred_reward_check");
    await as(reception);
    await expect(createProgram()).rejects.toThrow("FORBIDDEN");
  });

  it("links patients and refuses self, foreign, archived, duplicate and cyclic links", async () => {
    await as(reception);
    const first = await link(ana, ben);
    expect(first).toMatchObject({ status: "PENDING", version: 1 });
    await expect(link(ana, ana)).rejects.toThrow("REFERRAL_SELF");
    await expect(link(ana, foreign)).rejects.toThrow("PATIENT_NOT_FOUND");
    await expect(link(ana, archived)).rejects.toThrow("PATIENT_ARCHIVED");
    await expect(link(cris, ben)).rejects.toThrow("REFERRAL_ALREADY_ACTIVE");
    await link(ben, cris);
    await expect(link(ben, ana), "A→B→A").rejects.toThrow("REFERRAL_CYCLE");
    await expect(link(cris, ana), "A→B→C→A").rejects.toThrow("REFERRAL_CYCLE");

    const audit = await db.query("select action from public.audit_log order by created_at");
    expect(audit.rows.map((row) => (row as { action: string }).action)).toEqual([
      "REFERRAL_CREATED",
      "REFERRAL_CREATED",
    ]);
  });

  it("never deletes a referral with its patient", async () => {
    await link(ana, ben);
    await expect(db.exec(`delete from public.patients where id = '${ben}'`)).rejects.toThrow(
      "patient_referrals_referred_fkey",
    );
  });

  it("does not create rewards from an inactive program", async () => {
    const program = await createProgram();
    const referral = await link(ana, ben, { programId: program.id, status: "CONFIRMED" });
    expect(referral).toMatchObject({ status: "CONFIRMED", rewardCount: 0 });
    expect(await rewardsOf(ana)).toEqual([]);
  });

  it("approves, redeems in parts and protects the balance of a credit", async () => {
    const program = await activeProgram();
    const referral = await link(ana, ben, { programId: program.id });
    await rpc("public.referral_confirm($1, $2, $3)", [clinic, referral.id, referral.version]);
    const [credit] = await rewardsOf(ana);
    const [service] = await rewardsOf(ben);
    expect(credit).toMatchObject({ state: "PENDIENTE", beneficiaryRole: "REFERRER" });
    expect(service).toMatchObject({ state: "PENDIENTE", beneficiaryRole: "REFERRED" });

    await as(reception);
    await expect(
      rpc("public.referral_reward_redeem($1, $2, $3::jsonb, $4)", [
        clinic,
        credit!.id,
        JSON.stringify({ amountCents: 100 }),
        "redeem-early",
      ]),
      "pending rewards cannot be used",
    ).rejects.toThrow("REWARD_NOT_AVAILABLE");
    await expect(
      rpc("public.referral_reward_approve($1, $2)", [clinic, credit!.id]),
    ).rejects.toThrow("FORBIDDEN");

    await as(admin);
    const earned = await rpc<RewardJson>("public.referral_reward_approve($1, $2)", [
      clinic,
      credit!.id,
    ]);
    expect(earned.state).toBe("DISPONIBLE");
    expect(earned.expiresAt).not.toBeNull();

    await as(reception);
    const redeem = (amount: number, key: string, extra: Record<string, unknown> = {}) =>
      rpc<RewardJson>("public.referral_reward_redeem($1, $2, $3::jsonb, $4)", [
        clinic,
        credit!.id,
        JSON.stringify({ amountCents: amount, ...extra }),
        key,
      ]);
    expect(await redeem(1000, "redeem-0001", { invoiceId: invoice })).toMatchObject({
      state: "PARCIAL",
      remainingCents: 2000,
    });
    expect(
      await redeem(1000, "redeem-0001"),
      "a retried request is not applied twice",
    ).toMatchObject({ remainingCents: 2000 });
    await expect(redeem(2500, "redeem-0002")).rejects.toThrow("REWARD_INSUFFICIENT_BALANCE");
    await expect(redeem(500, "redeem-0003", { invoiceId: foreignInvoice })).rejects.toThrow(
      "INVALID_REFERENCE",
    );
    expect(await redeem(2000, "redeem-0004")).toMatchObject({ state: "USADO", remainingCents: 0 });

    await expect(
      rpc("public.referral_void($1, $2, $3)", [clinic, referral.id, "Error"]),
      "confirmed referrals need the reversal permission",
    ).rejects.toThrow("FORBIDDEN");

    await as(admin);
    await expect(
      rpc("public.referral_void($1, $2, $3)", [clinic, referral.id, "Error"]),
    ).rejects.toThrow("REFERRAL_HAS_REDEMPTIONS");
    const redemptions = await rpc<{ items: { id: string; status: string }[] }>(
      "public.referral_reward_redemptions_list($1, $2)",
      [clinic, credit!.id],
    );
    expect(redemptions.items).toHaveLength(2);
    for (const item of redemptions.items) {
      await rpc("public.referral_redemption_reverse($1, $2, $3)", [clinic, item.id, "Anulación"]);
    }
    await expect(
      rpc("public.referral_redemption_reverse($1, $2, $3)", [
        clinic,
        redemptions.items[0]!.id,
        "Otra vez",
      ]),
    ).rejects.toThrow("REDEMPTION_ALREADY_REVERSED");
    const voided = await rpc<ReferralJson>("public.referral_void($1, $2, $3)", [
      clinic,
      referral.id,
      "Error de registro",
    ]);
    expect(voided.status).toBe("VOID");
    expect((await rewardsOf(ana))[0]!.state).toBe("CANCELADO");
    expect((await rewardsOf(ben))[0]!.state).toBe("CANCELADO");
  });

  it("services are used once and the per-referrer limit is respected", async () => {
    const program = await activeProgram({ ...programPayload, maxReferralsPerReferrer: 1 });
    await link(ana, ben, { programId: program.id, status: "CONFIRMED" });
    await link(ana, cris, { programId: program.id, status: "CONFIRMED" });
    expect((await rewardsOf(ana)).length, "only the first referral pays the referrer").toBe(1);

    const [service] = await rewardsOf(ben);
    await rpc("public.referral_reward_approve($1, $2)", [clinic, service!.id]);
    const use = (key: string) =>
      rpc<RewardJson>("public.referral_reward_redeem($1, $2, '{}'::jsonb, $3)", [
        clinic,
        service!.id,
        key,
      ]);
    expect((await use("service-01")).state).toBe("USADO");
    await expect(use("service-02")).rejects.toThrow("REWARD_NOT_AVAILABLE");
  });

  it("earns automatically when the referred patient completes a first visit", async () => {
    const program = await activeProgram({
      ...programPayload,
      qualification: "PRIMERA_CITA_COMPLETADA",
    });
    await link(ana, ben, { programId: program.id, status: "CONFIRMED" });
    const [pending] = await rewardsOf(ana);
    expect(pending!.state).toBe("PENDIENTE");
    await expect(
      rpc("public.referral_reward_approve($1, $2)", [clinic, pending!.id]),
      "non-manual programs need evidence",
    ).rejects.toThrow("REFERENCE_REQUIRED");

    await db.exec(`insert into public.appointments(clinic_id, patient_id, starts_at)
      values ('${clinic}', '${ben}', now() + interval '1 hour')`);
    await db.exec(
      `update public.appointments set status = 'COMPLETED' where patient_id = '${ben}'`,
    );
    expect((await rewardsOf(ana))[0]!.state).toBe("DISPONIBLE");
  });

  it("reassigns the referrer by voiding with a reason and creating a new link", async () => {
    await as(reception);
    const referral = await link(ana, ben);
    await expect(
      rpc("public.referral_reassign($1, $2, $3, $4)", [clinic, referral.id, cris, " "]),
    ).rejects.toThrow("REASON_REQUIRED");
    const moved = await rpc<ReferralJson & { referrer: { id: string } }>(
      "public.referral_reassign($1, $2, $3, $4)",
      [clinic, referral.id, cris, "Se equivocó de nombre"],
    );
    expect(moved.referrer.id).toBe(cris);
    const rows = await db.query<{ status: string; replaces_referral_id: string | null }>(
      "select status, replaces_referral_id from public.patient_referrals order by created_at",
    );
    expect(rows.rows).toEqual([
      { status: "VOID", replaces_referral_id: null },
      { status: "PENDING", replaces_referral_id: referral.id },
    ]);
    await expect(
      rpc("public.referral_confirm($1, $2, $3)", [clinic, moved.id, 99]),
    ).rejects.toThrow("VERSION_CONFLICT");
  });

  it("lists with KPIs and summarises a patient for the record", async () => {
    await link(ana, ben, { status: "CONFIRMED" });
    await link(ana, cris);
    const list = await rpc<{ total: number; kpis: Record<string, number>; items: unknown[] }>(
      "public.referral_list($1, $2::jsonb)",
      [clinic, JSON.stringify({ search: "Ana" })],
    );
    expect(list.total).toBe(2);
    expect(list.kpis).toMatchObject({ activeReferrers: 1, referred: 2, confirmed: 1 });

    const summary = await rpc<{
      referredBy: { referrer: { id: string } } | null;
      referrals: unknown[];
      rewards: unknown[] | null;
    }>("public.referral_patient_summary($1, $2)", [clinic, ana]);
    expect(summary.referredBy).toBeNull();
    expect(summary.referrals).toHaveLength(2);
    const referred = await rpc<{ referredBy: { referrer: { id: string } } }>(
      "public.referral_patient_summary($1, $2)",
      [clinic, ben],
    );
    expect(referred.referredBy.referrer.id).toBe(ana);
  });

  it("keeps referrals invisible to other clinics, patients and anonymous users", async () => {
    await link(ana, ben);
    await db.exec("grant usage on schema public to authenticated, anon");
    const visible = async (profile: string | null, role: "authenticated" | "anon") => {
      await as(profile ?? "");
      await db.exec(`set role ${role}`);
      try {
        const result = await db.query("select id from public.patient_referrals");
        return result.rows.length;
      } catch {
        return -1;
      } finally {
        await db.exec("reset role");
      }
    };
    expect(await visible(admin, "authenticated")).toBe(1);
    expect(await visible(outsider, "authenticated")).toBe(0);
    expect(await visible(patientUser, "authenticated")).toBe(0);
    expect(await visible(null, "anon")).toBe(-1);

    await as(outsider);
    await expect(rpc("public.referral_list($1)", [clinic])).rejects.toThrow("FORBIDDEN");
    await as(patientUser);
    await expect(rpc("public.referral_patient_summary($1, $2)", [clinic, ana])).rejects.toThrow(
      "FORBIDDEN",
    );
  });
});
