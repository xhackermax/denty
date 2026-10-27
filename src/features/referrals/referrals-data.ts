"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  ReferralCreateInput,
  ReferralListFilters,
  ReferralProgramInput,
  ReferralRewardListFilters,
  ReferralRewardRedeemInput,
} from "@/shared/api";
import { getBrowserApi } from "@/shared/api/browser";

export const referralKeys = {
  root: ["referrals"] as const,
  list: (filters: ReferralListFilters) => ["referrals", "list", filters] as const,
  programs: ["referrals", "programs"] as const,
  rewards: (filters: ReferralRewardListFilters) => ["referrals", "rewards", filters] as const,
  redemptions: (rewardId: string) => ["referrals", "redemptions", rewardId] as const,
  patient: (patientId: string) => ["referrals", "patient", patientId] as const,
  sites: ["referrals", "sites"] as const,
};

// Every change can move KPIs, rewards and the patient record at once.
function useInvalidateReferrals() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: referralKeys.root });
}

export function useReferralListQuery(filters: ReferralListFilters, enabled = true) {
  return useQuery({
    queryKey: referralKeys.list(filters),
    queryFn: () => getBrowserApi().referrals.list(filters),
    enabled,
    placeholderData: (previous) => previous,
  });
}

export function useReferralProgramsQuery(enabled = true) {
  return useQuery({
    queryKey: referralKeys.programs,
    queryFn: () => getBrowserApi().referrals.programs(),
    enabled,
  });
}

export function useReferralRewardsQuery(filters: ReferralRewardListFilters, enabled = true) {
  return useQuery({
    queryKey: referralKeys.rewards(filters),
    queryFn: () => getBrowserApi().referrals.rewards(filters),
    enabled,
    placeholderData: (previous) => previous,
  });
}

export function useReferralRedemptionsQuery(rewardId: string | null) {
  return useQuery({
    queryKey: referralKeys.redemptions(rewardId ?? ""),
    queryFn: () => getBrowserApi().referrals.redemptions(rewardId ?? ""),
    enabled: rewardId !== null,
  });
}

export function usePatientReferralsQuery(patientId: string, enabled = true) {
  return useQuery({
    queryKey: referralKeys.patient(patientId),
    queryFn: () => getBrowserApi().referrals.patientSummary(patientId),
    enabled,
  });
}

/** Sites for the selectors; the agenda context is readable by reception. */
export function useReferralSitesQuery() {
  return useQuery({
    queryKey: referralKeys.sites,
    queryFn: () => getBrowserApi().agenda.context(),
    staleTime: 5 * 60_000,
    select: (context) => context.sites.filter((site) => site.active !== false),
  });
}

export function useCreateReferralMutation() {
  const invalidate = useInvalidateReferrals();
  return useMutation({
    mutationFn: (input: ReferralCreateInput) => getBrowserApi().referrals.create(input),
    onSettled: invalidate,
  });
}

export type ReferralChange =
  | { action: "confirm"; referralId: string; expectedVersion: number }
  | { action: "void"; referralId: string; expectedVersion: number; reason: string }
  | {
      action: "reassign";
      referralId: string;
      expectedVersion: number;
      reason: string;
      newReferrerPatientId: string;
    };

export function useReferralChangeMutation() {
  const invalidate = useInvalidateReferrals();
  return useMutation({
    mutationFn: (change: ReferralChange) => {
      const api = getBrowserApi().referrals;
      const { referralId, expectedVersion } = change;
      switch (change.action) {
        case "confirm":
          return api.confirm(referralId, { expectedVersion });
        case "void":
          return api.void(referralId, { expectedVersion, reason: change.reason });
        case "reassign":
          return api.reassign(referralId, {
            expectedVersion,
            reason: change.reason,
            newReferrerPatientId: change.newReferrerPatientId,
          });
      }
    },
    onSettled: invalidate,
  });
}

export function useSaveReferralProgramMutation() {
  const invalidate = useInvalidateReferrals();
  return useMutation({
    mutationFn: (
      input:
        | { programId: null; program: ReferralProgramInput }
        | { programId: string; program: ReferralProgramInput; expectedVersion: number },
    ) =>
      input.programId === null
        ? getBrowserApi().referrals.createProgram(input.program)
        : getBrowserApi().referrals.updateProgram(input.programId, {
            program: input.program,
            expectedVersion: input.expectedVersion,
          }),
    onSettled: invalidate,
  });
}

export type RewardChange =
  | { action: "approve"; rewardId: string; expectedVersion: number; reference: string | null }
  | { action: "cancel"; rewardId: string; expectedVersion: number; reason: string }
  | { action: "redeem"; rewardId: string; input: ReferralRewardRedeemInput }
  | { action: "reverse"; redemptionId: string; reason: string };

export function useRewardChangeMutation() {
  const invalidate = useInvalidateReferrals();
  return useMutation({
    mutationFn: (change: RewardChange) => {
      const api = getBrowserApi().referrals;
      switch (change.action) {
        case "approve":
          return api.approveReward(change.rewardId, {
            reference: change.reference,
            expectedVersion: change.expectedVersion,
          });
        case "cancel":
          return api.cancelReward(change.rewardId, {
            reason: change.reason,
            expectedVersion: change.expectedVersion,
          });
        case "redeem":
          return api.redeemReward(change.rewardId, change.input);
        case "reverse":
          return api.reverseRedemption(change.redemptionId, { reason: change.reason });
      }
    },
    onSettled: invalidate,
  });
}
