import { describe, expect, it } from "vitest";

import {
  deriveRewardState,
  describeReward,
  rewardRemainingCents,
  type RewardStateInput,
} from "../referrals";

const credit: RewardStateInput = {
  status: "EARNED",
  kind: "CREDIT",
  valueCents: 3000,
  appliedCents: 0,
  appliedCount: 0,
  expiresAt: null,
};
const now = "2026-10-27T10:00:00Z";

describe("deriveRewardState", () => {
  it("separa pendientes, cancelados y vencidos de los disponibles", () => {
    expect(deriveRewardState({ ...credit, status: "PENDING" }, now)).toBe("PENDIENTE");
    expect(deriveRewardState({ ...credit, status: "CANCELLED" }, now)).toBe("CANCELADO");
    expect(deriveRewardState({ ...credit, status: "EXPIRED" }, now)).toBe("VENCIDO");
    expect(deriveRewardState(credit, now)).toBe("DISPONIBLE");
  });

  it("un beneficio ganado vence al pasar su fecha, salvo que ya se haya usado del todo", () => {
    const expired = { ...credit, expiresAt: "2026-10-27T09:59:59Z" };
    expect(deriveRewardState(expired, now)).toBe("VENCIDO");
    expect(deriveRewardState({ ...credit, expiresAt: now }, now)).toBe("DISPONIBLE");
    expect(deriveRewardState({ ...expired, appliedCents: 3000, appliedCount: 1 }, now)).toBe(
      "USADO",
    );
  });

  it("el crédito se consume por partes", () => {
    expect(deriveRewardState({ ...credit, appliedCents: 1000, appliedCount: 1 }, now)).toBe(
      "PARCIAL",
    );
    expect(deriveRewardState({ ...credit, appliedCents: 3000, appliedCount: 2 }, now)).toBe(
      "USADO",
    );
  });

  it("descuentos y servicios se usan una sola vez", () => {
    const service = { ...credit, kind: "SERVICE" as const, valueCents: null };
    expect(deriveRewardState(service, now)).toBe("DISPONIBLE");
    expect(deriveRewardState({ ...service, appliedCount: 1 }, now)).toBe("USADO");
  });
});

describe("rewardRemainingCents", () => {
  it("devuelve el crédito restante y nunca negativo", () => {
    expect(rewardRemainingCents({ ...credit, appliedCents: 1200 })).toBe(1800);
    expect(rewardRemainingCents({ ...credit, appliedCents: 5000 })).toBe(0);
    expect(rewardRemainingCents({ ...credit, kind: "SERVICE", valueCents: null })).toBeNull();
  });
});

describe("describeReward", () => {
  it("resume cada tipo de beneficio", () => {
    expect(describeReward({ kind: "NONE" })).toBe("Sin beneficio");
    // Intl separates the euro sign with a non-breaking space.
    expect(describeReward({ kind: "CREDIT", valueCents: 2500 })).toBe("Crédito de 25,00\u00a0€");
    expect(describeReward({ kind: "DISCOUNT_PERCENT", percentBps: 1250 })).toBe(
      "Descuento del 12,5 %",
    );
    expect(describeReward({ kind: "SERVICE", description: "Limpieza" })).toBe("Servicio: Limpieza");
    expect(describeReward({ kind: "OTHER", description: null })).toBe("Otro beneficio");
  });
});
