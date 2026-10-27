import { describe, expect, test } from "vitest";

import { SupabaseRestClient } from "../../supabase/rest-client";
import { handleReferralsRoute, isReferralsRoute } from "../referrals-route";

type Call = { path: string; body: Record<string, unknown> | null };

function fakeClient(respond: (call: Call) => Response | unknown = () => ({})) {
  const calls: Call[] = [];
  const client = new SupabaseRestClient(
    { url: "https://example.supabase.co", key: "test" },
    async (input, init) => {
      const url = new URL(String(input));
      const call = {
        path: url.pathname.replace("/rest/v1/", ""),
        body: init?.body ? JSON.parse(String(init.body)) : null,
      };
      calls.push(call);
      const result = respond(call);
      return result instanceof Response ? result : Response.json(result);
    },
  );
  return { client, calls };
}

const ALL = [
  "referrals.read",
  "referrals.manage",
  "referral_programs.manage",
  "referral_rewards.read",
  "referral_rewards.approve",
  "referral_rewards.redeem",
  "referral_rewards.reverse",
];

const identity = (permissions: string[], client: SupabaseRestClient) => ({
  actor: { clinicId: "clinic-1", permissions },
  restClient: client,
});

const call = (method: string, path: string, body?: unknown) => {
  const request = new Request(`https://denty.example${path}`, {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { request, parts: new URL(request.url).pathname.split("/").filter(Boolean) };
};

async function send(
  method: string,
  path: string,
  body?: unknown,
  permissions = ALL,
  respond?: (call: Call) => Response | unknown,
) {
  const { client, calls } = fakeClient(respond);
  const { request, parts } = call(method, path, body);
  const response = await handleReferralsRoute(request, parts, identity(permissions, client));
  return { response, calls, json: (await response.json()) as Record<string, unknown> };
}

const program = {
  name: "Recomienda y gana",
  referrerReward: { kind: "CREDIT", valueCents: 3000 },
  referredReward: { kind: "NONE" },
  terms: "Condiciones.",
};

const pgError = (message: string, code = "P0001") =>
  Response.json({ code, message }, { status: 400 });

describe("isReferralsRoute", () => {
  test("matches only /api/referrals", () => {
    expect(isReferralsRoute(["api", "referrals"])).toBe(true);
    expect(isReferralsRoute(["api", "recalls"])).toBe(false);
  });
});

describe("handleReferralsRoute", () => {
  test("requires a session", async () => {
    const { request, parts } = call("GET", "/api/referrals");
    expect((await handleReferralsRoute(request, parts, null)).status).toBe(401);
  });

  test.each([
    ["GET", "/api/referrals", undefined, "referrals.read"],
    ["POST", "/api/referrals", {}, "referrals.manage"],
    ["POST", "/api/referrals/r1/confirm", {}, "referrals.manage"],
    ["GET", "/api/referrals/patients/p1", undefined, "referrals.read"],
    ["GET", "/api/referrals/programs", undefined, "referrals.read"],
    ["POST", "/api/referrals/programs", program, "referral_programs.manage"],
    ["PUT", "/api/referrals/programs/x", {}, "referral_programs.manage"],
    ["GET", "/api/referrals/rewards", undefined, "referral_rewards.read"],
    ["GET", "/api/referrals/rewards/w1/redemptions", undefined, "referral_rewards.read"],
    ["POST", "/api/referrals/rewards/w1/approve", {}, "referral_rewards.approve"],
    ["POST", "/api/referrals/rewards/w1/cancel", {}, "referral_rewards.approve"],
    ["POST", "/api/referrals/rewards/w1/redeem", {}, "referral_rewards.redeem"],
    ["POST", "/api/referrals/redemptions/d1/reverse", {}, "referral_rewards.reverse"],
  ])("%s %s needs %s", async (method, path, body, permission) => {
    const without = ALL.filter((candidate) => candidate !== permission);
    const { response, calls } = await send(method, path, body, without);
    expect(response.status).toBe(403);
    expect(calls).toHaveLength(0);
  });

  test("lists with filters from the query string", async () => {
    const { response, calls } = await send("GET", "/api/referrals?status=CONFIRMED&search=&page=2");
    expect(response.status).toBe(200);
    expect(calls[0]).toEqual({
      path: "rpc/referral_list",
      body: {
        p_clinic_id: "clinic-1",
        p_filters: { status: "CONFIRMED" },
        p_page: 2,
        p_page_size: 25,
      },
    });
  });

  test("creates a referral with defaults", async () => {
    const { response, calls } = await send("POST", "/api/referrals", {
      referrerPatientId: "a",
      referredPatientId: "b",
      source: "CODIGO_QR",
    });
    expect(response.status).toBe(201);
    expect(calls[0]?.body).toMatchObject({
      p_payload: { referrerPatientId: "a", status: "PENDING", programId: null },
    });
  });

  test("confirms, voids and reassigns with the expected version", async () => {
    await send("POST", "/api/referrals/r1/confirm", { expectedVersion: 2 }).then(({ calls }) =>
      expect(calls[0]?.body).toEqual({
        p_clinic_id: "clinic-1",
        p_referral_id: "r1",
        p_expected_version: 2,
      }),
    );
    await send("POST", "/api/referrals/r1/void", { reason: "Error" }).then(({ calls }) =>
      expect(calls[0]).toMatchObject({ path: "rpc/referral_void", body: { p_reason: "Error" } }),
    );
    await send("POST", "/api/referrals/r1/reassign", {
      reason: "Otro paciente",
      newReferrerPatientId: "c",
      expectedVersion: 1,
    }).then(({ calls }) =>
      expect(calls[0]).toMatchObject({
        path: "rpc/referral_reassign",
        body: { p_new_referrer_id: "c", p_expected_version: 1 },
      }),
    );
  });

  test("saves programs with only the values their reward kind uses", async () => {
    const created = await send("POST", "/api/referrals/programs", {
      ...program,
      referredReward: { kind: "NONE", valueCents: 999 },
    });
    expect(created.response.status).toBe(201);
    expect(created.calls[0]?.body).toMatchObject({
      p_program_id: null,
      p_payload: { active: false, referredReward: { kind: "NONE", valueCents: null } },
    });
    const updated = await send("PUT", "/api/referrals/programs/p9", {
      program,
      expectedVersion: 3,
    });
    expect(updated.calls[0]?.body).toMatchObject({ p_program_id: "p9", p_expected_version: 3 });
  });

  test("redeems with an idempotency key and reverses with a reason", async () => {
    const redeemed = await send("POST", "/api/referrals/rewards/w1/redeem", {
      amountCents: 500,
      idempotencyKey: "redeem-123",
    });
    expect(redeemed.calls[0]).toEqual({
      path: "rpc/referral_reward_redeem",
      body: {
        p_clinic_id: "clinic-1",
        p_reward_id: "w1",
        p_payload: { amountCents: 500, invoiceId: null, budgetId: null, reason: null },
        p_idempotency_key: "redeem-123",
      },
    });
    const reversed = await send("POST", "/api/referrals/redemptions/d1/reverse", {
      reason: "Error de caja",
    });
    expect(reversed.calls[0]).toMatchObject({ body: { p_redemption_id: "d1" } });
    const approved = await send("POST", "/api/referrals/rewards/w1/approve", {});
    expect(approved.calls[0]).toMatchObject({ body: { p_reference: null } });
    const cancelled = await send("POST", "/api/referrals/rewards/w1/cancel", {
      reason: "Duplicado",
    });
    expect(cancelled.calls[0]).toMatchObject({ path: "rpc/referral_reward_cancel" });
    const history = await send("GET", "/api/referrals/rewards/w1/redemptions");
    expect(history.calls[0]?.path).toBe("rpc/referral_reward_redemptions_list");
    const rewards = await send("GET", "/api/referrals/rewards?state=DISPONIBLE");
    expect(rewards.calls[0]?.body).toMatchObject({ p_filters: { state: "DISPONIBLE" } });
    const programs = await send("GET", "/api/referrals/programs");
    expect(programs.calls[0]?.path).toBe("rpc/referral_programs_list");
    const summary = await send("GET", "/api/referrals/patients/p1");
    expect(summary.calls[0]?.body).toMatchObject({ p_patient_id: "p1" });
  });

  test.each([
    ["REFERRAL_CYCLE", 422],
    ["REFERRAL_ALREADY_ACTIVE", 409],
    ["REWARD_INSUFFICIENT_BALANCE", 409],
    ["VERSION_CONFLICT", 409],
    ["PATIENT_NOT_FOUND", 404],
  ])("maps %s to %i with a Spanish message", async (message, status) => {
    const { response, json } = await send("POST", "/api/referrals/r1/confirm", {}, ALL, () =>
      pgError(message),
    );
    expect(response.status).toBe(status);
    expect((json.error as { message: string }).message).toMatch(/[a-z]/);
  });

  test("maps foreign keys, checks and unknown database errors", async () => {
    const fk = await send("POST", "/api/referrals/r1/confirm", {}, ALL, () =>
      pgError("insert violates foreign key", "23503"),
    );
    expect(fk.response.status).toBe(400);
    expect((fk.json.error as { code: string }).code).toBe("INVALID_REFERENCE");
    const check = await send("POST", "/api/referrals/r1/confirm", {}, ALL, () =>
      pgError("violates check", "23514"),
    );
    expect(check.response.status).toBe(400);
    const other = await send("POST", "/api/referrals/r1/confirm", {}, ALL, () =>
      Response.json({ message: "boom" }, { status: 500 }),
    );
    expect(other.response.status).toBe(500);
  });

  test("rejects invalid payloads and unknown routes", async () => {
    expect((await send("POST", "/api/referrals/r1/void", { reason: "" })).response.status).toBe(
      400,
    );
    const { request, parts } = call("POST", "/api/referrals/r1/void");
    const broken = new Request(request.url, { method: "POST", body: "{" });
    const { client } = fakeClient();
    expect((await handleReferralsRoute(broken, parts, identity(ALL, client))).status).toBe(400);
    expect((await send("DELETE", "/api/referrals/r1")).response.status).toBe(404);
  });
});
