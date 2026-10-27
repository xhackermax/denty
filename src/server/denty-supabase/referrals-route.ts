import { z } from "zod";

import {
  referralConfirmSchema,
  referralCreateSchema,
  referralListFiltersSchema,
  referralProgramInputSchema,
  referralProgramUpdateSchema,
  referralReassignSchema,
  referralRedemptionReverseSchema,
  referralRewardApproveSchema,
  referralRewardCancelSchema,
  referralRewardListFiltersSchema,
  referralRewardRedeemSchema,
  referralVoidSchema,
} from "@/shared/api/schemas/referrals";

import { SupabaseRestError, type SupabaseRestClient } from "../supabase/rest-client";
import { ReferralRepository } from "./referral-repository";

interface Identity {
  actor: { clinicId: string; permissions: readonly string[] };
  restClient: SupabaseRestClient;
}

export function isReferralsRoute(parts: readonly string[]): boolean {
  return parts[0] === "api" && parts[1] === "referrals";
}

// Rule violations raised by the referral RPCs, with the text reception sees.
const RULE_ERRORS: Record<string, [status: number, code: string, message: string]> = {
  FORBIDDEN: [403, "FORBIDDEN", "No tienes permiso para esta acción."],
  VERSION_CONFLICT: [
    409,
    "REFERRAL_VERSION_CONFLICT",
    "Otra persona lo ha cambiado. Actualiza la lista e inténtalo de nuevo.",
  ],
  REFERRAL_SELF: [422, "REFERRAL_SELF", "Un paciente no puede recomendarse a sí mismo."],
  REFERRAL_CYCLE: [
    422,
    "REFERRAL_CYCLE",
    "Esa relación cerraría un círculo: el recomendado ya recomendó, directa o indirectamente, a quien le recomienda.",
  ],
  REFERRAL_ALREADY_ACTIVE: [
    409,
    "REFERRAL_ALREADY_ACTIVE",
    "Este paciente ya tiene quien le recomendó. Usa «Cambiar quién recomienda» si hay que corregirlo.",
  ],
  PATIENT_NOT_FOUND: [404, "PATIENT_NOT_FOUND", "No se encontró el paciente en esta clínica."],
  PATIENT_ARCHIVED: [
    409,
    "PATIENT_ARCHIVED",
    "Uno de los pacientes está archivado. Pide a un administrador que lo revise.",
  ],
  REFERRAL_NOT_FOUND: [404, "REFERRAL_NOT_FOUND", "No se encontró la relación."],
  REFERRAL_PROGRAM_NOT_FOUND: [404, "REFERRAL_PROGRAM_NOT_FOUND", "No se encontró el programa."],
  REFERRAL_INVALID_TRANSITION: [
    409,
    "REFERRAL_INVALID_TRANSITION",
    "Esta acción no está disponible en el estado actual de la relación.",
  ],
  REFERRAL_HAS_REDEMPTIONS: [
    409,
    "REFERRAL_HAS_REDEMPTIONS",
    "Ya se usó algún beneficio de esta relación. Revierte primero esos canjes.",
  ],
  REFERRAL_NOT_CONFIRMED: [
    409,
    "REFERRAL_NOT_CONFIRMED",
    "Confirma primero la relación de recomendación.",
  ],
  REASON_REQUIRED: [400, "REASON_REQUIRED", "Indica el motivo."],
  REFERENCE_REQUIRED: [
    400,
    "REFERENCE_REQUIRED",
    "Indica la cita, el pago o el documento que demuestra que se cumple la condición.",
  ],
  REWARD_NOT_FOUND: [404, "REWARD_NOT_FOUND", "No se encontró el beneficio."],
  REWARD_INVALID_TRANSITION: [
    409,
    "REWARD_INVALID_TRANSITION",
    "Esta acción no está disponible en el estado actual del beneficio.",
  ],
  REWARD_HAS_REDEMPTIONS: [
    409,
    "REWARD_HAS_REDEMPTIONS",
    "El beneficio ya se ha usado. Revierte primero esos canjes.",
  ],
  REWARD_NOT_AVAILABLE: [
    409,
    "REWARD_NOT_AVAILABLE",
    "El beneficio no se puede usar: está pendiente, vencido, cancelado o ya usado.",
  ],
  REWARD_INSUFFICIENT_BALANCE: [
    409,
    "REWARD_INSUFFICIENT_BALANCE",
    "El importe supera el crédito disponible.",
  ],
  INVALID_AMOUNT: [400, "INVALID_AMOUNT", "Revisa el importe."],
  INVALID_REFERENCE: [
    400,
    "INVALID_REFERENCE",
    "La factura o el presupuesto no son de este paciente.",
  ],
  IDEMPOTENCY_KEY_REUSED: [
    409,
    "IDEMPOTENCY_KEY_REUSED",
    "Repite la operación desde el principio.",
  ],
  REDEMPTION_NOT_FOUND: [404, "REDEMPTION_NOT_FOUND", "No se encontró el canje."],
  REDEMPTION_ALREADY_REVERSED: [409, "REDEMPTION_ALREADY_REVERSED", "Ese canje ya está revertido."],
};

function databaseMessage(caught: SupabaseRestError): string {
  const details = caught.details as { message?: unknown } | null;
  return typeof details?.message === "string" ? details.message : "";
}

/**
 * /api/referrals — Pacientes asociados. Relations need referrals.*, programs
 * referral_programs.manage and the rewards ledger referral_rewards.*. The
 * database checks the same permissions again.
 */
export async function handleReferralsRoute(
  request: Request,
  parts: readonly string[],
  identity: Identity | null,
  headers: HeadersInit = {},
): Promise<Response> {
  const reply = (status: number, body: unknown) => Response.json(body, { status, headers });
  const fail = (status: number, code: string, message: string, details?: unknown) =>
    reply(status, { error: { code, message, details } });
  if (!identity) return fail(401, "UNAUTHENTICATED", "Sesión requerida.");

  const can = (permission: string) => identity.actor.permissions.includes(permission);
  const forbidden = () => fail(403, "FORBIDDEN", "No tienes permiso para esta acción.");
  const repo = new ReferralRepository(identity.restClient, identity.actor.clinicId);
  const method = request.method.toUpperCase();
  const [, , first, second, third] = parts.map((part) => decodeURIComponent(part));
  const body = async () => (await request.json()) as unknown;
  const query = () => Object.fromEntries(new URL(request.url).searchParams);
  const length = parts.length;

  try {
    if (length === 2) {
      if (method === "GET") {
        if (!can("referrals.read")) return forbidden();
        return reply(200, await repo.list(referralListFiltersSchema.parse(query())));
      }
      if (method === "POST") {
        if (!can("referrals.manage")) return forbidden();
        return reply(201, await repo.create(referralCreateSchema.parse(await body())));
      }
    } else if (first === "programs") {
      if (length === 3 && method === "GET") {
        if (!can("referrals.read")) return forbidden();
        return reply(200, await repo.programs());
      }
      if (!can("referral_programs.manage")) return forbidden();
      if (length === 3 && method === "POST") {
        const program = referralProgramInputSchema.parse(await body());
        return reply(201, await repo.saveProgram(null, program, null));
      }
      if (second && length === 4 && method === "PUT") {
        const input = referralProgramUpdateSchema.parse(await body());
        return reply(200, await repo.saveProgram(second, input.program, input.expectedVersion));
      }
    } else if (first === "rewards") {
      if (length === 3 && method === "GET") {
        if (!can("referral_rewards.read")) return forbidden();
        return reply(200, await repo.rewards(referralRewardListFiltersSchema.parse(query())));
      }
      if (second && length === 5 && method === "GET" && third === "redemptions") {
        if (!can("referral_rewards.read")) return forbidden();
        return reply(200, await repo.redemptions(second));
      }
      if (second && length === 5 && method === "POST") {
        if (third === "approve") {
          if (!can("referral_rewards.approve")) return forbidden();
          const input = referralRewardApproveSchema.parse(await body());
          return reply(
            200,
            await repo.approveReward(second, input.reference, input.expectedVersion),
          );
        }
        if (third === "cancel") {
          if (!can("referral_rewards.approve")) return forbidden();
          const input = referralRewardCancelSchema.parse(await body());
          return reply(200, await repo.cancelReward(second, input.reason, input.expectedVersion));
        }
        if (third === "redeem") {
          if (!can("referral_rewards.redeem")) return forbidden();
          return reply(
            200,
            await repo.redeemReward(second, referralRewardRedeemSchema.parse(await body())),
          );
        }
      }
    } else if (first === "redemptions") {
      if (second && third === "reverse" && length === 5 && method === "POST") {
        if (!can("referral_rewards.reverse")) return forbidden();
        const input = referralRedemptionReverseSchema.parse(await body());
        return reply(200, await repo.reverseRedemption(second, input.reason));
      }
    } else if (first === "patients") {
      if (second && length === 4 && method === "GET") {
        if (!can("referrals.read")) return forbidden();
        return reply(200, await repo.patientSummary(second));
      }
    } else if (first && length === 4 && method === "POST") {
      if (!can("referrals.manage")) return forbidden();
      if (second === "confirm") {
        const input = referralConfirmSchema.parse(await body());
        return reply(200, await repo.confirm(first, input.expectedVersion));
      }
      if (second === "void") {
        const input = referralVoidSchema.parse(await body());
        return reply(200, await repo.void(first, input.reason, input.expectedVersion));
      }
      if (second === "reassign") {
        const input = referralReassignSchema.parse(await body());
        return reply(
          200,
          await repo.reassign(
            first,
            input.newReferrerPatientId,
            input.reason,
            input.expectedVersion,
          ),
        );
      }
    }
  } catch (caught) {
    if (caught instanceof z.ZodError) {
      return fail(400, "INVALID_PAYLOAD", "Revisa los datos del formulario.", caught.flatten());
    }
    if (caught instanceof SyntaxError) {
      return fail(400, "INVALID_PAYLOAD", "Revisa los datos del formulario.");
    }
    if (caught instanceof SupabaseRestError) {
      const rule = RULE_ERRORS[databaseMessage(caught)];
      if (rule) return fail(...rule);
      const details = caught.details as { code?: unknown } | null;
      if (details?.code === "23503") {
        return fail(400, "INVALID_REFERENCE", "La sede, el programa o el paciente no existen.");
      }
      if (details?.code === "23514") {
        return fail(400, "INVALID_PAYLOAD", "Revisa los datos del formulario.");
      }
      return fail(
        caught.status >= 400 && caught.status < 600 ? caught.status : 502,
        "SUPABASE_ERROR",
        "No se pudo completar la operación.",
      );
    }
    throw caught;
  }
  return fail(404, "NOT_FOUND", "Ruta no encontrada.");
}
