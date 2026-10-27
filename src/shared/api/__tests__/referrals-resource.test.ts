import { describe, expect, it, vi } from "vitest";

import { ApiClient } from "../client";
import { createDentyApi } from "../endpoints";

function makeApi(body: unknown = {}) {
  const fetchImpl = vi
    .fn<typeof fetch>()
    .mockImplementation(() => Promise.resolve(Response.json(body)));
  const api = createDentyApi(new ApiClient({ baseUrl: "https://api.example.test", fetchImpl }));
  const calls = () =>
    fetchImpl.mock.calls.map(([url, init]) => ({
      url: String(url).replace("https://api.example.test", ""),
      method: init?.method ?? "GET",
      body: init?.body ? (JSON.parse(String(init.body)) as unknown) : undefined,
    }));
  return { api, calls };
}

const patient = { id: "p1", name: "Ana López", recordNumber: "101" };
const referral = {
  id: "r1",
  status: "PENDING",
  source: "OTRO",
  reportedAt: "2026-10-27T08:00:00Z",
  confirmedAt: null,
  voidedAt: null,
  voidReason: null,
  notes: null,
  version: 1,
  createdAt: "2026-10-27T08:00:00Z",
  referrer: patient,
  referred: { ...patient, id: "p2" },
  programId: null,
  programName: null,
  siteId: null,
  siteName: null,
  rewardCount: 0,
};
const reward = {
  id: "w1",
  referralId: "r1",
  programId: "g1",
  programName: "Programa",
  qualification: "APROBACION_MANUAL",
  beneficiary: patient,
  beneficiaryRole: "REFERRER",
  origin: { id: "p2", name: "Ben" },
  kind: "CREDIT",
  valueCents: 3000,
  percentBps: null,
  description: null,
  status: "EARNED",
  state: "PARCIAL",
  appliedCents: 1000,
  appliedCount: 1,
  remainingCents: 2000,
  earnedAt: "2026-10-27T08:00:00Z",
  expiresAt: null,
  qualificationReference: null,
  cancelReason: null,
  lastMovementAt: "2026-10-27T08:00:00Z",
  version: 2,
  createdAt: "2026-10-27T08:00:00Z",
};

describe("referrals resource", () => {
  it("consulta relaciones, beneficios y la ficha con sus filtros", async () => {
    const list = makeApi({
      total: 0,
      kpis: {
        activeReferrers: 0,
        referred: 0,
        confirmed: 0,
        withAppointments: 0,
        rewardsPending: 0,
        rewardsUsed: 0,
      },
      items: [],
    });
    await list.api.referrals.list({ status: "CONFIRMED", search: "" });
    expect(list.calls()[0]?.url).toBe("/api/referrals?page=1&pageSize=25&status=CONFIRMED");

    const rewards = makeApi({
      total: 1,
      kpis: { pending: 0, earned: 1, used: 0, expired: 0, creditRemainingCents: 2000 },
      items: [reward],
    });
    const result = await rewards.api.referrals.rewards({ patientId: "p1" });
    expect(result.items[0]?.remainingCents).toBe(2000);
    expect(rewards.calls()[0]?.url).toBe("/api/referrals/rewards?page=1&pageSize=25&patientId=p1");

    const summary = makeApi({ referredBy: referral, referrals: [], rewards: null });
    await summary.api.referrals.patientSummary("p 1");
    expect(summary.calls()[0]?.url).toBe("/api/referrals/patients/p%201");
  });

  it("envía las acciones sobre relaciones por sus rutas", async () => {
    const { api, calls } = makeApi(referral);
    await api.referrals.create({
      referrerPatientId: "p1",
      referredPatientId: "p2",
      source: "OTRO",
    });
    await api.referrals.confirm("r1", { expectedVersion: 1 });
    await api.referrals.void("r1", { reason: "Error" });
    await api.referrals.reassign("r1", { reason: "Otro", newReferrerPatientId: "p3" });
    expect(calls().map((call) => `${call.method} ${call.url}`)).toEqual([
      "POST /api/referrals",
      "POST /api/referrals/r1/confirm",
      "POST /api/referrals/r1/void",
      "POST /api/referrals/r1/reassign",
    ]);
  });

  it("gestiona programas y el libro de beneficios", async () => {
    const program = {
      id: "g1",
      name: "Programa",
      siteId: null,
      qualification: "APROBACION_MANUAL",
      referrerReward: { kind: "NONE", valueCents: null, percentBps: null, description: null },
      referredReward: { kind: "NONE", valueCents: null, percentBps: null, description: null },
      maxReferralsPerReferrer: null,
      validityDays: null,
      startsAt: null,
      endsAt: null,
      terms: "Condiciones",
      active: false,
      version: 1,
      createdAt: "2026-10-27T08:00:00Z",
      updatedAt: "2026-10-27T08:00:00Z",
      referralCount: 0,
    };
    const programs = makeApi(program);
    const input = {
      name: "Programa",
      referrerReward: { kind: "NONE" as const },
      referredReward: { kind: "NONE" as const },
      terms: "Condiciones",
    };
    await programs.api.referrals.createProgram(input);
    await programs.api.referrals.updateProgram("g1", { program: input, expectedVersion: 1 });
    expect(programs.calls()[1]).toMatchObject({ method: "PUT", url: "/api/referrals/programs/g1" });

    const ledger = makeApi(reward);
    await ledger.api.referrals.approveReward("w1");
    await ledger.api.referrals.cancelReward("w1", { reason: "Duplicado" });
    await ledger.api.referrals.redeemReward("w1", {
      amountCents: 500,
      idempotencyKey: "key-12345",
    });
    await ledger.api.referrals.reverseRedemption("d1", { reason: "Error" });
    expect(ledger.calls().map((call) => call.url)).toEqual([
      "/api/referrals/rewards/w1/approve",
      "/api/referrals/rewards/w1/cancel",
      "/api/referrals/rewards/w1/redeem",
      "/api/referrals/redemptions/d1/reverse",
    ]);
    expect(() =>
      ledger.api.referrals.redeemReward("w1", { amountCents: -1, idempotencyKey: "key-12345" }),
    ).toThrow();

    const redemptions = makeApi({ items: [] });
    await redemptions.api.referrals.redemptions("w1");
    const list = makeApi({ items: [] });
    await list.api.referrals.programs();
    expect(list.calls()[0]?.url).toBe("/api/referrals/programs");
  });
});
