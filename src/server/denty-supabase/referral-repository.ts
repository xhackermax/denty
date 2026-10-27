import type { z } from "zod";

import type {
  referralCreateSchema,
  referralListFiltersSchema,
  referralProgramInputSchema,
  referralRewardListFiltersSchema,
  referralRewardRedeemSchema,
} from "@/shared/api/schemas/referrals";

import type { SupabaseRestClient } from "../supabase/rest-client";

type ProgramInput = z.output<typeof referralProgramInputSchema>;

/** Pacientes asociados RPCs. Permissions, balance checks and audit live in the database functions. */
export class ReferralRepository {
  constructor(
    private readonly client: SupabaseRestClient,
    private readonly clinicId: string,
  ) {}

  private call(name: string, args: Record<string, unknown>) {
    return this.client.rpc<unknown>(name, { p_clinic_id: this.clinicId, ...args });
  }

  list({ page, pageSize, ...filters }: z.output<typeof referralListFiltersSchema>) {
    return this.call("referral_list", { p_filters: filters, p_page: page, p_page_size: pageSize });
  }

  create(input: z.output<typeof referralCreateSchema>) {
    return this.call("referral_create", { p_payload: input });
  }

  confirm(referralId: string, expectedVersion: number | null) {
    return this.call("referral_confirm", {
      p_referral_id: referralId,
      p_expected_version: expectedVersion,
    });
  }

  void(referralId: string, reason: string, expectedVersion: number | null) {
    return this.call("referral_void", {
      p_referral_id: referralId,
      p_reason: reason,
      p_expected_version: expectedVersion,
    });
  }

  reassign(
    referralId: string,
    newReferrerPatientId: string,
    reason: string,
    expectedVersion: number | null,
  ) {
    return this.call("referral_reassign", {
      p_referral_id: referralId,
      p_new_referrer_id: newReferrerPatientId,
      p_reason: reason,
      p_expected_version: expectedVersion,
    });
  }

  patientSummary(patientId: string) {
    return this.call("referral_patient_summary", { p_patient_id: patientId });
  }

  programs() {
    return this.call("referral_programs_list", {});
  }

  saveProgram(programId: string | null, program: ProgramInput, expectedVersion: number | null) {
    return this.call("referral_program_save", {
      p_program_id: programId,
      p_payload: program,
      p_expected_version: expectedVersion,
    });
  }

  rewards({ page, pageSize, ...filters }: z.output<typeof referralRewardListFiltersSchema>) {
    return this.call("referral_reward_list", {
      p_filters: filters,
      p_page: page,
      p_page_size: pageSize,
    });
  }

  redemptions(rewardId: string) {
    return this.call("referral_reward_redemptions_list", { p_reward_id: rewardId });
  }

  approveReward(rewardId: string, reference: string | null, expectedVersion: number | null) {
    return this.call("referral_reward_approve", {
      p_reward_id: rewardId,
      p_reference: reference,
      p_expected_version: expectedVersion,
    });
  }

  cancelReward(rewardId: string, reason: string, expectedVersion: number | null) {
    return this.call("referral_reward_cancel", {
      p_reward_id: rewardId,
      p_reason: reason,
      p_expected_version: expectedVersion,
    });
  }

  redeemReward(
    rewardId: string,
    { idempotencyKey, ...payload }: z.output<typeof referralRewardRedeemSchema>,
  ) {
    return this.call("referral_reward_redeem", {
      p_reward_id: rewardId,
      p_payload: payload,
      p_idempotency_key: idempotencyKey,
    });
  }

  reverseRedemption(redemptionId: string, reason: string) {
    return this.call("referral_redemption_reverse", {
      p_redemption_id: redemptionId,
      p_reason: reason,
    });
  }
}
