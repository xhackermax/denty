import { describe, expect, it } from "vitest";

import { availableReferralActions, availableRewardActions } from "../referral-actions";

const ALL = new Set([
  "referrals.manage",
  "referral_rewards.approve",
  "referral_rewards.redeem",
  "referral_rewards.reverse",
]);

describe("availableReferralActions", () => {
  it("una relación pendiente se confirma, se corrige o se anula", () => {
    expect(availableReferralActions({ status: "PENDING" }, ALL)).toEqual([
      "confirm",
      "reassign",
      "void",
    ]);
  });

  it("anular una confirmada exige poder revertir beneficios", () => {
    expect(availableReferralActions({ status: "CONFIRMED" }, ALL)).toEqual(["reassign", "void"]);
    expect(
      availableReferralActions({ status: "CONFIRMED" }, new Set(["referrals.manage"])),
    ).toEqual([]);
  });

  it("una anulada o sin permiso no ofrece cambios", () => {
    expect(availableReferralActions({ status: "VOID" }, ALL)).toEqual([]);
    expect(availableReferralActions({ status: "PENDING" }, new Set())).toEqual([]);
  });
});

describe("availableRewardActions", () => {
  it("un beneficio pendiente se valida o se cancela", () => {
    expect(availableRewardActions({ state: "PENDIENTE", appliedCount: 0 }, ALL)).toEqual([
      "approve",
      "cancel",
    ]);
  });

  it("solo se canjea lo disponible y se cancela lo que no se ha usado", () => {
    expect(availableRewardActions({ state: "DISPONIBLE", appliedCount: 0 }, ALL)).toEqual([
      "redeem",
      "cancel",
    ]);
    expect(availableRewardActions({ state: "PARCIAL", appliedCount: 1 }, ALL)).toEqual(["redeem"]);
    expect(availableRewardActions({ state: "USADO", appliedCount: 1 }, ALL)).toEqual([]);
    expect(availableRewardActions({ state: "VENCIDO", appliedCount: 0 }, ALL)).toEqual([]);
  });

  it("recepción canjea pero no valida", () => {
    const reception = new Set(["referral_rewards.redeem"]);
    expect(availableRewardActions({ state: "PENDIENTE", appliedCount: 0 }, reception)).toEqual([]);
    expect(availableRewardActions({ state: "DISPONIBLE", appliedCount: 0 }, reception)).toEqual([
      "redeem",
    ]);
  });
});
