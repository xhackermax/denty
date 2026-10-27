import { describe, expect, it } from "vitest";

import {
  referralCreateSchema,
  referralListFiltersSchema,
  referralProgramInputSchema,
  referralRewardRedeemSchema,
  referralVoidSchema,
} from "../referrals";

const program = {
  name: "Recomienda y gana",
  referrerReward: { kind: "CREDIT", valueCents: 3000 },
  referredReward: { kind: "NONE" },
  terms: "Condiciones.",
};

describe("referralProgramInputSchema", () => {
  it("nace inactivo, con aprobación manual y sin importes que no use su tipo", () => {
    const parsed = referralProgramInputSchema.parse({
      ...program,
      referredReward: { kind: "NONE", valueCents: 500, description: "sobrante" },
    });
    expect(parsed.active).toBe(false);
    expect(parsed.qualification).toBe("APROBACION_MANUAL");
    expect(parsed.referredReward).toEqual({
      kind: "NONE",
      valueCents: null,
      percentBps: null,
      description: null,
    });
  });

  it("pide el valor que necesita cada tipo de beneficio", () => {
    const issues = (input: unknown) =>
      referralProgramInputSchema.safeParse(input).error?.issues.map((issue) => issue.message) ?? [];
    expect(issues({ ...program, referrerReward: { kind: "CREDIT" } })).toContain(
      "Indica el importe del crédito.",
    );
    expect(issues({ ...program, referrerReward: { kind: "DISCOUNT_PERCENT" } })).toContain(
      "Indica el porcentaje de descuento.",
    );
    expect(issues({ ...program, referredReward: { kind: "SERVICE", description: "" } })).toContain(
      "Describe el beneficio.",
    );
    expect(
      issues({
        ...program,
        startsAt: "2026-12-01T00:00:00Z",
        endsAt: "2026-11-01T00:00:00Z",
      }),
    ).toContain("El fin es anterior al inicio.");
  });

  it("limita los porcentajes a 0,01 %–100 %", () => {
    expect(
      referralProgramInputSchema.safeParse({
        ...program,
        referrerReward: { kind: "DISCOUNT_PERCENT", percentBps: 10_001 },
      }).success,
    ).toBe(false);
  });
});

describe("referralCreateSchema", () => {
  it("rechaza que un paciente se recomiende a sí mismo", () => {
    const result = referralCreateSchema.safeParse({
      referrerPatientId: "p1",
      referredPatientId: "p1",
      source: "OTRO",
    });
    expect(result.error?.issues[0]?.message).toBe("Un paciente no puede recomendarse a sí mismo.");
  });

  it("empieza pendiente por defecto", () => {
    expect(
      referralCreateSchema.parse({
        referrerPatientId: "p1",
        referredPatientId: "p2",
        source: "CODIGO_QR",
      }),
    ).toMatchObject({ status: "PENDING", programId: null, notes: null });
  });
});

describe("otros contratos", () => {
  it("exige motivo al anular y clave de idempotencia al canjear", () => {
    expect(referralVoidSchema.safeParse({ reason: " " }).success).toBe(false);
    expect(referralRewardRedeemSchema.safeParse({ amountCents: 100 }).success).toBe(false);
    expect(
      referralRewardRedeemSchema.parse({ amountCents: 100, idempotencyKey: "redeem-1" }),
    ).toMatchObject({ invoiceId: null, budgetId: null });
  });

  it("acepta filtros como query string y descarta los vacíos", () => {
    expect(
      referralListFiltersSchema.parse({ page: "2", status: "", search: "Ana", from: "2026-10-01" }),
    ).toEqual({ page: 2, pageSize: 25, search: "Ana", from: "2026-10-01" });
  });
});
