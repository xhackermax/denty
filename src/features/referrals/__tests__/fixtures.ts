import type { Referral, ReferralProgram, ReferralReward } from "@/shared/api";

export function referral(overrides: Partial<Referral> = {}): Referral {
  return {
    id: "r1",
    status: "PENDING",
    source: "DECLARADO_EN_RECEPCION",
    reportedAt: "2026-10-20T10:00:00.000Z",
    confirmedAt: null,
    voidedAt: null,
    voidReason: null,
    notes: null,
    version: 3,
    createdAt: "2026-10-20T10:00:00.000Z",
    referrer: { id: "p-ana", name: "Ana López", recordNumber: "101" },
    referred: { id: "p-ben", name: "Ben Ruiz", recordNumber: "102" },
    programId: null,
    programName: null,
    siteId: null,
    siteName: null,
    rewardCount: 0,
    ...overrides,
  };
}

export function reward(overrides: Partial<ReferralReward> = {}): ReferralReward {
  return {
    id: "w1",
    referralId: "r1",
    programId: "g1",
    programName: "Recomienda",
    qualification: "APROBACION_MANUAL",
    beneficiary: { id: "p-ana", name: "Ana López", recordNumber: "101" },
    beneficiaryRole: "REFERRER",
    origin: { id: "p-ben", name: "Ben Ruiz" },
    kind: "CREDIT",
    valueCents: 3000,
    percentBps: null,
    description: null,
    status: "EARNED",
    state: "DISPONIBLE",
    appliedCents: 0,
    appliedCount: 0,
    remainingCents: 3000,
    earnedAt: "2026-10-21T10:00:00.000Z",
    expiresAt: null,
    qualificationReference: null,
    cancelReason: null,
    lastMovementAt: null,
    version: 2,
    createdAt: "2026-10-21T10:00:00.000Z",
    ...overrides,
  };
}

export function program(overrides: Partial<ReferralProgram> = {}): ReferralProgram {
  return {
    id: "g1",
    name: "Recomienda",
    siteId: null,
    qualification: "APROBACION_MANUAL",
    referrerReward: { kind: "CREDIT", valueCents: 3000, percentBps: null, description: null },
    referredReward: { kind: "NONE", valueCents: null, percentBps: null, description: null },
    maxReferralsPerReferrer: null,
    validityDays: null,
    startsAt: null,
    endsAt: null,
    terms: "Condiciones",
    active: false,
    version: 1,
    createdAt: "2026-10-01T10:00:00.000Z",
    updatedAt: "2026-10-01T10:00:00.000Z",
    referralCount: 2,
    ...overrides,
  };
}
