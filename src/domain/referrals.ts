/**
 * Pacientes asociados: who recommended whom, the programs that may reward it,
 * and the rewards ledger. Rewards are rights recorded in a ledger of
 * redemptions; the balance is always derived, never edited.
 */

import { epochMillis, type DateInput } from "./dates";
import { formatEUR } from "./money";

export const REFERRAL_STATUSES = ["PENDING", "CONFIRMED", "VOID"] as const;
export type ReferralStatus = (typeof REFERRAL_STATUSES)[number];

export const REFERRAL_SOURCES = [
  "DECLARADO_EN_RECEPCION",
  "FORMULARIO",
  "CODIGO_QR",
  "PORTAL",
  "OTRO",
] as const;
export type ReferralSource = (typeof REFERRAL_SOURCES)[number];

export const REFERRAL_QUALIFICATIONS = [
  "PRIMERA_CITA_COMPLETADA",
  "PRIMER_PAGO_CONFIRMADO",
  "APROBACION_MANUAL",
] as const;
export type ReferralQualification = (typeof REFERRAL_QUALIFICATIONS)[number];

export const REWARD_KINDS = ["NONE", "CREDIT", "DISCOUNT_PERCENT", "SERVICE", "OTHER"] as const;
export type RewardKind = (typeof REWARD_KINDS)[number];

export const REWARD_STATUSES = ["PENDING", "EARNED", "EXPIRED", "CANCELLED"] as const;
export type RewardStatus = (typeof REWARD_STATUSES)[number];

export const REWARD_STATES = [
  "PENDIENTE",
  "DISPONIBLE",
  "PARCIAL",
  "USADO",
  "VENCIDO",
  "CANCELADO",
] as const;
export type RewardState = (typeof REWARD_STATES)[number];

export const REFERRAL_STATUS_LABELS: Readonly<Record<ReferralStatus, string>> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmado",
  VOID: "Anulado",
};

export const REFERRAL_SOURCE_LABELS: Readonly<Record<ReferralSource, string>> = {
  DECLARADO_EN_RECEPCION: "Declarado en recepción",
  FORMULARIO: "Formulario",
  CODIGO_QR: "Código QR",
  PORTAL: "Portal del paciente",
  OTRO: "Otro",
};

export const REFERRAL_QUALIFICATION_LABELS: Readonly<Record<ReferralQualification, string>> = {
  PRIMERA_CITA_COMPLETADA: "Primera cita completada del recomendado",
  PRIMER_PAGO_CONFIRMADO: "Primer pago confirmado (validación manual)",
  APROBACION_MANUAL: "Aprobación manual",
};

export const REWARD_KIND_LABELS: Readonly<Record<RewardKind, string>> = {
  NONE: "Ninguno",
  CREDIT: "Crédito en euros",
  DISCOUNT_PERCENT: "Descuento en porcentaje",
  SERVICE: "Servicio",
  OTHER: "Otro",
};

export const REWARD_STATE_LABELS: Readonly<Record<RewardState, string>> = {
  PENDIENTE: "Pendiente de validar",
  DISPONIBLE: "Disponible",
  PARCIAL: "Usado en parte",
  USADO: "Usado",
  VENCIDO: "Vencido",
  CANCELADO: "Cancelado",
};

export interface RewardStateInput {
  status: RewardStatus;
  kind: RewardKind;
  valueCents: number | null;
  /** Sum of APPLIED (not reversed) redemptions. */
  appliedCents: number;
  /** Number of APPLIED (not reversed) redemptions. */
  appliedCount: number;
  expiresAt: string | null;
}

/** Credit left to use; null for rewards that are not an amount. */
export function rewardRemainingCents(
  reward: Pick<RewardStateInput, "kind" | "valueCents" | "appliedCents">,
): number | null {
  if (reward.kind !== "CREDIT" || reward.valueCents === null) return null;
  return Math.max(0, reward.valueCents - reward.appliedCents);
}

function fullyUsed(reward: RewardStateInput): boolean {
  if (reward.kind === "CREDIT") return (rewardRemainingCents(reward) ?? 0) === 0;
  return reward.appliedCount > 0;
}

/** Mirrors private.referral_reward_state; checked by the migration contract test. */
export function deriveRewardState(
  reward: RewardStateInput,
  now: DateInput = Date.now(),
): RewardState {
  switch (reward.status) {
    case "PENDING":
      return "PENDIENTE";
    case "CANCELLED":
      return "CANCELADO";
    case "EXPIRED":
      return "VENCIDO";
    default:
      break;
  }
  if (fullyUsed(reward)) return "USADO";
  if (reward.expiresAt && epochMillis(reward.expiresAt) < epochMillis(now)) return "VENCIDO";
  return reward.appliedCount > 0 ? "PARCIAL" : "DISPONIBLE";
}

const PERCENT = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 });

export interface RewardTerms {
  kind: RewardKind;
  valueCents?: number | null;
  percentBps?: number | null;
  description?: string | null;
}

export function describeReward(reward: RewardTerms): string {
  switch (reward.kind) {
    case "NONE":
      return "Sin beneficio";
    case "CREDIT":
      return `Crédito de ${formatEUR(reward.valueCents ?? 0)}`;
    case "DISCOUNT_PERCENT":
      return `Descuento del ${PERCENT.format((reward.percentBps ?? 0) / 100)} %`;
    case "SERVICE":
      return reward.description ? `Servicio: ${reward.description}` : "Servicio";
    case "OTHER":
      return reward.description ? reward.description : "Otro beneficio";
  }
}
