import type { z } from "zod";

import type { ApiClient } from "../client";
import {
  referralConfirmSchema,
  referralCreateSchema,
  referralListFiltersSchema,
  referralListSchema,
  referralPatientSummarySchema,
  referralProgramInputSchema,
  referralProgramSchema,
  referralProgramsSchema,
  referralProgramUpdateSchema,
  referralReassignSchema,
  referralRedemptionReverseSchema,
  referralRedemptionsSchema,
  referralRewardApproveSchema,
  referralRewardCancelSchema,
  referralRewardListFiltersSchema,
  referralRewardListSchema,
  referralRewardRedeemSchema,
  referralRewardSchema,
  referralSchema,
  referralVoidSchema,
  type ReferralListFilters,
  type ReferralRewardListFilters,
} from "../schemas/referrals";
import { encodeId, withQuery } from "./shared";

/** Pacientes asociados: referral relations, programs and the rewards ledger. */
export function createReferralsResource(client: ApiClient) {
  return {
    list: (filters: ReferralListFilters = {}) =>
      client.request(
        withQuery("/api/referrals", referralListFiltersSchema.parse(filters)),
        referralListSchema,
      ),
    create: (input: z.input<typeof referralCreateSchema>) =>
      client.mutation("/api/referrals", referralSchema, referralCreateSchema.parse(input)),
    confirm: (referralId: string, input: z.input<typeof referralConfirmSchema> = {}) =>
      client.mutation(
        `/api/referrals/${encodeId(referralId)}/confirm`,
        referralSchema,
        referralConfirmSchema.parse(input),
      ),
    void: (referralId: string, input: z.input<typeof referralVoidSchema>) =>
      client.mutation(
        `/api/referrals/${encodeId(referralId)}/void`,
        referralSchema,
        referralVoidSchema.parse(input),
      ),
    reassign: (referralId: string, input: z.input<typeof referralReassignSchema>) =>
      client.mutation(
        `/api/referrals/${encodeId(referralId)}/reassign`,
        referralSchema,
        referralReassignSchema.parse(input),
      ),
    patientSummary: (patientId: string) =>
      client.request(
        `/api/referrals/patients/${encodeId(patientId)}`,
        referralPatientSummarySchema,
      ),
    programs: () => client.request("/api/referrals/programs", referralProgramsSchema),
    createProgram: (input: z.input<typeof referralProgramInputSchema>) =>
      client.mutation(
        "/api/referrals/programs",
        referralProgramSchema,
        referralProgramInputSchema.parse(input),
      ),
    updateProgram: (programId: string, input: z.input<typeof referralProgramUpdateSchema>) =>
      client.mutation(
        `/api/referrals/programs/${encodeId(programId)}`,
        referralProgramSchema,
        referralProgramUpdateSchema.parse(input),
        { method: "PUT" },
      ),
    rewards: (filters: ReferralRewardListFilters = {}) =>
      client.request(
        withQuery("/api/referrals/rewards", referralRewardListFiltersSchema.parse(filters)),
        referralRewardListSchema,
      ),
    redemptions: (rewardId: string) =>
      client.request(
        `/api/referrals/rewards/${encodeId(rewardId)}/redemptions`,
        referralRedemptionsSchema,
      ),
    approveReward: (rewardId: string, input: z.input<typeof referralRewardApproveSchema> = {}) =>
      client.mutation(
        `/api/referrals/rewards/${encodeId(rewardId)}/approve`,
        referralRewardSchema,
        referralRewardApproveSchema.parse(input),
      ),
    cancelReward: (rewardId: string, input: z.input<typeof referralRewardCancelSchema>) =>
      client.mutation(
        `/api/referrals/rewards/${encodeId(rewardId)}/cancel`,
        referralRewardSchema,
        referralRewardCancelSchema.parse(input),
      ),
    redeemReward: (rewardId: string, input: z.input<typeof referralRewardRedeemSchema>) =>
      client.mutation(
        `/api/referrals/rewards/${encodeId(rewardId)}/redeem`,
        referralRewardSchema,
        referralRewardRedeemSchema.parse(input),
      ),
    reverseRedemption: (
      redemptionId: string,
      input: z.input<typeof referralRedemptionReverseSchema>,
    ) =>
      client.mutation(
        `/api/referrals/redemptions/${encodeId(redemptionId)}/reverse`,
        referralRewardSchema,
        referralRedemptionReverseSchema.parse(input),
      ),
  };
}
