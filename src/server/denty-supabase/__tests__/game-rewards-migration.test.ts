import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20261013065431_game_rewards_verified_arrival.sql"),
  "utf8",
);

describe("Denty Games reward migration", () => {
  it("requires a verified reception arrival before a voucher can be created", () => {
    expect(migration).toMatch(/current_arrived_game_appointment/);
    expect(migration).toMatch(/a\.status in \('ARRIVED','WAITING'\)/);
    expect(migration).toMatch(/coalesce\(a\.arrived_at, a\.waiting_room_at\) is not null/);
    expect(migration).toMatch(/GAME_REWARD_REQUIRES_ARRIVAL/);
  });

  it("stores one voucher per appointment with RLS enabled", () => {
    expect(migration).toMatch(/patient_game_vouchers_one_per_appointment_idx/);
    expect(migration).toMatch(/alter table public\.patient_game_plays enable row level security/);
    expect(migration).toMatch(
      /alter table public\.patient_game_vouchers enable row level security/,
    );
  });
});
