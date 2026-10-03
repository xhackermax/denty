import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { expect, test } from "vitest";

const clinic = "00000000-0000-4000-8000-000000000001";
const ana = "00000000-0000-4000-8000-0000000000a1"; // weekly rota
const luis = "00000000-0000-4000-8000-0000000000b1"; // no rota: weekdays 08:00–21:00
const desk = "00000000-0000-4000-8000-0000000000c1"; // reception, never offered

test("agenda_next_slots finds the nearest free slots per day part across doctors", async () => {
  const db = new PGlite();
  try {
    await db.exec(await readFile("scripts/clinical/fixtures/clinical-core.sql", "utf8"));
    await db.exec(`reset role;
      create table staff_members(id uuid primary key, clinic_id uuid, display_name text, role text, active boolean, collegiate_number text);
      create table staff_schedules(id uuid default gen_random_uuid(), clinic_id uuid, staff_member_id uuid, site_id uuid, weekday smallint, starts_at time, ends_at time, effective_from date, effective_until date, active boolean default true);
      create table appointments(clinic_id uuid, staff_id uuid, starts_at timestamptz, ends_at timestamptz, status text);
      create table staff_absences(clinic_id uuid, staff_member_id uuid, site_id uuid, starts_at timestamptz, ends_at timestamptz, status text);
      create table appointment_blocks(clinic_id uuid, staff_id uuid, site_id uuid, starts_at timestamptz, ends_at timestamptz);
      grant select on staff_members, staff_schedules, appointments, staff_absences, appointment_blocks to authenticated;
      insert into staff_members values
        ('${ana}','${clinic}','Dra. Ana','DENTIST',true,null),
        ('${luis}','${clinic}','Dr. Luis','DENTIST',true,null),
        ('${desk}','${clinic}','Recepción','RECEPTION',true,null);
      insert into staff_schedules(clinic_id, staff_member_id, weekday, starts_at, ends_at)
        select '${clinic}','${ana}', d, t.s, t.e from generate_series(1,5) d,
        (values (time '09:00', time '14:00'), (time '16:00', time '20:00')) as t(s,e);
      insert into appointments values ('${clinic}','${ana}','2026-10-02T10:15:00+02','2026-10-02T11:00:00+02','CONFIRMED'),
        ('${clinic}','${ana}','2026-10-02T11:00:00+02','2026-10-02T11:30:00+02','CANCELLED');
      insert into staff_absences values ('${clinic}','${ana}',null,'2026-10-05T00:00:00+02','2026-10-06T00:00:00+02','APPROVED');
      insert into appointment_blocks values ('${clinic}',null,null,'2026-10-02T16:00:00+02','2026-10-02T17:00:00+02');`);
    await db.exec(
      await readFile("supabase/migrations/20261003120000_agenda_next_slots.sql", "utf8"),
    );
    await db.exec("set role authenticated; set timezone to 'UTC';");

    const find = async (args: {
      notBefore: string;
      from?: number;
      to?: number;
      staff?: string | null;
      limit?: number;
      duration?: number;
    }) => {
      const result = await db.query<{ r: { slots: { startsAt: string; staffName: string }[] } }>(
        "select agenda_next_slots($1,$2::timestamptz,$3,$4,$5,$6,null,$7,60) as r",
        [
          clinic,
          args.notBefore,
          args.from ?? 0,
          args.to ?? 1440,
          args.duration ?? 30,
          args.staff ?? null,
          args.limit ?? 3,
        ],
      );
      return (result.rows[0]?.r.slots ?? []).map(
        (slot) => `${new Date(slot.startsAt).toISOString()} ${slot.staffName}`,
      );
    };
    const friday = "2026-10-02T10:07:00+02:00";

    // Morning (before 14:00): Luis is free right away; Ana only after her 10:15–11:00 visit.
    expect(await find({ notBefore: friday, to: 840 })).toEqual([
      "2026-10-02T08:15:00.000Z Dr. Luis",
      "2026-10-02T08:30:00.000Z Dr. Luis",
      "2026-10-02T08:45:00.000Z Dr. Luis",
    ]);
    expect(await find({ notBefore: friday, to: 840, staff: ana, limit: 1 })).toEqual([
      "2026-10-02T09:00:00.000Z Dra. Ana", // a cancelled visit does not hold the slot
    ]);
    // Afternoon: Ana's 16:00–17:00 is blocked for the whole clinic.
    expect(await find({ notBefore: friday, from: 840, staff: ana, limit: 1 })).toEqual([
      "2026-10-02T15:00:00.000Z Dra. Ana",
    ]);
    expect(await find({ notBefore: friday, from: 840, limit: 1 })).toEqual([
      "2026-10-02T12:00:00.000Z Dr. Luis",
    ]);
    // Weekends are skipped, and Ana is away all Monday.
    const saturday = "2026-10-03T00:00:00+02:00";
    expect(await find({ notBefore: saturday, staff: luis, limit: 1 })).toEqual([
      "2026-10-05T06:00:00.000Z Dr. Luis",
    ]);
    expect(await find({ notBefore: saturday, staff: ana, limit: 1 })).toEqual([
      "2026-10-06T07:00:00.000Z Dra. Ana",
    ]);
    // A long visit must fit inside one rota window: from 10:30, 4 h no longer fit before 14:00.
    expect(
      await find({ notBefore: "2026-10-06T10:30:00+02:00", staff: ana, duration: 240, limit: 1 }),
    ).toEqual(["2026-10-06T14:00:00.000Z Dra. Ana"]);
    // Reception staff are never offered as doctors.
    expect(
      (await find({ notBefore: friday, limit: 20 })).some((slot) => slot.includes("Recepción")),
    ).toBe(false);

    await expect(find({ notBefore: friday, duration: 0 })).rejects.toThrow("INVALID_ARGUMENT");
    await expect(find({ notBefore: friday, from: 900, to: 840 })).rejects.toThrow(
      "INVALID_ARGUMENT",
    );
    await db.exec(
      "reset role; select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000099',false); set role authenticated;",
    );
    await expect(find({ notBefore: friday })).rejects.toThrow("FORBIDDEN");
  } finally {
    await db.close();
  }
});
