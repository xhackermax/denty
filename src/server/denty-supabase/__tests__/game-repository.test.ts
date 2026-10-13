import { describe, expect, it, vi } from "vitest";

import type { SupabaseRestClient } from "../../supabase/rest-client";
import { GameRepository } from "../game-repository";

describe("GameRepository", () => {
  it("loads a dashboard through the verified-arrival RPC boundary", async () => {
    const rpc = vi.fn(async () => ({
      patientId: "patient-1",
      profile: { label: "Ficha **1234" },
      visit: { active: true, rewardGamesCount: 3, rewardPotentialCents: 100, voucher: null },
      games: [],
    }));
    const repo = new GameRepository({ rpc } as unknown as SupabaseRestClient, "clinic-1");

    const dashboard = await repo.dashboard("patient-1");

    expect(dashboard).toMatchObject({ visit: { active: true } });
    expect(rpc).toHaveBeenCalledWith("get_patient_game_dashboard", {
      p_clinic_id: "clinic-1",
      p_patient_id: "patient-1",
    });
  });

  it("creates a voucher only through the RPC that requires an arrived appointment", async () => {
    const rpc = vi.fn(async () => ({
      id: "voucher-1",
      patientId: "patient-1",
      appointmentId: "appointment-1",
      amountCents: 100,
      status: "AVAILABLE",
    }));
    const repo = new GameRepository({ rpc } as unknown as SupabaseRestClient, "clinic-1");

    await repo.createVoucher("patient-1");

    expect(rpc).toHaveBeenCalledWith("create_patient_game_voucher", {
      p_clinic_id: "clinic-1",
      p_patient_id: "patient-1",
    });
  });
});
