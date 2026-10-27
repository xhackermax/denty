import type { ReferralStatus, RewardState } from "@/domain/referrals";

export type ReferralAction = "confirm" | "reassign" | "void";
export type RewardAction = "approve" | "redeem" | "cancel";

/** Mirrors the referral RPC rules so the menu never offers an action the database refuses. */
export function availableReferralActions(
  referral: { status: ReferralStatus },
  permissions: ReadonlySet<string>,
): ReferralAction[] {
  if (!permissions.has("referrals.manage")) return [];
  switch (referral.status) {
    case "PENDING":
      return ["confirm", "reassign", "void"];
    case "CONFIRMED":
      // Voiding a confirmed relation withdraws its rewards.
      return permissions.has("referral_rewards.reverse") ? ["reassign", "void"] : [];
    case "VOID":
      return [];
  }
}

export function availableRewardActions(
  reward: { state: RewardState; appliedCount: number },
  permissions: ReadonlySet<string>,
): RewardAction[] {
  const canApprove = permissions.has("referral_rewards.approve");
  const actions: RewardAction[] = [];
  if (reward.state === "PENDIENTE" && canApprove) actions.push("approve");
  if (
    (reward.state === "DISPONIBLE" || reward.state === "PARCIAL") &&
    permissions.has("referral_rewards.redeem")
  ) {
    actions.push("redeem");
  }
  if (
    canApprove &&
    reward.appliedCount === 0 &&
    (reward.state === "PENDIENTE" || reward.state === "DISPONIBLE")
  ) {
    actions.push("cancel");
  }
  return actions;
}

export const REFERRAL_ACTION_LABELS: Record<ReferralAction, string> = {
  confirm: "Confirmar referido",
  reassign: "Cambiar quién recomienda",
  void: "Anular relación",
};

export const REWARD_ACTION_LABELS: Record<RewardAction, string> = {
  approve: "Validar cumplimiento",
  redeem: "Canjear",
  cancel: "Cancelar beneficio",
};
