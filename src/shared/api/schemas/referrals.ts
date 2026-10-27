import { z } from "zod";

import {
  REFERRAL_QUALIFICATIONS,
  REFERRAL_SOURCES,
  REFERRAL_STATUSES,
  REWARD_KINDS,
  REWARD_STATES,
  REWARD_STATUSES,
} from "@/domain/referrals";

import { idSchema, isoDateSchema, isoDateTimeSchema } from "../contracts";

const rewardTermsSchema = z.object({
  kind: z.enum(REWARD_KINDS),
  valueCents: z.number().int().positive().nullable().default(null),
  percentBps: z.number().int().min(1).max(10_000).nullable().default(null),
  description: z.string().trim().max(200).nullable().default(null),
});
export type RewardTermsInput = z.input<typeof rewardTermsSchema>;

// Same rule as the referral_programs reward checks: each kind carries exactly its value.
function checkReward(
  reward: z.output<typeof rewardTermsSchema>,
  path: string,
  ctx: z.RefinementCtx,
) {
  const issue = (message: string) => ctx.addIssue({ code: "custom", path: [path], message });
  switch (reward.kind) {
    case "CREDIT":
      if (reward.valueCents === null) issue("Indica el importe del crédito.");
      break;
    case "DISCOUNT_PERCENT":
      if (reward.percentBps === null) issue("Indica el porcentaje de descuento.");
      break;
    case "SERVICE":
    case "OTHER":
      if (!reward.description) issue("Describe el beneficio.");
      break;
    case "NONE":
      break;
  }
}

/** Keeps only the value the kind uses, so a switched kind never sends a stale amount. */
export function normalizeReward(reward: z.output<typeof rewardTermsSchema>) {
  return {
    kind: reward.kind,
    valueCents: reward.kind === "CREDIT" ? reward.valueCents : null,
    percentBps: reward.kind === "DISCOUNT_PERCENT" ? reward.percentBps : null,
    description:
      reward.kind === "SERVICE" || reward.kind === "OTHER" ? reward.description || null : null,
  };
}

export const referralProgramInputSchema = z
  .object({
    name: z.string().trim().min(3, "Mínimo 3 caracteres.").max(100),
    siteId: idSchema.nullable().default(null),
    qualification: z.enum(REFERRAL_QUALIFICATIONS).default("APROBACION_MANUAL"),
    referrerReward: rewardTermsSchema,
    referredReward: rewardTermsSchema,
    maxReferralsPerReferrer: z.number().int().positive().nullable().default(null),
    validityDays: z.number().int().min(1).max(3650).nullable().default(null),
    startsAt: isoDateTimeSchema.nullable().default(null),
    endsAt: isoDateTimeSchema.nullable().default(null),
    terms: z.string().trim().min(1, "Escribe las condiciones.").max(5000),
    active: z.boolean().default(false),
  })
  .superRefine((value, ctx) => {
    checkReward(value.referrerReward, "referrerReward", ctx);
    checkReward(value.referredReward, "referredReward", ctx);
    if (value.startsAt && value.endsAt && Date.parse(value.endsAt) < Date.parse(value.startsAt)) {
      ctx.addIssue({ code: "custom", path: ["endsAt"], message: "El fin es anterior al inicio." });
    }
  })
  .transform((value) => ({
    ...value,
    referrerReward: normalizeReward(value.referrerReward),
    referredReward: normalizeReward(value.referredReward),
  }));
export type ReferralProgramInput = z.input<typeof referralProgramInputSchema>;

export const referralProgramUpdateSchema = z.object({
  program: referralProgramInputSchema,
  expectedVersion: z.number().int().positive(),
});

const rewardTermsOutputSchema = z.object({
  kind: z.enum(REWARD_KINDS),
  valueCents: z.number().int().nullable(),
  percentBps: z.number().int().nullable(),
  description: z.string().nullable(),
});

export const referralProgramSchema = z.object({
  id: idSchema,
  name: z.string(),
  siteId: idSchema.nullable(),
  qualification: z.enum(REFERRAL_QUALIFICATIONS),
  referrerReward: rewardTermsOutputSchema,
  referredReward: rewardTermsOutputSchema,
  maxReferralsPerReferrer: z.number().int().nullable(),
  validityDays: z.number().int().nullable(),
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
  terms: z.string(),
  active: z.boolean(),
  version: z.number().int().positive(),
  createdAt: z.string(),
  updatedAt: z.string(),
  referralCount: z.number().int().nonnegative(),
});
export type ReferralProgram = z.infer<typeof referralProgramSchema>;
export const referralProgramsSchema = z.object({ items: z.array(referralProgramSchema) });

const patientRefSchema = z.object({
  id: idSchema,
  name: z.string(),
  recordNumber: z.string().nullable(),
});

export const referralSchema = z.object({
  id: idSchema,
  status: z.enum(REFERRAL_STATUSES),
  source: z.enum(REFERRAL_SOURCES),
  reportedAt: z.string(),
  confirmedAt: z.string().nullable(),
  voidedAt: z.string().nullable(),
  voidReason: z.string().nullable(),
  notes: z.string().nullable(),
  version: z.number().int().positive(),
  createdAt: z.string(),
  referrer: patientRefSchema,
  referred: patientRefSchema,
  programId: idSchema.nullable(),
  programName: z.string().nullable(),
  siteId: idSchema.nullable(),
  siteName: z.string().nullable(),
  rewardCount: z.number().int().nonnegative(),
});
export type Referral = z.infer<typeof referralSchema>;

export const referralCreateSchema = z
  .object({
    referrerPatientId: idSchema,
    referredPatientId: idSchema,
    siteId: idSchema.nullable().default(null),
    programId: idSchema.nullable().default(null),
    source: z.enum(REFERRAL_SOURCES),
    reportedAt: isoDateTimeSchema.nullable().default(null),
    notes: z.string().trim().max(500).nullable().default(null),
    status: z.enum(["PENDING", "CONFIRMED"]).default("PENDING"),
  })
  .refine((value) => value.referrerPatientId !== value.referredPatientId, {
    path: ["referredPatientId"],
    message: "Un paciente no puede recomendarse a sí mismo.",
  });
export type ReferralCreateInput = z.input<typeof referralCreateSchema>;

export const referralConfirmSchema = z.object({
  expectedVersion: z.number().int().positive().nullable().default(null),
});
export const referralVoidSchema = z.object({
  reason: z.string().trim().min(3, "Indica el motivo.").max(300),
  expectedVersion: z.number().int().positive().nullable().default(null),
});
export const referralReassignSchema = referralVoidSchema.extend({
  newReferrerPatientId: idSchema,
});

const emptyToUndefined = (value: unknown) => (value === "" || value === null ? undefined : value);
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess(emptyToUndefined, schema.optional());

export const referralListFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: optional(z.string().trim().max(100)),
  status: optional(z.enum(REFERRAL_STATUSES)),
  programId: optional(idSchema),
  siteId: optional(idSchema),
  patientId: optional(idSchema),
  referrerPatientId: optional(idSchema),
  from: optional(isoDateSchema),
  to: optional(isoDateSchema),
});
/** What the browser sends; the schema also accepts the same values as query strings. */
export interface ReferralListFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: (typeof REFERRAL_STATUSES)[number];
  programId?: string;
  siteId?: string;
  patientId?: string;
  referrerPatientId?: string;
  from?: string;
  to?: string;
}

export const referralListSchema = z.object({
  total: z.number().int().nonnegative(),
  kpis: z.object({
    activeReferrers: z.number().int().nonnegative(),
    referred: z.number().int().nonnegative(),
    confirmed: z.number().int().nonnegative(),
    withAppointments: z.number().int().nonnegative(),
    rewardsPending: z.number().int().nonnegative(),
    rewardsUsed: z.number().int().nonnegative(),
  }),
  items: z.array(referralSchema),
});
export type ReferralList = z.infer<typeof referralListSchema>;

export const referralRewardSchema = z.object({
  id: idSchema,
  referralId: idSchema,
  programId: idSchema,
  programName: z.string().nullable(),
  qualification: z.enum(REFERRAL_QUALIFICATIONS).nullable(),
  beneficiary: patientRefSchema,
  beneficiaryRole: z.enum(["REFERRER", "REFERRED"]),
  origin: z.object({ id: idSchema, name: z.string() }),
  kind: z.enum(REWARD_KINDS),
  valueCents: z.number().int().nullable(),
  percentBps: z.number().int().nullable(),
  description: z.string().nullable(),
  status: z.enum(REWARD_STATUSES),
  state: z.enum(REWARD_STATES),
  appliedCents: z.number().int().nonnegative(),
  appliedCount: z.number().int().nonnegative(),
  remainingCents: z.number().int().nonnegative().nullable(),
  earnedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  qualificationReference: z.string().nullable(),
  cancelReason: z.string().nullable(),
  lastMovementAt: z.string().nullable(),
  version: z.number().int().positive(),
  createdAt: z.string(),
});
export type ReferralReward = z.infer<typeof referralRewardSchema>;

export const referralRewardListFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: optional(z.string().trim().max(100)),
  state: optional(z.enum(REWARD_STATES)),
  programId: optional(idSchema),
  patientId: optional(idSchema),
});
export interface ReferralRewardListFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  state?: (typeof REWARD_STATES)[number];
  programId?: string;
  patientId?: string;
}

export const referralRewardListSchema = z.object({
  total: z.number().int().nonnegative(),
  kpis: z.object({
    pending: z.number().int().nonnegative(),
    earned: z.number().int().nonnegative(),
    used: z.number().int().nonnegative(),
    expired: z.number().int().nonnegative(),
    creditRemainingCents: z.number().int().nonnegative(),
  }),
  items: z.array(referralRewardSchema),
});
export type ReferralRewardList = z.infer<typeof referralRewardListSchema>;

export const referralRewardApproveSchema = z.object({
  reference: z.string().trim().max(200).nullable().default(null),
  expectedVersion: z.number().int().positive().nullable().default(null),
});
export const referralRewardCancelSchema = referralVoidSchema;
export const referralRewardRedeemSchema = z.object({
  amountCents: z.number().int().positive().nullable().default(null),
  invoiceId: idSchema.nullable().default(null),
  budgetId: idSchema.nullable().default(null),
  reason: z.string().trim().max(300).nullable().default(null),
  idempotencyKey: z.string().trim().min(8).max(100),
});
export type ReferralRewardRedeemInput = z.input<typeof referralRewardRedeemSchema>;
export const referralRedemptionReverseSchema = z.object({
  reason: z.string().trim().min(3, "Indica el motivo.").max(300),
});

export const referralRedemptionsSchema = z.object({
  items: z.array(
    z.object({
      id: idSchema,
      amountCents: z.number().int().nullable(),
      status: z.enum(["APPLIED", "REVERSED"]),
      reason: z.string().nullable(),
      reversalReason: z.string().nullable(),
      invoiceId: idSchema.nullable(),
      budgetId: idSchema.nullable(),
      createdAt: z.string(),
      reversedAt: z.string().nullable(),
      actorName: z.string().nullable(),
    }),
  ),
});
export type ReferralRedemptions = z.infer<typeof referralRedemptionsSchema>;

export const referralPatientSummarySchema = z.object({
  referredBy: referralSchema.nullable(),
  referrals: z.array(referralSchema),
  /** Null when the viewer may see referrals but not rewards. */
  rewards: z.array(referralRewardSchema).nullable(),
});
export type ReferralPatientSummary = z.infer<typeof referralPatientSummarySchema>;
